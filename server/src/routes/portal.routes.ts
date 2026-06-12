import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Public — no auth. Caller looks up their own inquiry status by phone number.
router.get('/status', async (req, res) => {
  const raw = (req.query.phone as string | undefined)?.trim() ?? '';
  if (raw.length < 7) {
    res.status(400).json({ error: 'phone required' });
    return;
  }

  // Try multiple phone formats: as-entered, digits-only, with +1 prefix
  const digits = raw.replace(/\D/g, '');
  const variants = Array.from(new Set([
    raw,
    digits,
    `+1${digits}`,
    `+${digits}`,
    digits.startsWith('1') ? digits.slice(1) : `1${digits}`,
  ]));

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, core_interest, call_outcome, status, score, notes, created_at, location_id')
    .in('phone', variants)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    res.status(500).json({ error: 'lookup failed' });
    return;
  }

  if (!data || data.length === 0) {
    res.json({ found: false });
    return;
  }

  // Fetch location name for each lead (franchise name)
  const locationIds = [...new Set(data.map((d) => d.location_id).filter(Boolean))];
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .in('id', locationIds);

  const locationMap = Object.fromEntries((locations ?? []).map((l) => [l.id, l.name]));

  const inquiries = data.map((d) => ({
    id: d.id,
    franchise: locationMap[d.location_id] ?? 'Your franchise',
    interest: d.core_interest,
    outcome: d.call_outcome,
    status: d.status,
    score: d.score,
    notes: d.notes,
    date: d.created_at,
  }));

  res.json({ found: true, inquiries });
});

export default router;
