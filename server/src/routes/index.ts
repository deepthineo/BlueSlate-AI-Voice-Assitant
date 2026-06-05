import { Router } from 'express';
import voiceRoutes from './voice.routes';
import knowledgeRoutes from './knowledge.routes';
import leadsRoutes from './leads.routes';
import callsRoutes from './calls.routes';
import locationsRoutes from './locations.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'blueslate-api' });
});

// DB diagnostic — no auth required, safe to call from browser
router.get('/health/db', async (_req, res) => {
  const { supabase } = await import('../config/supabase');
  const { data, error } = await supabase.from('locations').select('id, name').limit(1);
  if (error) {
    console.error('[DB Health] Supabase error:', error);
    res.status(500).json({ ok: false, error: error.message, hint: error.hint, code: error.code });
    return;
  }
  res.json({ ok: true, rowCount: data?.length ?? 0, sample: data });
});

// Voice webhooks (no auth — Twilio signature validates)
router.use('/voice', voiceRoutes);

// Authenticated API routes
router.use('/locations', locationsRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/leads', leadsRoutes);
router.use('/calls', callsRoutes);

export default router;
