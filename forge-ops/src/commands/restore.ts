import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { requireValue, type OpsConfig } from '../config.js';
import { OpsError } from '../errors.js';
import { parseConnection, runPg, type PgConnection } from '../pg.js';
import { filterRestoreList } from '../restore-list.js';
import { parseBackupName } from '../retention.js';
import { diffRowCounts, fetchRowCounts } from '../row-counts.js';
import { runBackup, type BackupManifest } from './backup.js';

const RESET_SQL = fileURLToPath(new URL('../../sql/reset-restore-target.sql', import.meta.url));
const PUBLICATION_SQL = fileURLToPath(
  new URL('../../sql/ensure-realtime-publication.sql', import.meta.url),
);

const manifestSchema = z.object({
  createdAt: z.string(),
  source: z.string(),
  rowCounts: z.record(z.string(), z.number().int().nonnegative()),
});

const PSQL_QUERY = ['--no-psqlrc', '--tuples-only', '--no-align', '-v', 'ON_ERROR_STOP=1'];

/** Public tables with RLS switched off. RLS is the only thing guarding user data. */
const TABLES_WITHOUT_RLS_SQL = `
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1`;

const REALTIME_TABLES_SQL = `
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('tickets', 'comments')
order by 1`;

/**
 * Restore a backup into the scratch database and prove it worked.
 *
 * @param file a dump path; defaults to the newest backup in FORGE_BACKUP_DIR.
 * @throws {OpsError} if the target looks like production or verification fails.
 */
export async function runRestoreTest(config: OpsConfig, file?: string): Promise<void> {
  const target = parseConnection(requireValue(config.restoreDbUrl, 'FORGE_RESTORE_DB_URL'));
  assertNotProduction(target, config.dbUrl);

  const dumpPath = file ?? (await newestBackup(config.backupDir));
  const manifest = await readManifest(dumpPath);

  console.log(`Restoring ${dumpPath}\n  into ${target.label}...`);
  await restoreInto(target, dumpPath, config);
  await verifyRestore(target, manifest, config);
}

/**
 * Restore a backup over PRODUCTION. Same code path as `restore-test`, so the
 * procedure that is rehearsed is the one that runs. Takes a fresh backup of
 * the current state first, and asks the operator to type the project ref.
 *
 * @throws {OpsError} without a terminal to confirm on, on a wrong answer, or
 *   if the restore fails (in which case production is left as it was).
 */
export async function runRestoreProduction(config: OpsConfig, file: string): Promise<void> {
  const target = parseConnection(requireValue(config.dbUrl, 'FORGE_DB_URL'));
  const manifest = await readManifest(file);

  if (!process.stdin.isTTY) {
    throw new OpsError('restore-production must be confirmed interactively in a terminal.');
  }
  const expected = target.label.split(' as ')[1] ?? target.label;
  console.log(`This REPLACES every Forge table in production (${target.label})`);
  console.log(`with the contents of ${file} (taken ${manifest.createdAt}).`);
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question(`Type "${expected}" to continue: `);
  prompt.close();
  if (answer.trim() !== expected)
    throw new OpsError('Confirmation did not match. Nothing changed.');

  // The broken current state may still hold writes newer than the backup.
  await runBackup(config, 'pre-restore');

  console.log('Restoring...');
  await restoreInto(target, file, config);
  await verifyRestore(target, manifest, config);
  console.log('Production restored. Run `make smoke` and check the board.');
}

/**
 * Replace the target's Forge objects with a backup's, in one transaction:
 * reset, restore, then re-add the Realtime publication. If any statement
 * fails, the target is left exactly as it was.
 *
 * The archive is converted to a plain SQL script first because pg_restore
 * can't include our reset and publication steps in its own transaction. The
 * script holds every row, so it lives in a private temp dir removed after.
 */
async function restoreInto(
  target: PgConnection,
  dumpPath: string,
  config: OpsConfig,
): Promise<void> {
  const workDir = await mkdtemp(join(tmpdir(), 'forge-restore-'));
  try {
    const listPath = join(workDir, 'restore.list');
    const scriptPath = join(workDir, 'restore.sql');
    const list = await runPg('pg_restore', null, ['--list', dumpPath], config.pgBin);
    await writeFile(listPath, filterRestoreList(list), { mode: 0o600 });
    await runPg(
      'pg_restore',
      null,
      ['--no-owner', '--use-list', listPath, '--file', scriptPath, dumpPath],
      config.pgBin,
    );
    await runPg(
      'psql',
      target,
      [
        '--no-psqlrc',
        '--quiet',
        '-v',
        'ON_ERROR_STOP=1',
        '--single-transaction',
        '-f',
        RESET_SQL,
        '-f',
        scriptPath,
        '-f',
        PUBLICATION_SQL,
      ],
      config.pgBin,
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Prove a restore worked: row counts match the backup's manifest, every
 * public table has RLS on, and the board's tables are in the Realtime
 * publication.
 *
 * @throws {OpsError} listing what doesn't match.
 */
async function verifyRestore(
  target: PgConnection,
  manifest: BackupManifest,
  config: OpsConfig,
): Promise<void> {
  const mismatches = diffRowCounts(manifest.rowCounts, await fetchRowCounts(target, config.pgBin));
  if (mismatches.length > 0) {
    throw new OpsError(`Restored row counts differ from the backup:\n  ${mismatches.join('\n  ')}`);
  }

  const query = async (sql: string): Promise<string[]> =>
    (await runPg('psql', target, [...PSQL_QUERY, '-c', sql], config.pgBin))
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  const withoutRls = await query(TABLES_WITHOUT_RLS_SQL);
  if (withoutRls.length > 0) {
    throw new OpsError(`Restored tables are missing RLS: ${withoutRls.join(', ')}`);
  }

  const realtime = await query(REALTIME_TABLES_SQL);
  if (realtime.join(',') !== 'comments,tickets') {
    throw new OpsError(
      `Realtime publication is missing tables (has: ${realtime.join(', ') || 'none'}).`,
    );
  }

  const tables = Object.entries(manifest.rowCounts)
    .map(([table, count]) => `${table}=${count}`)
    .join(' ');
  console.log(
    `Restore verified: row counts match (${tables}), RLS is on for every table, Realtime is set up.`,
  );
}

/**
 * Refuse to run the restore test against production: a restore drops and
 * recreates every Forge table.
 */
export function assertNotProduction(target: PgConnection, productionUrl?: string): void {
  if (productionUrl && parseConnection(productionUrl).label === target.label) {
    throw new OpsError('FORGE_RESTORE_DB_URL points at the production database. Refusing.');
  }
}

async function newestBackup(dir: string): Promise<string> {
  const newest = (await readdir(dir))
    .map(parseBackupName)
    .filter((backup) => backup !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!newest) throw new OpsError(`No backups found in ${dir}. Run \`make backup\` first.`);
  return join(dir, newest.name);
}

async function readManifest(dumpPath: string): Promise<BackupManifest> {
  try {
    return manifestSchema.parse(JSON.parse(await readFile(`${dumpPath}.json`, 'utf8')));
  } catch {
    throw new OpsError(`No valid manifest at ${dumpPath}.json; cannot verify the restore.`);
  }
}
