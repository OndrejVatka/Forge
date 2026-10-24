import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { requireValue, type OpsConfig } from '../config.js';
import { OpsError } from '../errors.js';
import {
  checksumOf,
  hasTransactionControl,
  isMigrationName,
  planMigrations,
  planProblems,
  type MigrationFile,
  type MigrationPlan,
} from '../migrations.js';
import { parseConnection, runPg, type PgConnection } from '../pg.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../../db/migrations/', import.meta.url));
const BOOTSTRAP_SQL = fileURLToPath(new URL('../../sql/bootstrap-migrations.sql', import.meta.url));
const RECORD_SQL = fileURLToPath(new URL('../../sql/record-migration.sql', import.meta.url));

const PSQL_FLAGS = ['--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '--quiet'];

interface MigrationOnDisk extends MigrationFile {
  path: string;
  sql: string;
}

/** Print what has been applied and what is pending. */
export async function runMigrateStatus(config: OpsConfig): Promise<MigrationPlan> {
  const connection = parseConnection(requireValue(config.dbUrl, 'FORGE_DB_URL'));
  const plan = planMigrations(await readMigrations(), await readApplied(connection, config));

  if (plan.pending.length === 0) console.log('No pending migrations.');
  for (const migration of plan.pending) console.log(`pending  ${migration.name}`);
  for (const problem of planProblems(plan)) console.log(`PROBLEM  ${problem}`);
  return plan;
}

/**
 * Apply every pending migration, each in its own transaction together with
 * the row recording it, so a migration is either applied and recorded or
 * neither. Stops at the first failure.
 *
 * Callers must have taken a backup first; the CLI and the deploy wrapper do.
 *
 * @returns the names applied.
 * @throws {OpsError} on any plan problem or failed migration.
 */
export async function runMigrateApply(config: OpsConfig): Promise<string[]> {
  const connection = parseConnection(requireValue(config.dbUrl, 'FORGE_DB_URL'));
  const migrations = await readMigrations();
  const plan = planMigrations(migrations, await readApplied(connection, config));

  const problems = planProblems(plan);
  for (const migration of plan.pending) {
    const onDisk = migrations.find((file) => file.name === migration.name);
    if (onDisk && hasTransactionControl(onDisk.sql)) {
      problems.push(`${migration.name} contains BEGIN/COMMIT; the runner provides the transaction`);
    }
  }
  if (problems.length > 0) {
    throw new OpsError(`Refusing to migrate:\n  ${problems.join('\n  ')}`);
  }

  const applied: string[] = [];
  for (const migration of plan.pending) {
    const onDisk = migrations.find((file) => file.name === migration.name);
    if (!onDisk) continue;
    console.log(`Applying ${migration.name}...`);
    await runPg(
      'psql',
      connection,
      [
        ...PSQL_FLAGS,
        '--single-transaction',
        '-v',
        `migration_name=${migration.name}`,
        '-v',
        `migration_checksum=${migration.checksum}`,
        '-f',
        onDisk.path,
        '-f',
        RECORD_SQL,
      ],
      config.pgBin,
    );
    applied.push(migration.name);
  }
  console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'Nothing to apply.');
  return applied;
}

/**
 * Create the bookkeeping table and mark migrations up to and including
 * `through` as applied without running them. For databases that were set up
 * by hand (from schema.sql and the SQL Editor) before this runner existed.
 *
 * @throws {OpsError} if `through` matches no migration file.
 */
export async function runMigrateBaseline(config: OpsConfig, through: string): Promise<string[]> {
  const connection = parseConnection(requireValue(config.dbUrl, 'FORGE_DB_URL'));
  const migrations = await readMigrations();
  const last = migrations.find((file) => file.name.startsWith(`${through}_`));
  if (!last) throw new OpsError(`No migration numbered ${through} in db/migrations/.`);

  await runPg('psql', connection, [...PSQL_FLAGS, '-f', BOOTSTRAP_SQL], config.pgBin);
  const alreadyApplied = new Set((await readApplied(connection, config)).map((m) => m.name));

  const baselined: string[] = [];
  for (const migration of migrations.filter((file) => file.name <= last.name)) {
    if (alreadyApplied.has(migration.name)) continue;
    await runPg(
      'psql',
      connection,
      [
        ...PSQL_FLAGS,
        '-v',
        `migration_name=${migration.name}`,
        '-v',
        `migration_checksum=${migration.checksum}`,
        '-f',
        RECORD_SQL,
      ],
      config.pgBin,
    );
    baselined.push(migration.name);
    console.log(`Marked as applied: ${migration.name}`);
  }
  return baselined;
}

async function readMigrations(): Promise<MigrationOnDisk[]> {
  const names = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();
  const invalid = names.filter((name) => !isMigrationName(name));
  if (invalid.length > 0) {
    throw new OpsError(`Badly named migration file(s): ${invalid.join(', ')}`);
  }
  return Promise.all(
    names.map(async (name) => {
      const path = `${MIGRATIONS_DIR}${name}`;
      const sql = await readFile(path, 'utf8');
      return { name, path, sql, checksum: checksumOf(sql) };
    }),
  );
}

async function readApplied(connection: PgConnection, config: OpsConfig): Promise<MigrationFile[]> {
  const exists = await runPg(
    'psql',
    connection,
    [
      ...PSQL_FLAGS,
      '--tuples-only',
      '--no-align',
      '-c',
      "select to_regclass('forge_meta.schema_migrations') is not null",
    ],
    config.pgBin,
  );
  if (exists.trim() !== 't') {
    throw new OpsError(
      'This database has no migration history yet. Run `make migrate-baseline THROUGH=<last applied number>` once (see docs/operations.md).',
    );
  }
  const rows = await runPg(
    'psql',
    connection,
    [
      ...PSQL_FLAGS,
      '--tuples-only',
      '--no-align',
      '--field-separator',
      '\t',
      '-c',
      'select name, checksum from forge_meta.schema_migrations order by name',
    ],
    config.pgBin,
  );
  return rows
    .split('\n')
    .map((line) => line.trim().split('\t'))
    .filter((parts): parts is [string, string] => parts.length === 2 && Boolean(parts[0]))
    .map(([name, checksum]) => ({ name, checksum }));
}
