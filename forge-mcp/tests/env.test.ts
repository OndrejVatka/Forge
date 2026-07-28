import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiKeyVarFor, loadEnv } from '../src/env.js';

const BASE_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

// Fixture values, never real credentials. The trailing pragma stops gitleaks'
// generic-api-key rule from flagging them on entropy alone.
const CLAUDE_KEY = 'claude-key-0123456789'; // gitleaks:allow
const HERMES_KEY = 'hermes-key-9876543210'; // gitleaks:allow

const originalEnv = process.env;

/** Replace the process environment with only the given vars. */
function setEnv(vars: Record<string, string>): void {
  process.env = { ...BASE_ENV, ...vars };
}

beforeEach(() => {
  // loadEnv reports config problems before exiting; keep the output quiet.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit');
  });
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe('apiKeyVarFor', () => {
  it('should derive the variable name from the identity', () => {
    expect(apiKeyVarFor('hermes')).toBe('FORGE_API_KEY_HERMES');
    expect(apiKeyVarFor('codex')).toBe('FORGE_API_KEY_CODEX');
    expect(apiKeyVarFor('claude-code')).toBe('FORGE_API_KEY_CLAUDE_CODE');
  });
});

describe('loadEnv', () => {
  it('should map a single FORGE_API_KEY to claude-code', () => {
    setEnv({ FORGE_API_KEY: CLAUDE_KEY });
    expect([...loadEnv().agentKeys]).toEqual([[CLAUDE_KEY, 'claude-code']]);
  });

  it('should map a per-agent key to its own identity', () => {
    setEnv({ FORGE_API_KEY_HERMES: HERMES_KEY });
    expect([...loadEnv().agentKeys]).toEqual([[HERMES_KEY, 'hermes']]);
  });

  it('should combine the shared key with per-agent keys', () => {
    setEnv({ FORGE_API_KEY: CLAUDE_KEY, FORGE_API_KEY_HERMES: HERMES_KEY });
    const { agentKeys } = loadEnv();

    expect(agentKeys.get(CLAUDE_KEY)).toBe('claude-code');
    expect(agentKeys.get(HERMES_KEY)).toBe('hermes');
    expect(agentKeys.size).toBe(2);
  });

  it('should accept an explicit claude-code key alongside hermes', () => {
    setEnv({ FORGE_API_KEY_CLAUDE_CODE: CLAUDE_KEY, FORGE_API_KEY_HERMES: HERMES_KEY });
    const { agentKeys } = loadEnv();

    expect(agentKeys.get(CLAUDE_KEY)).toBe('claude-code');
    expect(agentKeys.get(HERMES_KEY)).toBe('hermes');
  });

  it('should trim whitespace pasted along with a key', () => {
    setEnv({ FORGE_API_KEY_HERMES: `  ${HERMES_KEY}\n` });
    expect(loadEnv().agentKeys.get(HERMES_KEY)).toBe('hermes');
  });

  it('should exit when no key is configured', () => {
    setEnv({});
    expect(() => loadEnv()).toThrow('process.exit');
  });

  it('should exit on a key that is only whitespace', () => {
    setEnv({ FORGE_API_KEY_HERMES: '   ' });
    expect(() => loadEnv()).toThrow('process.exit');
  });

  it('should exit when one key claims two identities', () => {
    setEnv({ FORGE_API_KEY: CLAUDE_KEY, FORGE_API_KEY_HERMES: CLAUDE_KEY });
    expect(() => loadEnv()).toThrow('process.exit');
  });

  it('should allow the same key to be named twice for one identity', () => {
    setEnv({ FORGE_API_KEY: CLAUDE_KEY, FORGE_API_KEY_CLAUDE_CODE: CLAUDE_KEY });
    expect([...loadEnv().agentKeys]).toEqual([[CLAUDE_KEY, 'claude-code']]);
  });
});
