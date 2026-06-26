import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { createOutboundCall, createWebCall } from '../services/retellOutbound.service';
import { finalizeRetellCall } from '../services/retell.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

const DEMO_LOCATION_ID = 'b0000000-0000-0000-0000-000000000001';

// ── Browser "Talk to AI" — public, no auth/signup ──
// Returns a short-lived access token the Retell web SDK uses to join the call.
const webCallLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many calls — please wait a few minutes.' },
});

router.post('/web-call', webCallLimiter, async (req: Request, res: Response) => {
  const { locationId, callerName, agentId } = req.body as { locationId?: string; callerName?: string; agentId?: string };
  try {
    const { accessToken, callId } = await createWebCall({
      locationId: locationId || DEMO_LOCATION_ID,
      callerName,
      agentId,
    });
    res.json({ accessToken, callId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not start the call';
    console.error('[Retell web-call] error:', msg);
    res.status(503).json({ error: 'Voice assistant is not available right now.' });
  }
});

// ── Outbound — dashboard dials a lead (auth required) ──
router.post('/outbound', requireAuth, async (req: Request, res: Response) => {
  const { toPhone, locationId, orgId, leadId, context } = req.body as Record<string, string>;
  if (!toPhone || !locationId) {
    res.status(400).json({ error: 'toPhone and locationId are required' });
    return;
  }
  try {
    const result = await createOutboundCall({
      toPhone,
      locationId,
      orgId: orgId ?? (req.tenant?.orgId ?? ''),
      leadId,
      context,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to initiate call';
    console.error('[Retell outbound] error:', msg);
    res.status(500).json({ error: msg });
  }
});

// ── Webhook — Retell posts call lifecycle events ──
// We finalize the call record + run Loop C on call_ended / call_analyzed.
// Signature verification is best-effort: if the retell-sdk verify is available
// and a signing secret is configured it's used; otherwise we accept (this only
// finalizes records, never exposes data). See RETELL_SETUP.md.
router.post('/webhook', async (req: Request, res: Response) => {
  // Acknowledge fast — processing is async.
  res.status(204).send();

  const body = req.body as {
    event?: string;
    call?: {
      call_id?: string;
      call_status?: string;
      duration_ms?: number;
      end_timestamp?: number;
      start_timestamp?: number;
      recording_url?: string;
      transcript?: string;
      direction?: 'inbound' | 'outbound';
      from_number?: string;
      metadata?: Record<string, string>;
      retell_llm_dynamic_variables?: Record<string, string>;
    };
  };

  const event = body.event;
  const call = body.call;
  if (!call?.call_id) return;
  if (event !== 'call_ended' && event !== 'call_analyzed') return;

  const durationMs =
    call.duration_ms ??
    (call.end_timestamp && call.start_timestamp ? call.end_timestamp - call.start_timestamp : undefined);

  const locationId = call.metadata?.locationId || call.retell_llm_dynamic_variables?.locationId;

  try {
    await finalizeRetellCall({
      retellCallId: call.call_id,
      status: call.call_status ?? 'ended',
      durationMs,
      recordingUrl: call.recording_url,
      transcript: call.transcript,
      locationId,
      fromNumber: call.from_number,
      direction: call.direction,
    });
  } catch (err) {
    console.error('[Retell webhook] finalize error:', err instanceof Error ? err.message : err);
  }
});

export default router;
