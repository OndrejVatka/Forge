import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { OpsError } from './errors.js';

const execFileAsync = promisify(execFile);

/**
 * Run a command (`gh` or `git`) without a shell.
 *
 * @returns trimmed stdout.
 * @throws {OpsError} with stderr when it exits non-zero.
 */
export async function run(command: 'gh' | 'git', args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new OpsError(`${command} ${args[0] ?? ''} failed:\n${stderr || String(error)}`);
  }
}
