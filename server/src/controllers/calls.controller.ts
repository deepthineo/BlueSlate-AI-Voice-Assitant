import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function getCalls(req: Request, res: Response): Promise<void> {
  const { locationId, orgId } = req.tenant!;
  const { page = '1', pageSize = '20', status } = req.query as Record<string, string>;
  const from = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

  let query = supabase
    .from('calls')
    .select('id, twilio_call_sid, from_number, direction, status, duration_sec, summary, sentiment_score, started_at, ended_at', { count: 'exact' })
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .order('started_at', { ascending: false })
    .range(from, from + parseInt(pageSize, 10) - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json({ calls: data, total: count ?? 0, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) });
}

export async function getCall(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { locationId, orgId } = req.tenant!;

  const { data, error } = await supabase
    .from('calls')
    .select('*, call_turns(role, content, turn_index)')
    .eq('id', id)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) { res.status(404).json({ error: 'Call not found' }); return; }
  res.json({ call: data });
}

export async function getCallStats(req: Request, res: Response): Promise<void> {
  const { locationId, orgId } = req.tenant!;
  const { days = '7' } = req.query as { days?: string };

  const since = new Date();
  since.setDate(since.getDate() - parseInt(days, 10));

  const { data, error } = await supabase
    .from('calls')
    .select('status, duration_sec, sentiment_score, started_at')
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .gte('started_at', since.toISOString());

  if (error) { res.status(500).json({ error: error.message }); return; }

  const calls = data ?? [];
  const completed = calls.filter((c) => c.status === 'completed');
  const avgDuration = completed.length > 0
    ? Math.round(completed.reduce((s, c) => s + (c.duration_sec ?? 0), 0) / completed.length)
    : 0;
  const avgSentiment = completed.length > 0
    ? parseFloat((completed.reduce((s, c) => s + (c.sentiment_score ?? 0), 0) / completed.length).toFixed(2))
    : 0;

  res.json({
    stats: {
      total: calls.length,
      completed: completed.length,
      failed: calls.filter((c) => c.status === 'failed').length,
      noAnswer: calls.filter((c) => c.status === 'no_answer').length,
      avgDurationSec: avgDuration,
      avgSentiment,
    },
  });
}
