import { Router } from 'express';
import {
  inboundCall,
  processSpeech,
  statusCallback,
  startOutboundCall,
  outboundAnswer,
  processOutbound,
} from '../controllers/voice.controller';
import { validateTwilioSignature } from '../middleware/twilioSignature';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ── Inbound (Twilio webhooks — no auth, Twilio signature validates) ──
router.post('/incoming', validateTwilioSignature, inboundCall);
router.post('/process', validateTwilioSignature, processSpeech);
router.post('/status', statusCallback);

// ── Outbound Twilio webhooks (called by Twilio after we dial) ──
router.post('/outbound-answer', outboundAnswer);
router.post('/outbound-process', processOutbound);

// ── Outbound initiation (called by dashboard — auth required) ──
router.post('/outbound', requireAuth, startOutboundCall);

export default router;
