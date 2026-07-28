import type { AgentIdentity } from '@forge/shared';
import { timingSafeEqual } from 'node:crypto';

const BEARER_PATTERN = /^Bearer (.+)$/i;

/** Maps an `Authorization` header value to an identity, or null if it matches no key. */
export type AgentResolver = (authorization: string | undefined) => AgentIdentity | null;

/**
 * Build a resolver that turns `Authorization: Bearer <key>` into the agent
 * identity that key authenticates as. The identity is the caller's proof of
 * who it is — tools write it to `created_by` / `author` rather than trusting a
 * self-declared field, so presenting one agent's key cannot produce records
 * attributed to another.
 *
 * Every configured key is compared on every call, with no early exit, so the
 * work done doesn't depend on which key matched; each comparison itself is
 * constant-time. Callers must answer a single generic 401 for every failure —
 * distinguishing "no header" from "wrong key" would turn this into an oracle.
 */
export function createAgentResolver(agentKeys: ReadonlyMap<string, AgentIdentity>): AgentResolver {
  const candidates = [...agentKeys].map(([key, agent]) => ({
    expected: Buffer.from(key, 'utf8'),
    agent,
  }));

  return (authorization) => {
    const token = BEARER_PATTERN.exec(authorization ?? '')?.[1];
    if (!token) return null;

    const provided = Buffer.from(token, 'utf8');
    let resolved: AgentIdentity | null = null;
    for (const { expected, agent } of candidates) {
      // timingSafeEqual throws on length mismatch, so length-check first.
      if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
        resolved = agent;
      }
    }
    return resolved;
  };
}
