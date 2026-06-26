import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),

  // Supabase — free at supabase.com
  SUPABASE_URL: z.string().url('Invalid SUPABASE_URL'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY required'),

  // Clerk — free at clerk.com
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY required'),
  CLERK_WEBHOOK_SECRET: z.string().default(''),

  // Twilio — free trial at twilio.com (no credit card, $15.50 loaded)
  // Still the CARRIER for the imported number (+1 945-223-1301); Retell runs the agent.
  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'TWILIO_PHONE_NUMBER required'),

  // Retell AI — voice agent (inbound + outbound). retellai.com → API key + agent.
  // The agent's "Custom LLM" websocket URL must point at THIS server: wss://<server>/ws/retell-llm
  RETELL_API_KEY: z.string().optional(),
  RETELL_AGENT_ID: z.string().optional(),
  // The Retell-owned/managed number used for outbound (E.164, e.g. +19452231301).
  RETELL_FROM_NUMBER: z.string().optional(),

  // Groq — free at console.groq.com (14,400 req/day free tier). Used for real-time voice (low latency).
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY required'),

  // Gemini — free at aistudio.google.com. Used for async analysis (website scan, FAQs, sample
  // conversations, knowledge-gap detection). Optional: the analysis layer degrades gracefully if absent.
  GEMINI_API_KEY: z.string().optional(),

  // Anthropic — Claude Opus voice AI (console.anthropic.com — new accounts get $5 free credits)
  ANTHROPIC_API_KEY: z.string().optional(),

  // ElevenLabs — optional, free at elevenlabs.io (human voice for demo widget)
  ELEVENLABS_API_KEY: z.string().optional(),

  // Resend — optional, free at resend.com (100 emails/day). Sends a notification
  // email when a new lead is captured. If absent, email notifications are skipped.
  RESEND_API_KEY: z.string().optional(),
  // Where lead-alert emails are sent (defaults to the app owner's address).
  NOTIFY_EMAIL: z.string().email().optional(),
  // Verified "from" address in Resend (defaults to Resend's onboarding sender).
  NOTIFY_FROM_EMAIL: z.string().default('BlueSlate <onboarding@resend.dev>'),

  // App URLs
  SERVER_URL: z.string().url().default('http://localhost:3001'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('\n❌  Missing or invalid environment variables:\n');
    result.error.issues.forEach((issue) => {
      console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\nFill in server/.env then restart.\n');
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
