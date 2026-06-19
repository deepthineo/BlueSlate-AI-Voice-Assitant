import Vapi from '@vapi-ai/web';

// ──────────────────────────────────────────────────────────────
// Vapi Web SDK configuration.
// One assistant powers BOTH the inbound phone number (+1 980 265 4229)
// and the in-browser "Talk to AI" button — same assistant, same KB.
//
// Secrets are NOT hardcoded. Set these in Vercel (and client/.env locally):
//   VITE_VAPI_PUBLIC_KEY   — Vapi "Public Key" (safe to expose in the browser)
//   VITE_VAPI_ASSISTANT_ID — the assistant assigned to your Vapi phone number
//   VITE_VAPI_PHONE        — display number for click-to-call (defaults below)
// ──────────────────────────────────────────────────────────────

export const VAPI_PUBLIC_KEY = (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined)?.trim() ?? '';
export const VAPI_ASSISTANT_ID = (import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined)?.trim() ?? '';

// The AI receptionist phone number, shown for click-to-call across the app.
export const VAPI_PHONE = ((import.meta.env.VITE_VAPI_PHONE as string | undefined)?.trim()) || '+1 980 265 4229';

// `tel:` href — strips spaces/symbols, keeps leading +.
export const VAPI_PHONE_HREF = `tel:${VAPI_PHONE.replace(/[^\d+]/g, '')}`;

// True only when both required env vars are present — lets the UI degrade
// gracefully (show phone-only) instead of throwing when unconfigured.
export const isVapiConfigured = Boolean(VAPI_PUBLIC_KEY && VAPI_ASSISTANT_ID);

// Singleton — one Vapi instance per browser tab. Created lazily so an
// unconfigured build never instantiates the SDK.
let _vapi: Vapi | null = null;

export function getVapi(): Vapi | null {
  if (!isVapiConfigured) return null;
  if (!_vapi) _vapi = new Vapi(VAPI_PUBLIC_KEY);
  return _vapi;
}
