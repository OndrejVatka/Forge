import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { OpsError } from './errors.js';

const postgresUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), 'must be a postgres:// connection string');

/**
 * Ops environment, read from `forge-ops/.env` (see `.env.example`). Every
 * variable is optional at parse time because each command needs a different
 * subset; `require*` below fails fast on the ones a command actually uses.
 */
const configSchema = z.object({
  FORGE_DB_URL: postgresUrl.optional(),
  FORGE_RESTORE_DB_URL: postgresUrl.optional(),
  FORGE_MCP_URL: z.string().trim().url().optional(),
  FORGE_SMOKE_API_KEY: z.string().trim().min(1).optional(),
  FORGE_BACKUP_DIR: z
    .string()
    .trim()
    .min(1)
    .default(join(homedir(), 'Backups', 'forge')),
  FORGE_BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  FORGE_BACKUP_KEEP_MIN: z.coerce.number().int().positive().default(10),
  FORGE_DEPLOY_STATUS_CONTEXTS: z.string().trim().min(1).default('Vercel,Forge - @forge/mcp'),
  PG_BIN: z.string().trim().min(1).optional(),
});

export interface OpsConfig {
  dbUrl?: string;
  restoreDbUrl?: string;
  mcpUrl?: string;
  smokeApiKey?: string;
  backupDir: string;
  retention: { maxAgeDays: number; keepMin: number };
  /** GitHub commit-status contexts that must succeed before a deploy counts as live. */
  deployStatusContexts: string[];
  pgBin?: string;
}

/**
 * Parse the ops environment.
 *
 * @throws {OpsError} when a variable is present but malformed.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): OpsConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    // Name the variables only: the values may be credentials.
    const fields = Object.keys(parsed.error.flatten().fieldErrors).join(', ');
    throw new OpsError(`Invalid ops configuration in: ${fields}`);
  }
  const c = parsed.data;
  return {
    dbUrl: c.FORGE_DB_URL,
    restoreDbUrl: c.FORGE_RESTORE_DB_URL,
    mcpUrl: c.FORGE_MCP_URL?.replace(/\/+$/, ''),
    smokeApiKey: c.FORGE_SMOKE_API_KEY,
    backupDir: c.FORGE_BACKUP_DIR,
    retention: { maxAgeDays: c.FORGE_BACKUP_RETENTION_DAYS, keepMin: c.FORGE_BACKUP_KEEP_MIN },
    deployStatusContexts: c.FORGE_DEPLOY_STATUS_CONTEXTS.split(',')
      .map((context) => context.trim())
      .filter(Boolean),
    pgBin: c.PG_BIN,
  };
}

/**
 * Return a config value or fail with the variable to set.
 *
 * @throws {OpsError} when the value is missing.
 */
export function requireValue<T>(value: T | undefined, variable: string): T {
  if (value === undefined) {
    throw new OpsError(`${variable} is not set. Add it to forge-ops/.env (see .env.example).`);
  }
  return value;
}
