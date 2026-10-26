import type { Priority } from '@forge/shared';
import type { ReactElement } from 'react';
import { PRIORITY_META } from '../lib/constants.js';

const BAR_HEIGHTS = ['h-1', 'h-[7px]', 'h-2.5'] as const;
const FILLED_BARS: Record<Priority, number> = { low: 1, medium: 2, high: 3 };
/* Only high is coloured, so the board doesn't turn into confetti. */
const FILL_CLASS: Record<Priority, string> = {
  low: 'bg-priority-low',
  medium: 'bg-priority-medium',
  high: 'bg-priority-high',
};

interface PriorityBadgeProps {
  priority: Priority;
  /** Text label beside the bars. Cards hide it; screen readers always get it. */
  showLabel?: boolean;
}

/**
 * Signal-bar priority glyph: 1–3 of three ascending bars filled.
 * @example <PriorityBadge priority="high" showLabel={false} />
 */
export function PriorityBadge({ priority, showLabel = true }: PriorityBadgeProps): ReactElement {
  const { label } = PRIORITY_META[priority];

  return (
    <span
      title={`${label} priority`}
      className="inline-flex items-center gap-1.5 text-2xs leading-none text-fg-secondary"
    >
      <span aria-hidden="true" className="inline-flex h-2.5 items-end gap-[1.5px]">
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={height}
            className={`w-[3px] rounded-[1px] ${height} ${
              index < FILLED_BARS[priority] ? FILL_CLASS[priority] : 'bg-border-strong'
            }`}
          />
        ))}
      </span>
      {showLabel ? label : <span className="sr-only">{label} priority</span>}
    </span>
  );
}
