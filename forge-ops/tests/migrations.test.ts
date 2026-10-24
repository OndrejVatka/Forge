import { describe, it, expect } from 'vitest';
import {
  hasTransactionControl,
  isMigrationName,
  planMigrations,
  planProblems,
} from '../src/migrations.js';

const file = (name: string, checksum = `sum-${name}`): { name: string; checksum: string } => ({
  name,
  checksum,
});

describe('isMigrationName', () => {
  it('should accept the numbered snake_case convention', () => {
    expect(isMigrationName('0004_add_ticket_estimates.sql')).toBe(true);
  });

  it('should reject anything else', () => {
    expect(isMigrationName('4_add.sql')).toBe(false);
    expect(isMigrationName('0004-add.sql')).toBe(false);
    expect(isMigrationName('0004_Add.sql')).toBe(false);
  });
});

describe('hasTransactionControl', () => {
  it('should flag top-level BEGIN/COMMIT', () => {
    expect(hasTransactionControl('BEGIN;\nALTER TABLE t ADD c int;\nCOMMIT;')).toBe(true);
    expect(hasTransactionControl('start transaction;')).toBe(true);
  });

  it('should not flag plpgsql blocks', () => {
    const sql = `DO $$\nBEGIN\n  RAISE NOTICE 'hi';\nEND\n$$;\nCREATE FUNCTION f() RETURNS void AS $$\nBEGIN\n  NULL;\nEND;\n$$ LANGUAGE plpgsql;`;
    expect(hasTransactionControl(sql)).toBe(false);
  });

  it('should ignore commented-out statements', () => {
    expect(hasTransactionControl('-- BEGIN;\nSELECT 1;')).toBe(false);
  });

  it('should flag the legacy migrations, which is why they are baselined, not re-run', () => {
    expect(hasTransactionControl('BEGIN;\nDO $$\nBEGIN\nEND\n$$;\nCOMMIT;')).toBe(true);
  });
});

describe('planMigrations', () => {
  it('should list unapplied files as pending, in filename order', () => {
    const plan = planMigrations(
      [file('0005_b.sql'), file('0001_a.sql'), file('0004_a.sql')],
      [file('0001_a.sql')],
    );
    expect(plan.pending.map((m) => m.name)).toEqual(['0004_a.sql', '0005_b.sql']);
    expect(planProblems(plan)).toEqual([]);
  });

  describe('when an applied file was edited', () => {
    it('should report it as a problem', () => {
      const plan = planMigrations([file('0001_a.sql', 'new')], [file('0001_a.sql', 'old')]);
      expect(plan.changed).toEqual(['0001_a.sql']);
      expect(planProblems(plan)).toHaveLength(1);
    });
  });

  describe('when an applied file was deleted', () => {
    it('should report it as missing', () => {
      const plan = planMigrations([], [file('0001_a.sql')]);
      expect(plan.missing).toEqual(['0001_a.sql']);
    });
  });

  describe('when a new file is numbered before an applied one', () => {
    it('should report it as out of order', () => {
      const plan = planMigrations(
        [file('0002_late.sql'), file('0003_a.sql')],
        [file('0003_a.sql')],
      );
      expect(plan.outOfOrder).toEqual(['0002_late.sql']);
      expect(planProblems(plan)).toHaveLength(1);
    });
  });
});
