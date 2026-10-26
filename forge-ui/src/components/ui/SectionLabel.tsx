import type { ReactElement, ReactNode } from 'react';

interface SectionLabelProps {
  /** Heading level for the document outline; `div` when it only labels a group. */
  as?: 'h2' | 'h3' | 'div';
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * The v2 section label: 11px, medium, uppercase, +0.04em, tertiary.
 * @example <SectionLabel>Activity</SectionLabel>
 */
export function SectionLabel({
  as: Tag = 'h3',
  id,
  className,
  children,
}: SectionLabelProps): ReactElement {
  return (
    <Tag
      id={id}
      className={`text-2xs font-medium tracking-[0.04em] text-fg-tertiary uppercase ${className ?? ''}`}
    >
      {children}
    </Tag>
  );
}
