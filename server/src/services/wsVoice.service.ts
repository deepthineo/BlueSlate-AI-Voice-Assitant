/**
 * Browser-based WebSocket voice (demo / India-friendly mode).
 * No phone number required — uses browser speech recognition + TTS.
 */
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import { supabase } from '../config/supabase';
import { generateVoiceResponse, extractLeadFromTranscript, summarizeCall } from './ai.service';
import { getActiveKnowledgeBase, buildKnowledgeContextString } from './knowledge.service';
import type { Location } from '../types';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  callId: string;
  locationId: string;
  orgId: string;
  location: Location;
  turns: Turn[];
  knowledgeContext: string;
  callerName: string | null;
}

const sessions = new Map<string, Session>();

export function attachVoiceWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws/voice' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, 'http://localhost');
    const locationId = url.searchParams.get('locationId');
    const sessionId = url.searchParams.get('sessionId') ?? crypto.randomUUID();
    const callerName = url.searchParams.get('callerName') ?? null;

    if (!locationId) {
      ws.send(JSON.stringify({ type: 'error', message: 'locationId required' }));
      ws.close();
      return;
    }

    ws.on('message', (data: Buffer) => {
      void 0; // callerName captured in closure below
      handleMessage(sessionId, ws, data.toString()).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[WS] handleMessage error:', msg);
        // Don't kill the session — send a recoverable fallback
        send(ws, { type: 'ai_response', text: "Sorry, I had a brief technical issue. Could you repeat that?", final: false });
      });
    });
    ws.on('close', () => { endSession(sessionId).catch(console.error); });
    ws.on('error', (e) => console.error('[WS]', e.message));

    initSession(sessionId, locationId, ws, callerName).catch((err) => {
      console.error('[WS] initSession error:', err.message);
      ws.close();
    });
  });
}

async function initSession(sessionId: string, locationId: string, ws: WebSocket, callerName: string | null = null): Promise<void> {
  const { data: loc } = await supabase.from('locations').select('*').eq('id', locationId).single();
  if (!loc) { ws.close(); return; }

  const location = loc as Location;

  const { data: call } = await supabase
    .from('calls')
    .insert({
      location_id: location.id,
      org_id: location.org_id,
      twilio_call_sid: `ws_${sessionId}`,
      from_number: 'browser',
      to_number: 'web',
      direction: 'inbound',
      status: 'in_progress',
    })
    .select('id')
    .single();

  const kb = await getActiveKnowledgeBase(location.id);
  const knowledgeContext = kb
    ? buildKnowledgeContextString(kb)
    : `Business: ${location.name}`;

  const session: Session = {
    callId: call?.id ?? sessionId,
    locationId: location.id,
    orgId: location.org_id,
    location,
    turns: [],
    knowledgeContext,
    callerName,
  };
  sessions.set(sessionId, session);

  const greeting = location.ai_config?.greeting ?? `Hi! Thanks for calling ${location.name}. How can I help?`;

  // Store greeting as assistant turn (NOT included in Gemini history — see buildHistory)
  session.turns.push({ role: 'assistant', content: greeting });

  await supabase.from('call_turns').insert({
    call_id: session.callId,
    location_id: location.id,
    org_id: location.org_id,
    role: 'assistant',
    content: greeting,
    turn_index: 0,
  });

  send(ws, { type: 'ready', sessionId, greeting, agentName: location.ai_config?.agent_name ?? 'Alex' });
}

async function handleMessage(sessionId: string, ws: WebSocket, raw: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  let msg: { type: string; text?: string };
  try { msg = JSON.parse(raw); } catch { return; }

  if (msg.type === 'end_call') { await endSession(sessionId); return; }
  if (msg.type !== 'user_speech' || !msg.text?.trim()) return;

  const { location, turns, knowledgeContext, callId } = session;
  const userText = msg.text.trim();

  turns.push({ role: 'user', content: userText });
  await supabase.from('call_turns').insert({
    call_id: callId,
    location_id: session.locationId,
    org_id: session.orgId,
    role: 'user',
    content: userText,
    turn_index: turns.length - 1,
  });

  const userCount = turns.filter((t) => t.role === 'user').length;
  if (userCount >= (location.ai_config?.max_turns ?? 10)) {
    const farewell = location.ai_config?.farewell ?? 'Thanks! Have a great day!';
    send(ws, { type: 'ai_response', text: farewell, final: true });
    await endSession(sessionId);
    return;
  }

  send(ws, { type: 'thinking' });

  // Build Gemini-compatible history.
  // Gemini REQUIRES history to start with role 'user' — never 'model'.
  // On the first user turn, rawHistory only has the greeting (model), so pass [].
  const rawHistory = turns.slice(0, -1).map((t) => ({
    role: (t.role === 'user' ? 'user' : 'model') as 'user' | 'model',
    parts: [{ text: t.content }],
  }));
  const firstUserIdx = rawHistory.findIndex((h) => h.role === 'user');
  const history = firstUserIdx === -1 ? [] : rawHistory.slice(firstUserIdx);

  const aiText = await generateVoiceResponse({
    userMessage: userText,
    conversationHistory: history,
    systemPrompt: `You are ${location.ai_config?.agent_name ?? 'Alex'} for ${location.name}. Keep responses under 30 words. Drive toward booking a free trial.`,
    knowledgeContext,
  });

  turns.push({ role: 'assistant', content: aiText });
  await supabase.from('call_turns').insert({
    call_id: callId,
    location_id: session.locationId,
    org_id: session.orgId,
    role: 'assistant',
    content: aiText,
    turn_index: turns.length - 1,
  });

  send(ws, { type: 'ai_response', text: aiText, final: false });
}

async function endSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);

  const { turns, callId, locationId, orgId, callerName: sessionCallerName } = session;

  // Need at least 1 user turn to extract a lead
  const userTurns = turns.filter((t) => t.role === 'user');
  if (userTurns.length === 0) {
    await supabase.from('calls')
      .update({ status: 'no_answer', ended_at: new Date().toISOString() })
      .eq('id', callId);
    return;
  }

  const transcript = turns
    .map((t) => `${t.role === 'user' ? 'Caller' : 'Agent'}: ${t.content}`)
    .join('\n');

  await supabase.from('calls').update({
    status: 'completed',
    transcript,
    ended_at: new Date().toISOString(),
    duration_sec: turns.length * 8,
  }).eq('id', callId);

  console.log(`[WS] Call ended — ${userTurns.length} user turns. Extracting lead...`);

  // Loop C: async lead extraction — fire and forget, always completes within 60s
  void (async () => {
    try {
      const [extraction, { summary, sentimentScore }] = await Promise.all([
        extractLeadFromTranscript({ transcript, fromPhone: 'browser' }),
        summarizeCall(transcript),
      ]);

      await supabase.from('calls')
        .update({ summary, sentiment_score: sentimentScore })
        .eq('id', callId);

      let score = 30;
      if (extraction.call_outcome === 'booked') score = 90;
      else if (extraction.call_outcome === 'qualified') score = 75;
      else if (extraction.call_outcome === 'callback_needed') score = 65;
      else if (extraction.call_outcome === 'info_requested') score = 55;
      else if (extraction.call_outcome === 'not_interested') score = 10;
      if (extraction.caller_name) score = Math.min(score + 5, 100);

      await supabase.from('leads').insert({
        location_id: locationId,
        org_id: orgId,
        call_id: callId,
        name: sessionCallerName ?? extraction.caller_name ?? null,
        phone: extraction.phone ?? 'browser',
        email: extraction.email ?? null,
        core_interest: extraction.core_interest ?? null,
        call_outcome: extraction.call_outcome ?? 'unknown',
        status: extraction.call_outcome === 'booked' ? 'booked' : 'new',
        score,
        score_reason: `${extraction.call_outcome} | ${extraction.timeline ?? 'unknown'}`,
        notes: extraction.next_action ?? null,
        raw_extraction: extraction,
      });

      console.log(`[Loop C] ✓ Lead saved: "${extraction.caller_name ?? 'Unknown'}" | ${extraction.call_outcome} | score ${score}`);
    } catch (err) {
      console.error('[Loop C] Lead extraction failed:', err instanceof Error ? err.message : err);
    }
  })();
}

function send(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
