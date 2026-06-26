// ──────────────────────────────────────────────────────────────
// Voice / language options for the "Talk to AI" picker (after-sign-up only).
//
// Retell controls voice + language at the AGENT level, so each distinct
// voice/language needs its OWN agent in Retell. Until you create those
// agents, options fall back to the default agent — they still connect, they
// just won't sound different / speak that language yet.
//
// ▸ TO MAKE A LANGUAGE REALLY WORK: create a Retell agent in that language,
//   copy its agent_id, and set it in the matching VITE_RETELL_AGENT_* env
//   var on Vercel. English (US) uses the default agent (works today).
// ──────────────────────────────────────────────────────────────

export interface VoiceOption {
  id: string;
  name: string;          // AI display name
  gender: 'female' | 'male';
  language: string;      // display name
  langCode: string;
  agentId: string;       // empty → backend default agent
  flag: string;
}

const env = import.meta.env;
const v = (key: string) => (env[key as keyof ImportMetaEnv] as string | undefined)?.trim() || '';

export const VOICE_OPTIONS: VoiceOption[] = [
  // ── English (US) — default, works today ──
  { id: 'sara-female-en', name: 'Sara', gender: 'female', language: 'English (US)', langCode: 'en-US', agentId: v('VITE_RETELL_AGENT_ALEX_EN'), flag: '🇺🇸' },
  { id: 'sam-male-en',    name: 'Sam',  gender: 'male',   language: 'English (US)', langCode: 'en-US', agentId: v('VITE_RETELL_AGENT_SAM_EN'),  flag: '🇺🇸' },

  // ── Spanish — needs a Spanish Retell agent to truly speak Spanish ──
  { id: 'aria-female-es',  name: 'Aria',  gender: 'female', language: 'Spanish', langCode: 'es-419', agentId: v('VITE_RETELL_AGENT_ARIA_ES'),  flag: '🇪🇸' },
  { id: 'diego-male-es',   name: 'Diego', gender: 'male',   language: 'Spanish', langCode: 'es-419', agentId: v('VITE_RETELL_AGENT_DIEGO_ES'), flag: '🇪🇸' },

  // ── French — needs a French Retell agent ──
  { id: 'claire-female-fr', name: 'Claire', gender: 'female', language: 'French', langCode: 'fr-FR', agentId: v('VITE_RETELL_AGENT_CLAIRE_FR'), flag: '🇫🇷' },
  { id: 'luca-male-fr',     name: 'Luca',   gender: 'male',   language: 'French', langCode: 'fr-FR', agentId: v('VITE_RETELL_AGENT_LUCA_FR'),   flag: '🇫🇷' },
];

export const DEFAULT_VOICE = VOICE_OPTIONS[0];

/** Distinct languages, in display order (English first = default). */
export const LANGUAGES = Array.from(new Set(VOICE_OPTIONS.map((o) => o.language)));

/** Voices available for a given language. */
export function voicesForLanguage(language: string): VoiceOption[] {
  return VOICE_OPTIONS.filter((o) => o.language === language);
}
