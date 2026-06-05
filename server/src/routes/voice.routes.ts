import { Router } from 'express';
import { inboundCall, processSpeech, statusCallback } from '../controllers/voice.controller';
import { validateTwilioSignature } from '../middleware/twilioSignature';

const router = Router();

// Twilio sends URL-encoded POST bodies, not JSON
// Signature validation is skipped in development (no live signature from ngrok)
router.post('/incoming', validateTwilioSignature, inboundCall);
router.post('/process', validateTwilioSignature, processSpeech);
router.post('/status', statusCallback);   // status callbacks don't carry a signature

export default router;
