import type { Tag } from '@forge/shared';
import type { ReactElement } from 'react';

/** Colored tag pill. Background/border derive from the tag's hex with alpha. */
export function TagChip({ tag }: { tag: Tag }): ReactElement {
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${tag.color}1a`, color: tag.color, borderColor: `${tag.color}33` }}
    >
      {tag.name}
    </span>
  );
}
