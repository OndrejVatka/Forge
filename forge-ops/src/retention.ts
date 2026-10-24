/**
 * Backup files are named `forge-<UTC timestamp>-<label>.dump`, e.g.
 * `forge-20261024T195012Z-pre-deploy-pr37.dump`. The timestamp in the name,
 * not the file's mtime, decides its age, so copying backups around keeps the
 * policy intact.
 */
const BACKUP_NAME = /^forge-(\d{8}T\d{6}Z)-([a-z0-9-]+)\.dump$/;

export interface BackupFile {
  name: string;
  createdAt: Date;
}

export interface RetentionPolicy {
  /** Backups older than this are pruned... */
  maxAgeDays: number;
  /** ...except the newest `keepMin`, which are kept whatever their age. */
  keepMin: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Format a date as the compact UTC timestamp used in backup names. */
export function formatBackupTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Build a backup filename.
 *
 * @throws {Error} when the label has characters outside [a-z0-9-].
 */
export function backupFileName(date: Date, label: string): string {
  if (!/^[a-z0-9-]+$/.test(label)) {
    throw new Error(`Backup label must be lowercase letters, digits and dashes: ${label}`);
  }
  return `forge-${formatBackupTimestamp(date)}-${label}.dump`;
}

/** Parse a backup filename; returns null for anything this tool did not write. */
export function parseBackupName(name: string): BackupFile | null {
  const match = BACKUP_NAME.exec(name);
  if (!match?.[1]) return null;
  const stamp = match[1];
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
  const createdAt = new Date(iso);
  return Number.isNaN(createdAt.getTime()) ? null : { name, createdAt };
}

/**
 * Decide which backups to delete. Files that don't match the naming scheme
 * are never selected, so pruning cannot touch anything else in the folder.
 *
 * @returns the names to delete, oldest first.
 */
export function selectBackupsToPrune(
  names: string[],
  now: Date,
  policy: RetentionPolicy,
): string[] {
  const newestFirst = names
    .map(parseBackupName)
    .filter((file): file is BackupFile => file !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const cutoff = now.getTime() - policy.maxAgeDays * DAY_MS;
  return newestFirst
    .slice(policy.keepMin)
    .filter((file) => file.createdAt.getTime() < cutoff)
    .map((file) => file.name)
    .reverse();
}
