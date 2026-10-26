import type { LucideIcon } from 'lucide-react';
import { useRef, type KeyboardEvent, type ReactElement } from 'react';
import { Icon } from './Icon.js';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name for the group, e.g. "Priority". */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Show option text; when false, icon-only segments use the label as their name. */
  showLabels?: boolean;
  /** Stretch to the container width with equal segments. */
  block?: boolean;
  className?: string;
}

/**
 * The v2 segmented control (FilterBar priority, theme mode). The selection is a
 * raised neutral pill, never accent-filled. Behaves as a radio group: one tab
 * stop, arrow keys move and select.
 * @example <SegmentedControl label="Priority" options={opts} value={p} onChange={setP} />
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  showLabels = true,
  block = false,
  className,
}: SegmentedControlProps<T>): ReactElement {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const current = options.findIndex((option) => option.value === value);
    const nextIndex = (current + step + options.length) % options.length;
    const next = options[nextIndex];
    if (!next) return;
    onChange(next.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={[
        'tap-target-sm h-7 gap-0.5 rounded-sm border border-border bg-bg-subtle p-0.5',
        block ? 'flex w-full' : 'inline-flex',
        className ?? '',
      ].join(' ')}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={showLabels ? undefined : option.label}
            title={showLabels ? undefined : option.label}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={[
              'inline-flex cursor-pointer items-center justify-center gap-[5px] rounded-xs text-xs font-medium',
              'transition-[color,background-color] duration-[120ms]',
              showLabels ? 'px-[9px]' : 'px-2',
              block ? 'flex-1' : '',
              isSelected
                ? 'bg-surface-raised text-fg shadow-[0_0_0_1px_var(--border),var(--shadow-card)]'
                : 'text-fg-tertiary hover:text-fg-secondary',
            ].join(' ')}
          >
            {option.icon && <Icon icon={option.icon} size={13} />}
            {showLabels && option.label}
          </button>
        );
      })}
    </div>
  );
}
