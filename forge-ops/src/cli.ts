import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { runBackup } from './commands/backup.js';
import { runDeploy } from './commands/deploy.js';
import { runMigrateApply, runMigrateBaseline, runMigrateStatus } from './commands/migrate.js';
import { runRestoreProduction, runRestoreTest } from './commands/restore.js';
import { runSmoke, waitForHealth } from './commands/smoke.js';
import { loadConfig } from './config.js';
import { OpsError } from './errors.js';

const USAGE = `Usage: npm run ops -- <command>

  backup                     Back up production now (manual label)
  restore-test [file]        Restore a backup (default: newest) into FORGE_RESTORE_DB_URL and verify it
  restore-production <file>  Restore a backup over PRODUCTION (backs up first, asks to confirm)
  migrate status             List pending migrations
  migrate apply              Back up, then apply pending migrations
  migrate baseline <NNNN>    Record migrations up to NNNN as already applied (one-off)
  smoke                      /health poll + authenticated MCP smoke test against FORGE_MCP_URL
  deploy <pr> [--dry-run]    Preflight, backup, migrate, merge, wait, health, smoke

See docs/operations.md.`;

async function main(args: string[]): Promise<void> {
  loadDotenv({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
  const config = loadConfig();
  const [command, sub, arg] = args;

  switch (command) {
    case 'backup':
      await runBackup(config, 'manual');
      return;
    case 'restore-test':
      await runRestoreTest(config, sub);
      return;
    case 'restore-production':
      if (!sub) throw new OpsError(USAGE);
      await runRestoreProduction(config, sub);
      return;
    case 'migrate':
      if (sub === 'status') {
        await runMigrateStatus(config);
      } else if (sub === 'apply') {
        await runBackup(config, 'pre-migrate');
        await runMigrateApply(config);
      } else if (sub === 'baseline' && arg && /^\d{4}$/.test(arg)) {
        await runBackup(config, 'pre-baseline');
        await runMigrateBaseline(config, arg);
      } else {
        throw new OpsError(USAGE);
      }
      return;
    case 'smoke':
      await waitForHealth(config);
      await runSmoke(config);
      return;
    case 'deploy': {
      const pr = Number(sub);
      if (!Number.isInteger(pr) || pr <= 0) throw new OpsError(USAGE);
      await runDeploy(config, { pr, dryRun: args.includes('--dry-run') });
      return;
    }
    default:
      throw new OpsError(USAGE);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof OpsError) {
    console.error(`\n${error.message}`);
  } else {
    console.error('\nUnexpected failure:', error);
  }
  process.exit(1);
});
