// ──────────────────────────────────────────────────────────────
// Retell AI Web SDK configuration.
// One agent powers BOTH the inbound phone number and the in-browser
// "Talk to AI" button. The browser never sees the Retell API key:
// it asks our backend (/api/retell/web-call) for a short-lived access
// token, then joins the call with the Retell web client.
//
// Set in Vercel (and client/.env locally):
//   VITE_RETELL_PHONE  — display number for click-to-call (defaults below)
// (No public key needed — token comes from our backend.)
// ──────────────────────────────────────────────────────────────

// The AI receptionist phone number, shown for click-to-call across the app.
export const RETELL_PHONE =
  ((import.meta.env.VITE_RETELL_PHONE as string | undefined)?.trim()) || '+1 945 223 1301';

// `tel:` href — strips spaces/symbols, keeps leading +.
export const RETELL_PHONE_HREF = `tel:${RETELL_PHONE.replace(/[^\d+]/g, '')}`;

// Browser web calls are always available — the backend gates on whether
// Retell is configured server-side and returns 503 if not.
export const isRetellConfigured = true;
