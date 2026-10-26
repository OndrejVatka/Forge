/*
 * Shared chrome for Input and Textarea: rest `--border`, hover `--border-strong`,
 * focus `--accent-text` border plus a 3px `--accent-soft` ring. The ring is the
 * visible focus indicator, so the global outline is dropped (`outline-hidden`
 * keeps it in forced-colors mode).
 */
export const FIELD_CHROME =
  'rounded-sm border border-border bg-surface text-sm text-fg shadow-card outline-hidden ' +
  'placeholder:text-fg-tertiary transition-[border-color,box-shadow] duration-[120ms] ' +
  'hover:border-border-strong focus:border-accent-text focus:ring-3 focus:ring-accent-soft ' +
  'disabled:cursor-default disabled:opacity-45';
