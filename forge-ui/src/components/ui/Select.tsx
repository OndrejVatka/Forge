import { ChevronDown } from 'lucide-react';
import type { ReactElement, SelectHTMLAttributes } from 'react';
import { Icon } from './Icon.js';

export type SelectSize = 'sm' | 'md';
export type SelectVariant = 'default' | 'ghost';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** sm 24px · md 28px. */
  size?: SelectSize;
  /** ghost drops the border, for the toolbar project picker and ticket properties. */
  variant?: SelectVariant;
}

const VARIANT_CLASSES: Record<SelectVariant, string> = {
  default: 'border-border bg-surface shadow-card hover:border-border-strong',
  ghost: 'border-transparent bg-transparent hover:bg-surface-hover',
};

/**
 * The v2 picker: a native <select> (keeps platform pickers on touch) with the
 * arrow replaced by a lucide chevron. `className` applies to the wrapper.
 * @example <Select variant="ghost" value={id} onChange={handleChange}>{options}</Select>
 */
export function Select({
  size = 'md',
  variant = 'default',
  className,
  children,
  ...rest
}: SelectProps): ReactElement {
  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <select
        className={[
          'tap-target w-full cursor-pointer appearance-none rounded-sm border pr-7 pl-2.5',
          'font-sans font-medium text-fg transition-[color,background-color,border-color] duration-[120ms]',
          'focus:border-accent-text disabled:cursor-default disabled:opacity-45',
          size === 'sm' ? 'h-6 text-xs' : 'h-7 text-sm',
          VARIANT_CLASSES[variant],
        ].join(' ')}
        {...rest}
      >
        {children}
      </select>
      <Icon
        icon={ChevronDown}
        size={14}
        className="pointer-events-none absolute right-2 text-fg-tertiary"
      />
    </span>
  );
}
