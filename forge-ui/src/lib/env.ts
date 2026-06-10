import { z } from 'zod';

/**
 * Client environment (Vite inlines `VITE_*` vars at build time). Validated at
 * module load so a misconfigured deploy fails loudly instead of making opaque
 * requests to `undefined`.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse(import.meta.env);
