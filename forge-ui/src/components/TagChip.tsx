import type { Tag } from '@forge/shared';
import { X } from 'lucide-react';
import type { ReactElement } from 'react';
import { Icon } from './ui/Icon.js';

interface TagChipProps {
  tag: Pick<Tag, 'name' | 'color'>;
  /** false = an unselected filter or toggle (dimmed). */
  active?: boolean;
  /** Makes the chip a toggle button (filters, ticket tag pickers). */
  onClick?: () => void;
  /** Adds a trailing remove button (Settings tag manager). */
  onRemove?: () => void;
}

/**
 * Neutral 20px chip with a 6px dot. The tag's user-picked hex only colours
 * the dot, never the chip, so any colour stays legible on every theme.
 * @example <TagChip tag={tag} active={isSelected} onClick={toggle} />
 */
export function TagChip({ tag, active = true, onClick, onRemove }: TagChipProps): ReactElement {
  const chipClasses = [
    'inline-flex h-5 items-center gap-[5px] rounded-xs border text-2xs leading-none font-medium whitespace-nowrap',
    'transition-[color,background-color,border-color] duration-[120ms]',
    onRemove ? 'pr-[3px] pl-[7px]' : 'px-[7px]',
    active ? 'border-border-strong text-fg-secondary' : 'border-border text-fg-tertiary',
    active && onClick ? 'bg-surface-hover' : '',
  ].join(' ');

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${active ? '' : 'opacity-55'}`}
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={`tap-target-sm cursor-pointer hover:text-fg-secondary ${chipClasses}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={chipClasses}>
      {content}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${tag.name}`}
          title={`Remove ${tag.name}`}
          className="inline-flex size-3.5 cursor-pointer items-center justify-center rounded-[2px] text-fg-tertiary hover:bg-surface-hover hover:text-fg"
        >
          <Icon icon={X} size={11} />
        </button>
      )}
    </span>
  );
}
