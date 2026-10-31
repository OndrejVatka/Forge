import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID = {
  VITE_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
};

// env.ts validates import.meta.env when it loads, so each test stubs the env
// first and then imports a fresh copy of the module.
async function loadEnvModule(): Promise<typeof import('./env.js')> {
  vi.resetModules();
  return import('./env.js');
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', VALID.VITE_SUPABASE_URL);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID.VITE_SUPABASE_ANON_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseEnv', () => {
  it('should return both settings when they are valid', async () => {
    const { parseEnv } = await loadEnvModule();
    expect(parseEnv(VALID)).toEqual(VALID);
  });

  it('should accept a plain http URL for local Supabase', async () => {
    const { parseEnv } = await loadEnvModule();
    const local = { ...VALID, VITE_SUPABASE_URL: 'http://127.0.0.1:54321' };
    expect(parseEnv(local)).toEqual(local);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a URL', 'abcdefgh.supabase.co'],
    ['a non-http scheme', 'javascript:alert(1)'],
  ])('should reject a URL that is %s', async (_case, url) => {
    const { parseEnv } = await loadEnvModule();
    expect(() => parseEnv({ ...VALID, VITE_SUPABASE_URL: url })).toThrow(/VITE_SUPABASE_URL/);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
  ])('should reject an anon key that is %s', async (_case, key) => {
    const { parseEnv } = await loadEnvModule();
    expect(() => parseEnv({ ...VALID, VITE_SUPABASE_ANON_KEY: key })).toThrow(
      /VITE_SUPABASE_ANON_KEY/,
    );
  });

  it('should name every invalid variable without echoing values', async () => {
    const { parseEnv } = await loadEnvModule();
    const attempt = (): unknown =>
      parseEnv({ VITE_SUPABASE_URL: 'nope', VITE_SUPABASE_ANON_KEY: '' });
    expect(attempt).toThrow(/VITE_SUPABASE_URL.*VITE_SUPABASE_ANON_KEY/);
    expect(attempt).not.toThrow(/nope/);
  });
});

describe('env', () => {
  it('should expose the validated build-time settings', async () => {
    const { env } = await loadEnvModule();
    expect(env).toEqual(VALID);
  });

  describe('when the build-time env is invalid', () => {
    it('should fail as soon as the module loads', async () => {
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      await expect(loadEnvModule()).rejects.toThrow(/VITE_SUPABASE_ANON_KEY/);
    });
  });
});
