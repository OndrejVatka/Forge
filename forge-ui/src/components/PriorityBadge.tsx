import type { Priority } from '@forge/shared';
import type { ReactElement } from 'react';
import { PRIORITY_META } from '../lib/constants.js';

export function PriorityBadge({ priority }: { priority: Priority }): ReactElement {
  const meta = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
