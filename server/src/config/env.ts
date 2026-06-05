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
  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'TWILIO_PHONE_NUMBER required'),

  // Gemini — free at aistudio.google.com
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY required'),

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
