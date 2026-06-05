import twilio from 'twilio';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { generateVoiceResponse, extractLeadFromTranscript, summarizeCall } from './gemini.service';
import { getActiveKnowledgeBase, buildKnowledgeContextString } from './knowledge.service';
import type { Location } from '../types';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ─────────────────────────────────────────────────────────────
// LOOP B — Step 1
// Twilio calls POST /api/voice/incoming when phone is dialled.
// We greet the caller and open a Gather (speech input) loop.
// ─────────────────────────────────────────────────────────────
export async function handleInboundCall(params: {
  callSid: string;
  from: string;
  to: string;
  location: Location;
}): Promise<string> {
  const { callSid, from, to, location } = params;

  // Create call record in DB
  await supabase.from('calls').upsert(
    {
      twilio_call_sid: callSid,
      location_id: location.id,
      org_id: location.org_id,
      from_number: from,
      to_number: to,
      direction: 'inbound',
      status: 'in_progress',
    },
    { onConflict: 'twilio_call_sid' }
  );

  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    input: ['speech'],
    action: `${env.SERVER_URL}/api/voice/process`,
    method: 'POST',
    speechTimeout: 'auto',
    speechModel: 'experimental_conversations',
    enhanced: true,
    language: 'en-US',
    timeout: 5,
    actionOnEmptyResult: true,
  });

  gather.say({ voice: 'Polly.Joanna-Neural', language: 'en-US' }, location.ai_config.greeting);

  // If caller says nothing after greeting, re-prompt once
  twiml.say({ voice: 'Polly.Joanna-Neural' }, "I didn't catch that. Could you repeat that?");
  twiml.redirect({ method: 'POST' }, `${env.SERVER_URL}/api/voice/incoming`);

  return twiml.toString();
}

// ─────────────────────────────────────────────────────────────
// LOOP B — Step 2
// Twilio sends the caller's speech transcript here.
// We ask Gemini (with knowledge base context) and reply.
// ─────────────────────────────────────────────────────────────
export async function processUserSpeech(params: {
  callSid: string;
  speechResult: string;
  location: Location;
}): Promise<string> {
  const { callSid, speechResult, location } = params;
  const twiml = new VoiceResponse();

  if (!speechResult?.trim()) {
    // Empty speech — re-prompt
    const gather = twiml.gather({
      input: ['speech'],
      action: `${env.SERVER_URL}/api/voice/process`,
      method: 'POST',
      speechTimeout: 'auto',
      speechModel: 'experimental_conversations',
      enhanced: true,
      timeout: 5,
    });
    gather.say({ voice: 'Polly.Joanna-Neural' }, "Sorry, I didn't catch that. How can I help you?");
    return twiml.toString();
  }

  try {
    // Fetch call record
    const { data: call } = await supabase
      .from('calls')
      .select('id')
      .eq('twilio_call_sid', callSid)
      .single();

    if (!call) throw new Error('Call record not found');

    // Get current turn count
    const { data: existingTurns } = await supabase
      .from('call_turns')
      .select('turn_index')
      .eq('call_id', call.id)
      .order('turn_index', { ascending: false })
      .limit(1);

    const nextIndex = (existingTurns?.[0]?.turn_index ?? -1) + 1;

    // Store user turn
    await supabase.from('call_turns').insert({
      call_id: call.id,
      location_id: location.id,
      org_id: location.org_id,
      role: 'user',
      content: speechResult.trim(),
      turn_index: nextIndex,
    });

    // Get conversation history for context
    const { data: allTurns } = await supabase
      .from('call_turns')
      .select('role, content')
      .eq('call_id', call.id)
      .order('turn_index', { ascending: true })
      .limit(20);

    // Gemini requires history to start with role 'user' — strip leading assistant turns
    const rawHistory = (allTurns ?? [])
      .slice(0, -1)
      .map((t: { role: string; content: string }) => ({
        role: (t.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: t.content }],
      }));
    const firstUserIdx = rawHistory.findIndex((h) => h.role === 'user');
    const history = firstUserIdx === -1 ? [] : rawHistory.slice(firstUserIdx);

    // Enforce max turns — say goodbye and hang up
    const userTurnCount = Math.ceil((nextIndex + 1) / 2);
    if (userTurnCount >= location.ai_config.max_turns) {
      await supabase.from('call_turns').insert({
        call_id: call.id,
        location_id: location.id,
        org_id: location.org_id,
        role: 'assistant',
        content: location.ai_config.farewell,
        turn_index: nextIndex + 1,
      });
      twiml.say({ voice: 'Polly.Joanna-Neural' }, location.ai_config.farewell);
      twiml.hangup();
      return twiml.toString();
    }

    // Load knowledge base context
    const kb = await getActiveKnowledgeBase(location.id);
    const knowledgeContext = kb
      ? buildKnowledgeContextString(kb)
      : `Business: ${location.name}. Knowledge base not loaded yet.`;

    // Build system prompt
    const systemPrompt = `You are ${location.ai_config.agent_name}, the AI phone receptionist for ${location.name}.
You are on a LIVE PHONE CALL. Rules:
- Keep every response under 30 words
- Sound natural and conversational, like a real person
- Always move the conversation toward: booking a free trial OR getting the caller's name and number
- If asked something not in your knowledge base: "Great question — let me have our team follow up with you on that."
- Turn ${userTurnCount} of max ${location.ai_config.max_turns}`;

    // Get AI response from Gemini
    const aiResponse = await generateVoiceResponse({
      userMessage: speechResult.trim(),
      conversationHistory: history,
      systemPrompt,
      knowledgeContext,
    });

    // Store assistant turn
    await supabase.from('call_turns').insert({
      call_id: call.id,
      location_id: location.id,
      org_id: location.org_id,
      role: 'assistant',
      content: aiResponse,
      turn_index: nextIndex + 1,
    });

    // Return TwiML: speak response and gather next input
    const gather = twiml.gather({
      input: ['speech'],
      action: `${env.SERVER_URL}/api/voice/process`,
      method: 'POST',
      speechTimeout: 'auto',
      speechModel: 'experimental_conversations',
      enhanced: true,
      language: 'en-US',
      timeout: 6,
    });

    gather.say({ voice: 'Polly.Joanna-Neural', language: 'en-US' }, aiResponse);

    // Fallback if caller goes silent after AI speaks
    twiml.say({ voice: 'Polly.Joanna-Neural' }, location.ai_config.farewell);
    twiml.hangup();

    return twiml.toString();
  } catch (err) {
    console.error('[Voice] Error:', err);
    twiml.say(
      { voice: 'Polly.Joanna-Neural' },
      "I'm sorry, I'm having a brief technical issue. Please call us back or we'll reach out to you shortly. Goodbye!"
    );
    twiml.hangup();
    return twiml.toString();
  }
}

// ─────────────────────────────────────────────────────────────
// LOOP B — Step 3 / LOOP C — Trigger
// Twilio POSTs here when call ends.
// We update the call record and trigger async lead extraction.
// ─────────────────────────────────────────────────────────────
export async function handleCallStatus(params: {
  callSid: string;
  callStatus: string;
  callDuration: string;
  recordingUrl?: string;
}): Promise<void> {
  const { callSid, callStatus, callDuration, recordingUrl } = params;

  const terminalStatuses = ['completed', 'failed', 'busy', 'no-answer', 'canceled'];
  if (!terminalStatuses.includes(callStatus)) return;

  const mappedStatus =
    callStatus === 'completed' ? 'completed'
    : callStatus === 'no-answer' ? 'no_answer'
    : 'failed';

  const { data: call } = await supabase
    .from('calls')
    .update({
      status: mappedStatus,
      duration_sec: parseInt(callDuration ?? '0', 10),
      ended_at: new Date().toISOString(),
      recording_url: recordingUrl ?? null,
    })
    .eq('twilio_call_sid', callSid)
    .select('id, location_id, org_id, from_number')
    .single();

  if (!call || callStatus !== 'completed') return;

  // Build transcript from stored turns
  const { data: turns } = await supabase
    .from('call_turns')
    .select('role, content, turn_index')
    .eq('call_id', call.id)
    .order('turn_index', { ascending: true });

  if (!turns || turns.length === 0) return;

  const transcript = turns
    .map((t: { role: string; content: string }) =>
      `${t.role === 'user' ? 'Caller' : 'Agent'}: ${t.content}`
    )
    .join('\n');

  await supabase.from('calls').update({ transcript }).eq('id', call.id);

  // ── LOOP C: extract lead within 60 seconds ────────────────
  void extractLeadAsync({
    callId: call.id,
    locationId: call.location_id,
    orgId: call.org_id,
    fromPhone: call.from_number,
    transcript,
  });
}

// ─────────────────────────────────────────────────────────────
// LOOP C — Async lead extraction
// Fires immediately after call ends, resolves in ~10-20 seconds.
// Guaranteed within 60 seconds per the product spec.
// ─────────────────────────────────────────────────────────────
async function extractLeadAsync(params: {
  callId: string;
  locationId: string;
  orgId: string;
  fromPhone: string;
  transcript: string;
}): Promise<void> {
  const { callId, locationId, orgId, fromPhone, transcript } = params;

  try {
    const [extraction, { summary, sentimentScore }] = await Promise.all([
      extractLeadFromTranscript({ transcript, fromPhone }),
      summarizeCall(transcript),
    ]);

    // Update call with AI summary
    await supabase
      .from('calls')
      .update({ summary, sentiment_score: sentimentScore })
      .eq('id', callId);

    // Score the lead
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

    // Commit lead to tenant partition
    await supabase.from('leads').insert({
      location_id: locationId,
      org_id: orgId,
      call_id: callId,
      name: extraction.caller_name ?? null,
      phone: extraction.phone ?? fromPhone,
      email: extraction.email ?? null,
      core_interest: extraction.core_interest ?? null,
      call_outcome: outcome ?? 'unknown',
      status: outcome === 'booked' ? 'booked' : 'new',
      score,
      score_reason: `${outcome} | timeline: ${extraction.timeline ?? 'unknown'} | confidence: ${((extraction.extraction_confidence ?? 0) * 100).toFixed(0)}%`,
      notes: extraction.next_action ?? null,
      raw_extraction: extraction,
    });

    console.log(
      `[Loop C] ✓ Lead saved — name: "${extraction.caller_name ?? 'unknown'}" | outcome: ${outcome} | score: ${score}`
    );
  } catch (err) {
    console.error('[Loop C] Lead extraction failed:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
export async function getLocationByPhoneNumber(phoneNumber: string): Promise<Location | null> {
  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  return data as Location | null;
}

export async function getLocationById(locationId: string): Promise<Location | null> {
  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single();
  return data as Location | null;
}
