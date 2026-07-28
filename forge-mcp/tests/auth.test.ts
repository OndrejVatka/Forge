import type { AgentIdentity } from '@forge/shared';
import { describe, it, expect } from 'vitest';
import { createAgentResolver } from '../src/auth.js';

// Fixture values, never real credentials. The trailing pragma stops gitleaks'
// generic-api-key rule from flagging them on entropy alone.
const CLAUDE_KEY = 'claude-key-0123456789abcdef'; // gitleaks:allow
const HERMES_KEY = 'hermes-key-fedcba9876543210'; // gitleaks:allow

const agentKeys = new Map<string, AgentIdentity>([
  [CLAUDE_KEY, 'claude-code'],
  [HERMES_KEY, 'hermes'],
]);

describe('createAgentResolver', () => {
  const resolve = createAgentResolver(agentKeys);

  it('should resolve each key to its own identity', () => {
    expect(resolve(`Bearer ${CLAUDE_KEY}`)).toBe('claude-code');
    expect(resolve(`Bearer ${HERMES_KEY}`)).toBe('hermes');
  });

  it('should accept the Bearer scheme case-insensitively', () => {
    expect(resolve(`bearer ${HERMES_KEY}`)).toBe('hermes');
  });

  it('should reject an unknown key', () => {
    expect(resolve('Bearer not-a-configured-key')).toBeNull();
  });

  it('should reject a missing Authorization header', () => {
    expect(resolve(undefined)).toBeNull();
  });

  it('should reject a non-Bearer scheme', () => {
    expect(resolve(`Basic ${CLAUDE_KEY}`)).toBeNull();
  });

  it('should reject a key carrying trailing whitespace', () => {
    // The capture group is greedy, so a stray newline copied along with the
    // key changes its length and must not authenticate.
    expect(resolve(`Bearer ${CLAUDE_KEY}\n`)).toBeNull();
    expect(resolve(`Bearer ${CLAUDE_KEY} `)).toBeNull();
  });

  it('should reject a key that merely extends a valid one', () => {
    expect(resolve(`Bearer ${CLAUDE_KEY}extra`)).toBeNull();
  });

  it('should leave other agents working when one key is revoked', () => {
    const withoutHermes = new Map<string, AgentIdentity>([[CLAUDE_KEY, 'claude-code']]);
    const afterRevocation = createAgentResolver(withoutHermes);

    expect(afterRevocation(`Bearer ${HERMES_KEY}`)).toBeNull();
    expect(afterRevocation(`Bearer ${CLAUDE_KEY}`)).toBe('claude-code');
  });

  it('should reject everything when no keys are configured', () => {
    const noKeys = createAgentResolver(new Map<string, AgentIdentity>());
    expect(noKeys(`Bearer ${CLAUDE_KEY}`)).toBeNull();
  });
});
