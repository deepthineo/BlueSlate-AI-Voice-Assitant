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
  const subject = `🟢 New lead: ${name || 'Unknown caller'}${score != null ? ` (score ${score})` : ''}`;
  const row = (label: string, val?: string | null) =>
    val ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${label}</td><td style="padding:4px 0;font-weight:600">${val}</td></tr>` : '';
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px">
      <h2 style="margin:0 0 4px">New lead captured${businessName ? ` — ${businessName}` : ''}</h2>
      <p style="color:#6b7280;margin:0 0 16px">From a BlueSlate AI voice call.</p>
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
