import { z } from 'zod';

/**
 * Runtime environment schema. Validated once at startup so the server fails
 * fast with a clear message rather than throwing deep in a request handler.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FORGE_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate `process.env`. Exits the process with code 1 on invalid
 * config (never returns invalid data).
 */
export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      '[forge-mcp] Invalid environment configuration:',
      parsed.error.flatten().fieldErrors,
    );
    process.exit(1);
  }
  return parsed.data;
}
