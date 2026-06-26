/**
 * Retell AI — call creation REST helpers.
 *  - createOutboundCall: dashboard → dial a lead (replaces Twilio client.calls.create).
 *  - createWebCall:       landing page "Talk to AI" → browser call access token.
 *
 * Both pass `retell_llm_dynamic_variables` so the Custom LLM websocket
 * (retell.service.ts) can resolve the right location/KB and lead context.
 */
import axios from 'axios';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { getLocationById } from './voice.service';

const RETELL_BASE = 'https://api.retellai.com';

function authHeaders() {
  if (!env.RETELL_API_KEY) throw new Error('RETELL_API_KEY not configured');
  return { Authorization: `Bearer ${env.RETELL_API_KEY}`, 'Content-Type': 'application/json' };
}

// ── OUTBOUND — dashboard dials a lead ──
export async function createOutboundCall(params: {
  toPhone: string;
  locationId: string;
  orgId: string;
  leadId?: string;
  context?: string;
}): Promise<{ callId: string; status: string }> {
  const { toPhone, locationId, orgId, leadId, context } = params;

  const location = await getLocationById(locationId);
  if (!location) throw new Error('Location not found');

  const fromNumber = env.RETELL_FROM_NUMBER || location.phone_number;
  if (!fromNumber) throw new Error('No Retell from-number configured (set RETELL_FROM_NUMBER or location.phone_number)');

  const dynamicVars: Record<string, string> = { locationId, direction: 'outbound' };
  if (leadId) dynamicVars.leadId = leadId;
  if (context) dynamicVars.context = context.substring(0, 500);

  const resp = await axios.post(
    `${RETELL_BASE}/v2/create-phone-call`,
    {
      from_number: fromNumber,
      to_number: toPhone,
      override_agent_id: env.RETELL_AGENT_ID,
      retell_llm_dynamic_variables: dynamicVars,
      metadata: { locationId, orgId, ...(leadId ? { leadId } : {}) },
    },
    { headers: authHeaders(), timeout: 15000 }
  );

  const callId: string = resp.data.call_id;
  const status: string = resp.data.call_status ?? 'registered';

  // Track immediately so the dashboard shows it live. The websocket handler
  // upserts on the same external id, so this is the authoritative create.
  await supabase.from('calls').upsert(
    {
      twilio_call_sid: `retell_${callId}`,
      location_id: locationId,
      org_id: orgId,
      from_number: fromNumber,
      to_number: toPhone,
      direction: 'outbound',
      status: 'in_progress',
    },
    { onConflict: 'twilio_call_sid' }
  );

  return { callId, status };
}

// ── WEB CALL — browser "Talk to AI" ──
// Returns the short-lived access token the Retell web SDK uses to join the room.
export async function createWebCall(params: {
  locationId?: string;
  callerName?: string;
  /** Optional Retell agent override (voice/language picker). Falls back to default. */
  agentId?: string;
}): Promise<{ accessToken: string; callId: string }> {
  const { locationId, callerName, agentId } = params;
  const useAgentId = agentId?.trim() || env.RETELL_AGENT_ID;
  if (!useAgentId) throw new Error('RETELL_AGENT_ID not configured');

  const dynamicVars: Record<string, string> = { direction: 'inbound' };
  if (locationId) dynamicVars.locationId = locationId;
  if (callerName) dynamicVars.callerName = callerName;

  const resp = await axios.post(
    `${RETELL_BASE}/v2/create-web-call`,
    {
      agent_id: useAgentId,
      retell_llm_dynamic_variables: dynamicVars,
      ...(locationId ? { metadata: { locationId } } : {}),
    },
    { headers: authHeaders(), timeout: 15000 }
  );

  return { accessToken: resp.data.access_token, callId: resp.data.call_id };
}
