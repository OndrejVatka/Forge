import type { ReactElement } from 'react';
import { useTheme } from '../theme/ThemeProvider.js';

/*
 * Decorative pixel-art band for the molten theme: metal pours hot on the left
 * and cools to dark iron on the right, with four ingots roughly over the four
 * board columns, so the art restates the backlog-to-done progression.
 *
 * The handoff specced 120px, cut to 64px here and hidden below `sm` — on a
 * Kanban board a full-height banner costs about two ticket cards of vertical
 * space, which is a bad trade on a phone.
 *
 * `none` rather than `slice`: the left-to-right cooling has to span the full
 * width to mean anything, and `slice` crops the cold end off on wide screens.
 * Every element is an axis-aligned rectangle, so the horizontal stretch reads
 * as wider pixels rather than as distortion.
 */
export function MoltenBanner(): ReactElement | null {
  const { theme } = useTheme();
  if (theme !== 'molten') return null;

  return (
    <div aria-hidden="true" className="hidden h-16 w-full overflow-hidden sm:block">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 240 16"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width="240" height="16" fill="#1a0d05" />

        <rect x="0" y="12" width="80" height="4" fill="#ff6d00" />
        <rect x="80" y="12" width="40" height="4" fill="#c4551a" />
        <rect x="120" y="12" width="40" height="4" fill="#8a4418" />
        <rect x="160" y="12" width="40" height="4" fill="#5a3a24" />
        <rect x="200" y="12" width="40" height="4" fill="#3a2416" />
        <rect x="0" y="10" width="56" height="2" fill="#ff9e40" />
        <rect x="0" y="8" width="32" height="2" fill="#ffd180" />

        <rect x="36" y="5" width="32" height="4" fill="#ff9e40" />
        <rect x="36" y="5" width="32" height="1" fill="#ffd180" />
        <rect x="96" y="5" width="32" height="4" fill="#c4551a" />
        <rect x="96" y="5" width="32" height="1" fill="#e07a2e" />
        <rect x="152" y="5" width="32" height="4" fill="#6b4a30" />
        <rect x="152" y="5" width="32" height="1" fill="#8a6244" />
        <rect x="204" y="5" width="32" height="4" fill="#4a3020" />
        <rect x="204" y="5" width="32" height="1" fill="#5f4029" />

        <rect x="24" y="3" width="1" height="1" fill="#ffd180" opacity="0.8" />
        <rect x="48" y="2" width="1" height="1" fill="#ff9e40" opacity="0.6" />
        <rect x="72" y="4" width="1" height="1" fill="#ff6d00" opacity="0.5" />
        <rect x="12" y="4" width="1" height="1" fill="#ff9e40" opacity="0.7" />
        <rect x="88" y="2" width="1" height="1" fill="#ff6d00" opacity="0.4" />
      </svg>
    </div>
  );
}
