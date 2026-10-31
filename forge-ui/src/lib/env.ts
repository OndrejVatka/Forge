/**
 * Client environment (Vite inlines `VITE_*` vars at build time). Validated at
 * module load so a misconfigured deploy fails loudly instead of making opaque
 * requests to `undefined`.
 *
 * Hand-written rather than zod: these two checks were the only reason zod sat
 * in the UI's boot bundle (FO-30).
 */
export interface ClientEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === 'https:' || protocol === 'http:';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates the raw build-time environment.
 * @param raw - Usually `import.meta.env`.
 * @returns The two Supabase settings, typed.
 * @throws Error naming each invalid variable. Values are never included, since
 * the anon key would end up in the console.
 * @example parseEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' })
 */
export function parseEnv(raw: Record<string, unknown>): ClientEnv {
  const url = raw.VITE_SUPABASE_URL;
  const anonKey = raw.VITE_SUPABASE_ANON_KEY;
  if (isHttpUrl(url) && isNonEmptyString(anonKey)) {
    return { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey };
  }
  const invalid = [
    ...(isHttpUrl(url) ? [] : ['VITE_SUPABASE_URL (must be an http(s) URL)']),
    ...(isNonEmptyString(anonKey) ? [] : ['VITE_SUPABASE_ANON_KEY (must be non-empty)']),
  ];
  throw new Error(`Invalid client environment: ${invalid.join(', ')}`);
}

export const env = parseEnv(import.meta.env);
