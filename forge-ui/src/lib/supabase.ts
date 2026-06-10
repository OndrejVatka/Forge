import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@forge/shared';
import { env } from './env.js';

/**
 * Browser Supabase client using the anon key. All access is gated by RLS
 * (authenticated users have full access; see db/schema.sql). The session is
 * persisted in localStorage by supabase-js — standard for a static SPA.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
);
