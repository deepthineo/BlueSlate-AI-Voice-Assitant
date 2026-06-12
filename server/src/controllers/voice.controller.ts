import { Request, Response } from 'express';
import {
  handleInboundCall,
  processUserSpeech,
  handleCallStatus,
  getLocationByPhoneNumber,
  getLocationById,
} from '../services/voice.service';
import {
  initiateOutboundCall,
  handleOutboundAnswer,
  processOutboundSpeech,
} from '../services/outbound.service';

// Fallback demo location ID (seeded in schema.sql)
const DEMO_LOCATION_ID = 'b0000000-0000-0000-0000-000000000001';

// ── Twilio calls this when a call comes in ──────────────────
export async function inboundCall(req: Request, res: Response): Promise<void> {
  const { CallSid, From, To } = req.body as Record<string, string>;

  // Look up location by the Twilio number that was dialled
  let location = await getLocationByPhoneNumber(To);

  // Fall back to demo location during development
  if (!location) {
    location = await getLocationById(DEMO_LOCATION_ID);
  }

  if (!location) {
    res
      .type('text/xml')
      .send('<Response><Say>This number is not configured. Goodbye.</Say><Hangup/></Response>');
    return;
  }

  const twiml = await handleInboundCall({
    callSid: CallSid,
    from: From,
    to: To,
    location,
  });

  res.type('text/xml').send(twiml);
}

// ── Twilio sends the caller's speech here ──────────────────
export async function processSpeech(req: Request, res: Response): Promise<void> {
  const { CallSid, SpeechResult, To } = req.body as Record<string, string>;

  let location = await getLocationByPhoneNumber(To);
  if (!location) location = await getLocationById(DEMO_LOCATION_ID);

  if (!location) {
    res
      .type('text/xml')
      .send('<Response><Say>Configuration error. Goodbye.</Say><Hangup/></Response>');
    return;
  }

  const twiml = await processUserSpeech({
    callSid: CallSid,
    speechResult: SpeechResult ?? '',
    location,
  });

  res.type('text/xml').send(twiml);
}

// ── Dashboard: initiate an outbound call to a lead ─────────
export async function startOutboundCall(req: Request, res: Response): Promise<void> {
  const { toPhone, locationId, orgId, leadId, context } = req.body as Record<string, string>;

  if (!toPhone || !locationId) {
    res.status(400).json({ error: 'toPhone and locationId are required' });
    return;
  }

  try {
    const result = await initiateOutboundCall({
      toPhone,
      locationId,
      orgId: orgId ?? (req.tenant?.orgId ?? ''),
      leadId,
      context,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to initiate call';
    res.status(500).json({ error: msg });
  }
}

// ── Twilio calls this when outbound call is answered ────────
export async function outboundAnswer(req: Request, res: Response): Promise<void> {
  const { CallSid, CallStatus, AnsweredBy } = req.body as Record<string, string>;
  const { locationId, leadId, context } = req.query as Record<string, string>;

  const twiml = await handleOutboundAnswer({
    callSid: CallSid,
    callStatus: CallStatus,
    answeredBy: AnsweredBy,
    locationId,
    leadId,
    context,
  });

  res.type('text/xml').send(twiml);
}

// ── Twilio calls this with outbound prospect's speech ───────
export async function processOutbound(req: Request, res: Response): Promise<void> {
  const { CallSid, SpeechResult } = req.body as Record<string, string>;
  const { locationId, leadId } = req.query as Record<string, string>;

  const twiml = await processOutboundSpeech({
    callSid: CallSid,
    speechResult: SpeechResult ?? '',
    locationId,
    leadId,
  });

  res.type('text/xml').send(twiml);
}

// ── Twilio calls this when the call ends (status callback) ──
// This triggers Loop C (lead extraction).
export async function statusCallback(req: Request, res: Response): Promise<void> {
  const { CallSid, CallStatus, CallDuration, RecordingUrl } =
    req.body as Record<string, string>;

  // Respond immediately — Loop C runs async in background
  res.status(204).send();

  await handleCallStatus({
    callSid: CallSid,
    callStatus: CallStatus,
    callDuration: CallDuration,
    recordingUrl: RecordingUrl,
  });
}
