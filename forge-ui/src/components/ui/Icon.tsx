import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

interface IconProps {
  icon: LucideIcon;
  /** px; 16 in md/lg controls, 14 in sm controls, 13 in segments. */
  size?: number;
  /** Solid instead of stroked. Only the Zap agent marker uses this. */
  filled?: boolean;
  className?: string;
}

/**
 * A lucide icon at the v2 stroke weight (1.75). Decorative: always hidden from
 * assistive tech, so give the surrounding control an accessible name.
 * @example <Icon icon={Plus} size={14} />
 */
export function Icon({
  icon: LucideGlyph,
  size = 16,
  filled = false,
  className,
}: IconProps): ReactElement {
  return (
    <LucideGlyph
      size={size}
      strokeWidth={1.75}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      aria-hidden="true"
      className={`block shrink-0 ${className ?? ''}`}
    />
  );
}
