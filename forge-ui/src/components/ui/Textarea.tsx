import type { ReactElement, TextareaHTMLAttributes } from 'react';
import { FIELD_CHROME } from './field-classes.js';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** No border, background or ring: for inline editing inside a modal body. */
  bare?: boolean;
}

/**
 * The v2 multi-line field for markdown descriptions and comments.
 * @example <Textarea rows={2} placeholder="Add a comment…" value={draft} onChange={handleChange} />
 */
export function Textarea({
  bare = false,
  rows = 3,
  className,
  ...rest
}: TextareaProps): ReactElement {
  return (
    <textarea
      rows={rows}
      className={[
        'block w-full resize-y leading-[1.45]',
        bare
          ? 'rounded-sm border border-transparent bg-transparent p-0 text-sm text-fg outline-hidden placeholder:text-fg-tertiary'
          : `px-2.5 py-[7px] ${FIELD_CHROME}`,
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}
