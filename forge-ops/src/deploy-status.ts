/** One entry of GitHub's combined commit status. */
export interface CommitStatus {
  context: string;
  state: 'success' | 'pending' | 'failure' | 'error';
}

export interface DeployVerdict {
  state: 'success' | 'pending' | 'failure';
  detail: string;
}

/**
 * Decide whether the hosts have finished deploying a commit, from the
 * statuses Vercel and Railway post to GitHub. Railway posts one even when it
 * skips a build because nothing in forge-mcp changed, so waiting on it never
 * hangs on a UI-only merge.
 *
 * Contexts that are not in `required` are ignored. A required context that
 * hasn't appeared yet counts as pending.
 */
export function evaluateDeployStatuses(
  statuses: CommitStatus[],
  required: string[],
): DeployVerdict {
  const byContext = new Map(statuses.map((status) => [status.context, status.state]));

  const failed = required.filter((context) => {
    const state = byContext.get(context);
    return state === 'failure' || state === 'error';
  });
  if (failed.length > 0) return { state: 'failure', detail: `failed: ${failed.join(', ')}` };

  const waiting = required.filter((context) => byContext.get(context) !== 'success');
  if (waiting.length > 0) return { state: 'pending', detail: `waiting on: ${waiting.join(', ')}` };

  return { state: 'success', detail: `deployed: ${required.join(', ')}` };
}
