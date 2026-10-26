import type { Comment, CommentAuthor } from '@forge/shared';
import { User, Zap } from 'lucide-react';
import type { ReactElement } from 'react';
import { isAgent } from '../lib/constants.js';
import { Markdown } from './Markdown.js';
import { Icon } from './ui/Icon.js';

/*
 * `human` isn't tied to a user, so it stays "Human" rather than the handoff's
 * "You", which would be wrong for anyone but the author.
 */
const AUTHOR_LABELS: Record<CommentAuthor, string> = {
  human: 'Human',
  'claude-code': 'Claude Code',
  codex: 'Codex',
  hermes: 'Hermes',
  system: 'System',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function Timestamp({ iso }: { iso: string }): ReactElement {
  return (
    <time dateTime={iso} className="font-mono text-2xs text-fg-tertiary">
      {formatTime(iso)}
    </time>
  );
}

function AuthorMark({ author }: { author: CommentAuthor }): ReactElement {
  return isAgent(author) ? (
    <span
      aria-hidden="true"
      className="relative z-10 inline-flex size-5 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--ai)_16%,var(--bg))] text-ai"
    >
      <Icon icon={Zap} size={11} filled />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="relative z-10 inline-flex size-5 items-center justify-center rounded-full border border-border bg-surface-hover text-fg-secondary"
    >
      <Icon icon={User} size={12} />
    </span>
  );
}

/**
 * Ticket activity as a timeline on a 1px rail. System events are a hollow dot
 * and one muted line; comments get an author mark, name, mono timestamp and a
 * markdown body. No comment cards: the rail carries the structure.
 */
export function ActivityLog({ comments }: { comments: Comment[] }): ReactElement {
  if (comments.length === 0) {
    return <p className="text-sm text-fg-tertiary">No activity yet.</p>;
  }

  return (
    // The rail is a ::before, since a <ul> may only hold <li> children.
    <ul className="relative flex flex-col gap-3.5 before:absolute before:top-2.5 before:bottom-2.5 before:left-[9.5px] before:w-px before:bg-border before:content-['']">
      {comments.map((comment) =>
        comment.author === 'system' ? (
          <li key={comment.id} className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-2.5">
            <span
              aria-hidden="true"
              className="relative z-10 size-[7px] justify-self-center rounded-full border-[1.5px] border-border-strong bg-bg"
            />
            <span className="text-xs text-fg-tertiary">
              {comment.body}
              <span className="ml-2">
                <Timestamp iso={comment.created_at} />
              </span>
            </span>
          </li>
        ) : (
          <li key={comment.id} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5">
            <AuthorMark author={comment.author} />
            <div className="min-w-0">
              <div className="flex h-5 items-baseline gap-2 leading-5">
                <span
                  className={`text-xs font-medium ${isAgent(comment.author) ? 'text-ai' : 'text-fg'}`}
                >
                  {AUTHOR_LABELS[comment.author]}
                </span>
                <Timestamp iso={comment.created_at} />
              </div>
              <div className="mt-0.5">
                <Markdown>{comment.body}</Markdown>
              </div>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
