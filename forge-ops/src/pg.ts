import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { OpsError } from './errors.js';

const execFileAsync = promisify(execFile);

/** Homebrew's libpq is keg-only, so its tools are not on PATH by default. */
const HOMEBREW_LIBPQ_BIN = '/opt/homebrew/opt/libpq/bin';

export type PgTool = 'pg_dump' | 'pg_restore' | 'psql';

/**
 * A connection split so the password never appears in argv, where `ps` and
 * shell history would show it. libpq reads it from PGPASSWORD instead.
 */
export interface PgConnection {
  /** The connection URL with the password removed; safe to pass as `--dbname`. */
  dbname: string;
  password?: string;
  /** host:port/database as user — for logs and same-database checks. */
  label: string;
}

/**
 * Split a postgres:// URL into a password-free dbname and the password.
 *
 * @throws {OpsError} when the URL has no host.
 */
export function parseConnection(url: string): PgConnection {
  const parsed = new URL(url);
  if (!parsed.hostname) throw new OpsError('Database URL has no host.');
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
  parsed.password = '';
  const user = decodeURIComponent(parsed.username);
  const database = parsed.pathname.replace(/^\//, '') || 'postgres';
  return {
    dbname: parsed.toString(),
    password,
    label: `${parsed.hostname}:${parsed.port || '5432'}/${database} as ${user}`,
  };
}

/** Locate a Postgres client binary: `PG_BIN`, then Homebrew's libpq, then PATH. */
export function resolvePgTool(tool: PgTool, pgBin?: string): string {
  if (pgBin) return join(pgBin, tool);
  const brewPath = join(HOMEBREW_LIBPQ_BIN, tool);
  return existsSync(brewPath) ? brewPath : tool;
}

/**
 * Run a Postgres client tool, against a connection or (for `pg_restore --list`)
 * none. No shell is involved, so arguments are never re-parsed.
 *
 * @returns the tool's stdout.
 * @throws {OpsError} with the tool's stderr when it exits non-zero.
 */
export async function runPg(
  tool: PgTool,
  connection: PgConnection | null,
  args: string[],
  pgBin?: string,
): Promise<string> {
  const binary = resolvePgTool(tool, pgBin);
  try {
    // --dbname goes first: options after a positional argument (pg_restore's
    // archive path) are not reliably parsed on every platform.
    const target = connection ? ['--dbname', connection.dbname] : [];
    const { stdout } = await execFileAsync(binary, [...target, ...args], {
      env: { ...process.env, PGPASSWORD: connection?.password ?? '', PGAPPNAME: 'forge-ops' },
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    if (isMissingBinary(error)) {
      throw new OpsError(
        `${tool} not found. Install it with \`brew install libpq\` or set PG_BIN.`,
      );
    }
    const stderr = (error as { stderr?: string }).stderr?.trim();
    const against = connection ? ` against ${connection.label}` : '';
    throw new OpsError(`${tool} failed${against}:\n${stderr || String(error)}`);
  }
}

function isMissingBinary(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}
