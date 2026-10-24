import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { requireValue, type OpsConfig } from '../config.js';
import { OpsError } from '../errors.js';
import { parseConnection, runPg, type PgConnection } from '../pg.js';
import { parseBackupName } from '../retention.js';
import { diffRowCounts, fetchRowCounts } from '../row-counts.js';
import type { BackupManifest } from './backup.js';

const manifestSchema = z.object({
  createdAt: z.string(),
  source: z.string(),
  rowCounts: z.record(z.number().int().nonnegative()),
});

/** Public tables with RLS switched off. RLS is the only thing guarding user data. */
const TABLES_WITHOUT_RLS_SQL = `
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1`;

/**
 * Restore a backup into the scratch database and prove it worked: every
 * table's row count must match the manifest, and every public table must
 * still have RLS enabled.
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
  await runPg(
    'pg_restore',
    target,
    ['--clean', '--if-exists', '--no-owner', '--exit-on-error', '--single-transaction', dumpPath],
    config.pgBin,
  );

  const mismatches = diffRowCounts(manifest.rowCounts, await fetchRowCounts(target, config.pgBin));
  if (mismatches.length > 0) {
    throw new OpsError(`Restored row counts differ from the backup:\n  ${mismatches.join('\n  ')}`);
  }

  const withoutRls = (
    await runPg(
      'psql',
      target,
      ['--no-psqlrc', '--tuples-only', '--no-align', '-c', TABLES_WITHOUT_RLS_SQL],
      config.pgBin,
    )
  ).trim();
  if (withoutRls) {
    throw new OpsError(`Restored tables are missing RLS: ${withoutRls.split('\n').join(', ')}`);
  }

  const tables = Object.entries(manifest.rowCounts)
    .map(([table, count]) => `${table}=${count}`)
    .join(' ');
  console.log(`Restore verified: row counts match (${tables}) and RLS is on for every table.`);
}

/**
 * Refuse to restore over the production database. Restoring runs
 * `--clean`, which drops every object in the dump first.
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
