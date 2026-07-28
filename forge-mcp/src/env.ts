import { AGENT_IDENTITIES, type AgentIdentity } from '@forge/shared';
import { z } from 'zod';

/**
 * Runtime environment schema. Validated once at startup so the server fails
 * fast with a clear message rather than throwing deep in a request handler.
 *
 * Per-agent keys are read separately, since their variable names are derived
 * from the agent list rather than fixed — see `apiKeyVarFor`.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Single-key config. The caller presenting it writes as `claude-code`. */
  FORGE_API_KEY: z.string().min(1).optional(),
});

export interface Env {
  PORT: number;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** API key -> the identity a caller presenting that key writes as. */
  agentKeys: ReadonlyMap<string, AgentIdentity>;
}

/** The env var holding a given agent's key, e.g. `claude-code` -> `FORGE_API_KEY_CLAUDE_CODE`. */
export function apiKeyVarFor(agent: AgentIdentity): string {
  return `FORGE_API_KEY_${agent.toUpperCase().replace(/-/g, '_')}`;
}

/** Report a fatal config problem and exit. Never returns. */
function fail(message: string): never {
  console.error(`[forge-mcp] Invalid environment configuration: ${message}`);
  process.exit(1);
}

/**
 * Parse and validate `process.env`, resolving the configured API keys into a
 * key -> agent identity map. Exits the process with code 1 on invalid config
 * (never returns invalid data).
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

  const { FORGE_API_KEY, ...rest } = parsed.data;
  const agentKeys = new Map<string, AgentIdentity>();
  const claimedBy = new Map<string, string>();

  /**
   * Register one key. Values are trimmed because these are pasted into
   * dashboards, where a trailing newline rides along easily and would
   * otherwise present as an unexplained 401 at request time.
   */
  const register = (raw: string, agent: AgentIdentity, source: string): void => {
    const key = raw.trim();
    if (key.length === 0) {
      fail(`${source} is set but empty.`);
    }
    // One key standing for two identities makes attribution ambiguous, and
    // silently picking a winner would be worse than refusing to start.
    const owner = claimedBy.get(key);
    if (owner && agentKeys.get(key) !== agent) {
      fail(`${source} and ${owner} are set to the same key but different identities.`);
    }
    agentKeys.set(key, agent);
    claimedBy.set(key, source);
  };

  // Single-key installs keep working unchanged, authenticating as claude-code.
  if (FORGE_API_KEY) {
    register(FORGE_API_KEY, 'claude-code', 'FORGE_API_KEY');
  }

  for (const agent of AGENT_IDENTITIES) {
    const source = apiKeyVarFor(agent);
    const value = process.env[source];
    if (value !== undefined) {
      register(value, agent, source);
    }
  }

  if (agentKeys.size === 0) {
    const example = apiKeyVarFor('hermes');
    fail(`set FORGE_API_KEY, or a per-agent key such as ${example}.`);
  }

  return { ...rest, agentKeys };
}
