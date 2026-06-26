/**
 * Email notifications via Resend (resend.com — free tier ~100/day).
 * Fully optional: if RESEND_API_KEY / NOTIFY_EMAIL are not set, every function
 * here silently no-ops, so the rest of the app is unaffected.
 */
import axios from 'axios';
import { env } from '../config/env';

function emailEnabled(): boolean {
  return Boolean(env.RESEND_API_KEY && env.NOTIFY_EMAIL);
}

async function sendEmail(subject: string, html: string): Promise<void> {
  if (!emailEnabled()) return; // not configured — skip quietly
  try {
    await axios.post(
      'https://api.resend.com/emails',
      { from: env.NOTIFY_FROM_EMAIL, to: [env.NOTIFY_EMAIL], subject, html },
      { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    console.log('[Email] sent:', subject);
  } catch (err: any) {
    // Never let email failure affect the caller — just log.
    console.error('[Email] send failed:', err?.response?.data ?? err?.message ?? err);
  }
}

// Outcomes that mean the owner should personally follow up.
const FOLLOWUP_OUTCOMES = ['callback_needed', 'callback_requested', 'info_requested'];

/** Notify the owner that a new lead was captured from a call. */
export async function notifyNewLead(params: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  interest?: string | null;
  outcome?: string | null;
  score?: number;
  summary?: string | null;
  businessName?: string;
}): Promise<void> {
  const { name, phone, email, interest, outcome, score, summary, businessName } = params;
  const needsFollowUp = outcome ? FOLLOWUP_OUTCOMES.includes(outcome) : false;
  const prefix = needsFollowUp ? '🟠 Follow-up needed' : '🟢 New lead';
  const subject = `${prefix}: ${name || 'Unknown caller'}${score != null ? ` (score ${score})` : ''}`;
  const row = (label: string, val?: string | null) =>
    val ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${label}</td><td style="padding:4px 0;font-weight:600">${val}</td></tr>` : '';
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px">
      <h2 style="margin:0 0 4px">${needsFollowUp ? 'Follow-up needed' : 'New lead captured'}${businessName ? ` — ${businessName}` : ''}</h2>
      <p style="color:#6b7280;margin:0 0 16px">From a BlueSlate AI voice call.</p>
      ${needsFollowUp ? `<p style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:8px 12px;border-radius:8px;font-size:13px;margin:0 0 14px">⚠️ This caller asked for a callback / more info — reach out to them personally.</p>` : ''}
      <table style="border-collapse:collapse;font-size:14px">
        ${row('Name', name)}
        ${row('Phone', phone)}
        ${row('Email', email)}
        ${row('Interest', interest)}
        ${row('Outcome', outcome)}
        ${row('Score', score != null ? String(score) : null)}
      </table>
      ${summary ? `<p style="margin:16px 0 0;font-size:14px"><strong>Summary:</strong> ${summary}</p>` : ''}
    </div>`;
  await sendEmail(subject, html);
}

/**
 * Notify the owner that a caller talked to the AI but left NO contact info
 * (abandoned / no-info call). The closest real equivalent to a "missed" caller.
 */
export async function notifyAbandonedCall(params: {
  summary?: string | null;
  transcript?: string | null;
  businessName?: string;
}): Promise<void> {
  const { summary, transcript, businessName } = params;
  const subject = `🟡 Caller left no contact info${businessName ? ` — ${businessName}` : ''}`;
  const snippet = (transcript ?? '').split('\n').slice(0, 6).join('<br>');
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px">
      <h2 style="margin:0 0 4px">Someone called your AI but didn't leave details</h2>
      <p style="color:#6b7280;margin:0 0 16px">They spoke with your AI receptionist but no name/phone/email was captured.</p>
      ${summary ? `<p style="font-size:14px"><strong>What they wanted:</strong> ${summary}</p>` : ''}
      ${snippet ? `<div style="margin-top:12px;padding:12px;background:#f9fafb;border-radius:8px;font-size:13px;color:#374151">${snippet}</div>` : ''}
    </div>`;
  await sendEmail(subject, html);
}
