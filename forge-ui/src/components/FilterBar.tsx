import { PRIORITIES, type Priority, type Tag } from '@forge/shared';
import type { ReactElement } from 'react';

export type PriorityFilter = Priority | 'all';

interface FilterBarProps {
  tags: Tag[];
  priority: PriorityFilter;
  onPriorityChange: (priority: PriorityFilter) => void;
  selectedTagNames: string[];
  onToggleTag: (name: string) => void;
}

const PRIORITY_OPTIONS: PriorityFilter[] = ['all', ...PRIORITIES];

export function FilterBar({
  tags,
  priority,
  onPriorityChange,
  selectedTagNames,
  onToggleTag,
}: FilterBarProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
        {PRIORITY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onPriorityChange(option)}
            className={`tap-target-sm inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
              priority === option ? 'bg-primary text-white' : 'text-muted hover:text-text'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => {
            const active = selectedTagNames.includes(tag.name);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleTag(tag.name)}
                className="tap-target-sm inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium transition-opacity"
                style={{
                  backgroundColor: active ? `${tag.color}33` : 'transparent',
                  color: tag.color,
                  borderColor: `${tag.color}55`,
                  opacity: active ? 1 : 0.6,
                }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
