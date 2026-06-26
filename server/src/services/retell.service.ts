/**
 * Retell AI — Custom LLM WebSocket handler.
 *
 * Retell handles all telephony, speech-to-text and text-to-speech. For each
 * agent turn it opens a WebSocket to THIS server (one connection per call) at:
 *     wss://<server>/ws/retell-llm/<call_id>
 * and asks us for the agent's response. We run the SAME AI brain used by the
 * Twilio/browser flows (generateVoiceResponse + Supabase KB + Loop C lead
 * extraction), so behaviour and knowledge stay identical across channels.
 *
 * Protocol (see https://docs.retellai.com/api-references/llm-websocket):
 *  - On connect, WE send a `config` event.
 *  - Retell sends `call_details` once (carries retell_llm_dynamic_variables + metadata).
 *  - Retell sends `response_required` / `reminder_required` → we stream `response` events.
 *  - Retell sends `ping_pong` every 2s → we echo it back.
 *  - Retell sends `update_only` → no response needed.
 *
 * Knowledge switch (the product requirement):
 *  - Location has a usable KB  → agent answers from that customer's KB.
 *  - Location has NO usable KB → agent answers as a BlueSlate product demo.
 */
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import { supabase } from '../config/supabase';
import { generateVoiceResponse, extractLeadFromTranscript, summarizeCall } from './ai.service';
import { getActiveKnowledgeBase, buildKnowledgeContextString, isKnowledgeBaseUsable } from './knowledge.service';
import { BLUESLATE_KNOWLEDGE_CONTEXT, buildBlueslateSystemPrompt } from './blueslateKnowledge';
import { notifyNewLead, notifyAbandonedCall } from './email.service';
import type { Location } from '../types';

const DEMO_LOCATION_ID = 'b0000000-0000-0000-0000-000000000001';

// ── Retell → us ──
interface RetellUtterance { role: 'agent' | 'user'; content: string }
interface RetellInbound {
  interaction_type: 'call_details' | 'response_required' | 'reminder_required' | 'update_only' | 'ping_pong';
  response_id?: number;
  transcript?: RetellUtterance[];
  timestamp?: number;
  call?: {
    call_id: string;
    from_number?: string;
    to_number?: string;
    direction?: 'inbound' | 'outbound';
    retell_llm_dynamic_variables?: Record<string, string>;
    metadata?: Record<string, unknown>;
  };
}

interface Session {
  retellCallId: string;
  callRowId: string | null;     // our `calls` table id
  location: Location;
  locationId: string;
  orgId: string;
  knowledgeContext: string;
  kbIsEmpty: boolean;
  systemPrompt: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  leadId: string | null;
  context: string | null;       // outbound lead context
  greeted: boolean;
}

const sessions = new Map<string, Session>();

export function attachRetellWebSocket(server: Server): void {
  // Note: ws matches the path prefix; the call_id is the trailing path segment.
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '', 'http://localhost');
    if (!pathname.startsWith('/ws/retell-llm/')) return; // let other WS servers (e.g. /ws/voice) handle theirs
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const { pathname } = new URL(req.url ?? '', 'http://localhost');
    const retellCallId = decodeURIComponent(pathname.split('/ws/retell-llm/')[1] ?? '');
    if (!retellCallId) { ws.close(); return; }

    // 1) Tell Retell how we want to be driven.
    send(ws, { response_type: 'config', config: { auto_reconnect: true, call_details: true } });

    ws.on('message', (data: Buffer) => {
      void handleMessage(ws, retellCallId, data.toString()).catch((err) => {
        console.error('[Retell] handleMessage error:', err instanceof Error ? err.message : err);
      });
    });
    ws.on('close', () => { void endSession(retellCallId); });
    ws.on('error', (e) => console.error('[Retell] ws error:', e.message));
  });
}

async function handleMessage(ws: WebSocket, retellCallId: string, raw: string): Promise<void> {
  let msg: RetellInbound;
  try { msg = JSON.parse(raw); } catch { return; }

  switch (msg.interaction_type) {
    case 'ping_pong':
      send(ws, { response_type: 'ping_pong', timestamp: msg.timestamp ?? 0 });
      return;

    case 'call_details':
      await initSession(retellCallId, msg);
      return;

    case 'update_only':
      return; // transcript update only — nothing to say

    case 'response_required':
    case 'reminder_required':
      await respond(ws, retellCallId, msg);
      return;

    default:
      return;
  }
}

async function initSession(retellCallId: string, msg: RetellInbound): Promise<void> {
  if (sessions.has(retellCallId)) return;

  const dyn = msg.call?.retell_llm_dynamic_variables ?? {};
  const meta = (msg.call?.metadata ?? {}) as Record<string, string>;
  const direction = msg.call?.direction ?? 'inbound';
  const fromNumber = msg.call?.from_number ?? (direction === 'inbound' ? 'unknown' : 'agent');
  const toNumber = msg.call?.to_number ?? '';

  // Resolve which location/KB this call belongs to:
  //  - outbound: locationId passed via dynamic variables at call creation
  //  - inbound:  look up by the dialled (to) number; fall back to demo location
  const locationId = dyn.locationId || meta.locationId || null;
  const leadId = dyn.leadId || meta.leadId || null;
  const context = dyn.context || meta.context || null;

  let location: Location | null = null;
  if (locationId) {
    const { data } = await supabase.from('locations').select('*').eq('id', locationId).single();
    location = data as Location | null;
  }
  if (!location && toNumber) {
    const { data } = await supabase.from('locations').select('*').eq('phone_number', toNumber).single();
    location = data as Location | null;
  }
  if (!location) {
    const { data } = await supabase.from('locations').select('*').eq('id', DEMO_LOCATION_ID).single();
    location = data as Location | null;
  }
  if (!location) {
    console.error('[Retell] No location resolved and no demo location seeded — call', retellCallId);
    return;
  }

  // Create the call row up-front so the dashboard tracks it live.
  const { data: callRow } = await supabase
    .from('calls')
    .upsert(
      {
        twilio_call_sid: `retell_${retellCallId}`, // reuse existing column as the external call id
        location_id: location.id,
        org_id: location.org_id,
        from_number: fromNumber,
        to_number: toNumber || (location.phone_number ?? 'retell'),
        direction,
        status: 'in_progress',
      },
      { onConflict: 'twilio_call_sid' }
    )
    .select('id')
    .single();

  // ── Knowledge switch ──
  const kb = await getActiveKnowledgeBase(location.id);
  const kbIsEmpty = !isKnowledgeBaseUsable(kb);
  const agentName = location.ai_config?.agent_name ?? 'Alex';

  let knowledgeContext: string;
  let systemPrompt: string;

  if (kb && !kbIsEmpty) {
    // Customer KB present → act as that business's receptionist.
    knowledgeContext = buildKnowledgeContextString(kb);
    systemPrompt = direction === 'outbound'
      ? buildOutboundPrompt(agentName, location.name, context)
      : buildInboundPrompt(agentName, location.name, location.ai_config?.max_turns ?? 10);
  } else {
    // No KB yet → live BlueSlate product demo.
    knowledgeContext = BLUESLATE_KNOWLEDGE_CONTEXT;
    systemPrompt = buildBlueslateSystemPrompt(agentName);
  }

  sessions.set(retellCallId, {
    retellCallId,
    callRowId: callRow?.id ?? null,
    location,
    locationId: location.id,
    orgId: location.org_id,
    knowledgeContext,
    kbIsEmpty,
    systemPrompt,
    direction,
    fromNumber,
    leadId,
    context,
    greeted: false,
  });
}

async function respond(ws: WebSocket, retellCallId: string, msg: RetellInbound): Promise<void> {
  const session = sessions.get(retellCallId);
  const responseId = msg.response_id ?? 0;

  if (!session) {
    // call_details hasn't arrived yet — say a safe neutral greeting.
    streamReply(ws, responseId, "Hi there! Thanks for calling. How can I help you today?", false);
    return;
  }

  const transcript = msg.transcript ?? [];
  const lastUser = [...transcript].reverse().find((t) => t.role === 'user');
  const userText = lastUser?.content?.trim() ?? '';

  // First turn with no user speech yet → greeting.
  if (!session.greeted && !userText) {
    session.greeted = true;
    const greeting = session.location.ai_config?.greeting
      ?? (session.kbIsEmpty
        ? `Hi! This is ${session.location.ai_config?.agent_name ?? 'Alex'} from BlueSlate. I can tell you what BlueSlate does for your business — what would you like to know?`
        : `Hi, thanks for calling ${session.location.name}! How can I help you today?`);
    await persistTurn(session, 'assistant', greeting);
    streamReply(ws, responseId, greeting, false);
    return;
  }
  session.greeted = true;

  if (!userText) {
    streamReply(ws, responseId, "Sorry, I didn't catch that — could you say that again?", false);
    return;
  }

  // Build Gemini-style history from Retell's transcript (must start with a user turn).
  const rawHistory = transcript.slice(0, -1).map((t) => ({
    role: (t.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    parts: [{ text: t.content }],
  }));
  const firstUserIdx = rawHistory.findIndex((h) => h.role === 'user');
  const history = firstUserIdx === -1 ? [] : rawHistory.slice(firstUserIdx);

  await persistTurn(session, 'user', userText);

  // Max-turns guard → graceful hang up.
  const userTurns = transcript.filter((t) => t.role === 'user').length;
  const maxTurns = session.location.ai_config?.max_turns ?? 10;
  if (userTurns >= maxTurns) {
    const farewell = session.location.ai_config?.farewell ?? 'Thanks so much! We\'ll follow up shortly. Have a great day!';
    await persistTurn(session, 'assistant', farewell);
    streamReply(ws, responseId, farewell, true /* end_call */);
    return;
  }

  let aiText: string;
  try {
    aiText = await generateVoiceResponse({
      userMessage: userText,
      conversationHistory: history,
      systemPrompt: session.systemPrompt,
      knowledgeContext: session.knowledgeContext,
      businessName: session.kbIsEmpty ? 'BlueSlate' : session.location.name,
      kbIsEmpty: session.kbIsEmpty,
    });
  } catch (err) {
    console.error('[Retell] AI error:', err instanceof Error ? err.message : err);
    streamReply(ws, responseId, "Sorry, I had a brief technical issue. Could you repeat that?", false);
    return;
  }

  await persistTurn(session, 'assistant', aiText);

  const endPhrases = ['goodbye', 'have a great day', 'take care'];
  const shouldEnd = endPhrases.some((p) => aiText.toLowerCase().includes(p));
  streamReply(ws, responseId, aiText, shouldEnd);
}

// Stream one logical reply as a single complete chunk.
function streamReply(ws: WebSocket, responseId: number, content: string, endCall: boolean): void {
  send(ws, {
    response_type: 'response',
    response_id: responseId,
    content,
    content_complete: true,
    end_call: endCall,
  });
}

async function persistTurn(session: Session, role: 'user' | 'assistant', content: string): Promise<void> {
  if (!session.callRowId) return;
  // turn_index = current row count for this call
  const { count } = await supabase
    .from('call_turns')
    .select('id', { count: 'exact', head: true })
    .eq('call_id', session.callRowId);
  await supabase.from('call_turns').insert({
    call_id: session.callRowId,
    location_id: session.locationId,
    org_id: session.orgId,
    role,
    content,
    turn_index: count ?? 0,
  });
}

async function endSession(retellCallId: string): Promise<void> {
  const session = sessions.get(retellCallId);
  if (!session) return;
  sessions.delete(retellCallId);
  // Final call finalization + Loop C happens in the webhook (call_ended/call_analyzed),
  // which is authoritative for duration/recording. Nothing else needed here.
}

function send(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

// ── Prompt builders (mirror voice.service / outbound.service) ──
function buildInboundPrompt(agentName: string, businessName: string, maxTurns: number): string {
  return `You are ${agentName}, a warm and friendly receptionist at ${businessName}. This is a LIVE PHONE CALL.
- Genuine, enthusiastic, natural contractions ("I'm", "we've", "that's").
- Once you learn the caller's name, use it naturally.
- Ask ONE natural follow-up per response.
Goal: understand their need, then guide toward booking a free trial or a callback.
Rules: MAX 28 words per response; never robotic; never claim to be human or to transfer the call — offer to take their details instead. (Up to ${maxTurns} turns.)`;
}

function buildOutboundPrompt(agentName: string, businessName: string, context: string | null): string {
  return `You are ${agentName}, an AI representative calling on behalf of ${businessName}. You CALLED this person — be brief, polite, respectful of their time.
${context ? `Context: ${context}\n` : ''}- Keep every response under 25 words.
- If interested: offer to book a free trial or send info. If busy/not interested: be gracious, offer to call another time.
- NEVER claim you're human. If they say stop: apologize and end the call.`;
}

// ── Finalize a call (called by the Retell webhook) ──
export async function finalizeRetellCall(params: {
  retellCallId: string;
  status: string;
  durationMs?: number;
  recordingUrl?: string;
  transcript?: string;
  // Path-B (Retell-hosted) browser/phone calls never hit our WS handler, so no
  // calls row exists yet. The webhook carries enough to create one here.
  locationId?: string;
  fromNumber?: string;
  direction?: 'inbound' | 'outbound';
}): Promise<void> {
  const { retellCallId, status, durationMs, recordingUrl, transcript, locationId, fromNumber, direction } = params;
  const sid = `retell_${retellCallId}`;

  const mapped = status === 'ended' || status === 'completed' ? 'completed'
    : status === 'no-answer' ? 'no_answer'
    : status === 'error' || status === 'failed' ? 'failed'
    : 'completed';

  // Resolve the location (passed via webhook metadata, else demo location).
  let resolvedLocationId = locationId ?? null;
  let orgId: string | null = null;
  if (resolvedLocationId) {
    const { data: loc } = await supabase.from('locations').select('id, org_id').eq('id', resolvedLocationId).single();
    orgId = loc?.org_id ?? null;
    if (!loc) resolvedLocationId = null;
  }
  if (!resolvedLocationId) {
    const { data: loc } = await supabase.from('locations').select('id, org_id').eq('id', DEMO_LOCATION_ID).single();
    resolvedLocationId = loc?.id ?? null;
    orgId = loc?.org_id ?? null;
  }
  if (!resolvedLocationId || !orgId) {
    console.error(`[Retell finalize] cannot resolve location/org (locId=${resolvedLocationId}, orgId=${orgId}) — check the demo location row exists with an org_id. Skipping.`);
    return;
  }

  // Upsert the call row (create if Path-B never made one; update if it exists).
  const { data: call, error: upsertErr } = await supabase
    .from('calls')
    .upsert(
      {
        twilio_call_sid: sid,
        location_id: resolvedLocationId,
        org_id: orgId,
        from_number: fromNumber ?? 'browser',
        to_number: 'retell',
        direction: direction ?? 'inbound',
        status: mapped,
        duration_sec: durationMs ? Math.round(durationMs / 1000) : undefined,
        ended_at: new Date().toISOString(),
        recording_url: recordingUrl ?? null,
        transcript: transcript ?? undefined,
      },
      { onConflict: 'twilio_call_sid' }
    )
    .select('id, location_id, org_id, from_number')
    .single();

  if (upsertErr || !call) {
    console.error('[Retell finalize] upsert failed for', sid, '—', upsertErr?.message, '| details:', upsertErr?.details, '| hint:', upsertErr?.hint, '| code:', upsertErr?.code);
    return;
  }
  if (mapped !== 'completed') { console.log(`[Retell finalize] status=${mapped} (not completed) — waiting for completed event`); return; }

  // Build transcript from stored turns if Retell didn't supply one.
  let finalTranscript = transcript ?? '';
  if (!finalTranscript) {
    const { data: turns } = await supabase
      .from('call_turns')
      .select('role, content, turn_index')
      .eq('call_id', call.id)
      .order('turn_index', { ascending: true });
    if (turns?.length) {
      finalTranscript = turns
        .map((t: { role: string; content: string }) => `${t.role === 'user' ? 'Caller' : 'Agent'}: ${t.content}`)
        .join('\n');
      await supabase.from('calls').update({ transcript: finalTranscript }).eq('id', call.id);
    }
  }
  if (!finalTranscript) { console.log('[Retell finalize] no transcript (call_ended before call_analyzed?) — skipping extraction for', sid); return; }
  console.log(`[Retell finalize] extracting lead for ${sid}, transcript ${finalTranscript.length} chars`);

  // ── Loop C: lead extraction (reuses the same logic as Twilio flow) ──
  void (async () => {
    try {
      const [extraction, { summary, sentimentScore }] = await Promise.all([
        extractLeadFromTranscript({ transcript: finalTranscript, fromPhone: call.from_number }),
        summarizeCall(finalTranscript),
      ]);
      await supabase.from('calls').update({ summary, sentiment_score: sentimentScore }).eq('id', call.id);

      // Abandoned / no-info call: caller talked to the AI but left no contact details.
      // Notify the owner (closest real equivalent to a "missed" caller) and skip lead insert.
      const hasContact = Boolean(extraction.caller_name || extraction.email ||
        (extraction.phone && extraction.phone !== call.from_number) || call.from_number !== 'browser');
      if (!hasContact) {
        void notifyAbandonedCall({ summary, transcript: finalTranscript });
        console.log('[Retell Loop C] Abandoned/no-info call — owner notified, no lead saved.');
        return;
      }

      let score = 30;
      const outcome = extraction.call_outcome;
      if (outcome === 'booked') score = 90;
      else if (outcome === 'qualified') score = 75;
      else if (outcome === 'callback_needed') score = 65;
      else if (outcome === 'info_requested') score = 55;
      else if (outcome === 'not_interested') score = 10;
      if (extraction.timeline === 'immediate' || extraction.timeline === 'this_week') score = Math.min(score + 15, 100);
      if (extraction.caller_name) score = Math.min(score + 5, 100);
      if (extraction.email) score = Math.min(score + 5, 100);

      await supabase.from('leads').insert({
        location_id: call.location_id,
        org_id: call.org_id,
        call_id: call.id,
        name: extraction.caller_name ?? null,
        phone: extraction.phone ?? call.from_number,
        email: extraction.email ?? null,
        core_interest: extraction.core_interest ?? null,
        call_outcome: outcome ?? 'unknown',
        status: outcome === 'booked' ? 'booked' : 'new',
        score,
        score_reason: `${outcome} | timeline: ${extraction.timeline ?? 'unknown'} | confidence: ${((extraction.extraction_confidence ?? 0) * 100).toFixed(0)}%`,
        notes: extraction.next_action ?? null,
        raw_extraction: extraction,
      });
      console.log(`[Retell Loop C] ✓ Lead saved — "${extraction.caller_name ?? 'unknown'}" | ${outcome} | score ${score}`);

      // Email the owner about the new lead (no-ops if Resend isn't configured).
      void notifyNewLead({
        name: extraction.caller_name,
        phone: extraction.phone ?? call.from_number,
        email: extraction.email,
        interest: extraction.core_interest,
        outcome,
        score,
        summary,
      });
    } catch (err) {
      console.error('[Retell Loop C] failed:', err instanceof Error ? err.message : err);
    }
  })();
}
