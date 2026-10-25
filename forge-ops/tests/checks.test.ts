import { describe, it, expect } from 'vitest';
import { assertNotProduction } from '../src/commands/restore.js';
import { loadConfig } from '../src/config.js';
import { evaluateDeployStatuses } from '../src/deploy-status.js';
import { OpsError } from '../src/errors.js';
import { parseConnection } from '../src/pg.js';
import { filterRestoreList } from '../src/restore-list.js';
import { diffRowCounts, parseRowCounts } from '../src/row-counts.js';

// Fixture values, never real credentials. The trailing pragma stops gitleaks'
// generic rules from flagging them on entropy alone.
const PROD_URL =
  'postgresql://postgres.prodref:s%40cret@aws-0-eu.pooler.supabase.com:5432/postgres'; // gitleaks:allow
const SCRATCH_URL =
  'postgresql://postgres.scratchref:other@aws-0-eu.pooler.supabase.com:5432/postgres'; // gitleaks:allow

describe('parseConnection', () => {
  it('should keep the password out of the dbname passed on argv', () => {
    const connection = parseConnection(PROD_URL);
    expect(connection.dbname).not.toContain('s%40cret');
    expect(connection.dbname).not.toContain('s@cret');
    expect(connection.password).toBe('s@cret');
    expect(connection.label).toBe('aws-0-eu.pooler.supabase.com:5432/postgres as postgres.prodref');
  });
});

describe('assertNotProduction', () => {
  it('should refuse a restore target that is the production database', () => {
    expect(() => assertNotProduction(parseConnection(PROD_URL), PROD_URL)).toThrow(OpsError);
  });

  it('should allow another project on the same shared pooler host', () => {
    expect(() => assertNotProduction(parseConnection(SCRATCH_URL), PROD_URL)).not.toThrow();
  });
});

describe('row counts', () => {
  it('should parse psql output', () => {
    expect(parseRowCounts('comments\t12\ntickets\t3\n\n')).toEqual({ comments: 12, tickets: 3 });
  });

  it('should report differing and missing tables', () => {
    expect(diffRowCounts({ tickets: 3, comments: 12 }, { tickets: 3, comments: 11 })).toEqual([
      'comments: expected 12, got 11',
    ]);
    expect(diffRowCounts({ tickets: 3 }, {})).toEqual(['tickets: expected 3, got no table']);
  });
});

describe('evaluateDeployStatuses', () => {
  const required = ['Vercel', 'Forge - @forge/mcp'];

  it('should succeed once every required context has succeeded', () => {
    const verdict = evaluateDeployStatuses(
      [
        { context: 'Vercel', state: 'success' },
        { context: 'Forge - @forge/mcp', state: 'success' },
        { context: 'unrelated', state: 'failure' },
      ],
      required,
    );
    expect(verdict.state).toBe('success');
  });

  it('should wait while a required context is pending or has not appeared', () => {
    const verdict = evaluateDeployStatuses([{ context: 'Vercel', state: 'pending' }], required);
    expect(verdict).toEqual({ state: 'pending', detail: 'waiting on: Vercel, Forge - @forge/mcp' });
  });

  it('should fail as soon as a required context fails', () => {
    const verdict = evaluateDeployStatuses(
      [
        { context: 'Vercel', state: 'pending' },
        { context: 'Forge - @forge/mcp', state: 'error' },
      ],
      required,
    );
    expect(verdict.state).toBe('failure');
  });
});

describe('loadConfig', () => {
  it('should apply the documented retention defaults', () => {
    const config = loadConfig({});
    expect(config.retention).toEqual({ maxAgeDays: 30, keepMin: 10 });
    expect(config.deployStatusContexts).toEqual(['Vercel', 'Forge - @forge/mcp']);
  });

  it('should reject a non-postgres database URL without echoing its value', () => {
    const attempt = (): unknown => loadConfig({ FORGE_DB_URL: 'https://user:hunter2@example.com' });
    expect(attempt).toThrow(OpsError);
    expect(attempt).toThrow(/FORGE_DB_URL/);
    expect(attempt).not.toThrow(/hunter2/);
  });
});

describe('filterRestoreList', () => {
  it('should drop Supabase platform entries and keep Forge objects', () => {
    const list = [
      ';',
      '; Archive created at 2026-10-25 10:51:14 UTC',
      '5; 2615 2200 SCHEMA - public pg_database_owner',
      '4012; 0 0 COMMENT - SCHEMA public pg_database_owner',
      '4013; 0 0 ACL - SCHEMA public pg_database_owner',
      '230; 1255 17001 FUNCTION public is_allowed_user() postgres',
      '3990; 0 17020 TABLE DATA public tickets postgres',
      '3801; 3256 17100 POLICY public tickets allowlisted_full_access postgres',
      '3802; 0 0 ACL public FUNCTION is_allowed_user() postgres',
      '2290; 826 2200 DEFAULT ACL public DEFAULT PRIVILEGES FOR FUNCTIONS supabase_admin',
    ].join('\n');

    expect(filterRestoreList(list).split('\n')).toEqual([
      ';',
      '; Archive created at 2026-10-25 10:51:14 UTC',
      '230; 1255 17001 FUNCTION public is_allowed_user() postgres',
      '3990; 0 17020 TABLE DATA public tickets postgres',
      '3801; 3256 17100 POLICY public tickets allowlisted_full_access postgres',
      '3802; 0 0 ACL public FUNCTION is_allowed_user() postgres',
    ]);
  });
});
