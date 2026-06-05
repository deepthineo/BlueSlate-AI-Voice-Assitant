import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import type { Location } from '../types';

export async function getLocations(req: Request, res: Response): Promise<void> {
  const { orgId } = req.tenant!;

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    console.error('[Locations] Supabase error:', JSON.stringify(error));
    res.status(500).json({ error: error.message, code: error.code, hint: error.hint });
    return;
  }
  res.json({ locations: data as Location[] });
}

export async function getLocation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { orgId } = req.tenant!;

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error || !data) { res.status(404).json({ error: 'Location not found' }); return; }
  res.json({ location: data as Location });
}

export async function createLocation(req: Request, res: Response): Promise<void> {
  const { orgId } = req.tenant!;
  const { name, phoneNumber, websiteUrl, timezone, address, aiConfig } = req.body as {
    name: string;
    phoneNumber?: string;
    websiteUrl?: string;
    timezone?: string;
    address?: string;
    aiConfig?: Record<string, unknown>;
  };

  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  const { data, error } = await supabase
    .from('locations')
    .insert({
      org_id: orgId,
      name,
      phone_number: phoneNumber,
      website_url: websiteUrl,
      timezone: timezone ?? 'America/Chicago',
      address,
      ...(aiConfig ? { ai_config: aiConfig } : {}),
    })
    .select()
    .single();

  if (error || !data) { res.status(500).json({ error: error?.message }); return; }
  res.status(201).json({ location: data as Location });
}

export async function deleteLocation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { orgId } = req.tenant!;

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { orgId } = req.tenant!;
  const updates = req.body as Partial<{
    name: string;
    phone_number: string;
    website_url: string;
    timezone: string;
    address: string;
    ai_config: Record<string, unknown>;
  }>;

  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: error?.message ?? 'Location not found' }); return; }
  res.json({ location: data as Location });
}
