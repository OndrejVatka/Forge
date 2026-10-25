import { createHash } from 'node:crypto';

/** `NNNN_snake_case_description.sql`, applied in filename order. */
const MIGRATION_NAME = /^\d{4}_[a-z0-9_]+\.sql$/;

/**
 * Top-level transaction statements. The runner wraps each file and its
 * bookkeeping row in one transaction, and a COMMIT inside the file would end
 * that transaction early. plpgsql's `BEGIN`/`END;` (no semicolon after BEGIN,
 * no COMMIT) don't match.
 */
const TRANSACTION_CONTROL =
  /^\s*(BEGIN(\s+(WORK|TRANSACTION))?|START\s+TRANSACTION|COMMIT(\s+(WORK|TRANSACTION))?|ROLLBACK(\s+(WORK|TRANSACTION))?)\s*;/im;

export interface MigrationFile {
  name: string;
  checksum: string;
}

export interface MigrationPlan {
  /** Not yet applied, in the order they will run. */
  pending: MigrationFile[];
  /** Applied, but the file on disk no longer matches what ran. */
  changed: string[];
  /** Recorded as applied, but the file is gone. */
  missing: string[];
  /** Pending files numbered below one already applied. */
  outOfOrder: string[];
}

export function isMigrationName(name: string): boolean {
  return MIGRATION_NAME.test(name);
}

export function checksumOf(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

/** True when a migration manages its own transaction (not allowed from 0004 on). */
export function hasTransactionControl(sql: string): boolean {
  const withoutLineComments = sql.replace(/--.*$/gm, '');
  return TRANSACTION_CONTROL.test(withoutLineComments);
}

/** Compare the migration files on disk with what the database says it has run. */
export function planMigrations(files: MigrationFile[], applied: MigrationFile[]): MigrationPlan {
  const appliedByName = new Map(applied.map((migration) => [migration.name, migration.checksum]));
  const fileNames = new Set(files.map((file) => file.name));
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const lastApplied = [...appliedByName.keys()].sort().at(-1);

  const pending = sorted.filter((file) => !appliedByName.has(file.name));
  return {
    pending,
    changed: sorted
      .filter((file) => appliedByName.has(file.name))
      .filter((file) => appliedByName.get(file.name) !== file.checksum)
      .map((file) => file.name),
    missing: [...appliedByName.keys()].filter((name) => !fileNames.has(name)).sort(),
    outOfOrder: lastApplied
      ? pending.filter((file) => file.name < lastApplied).map((file) => file.name)
      : [],
  };
}

/** Problems that must block `migrate apply`; empty when it is safe to run. */
export function planProblems(plan: MigrationPlan): string[] {
  return [
    ...plan.changed.map((name) => `${name} was edited after it was applied`),
    ...plan.missing.map((name) => `${name} is recorded as applied but the file is missing`),
    ...plan.outOfOrder.map((name) => `${name} is numbered before an applied migration`),
  ];
}
