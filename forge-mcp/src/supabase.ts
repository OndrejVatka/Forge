import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@forge/shared';
import type { Env } from './env.js';

export type ForgeSupabaseClient = SupabaseClient<Database>;

/**
 * Create a Supabase client authenticated with the service role key. This
 * bypasses RLS, so it must only ever run server-side. Session persistence and
 * token refresh are disabled — the server is stateless and uses a static key.
 */
export function createSupabaseClient(
  env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>,
): ForgeSupabaseClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
