import type { Priority } from '@forge/shared';
import type { ReactElement } from 'react';
import { priorityMeta } from '../lib/constants.js';
import { useTheme } from '../theme/ThemeProvider.js';

export function PriorityBadge({ priority }: { priority: Priority }): ReactElement {
  const { theme } = useTheme();
  const meta = priorityMeta(theme, priority);

  // Molten swaps the dot for a diamond glyph and tints the whole badge, where
  // the base skin keeps a muted label beside a coloured dot.
  if (theme === 'molten') {
    return (
      <span className="inline-flex items-center gap-1 text-[13px]" style={{ color: meta.color }}>
        <span aria-hidden="true">◆</span>
        {meta.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
