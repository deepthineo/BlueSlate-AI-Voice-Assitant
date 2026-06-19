import twilio from 'twilio';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { generateVoiceResponse } from './ai.service';
import { getActiveKnowledgeBase, buildKnowledgeContextString, isKnowledgeBaseUsable } from './knowledge.service';
import { getLocationById } from './voice.service';
import type { Location } from '../types';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ─────────────────────────────────────────────────────────────
// OUTBOUND — Initiate a call from dashboard to a lead
// ─────────────────────────────────────────────────────────────
export async function initiateOutboundCall(params: {
  toPhone: string;
  locationId: string;
  orgId: string;
  leadId?: string;
  context?: string;
}): Promise<{ callSid: string; status: string }> {
  const { toPhone, locationId, orgId, leadId, context } = params;

  const location = await getLocationById(locationId);
  if (!location) throw new Error('Location not found');
  if (!location.phone_number) throw new Error('Location has no Twilio number configured');

  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

  // Build callback URL — includes lead context so AI knows who it's calling
  const callbackUrl = new URL(`${env.SERVER_URL}/api/voice/outbound-answer`);
  callbackUrl.searchParams.set('locationId', locationId);
  if (leadId) callbackUrl.searchParams.set('leadId', leadId);
  if (context) callbackUrl.searchParams.set('context', context.substring(0, 200));

  const statusCallbackUrl = new URL(`${env.SERVER_URL}/api/voice/status`);

  const call = await client.calls.create({
    to: toPhone,
    from: location.phone_number,
    url: callbackUrl.toString(),
    method: 'POST',
    statusCallback: statusCallbackUrl.toString(),
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
    machineDetection: 'DetectMessageEnd',
  });

  // Create call record immediately so we can track it in the dashboard
  await supabase.from('calls').insert({
    twilio_call_sid: call.sid,
    location_id: locationId,
    org_id: orgId,
    from_number: location.phone_number,
    to_number: toPhone,
    direction: 'outbound',
    status: 'in_progress',
  });

  return { callSid: call.sid, status: call.status };
}

// ─────────────────────────────────────────────────────────────
// OUTBOUND — When prospect answers, AI speaks first
// ─────────────────────────────────────────────────────────────
export async function handleOutboundAnswer(params: {
  callSid: string;
  callStatus: string;
  answeredBy?: string;
  locationId: string;
  leadId?: string;
  context?: string;
}): Promise<string> {
  const { callSid, callStatus, answeredBy, locationId, leadId, context } = params;
  const twiml = new VoiceResponse();

  // If answered by machine/voicemail — leave a short message and hang up
  if (answeredBy && (answeredBy === 'machine_start' || answeredBy === 'fax')) {
    twiml.say(
      { voice: 'Polly.Joanna-Neural' },
      "Hi, this is a message from your local franchise. We wanted to follow up on your recent inquiry. Please call us back at your convenience. Thank you!"
    );
    twiml.hangup();
    return twiml.toString();
  }

  const location = await getLocationById(locationId);
  if (!location) {
    twiml.say({ voice: 'Polly.Joanna-Neural' }, "Sorry, there was a configuration error. Goodbye.");
    twiml.hangup();
    return twiml.toString();
  }

  // Fetch lead context if available
  let leadContext = context ?? '';
  if (leadId) {
    const { data: lead } = await supabase.from('leads').select('name, core_interest, call_outcome').eq('id', leadId).single();
    if (lead) {
      leadContext = `Calling ${lead.name ?? 'a prospect'} who previously showed interest in: ${lead.core_interest ?? 'our services'}. Prior outcome: ${lead.call_outcome ?? 'unknown'}.`;
    }
  }

  // Build opening message for outbound call
  const openingMessage = leadContext.includes('Calling')
    ? `Hi! This is ${location.ai_config.agent_name} calling from ${location.name}. I'm following up on your recent inquiry. Is now a good time to chat for just a minute?`
    : `Hi! This is ${location.ai_config.agent_name} from ${location.name}. We wanted to reach out — is this a good time to chat quickly?`;

  // Store the AI's opening turn
  const { data: call } = await supabase
    .from('calls')
    .select('id')
    .eq('twilio_call_sid', callSid)
    .single();

  if (call) {
    await supabase.from('call_turns').insert({
      call_id: call.id,
      location_id: locationId,
      org_id: location.org_id,
      role: 'assistant',
      content: openingMessage,
      turn_index: 0,
    });
  }

  // Speak opening and gather response
  const gather = twiml.gather({
    input: ['speech'],
    action: `${env.SERVER_URL}/api/voice/outbound-process?locationId=${locationId}${leadId ? `&leadId=${leadId}` : ''}`,
    method: 'POST',
    speechTimeout: 'auto',
    speechModel: 'experimental_conversations',
    enhanced: true,
    language: 'en-US',
    timeout: 8,
    actionOnEmptyResult: true,
  });

  gather.say({ voice: 'Polly.Joanna-Neural', language: 'en-US' }, openingMessage);

  // Fallback: if no response
  twiml.say({ voice: 'Polly.Joanna-Neural' }, "I didn't catch a response. I'll try reaching you again another time. Have a great day!");
  twiml.hangup();

  return twiml.toString();
}

// ─────────────────────────────────────────────────────────────
// OUTBOUND — Process prospect's speech response
// Same as inbound but with outbound-specific system prompt
// ─────────────────────────────────────────────────────────────
export async function processOutboundSpeech(params: {
  callSid: string;
  speechResult: string;
  locationId: string;
  leadId?: string;
}): Promise<string> {
  const { callSid, speechResult, locationId, leadId } = params;
  const twiml = new VoiceResponse();

  const location = await getLocationById(locationId);
  if (!location) {
    twiml.say({ voice: 'Polly.Joanna-Neural' }, "Sorry, there was an error. Goodbye.");
    twiml.hangup();
    return twiml.toString();
  }

  if (!speechResult?.trim()) {
    const gather = twiml.gather({
      input: ['speech'],
      action: `${env.SERVER_URL}/api/voice/outbound-process?locationId=${locationId}${leadId ? `&leadId=${leadId}` : ''}`,
      method: 'POST',
      speechTimeout: 'auto',
      speechModel: 'experimental_conversations',
      enhanced: true,
      timeout: 5,
    });
    gather.say({ voice: 'Polly.Joanna-Neural' }, "Sorry, I didn't catch that. Are you still there?");
    return twiml.toString();
  }

  try {
    const { data: call } = await supabase
      .from('calls')
      .select('id')
      .eq('twilio_call_sid', callSid)
      .single();

    if (!call) throw new Error('Call not found');

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
      location_id: locationId,
      org_id: location.org_id,
      role: 'user',
      content: speechResult.trim(),
      turn_index: nextIndex,
    });

    // Get conversation history
    const { data: allTurns } = await supabase
      .from('call_turns')
      .select('role, content')
      .eq('call_id', call.id)
      .order('turn_index', { ascending: true })
      .limit(20);

    const rawHistory = (allTurns ?? [])
      .slice(0, -1)
      .map((t: { role: string; content: string }) => ({
        role: (t.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: t.content }],
      }));
    const firstUserIdx = rawHistory.findIndex((h) => h.role === 'user');
    const history = firstUserIdx === -1 ? [] : rawHistory.slice(firstUserIdx);

    const userTurnCount = Math.ceil((nextIndex + 1) / 2);

    // Hang up gracefully after max turns
    if (userTurnCount >= location.ai_config.max_turns) {
      const farewell = `Thanks so much for chatting! We'll follow up with all the details shortly. Have a great day!`;
      await supabase.from('call_turns').insert({
        call_id: call.id,
        location_id: locationId,
        org_id: location.org_id,
        role: 'assistant',
        content: farewell,
        turn_index: nextIndex + 1,
      });
      twiml.say({ voice: 'Polly.Joanna-Neural' }, farewell);
      twiml.hangup();
      return twiml.toString();
    }

    // Load KB
    const kb = await getActiveKnowledgeBase(locationId);
    const kbIsEmpty = !isKnowledgeBaseUsable(kb);
    const knowledgeContext = kb && !kbIsEmpty
      ? buildKnowledgeContextString(kb)
      : `Business name: ${location.name}. (No detailed knowledge base configured yet.)`;

    // Outbound system prompt — different tone from inbound
    const systemPrompt = `You are ${location.ai_config.agent_name}, an AI representative calling on behalf of ${location.name}.
You CALLED this person — so be brief, polite, and respectful of their time. Rules:
- Keep every response under 25 words
- You called THEM — so be upbeat but not pushy
- If they seem interested: quickly offer to book a free trial or send info
- If they're not interested or busy: be gracious, thank them, offer to call another time
- Goal: book a trial OR get their email to send info

BUSINESS KNOWLEDGE:
${knowledgeContext}

RULES:
- NEVER claim you're a human — you're an AI assistant
- Keep responses SHORT (under 25 words)
- Respect their time — they didn't call you
- If they say stop/not interested: apologize gracefully and hang up`;

    const aiResponse = await generateVoiceResponse({
      userMessage: speechResult.trim(),
      conversationHistory: history,
      systemPrompt,
      knowledgeContext,
      businessName: location.name,
      kbIsEmpty,
    });

    await supabase.from('call_turns').insert({
      call_id: call.id,
      location_id: locationId,
      org_id: location.org_id,
      role: 'assistant',
      content: aiResponse,
      turn_index: nextIndex + 1,
    });

    // Check for conversation-ending phrases
    const endPhrases = ['goodbye', 'goodbye!', 'have a great day', 'take care', 'not interested'];
    const shouldHangUp = endPhrases.some((p) => aiResponse.toLowerCase().includes(p));

    if (shouldHangUp) {
      twiml.say({ voice: 'Polly.Joanna-Neural', language: 'en-US' }, aiResponse);
      twiml.hangup();
    } else {
      const gather = twiml.gather({
        input: ['speech'],
        action: `${env.SERVER_URL}/api/voice/outbound-process?locationId=${locationId}${leadId ? `&leadId=${leadId}` : ''}`,
        method: 'POST',
        speechTimeout: 'auto',
        speechModel: 'experimental_conversations',
        enhanced: true,
        language: 'en-US',
        timeout: 6,
      });
      gather.say({ voice: 'Polly.Joanna-Neural', language: 'en-US' }, aiResponse);
      twiml.say({ voice: 'Polly.Joanna-Neural' }, "Thanks for your time! Have a great day!");
      twiml.hangup();
    }

    return twiml.toString();
  } catch (err) {
    console.error('[Outbound] Error:', err);
    twiml.say({ voice: 'Polly.Joanna-Neural' }, "Sorry, I had a technical issue. I'll try again later. Goodbye!");
    twiml.hangup();
    return twiml.toString();
  }
}
