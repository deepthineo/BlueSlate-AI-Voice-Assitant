import { supabase } from '../config/supabase';
import type { Lead } from '../types';

export async function listLeads(params: {
  locationId: string;
  orgId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { locationId, orgId, status, page = 1, pageSize = 25 } = params;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('leads')
    .select('*, calls(duration_sec, started_at)', { count: 'exact' })
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { leads: data as Lead[], total: count ?? 0, page, pageSize };
}

export async function getLeadById(id: string, locationId: string, orgId: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, calls(*)')
    .eq('id', id)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Lead not found');
  return data as Lead;
}

export async function updateLeadStatus(params: {
  id: string;
  locationId: string;
  orgId: string;
  status: string;
  notes?: string;
}): Promise<Lead> {
  const { id, locationId, orgId, status, notes } = params;

  const update: Record<string, unknown> = { status };
  if (notes !== undefined) update.notes = notes;

  const { data, error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', id)
    .eq('location_id', locationId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Lead not found');
  return data as Lead;
}

export async function getLeadStats(locationId: string, orgId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('status, score, call_outcome, created_at')
    .eq('location_id', locationId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);

  const leads = data ?? [];
  const now = new Date();
  const last7Days = leads.filter((l) => {
    const d = new Date(l.created_at);
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  return {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    booked: leads.filter((l) => l.status === 'booked').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    hot: leads.filter((l) => l.score >= 70).length,
    last7Days: last7Days.length,
    avgScore: leads.length > 0
      ? Math.round(leads.reduce((sum, l) => sum + (l.score ?? 0), 0) / leads.length)
      : 0,
    outcomeBreakdown: {
      booked: leads.filter((l) => l.call_outcome === 'booked').length,
      qualified: leads.filter((l) => l.call_outcome === 'qualified').length,
      info_requested: leads.filter((l) => l.call_outcome === 'info_requested').length,
      callback_needed: leads.filter((l) => l.call_outcome === 'callback_needed').length,
      not_interested: leads.filter((l) => l.call_outcome === 'not_interested').length,
    },
  };
}
