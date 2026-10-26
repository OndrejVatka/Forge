import type { TicketStatus } from '@forge/shared';
import type { ReactElement } from 'react';

/* Backlog is hollow; the rest are filled. Mono palettes lean on lightness. */
const STATUS_CLASSES: Record<TicketStatus, string> = {
  backlog: 'border-[1.5px] border-status-backlog',
  in_dev: 'bg-status-in-dev',
  review: 'bg-status-review',
  done: 'bg-status-done',
};

/**
 * The 9px rounded-square status glyph. Decorative: always sits next to the
 * status label.
 * @example <StatusMark status="review" />
 */
export function StatusMark({ status }: { status: TicketStatus }): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-[9px] shrink-0 rounded-[2.5px] ${STATUS_CLASSES[status]}`}
    />
  );
}
