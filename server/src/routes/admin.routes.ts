import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/overview', requireAuth, async (_req, res) => {
  try {
    const { supabase } = await import('../config/supabase');

    const { data: locations, error: locErr } = await supabase
      .from('locations')
      .select('id, name, org_id, created_at, phone_number, website_url, ai_config')
      .order('created_at', { ascending: false });

    if (locErr) throw locErr;

    const { data: calls, error: callsErr } = await supabase
      .from('calls')
      .select('location_id');
    if (callsErr) throw callsErr;

    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('location_id');
    if (leadsErr) throw leadsErr;

    const { data: kbs, error: kbsErr } = await supabase
      .from('knowledge_bases')
      .select('location_id');
    if (kbsErr) throw kbsErr;

    const callCounts: Record<string, number> = {};
    const leadCounts: Record<string, number> = {};
    const kbCounts: Record<string, number> = {};

    for (const c of calls ?? []) {
      callCounts[c.location_id] = (callCounts[c.location_id] ?? 0) + 1;
    }
    for (const l of leads ?? []) {
      leadCounts[l.location_id] = (leadCounts[l.location_id] ?? 0) + 1;
    }
    for (const k of kbs ?? []) {
      kbCounts[k.location_id] = (kbCounts[k.location_id] ?? 0) + 1;
    }

    const customers = (locations ?? []).map((loc) => ({
      id: loc.id,
      name: loc.name,
      orgId: loc.org_id,
      createdAt: loc.created_at,
      phoneNumber: loc.phone_number ?? null,
      websiteUrl: loc.website_url ?? null,
      hasAI: !!(loc.ai_config),
      callCount: callCounts[loc.id] ?? 0,
      leadCount: leadCounts[loc.id] ?? 0,
      kbCount: kbCounts[loc.id] ?? 0,
    }));

    const totalCalls = (calls ?? []).length;
    const totalLeads = (leads ?? []).length;

    res.json({
      totals: {
        locations: customers.length,
        calls: totalCalls,
        leads: totalLeads,
        knowledgeBases: (kbs ?? []).length,
      },
      customers,
    });
  } catch (err: unknown) {
    console.error('[Admin Overview]', err);
    res.status(500).json({ error: 'Failed to fetch admin overview' });
  }
});

export default router;
