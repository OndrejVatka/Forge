import { chmod, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { requireValue, type OpsConfig } from '../config.js';
import { OpsError } from '../errors.js';
import { parseConnection, runPg } from '../pg.js';
import { backupFileName, selectBackupsToPrune } from '../retention.js';
import { fetchRowCounts, type RowCounts } from '../row-counts.js';

/** Written next to each dump as `<dump>.json`; `restore-test` checks against it. */
export interface BackupManifest {
  createdAt: string;
  source: string;
  rowCounts: RowCounts;
}

/**
 * Schemas we own. Supabase-managed schemas (auth, storage, realtime, ...) are
 * left out: a fresh Supabase project already has them, and restoring them
 * over a live project would fight the platform.
 */
const OWNED_SCHEMAS = ['public', 'forge_meta'];

/**
 * Dump the production database, verify the archive is readable, record row
 * counts, then apply the retention policy.
 *
 * @returns the path of the new dump.
 * @throws {OpsError} if any step fails; a half-written dump is removed.
 */
export async function runBackup(config: OpsConfig, label: string): Promise<string> {
  const connection = parseConnection(requireValue(config.dbUrl, 'FORGE_DB_URL'));
  // 0700: dumps hold every ticket, comment and allowlisted email address.
  await mkdir(config.backupDir, { recursive: true, mode: 0o700 });
  await chmod(config.backupDir, 0o700);

  const now = new Date();
  const finalPath = join(config.backupDir, backupFileName(now, label));
  const partialPath = `${finalPath}.partial`;

  console.log(`Backing up ${connection.label}...`);
  try {
    const rowCounts = await fetchRowCounts(connection, config.pgBin);
    await runPg(
      'pg_dump',
      connection,
      [
        '--format=custom',
        '--no-owner',
        ...OWNED_SCHEMAS.flatMap((schema) => ['--schema', schema]),
        '--file',
        partialPath,
      ],
      config.pgBin,
    );
    await chmod(partialPath, 0o600);

    // A dump pg_restore can't list is not a backup.
    const listing = await runPg('pg_restore', null, ['--list', partialPath], config.pgBin);
    if (!/TABLE DATA public tickets/.test(listing)) {
      throw new OpsError('Backup archive has no data for public.tickets; refusing to keep it.');
    }

    const manifest: BackupManifest = {
      createdAt: now.toISOString(),
      source: connection.label,
      rowCounts,
    };
    await writeFile(`${finalPath}.json`, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await rename(partialPath, finalPath);
  } catch (error) {
    await rm(partialPath, { force: true });
    throw error;
  }

  console.log(`Backup written: ${finalPath}`);
  await pruneBackups(config, now);
  return finalPath;
}

async function pruneBackups(config: OpsConfig, now: Date): Promise<void> {
  const names = await readdir(config.backupDir);
  for (const name of selectBackupsToPrune(names, now, config.retention)) {
    await rm(join(config.backupDir, name), { force: true });
    await rm(join(config.backupDir, `${name}.json`), { force: true });
    console.log(`Pruned old backup: ${name}`);
  }
}
