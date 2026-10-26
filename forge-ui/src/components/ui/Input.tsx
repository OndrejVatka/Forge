import type { InputHTMLAttributes, ReactElement } from 'react';
import { FIELD_CHROME } from './field-classes.js';

export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** sm 24px · md 28px · lg 32px (auth screens only). */
  size?: InputSize;
  /** Monospace, for identifiers such as slugs and prefixes. */
  mono?: boolean;
}

const HEIGHT: Record<InputSize, string> = { sm: 'h-6', md: 'h-7', lg: 'h-8' };

/**
 * The v2 single-line field. Full width by default; size its container.
 * @example <Input type="email" size="lg" value={email} onChange={handleChange} />
 */
export function Input({
  size = 'md',
  mono = false,
  type = 'text',
  className,
  ...rest
}: InputProps): ReactElement {
  return (
    <input
      type={type}
      className={[
        'tap-target block w-full px-2.5',
        FIELD_CHROME,
        HEIGHT[size],
        mono ? 'font-mono' : 'font-sans',
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}
