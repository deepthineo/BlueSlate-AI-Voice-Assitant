// ──────────────────────────────────────────────────────────────
// Voice / name / language options for the "Talk to AI" picker.
//
// Each option maps a human choice (AI name + gender + language) to a
// Retell agent_id. Retell controls voice + language at the agent level,
// so each distinct voice/language needs its OWN agent created in the
// Retell dashboard. Until you create more agents, every option can point
// at the same default agent — the picker still works, it just won't sound
// different yet.
//
// HOW TO ADD A REAL VOICE:
//   1. In Retell, duplicate your agent, pick a different voice/language.
//   2. Copy its agent_id.
//   3. Put it in the matching VITE_RETELL_AGENT_* env var (Vercel), or
//      paste it directly into `agentId` below.
// An empty agentId means "use the backend default agent".
// ──────────────────────────────────────────────────────────────

export interface VoiceOption {
  id: string;            // stable key
  name: string;          // AI display name, e.g. "Alex"
  gender: 'female' | 'male';
  language: string;      // display, e.g. "English (US)"
  langCode: string;      // e.g. "en-US"
  /** Retell agent id for this voice. Empty → backend default agent. */
  agentId: string;
  flag: string;          // emoji for the language
}

const env = import.meta.env;

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'alex-female-en',
    name: 'Alex',
    gender: 'female',
    language: 'English (US)',
    langCode: 'en-US',
    agentId: (env.VITE_RETELL_AGENT_ALEX_EN as string | undefined)?.trim() || '', // default agent
    flag: '🇺🇸',
  },
  {
    id: 'sam-male-en',
    name: 'Sam',
    gender: 'male',
    language: 'English (US)',
    langCode: 'en-US',
    agentId: (env.VITE_RETELL_AGENT_SAM_EN as string | undefined)?.trim() || '',
    flag: '🇺🇸',
  },
  {
    id: 'aria-female-es',
    name: 'Aria',
    gender: 'female',
    language: 'Spanish',
    langCode: 'es-419',
    agentId: (env.VITE_RETELL_AGENT_ARIA_ES as string | undefined)?.trim() || '',
    flag: '🇪🇸',
  },
  {
    id: 'maya-female-hi',
    name: 'Maya',
    gender: 'female',
    language: 'Hindi',
    langCode: 'hi-IN',
    agentId: (env.VITE_RETELL_AGENT_MAYA_HI as string | undefined)?.trim() || '',
    flag: '🇮🇳',
  },
];

export const DEFAULT_VOICE = VOICE_OPTIONS[0];
