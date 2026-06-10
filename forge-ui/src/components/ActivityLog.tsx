import type { Comment, CommentAuthor } from '@forge/shared';
import type { ReactElement } from 'react';
import { Markdown } from './Markdown.js';

const AUTHOR_LABELS: Record<CommentAuthor, string> = {
  human: 'Human',
  'claude-code': 'Claude Code',
  codex: 'Codex',
  system: 'System',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityLog({ comments }: { comments: Comment[] }): ReactElement {
  if (comments.length === 0) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((comment) =>
        comment.author === 'system' ? (
          <li key={comment.id} className="text-xs italic text-muted">
            {comment.body} · {formatTime(comment.created_at)}
          </li>
        ) : (
          <li key={comment.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-text">{AUTHOR_LABELS[comment.author]}</span>
              <span>{formatTime(comment.created_at)}</span>
            </div>
            <Markdown>{comment.body}</Markdown>
          </li>
        ),
      )}
    </ul>
  );
}
