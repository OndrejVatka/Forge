import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { Icon } from './Icon.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label' | 'title'
> {
  /** primary: one per view. secondary: neutral confirm. ghost: toolbar, nav, cancel. danger: destructive. */
  variant?: ButtonVariant;
  /** sm 24px · md 28px · lg 32px (auth screens only). */
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Trailing keyboard hint, e.g. "C" or "⌘↵". Only show it once the shortcut is wired up. */
  shortcut?: string;
  fullWidth?: boolean;
}

/*
 * An icon-only button has no visible text, so `label` (aria-label + tooltip)
 * is required for it and optional otherwise.
 */
export type ButtonProps = ButtonBaseProps &
  (
    | { children: ReactNode; label?: string }
    | { children?: undefined; icon: LucideIcon; label: string }
  );

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-accent-fg hover:bg-accent-hover',
  secondary:
    'border-border bg-surface text-fg shadow-card hover:border-border-strong hover:bg-surface-hover',
  ghost: 'border-transparent bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg',
  danger: 'border-transparent bg-transparent text-danger hover:bg-danger/12',
};

const SIZE_CLASSES: Record<ButtonSize, { box: string; square: string; text: string }> = {
  sm: { box: 'h-6 px-2', square: 'h-6 w-6', text: 'text-xs' },
  md: { box: 'h-7 px-2.5', square: 'h-7 w-7', text: 'text-sm' },
  lg: { box: 'h-8 px-3.5', square: 'h-8 w-8', text: 'text-sm' },
};

/**
 * The v2 button. Defaults to `type="button"` so it never submits a form by
 * accident; pass `type="submit"` explicitly.
 * @example <Button icon={Plus} onClick={open}>New ticket</Button>
 * @example <Button variant="ghost" icon={X} label="Close" onClick={onClose} />
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  shortcut,
  fullWidth = false,
  label,
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps): ReactElement {
  const isIconOnly = icon !== undefined && children === undefined;
  const sizing = SIZE_CLASSES[size];

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'tap-target inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap',
        'rounded-sm border font-medium tracking-[-0.012em] transition-[color,background-color,border-color] duration-[120ms]',
        'disabled:cursor-default disabled:opacity-45',
        VARIANT_CLASSES[variant],
        sizing.text,
        isIconOnly ? `tap-target-square ${sizing.square}` : sizing.box,
        fullWidth ? 'w-full' : '',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {icon && <Icon icon={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
      {shortcut && (
        <kbd className="-mr-1 ml-0.5 inline-flex pointer-coarse:hidden h-4 items-center rounded-xs bg-[color-mix(in_oklch,currentColor_14%,transparent)] px-1 font-mono text-[10px] font-medium opacity-85">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
