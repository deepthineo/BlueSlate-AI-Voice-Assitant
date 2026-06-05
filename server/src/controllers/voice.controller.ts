import { Request, Response } from 'express';
import {
  handleInboundCall,
  processUserSpeech,
  handleCallStatus,
  getLocationByPhoneNumber,
  getLocationById,
} from '../services/voice.service';

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
