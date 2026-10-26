import type { Priority, Tag } from '@forge/shared';
import type { ReactElement } from 'react';
import { TagChip } from './TagChip.js';
import { SegmentedControl, type SegmentOption } from './ui/SegmentedControl.js';

export type PriorityFilter = Priority | 'all';

interface FilterBarProps {
  tags: Tag[];
  priority: PriorityFilter;
  onPriorityChange: (priority: PriorityFilter) => void;
  selectedTagNames: string[];
  onToggleTag: (name: string) => void;
}

const PRIORITY_OPTIONS: readonly SegmentOption<PriorityFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

/** Board filters: a priority segmented control, then toggleable tag chips. */
export function FilterBar({
  tags,
  priority,
  onPriorityChange,
  selectedTagNames,
  onToggleTag,
}: FilterBarProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SegmentedControl
        label="Priority"
        options={PRIORITY_OPTIONS}
        value={priority}
        onChange={onPriorityChange}
      />

      {tags.length > 0 && (
        <div role="group" aria-label="Tags" className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              active={selectedTagNames.includes(tag.name)}
              onClick={() => onToggleTag(tag.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
