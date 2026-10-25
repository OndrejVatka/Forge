import { z } from 'zod';
import { run } from '../command.js';
import { requireValue, type OpsConfig } from '../config.js';
import { evaluateDeployStatuses } from '../deploy-status.js';
import { OpsError } from '../errors.js';
import { planProblems } from '../migrations.js';
import { runBackup } from './backup.js';
import { runMigrateApply, runMigrateStatus } from './migrate.js';
import { runSmoke, waitForHealth } from './smoke.js';

const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  state: z.string(),
  isDraft: z.boolean(),
  baseRefName: z.string(),
  headRefOid: z.string(),
  mergeStateStatus: z.string(),
});

const commitStatusSchema = z.object({
  statuses: z.array(
    z.object({
      context: z.string(),
      state: z.enum(['success', 'pending', 'failure', 'error']),
    }),
  ),
});

const STATUS_POLL_MS = 15_000;
const STATUS_TIMEOUT_MS = 15 * 60_000;

export interface DeployOptions {
  pr: number;
  /** Preflight and backup only: no migrations applied, nothing merged. */
  dryRun: boolean;
}

/**
 * The one way to ship to production. Railway and Vercel deploy whatever lands
 * on `main`, so "deploying" means merging the PR; this wraps that merge in
 * the steps around it:
 *
 *   preflight → backup → migrations → merge → wait for hosts → /health → smoke
 *
 * Every step must pass before the next starts, and any failure exits non-zero
 * naming the step. Migrations run before the merge, so they must keep the
 * currently deployed code working (expand first, contract in a later PR).
 *
 * @throws {OpsError} at the first failed step.
 */
export async function runDeploy(config: OpsConfig, options: DeployOptions): Promise<void> {
  // Fail on missing config now, not after the merge.
  requireValue(config.dbUrl, 'FORGE_DB_URL');
  requireValue(config.mcpUrl, 'FORGE_MCP_URL');
  requireValue(config.smokeApiKey, 'FORGE_SMOKE_API_KEY');

  step('1/7 Preflight');
  const pr = await preflight(options.pr);
  const plan = await runMigrateStatus(config);
  const problems = planProblems(plan);
  if (problems.length > 0) throw new OpsError(`Migration problems:\n  ${problems.join('\n  ')}`);

  step('2/7 Backup');
  const backupPath = await runBackup(config, `pre-deploy-pr${pr.number}`);

  if (options.dryRun) {
    console.log(`\nDry run complete. ${plan.pending.length} migration(s) would be applied.`);
    return;
  }

  step('3/7 Migrations');
  await runMigrateApply(config);

  step('4/7 Merge');
  await run('gh', [
    'pr',
    'merge',
    String(pr.number),
    '--merge',
    // Refuse if someone pushed to the PR after preflight checked it.
    '--match-head-commit',
    pr.headRefOid,
  ]);
  const mergeSha = await mergeCommitOf(pr.number);
  console.log(`Merged as ${mergeSha.slice(0, 7)}.`);

  step('5/7 Waiting for Railway and Vercel');
  await waitForDeployStatuses(mergeSha, config.deployStatusContexts);

  step('6/7 Health');
  await waitForHealth(config);

  step('7/7 Smoke test');
  await runSmoke(config);

  console.log(`\nDeployed PR #${pr.number} (${mergeSha.slice(0, 7)}). Backup: ${backupPath}`);
}

async function preflight(prNumber: number): Promise<z.infer<typeof pullRequestSchema>> {
  const pr = pullRequestSchema.parse(
    JSON.parse(
      await run('gh', [
        'pr',
        'view',
        String(prNumber),
        '--json',
        'number,title,url,state,isDraft,baseRefName,headRefOid,mergeStateStatus',
      ]),
    ),
  );
  console.log(`PR #${pr.number}: ${pr.title}\n${pr.url}`);

  if (pr.state !== 'OPEN') throw new OpsError(`PR is ${pr.state}, not OPEN.`);
  if (pr.isDraft) throw new OpsError('PR is a draft.');
  if (pr.baseRefName !== 'main') throw new OpsError(`PR targets ${pr.baseRefName}, not main.`);
  // CLEAN: mergeable, checks green, nothing blocking. Anything else needs a human look.
  if (pr.mergeStateStatus !== 'CLEAN') {
    throw new OpsError(
      `PR merge state is ${pr.mergeStateStatus}, not CLEAN. Wait for CI or fix conflicts.`,
    );
  }

  // Migrations are read from disk, so the checkout must be exactly the PR's head.
  const head = await run('git', ['rev-parse', 'HEAD']);
  if (head !== pr.headRefOid) {
    throw new OpsError(
      `Local HEAD ${head.slice(0, 7)} is not the PR head ${pr.headRefOid.slice(0, 7)}. Run \`gh pr checkout ${pr.number}\` and pull.`,
    );
  }
  if ((await run('git', ['status', '--porcelain'])) !== '') {
    throw new OpsError('Working tree has uncommitted changes.');
  }
  return pr;
}

async function mergeCommitOf(prNumber: number): Promise<string> {
  const view = z
    .object({ mergeCommit: z.object({ oid: z.string() }).nullable() })
    .parse(JSON.parse(await run('gh', ['pr', 'view', String(prNumber), '--json', 'mergeCommit'])));
  if (!view.mergeCommit) throw new OpsError('PR reports no merge commit after merging.');
  return view.mergeCommit.oid;
}

async function waitForDeployStatuses(sha: string, required: string[]): Promise<void> {
  const deadline = Date.now() + STATUS_TIMEOUT_MS;
  let lastDetail = '';
  while (Date.now() < deadline) {
    const { statuses } = commitStatusSchema.parse(
      JSON.parse(await run('gh', ['api', `repos/{owner}/{repo}/commits/${sha}/status`])),
    );
    const verdict = evaluateDeployStatuses(statuses, required);
    if (verdict.state === 'success') {
      console.log(verdict.detail);
      return;
    }
    if (verdict.state === 'failure') {
      throw new OpsError(`Host deploy ${verdict.detail}. Check the Railway/Vercel dashboards.`);
    }
    if (verdict.detail !== lastDetail) console.log(verdict.detail);
    lastDetail = verdict.detail;
    await new Promise((resolve) => setTimeout(resolve, STATUS_POLL_MS));
  }
  throw new OpsError(`Hosts did not finish deploying within 15 minutes (${lastDetail}).`);
}

function step(title: string): void {
  console.log(`\n== ${title}`);
}
