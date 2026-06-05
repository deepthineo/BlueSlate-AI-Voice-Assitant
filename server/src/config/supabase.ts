import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: ws as any,
  },
});
