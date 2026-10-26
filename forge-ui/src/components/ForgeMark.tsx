import type { ReactElement } from 'react';

/* Anvil silhouette and strike lines on a 100×100 grid, from the v2 handoff. */
const ANVIL =
  'M6 44C18 44 26 40 30 40h62v14H76c-7 0-10 5-10 12v4h12v12H22V70h12v-4c0-7-3-11-10-12C15 53 9 50 6 44z';
const STRIKES = 'M60 30V16M46 32l-7-11M74 32l7-11';

/** Below this size the strike lines blur into the silhouette, so they're dropped. */
const FULL_MARK_MIN_SIZE = 28;

/**
 * The Forge brand mark: an anvil on an accent tile. Follows the active palette.
 * Decorative; pair it with visible text ("Forge") or a labelled link.
 * @param size - Tile edge in px (20 in the header, 32 on Login).
 */
export function ForgeMark({ size = 20 }: { size?: number }): ReactElement {
  const isFull = size >= FULL_MARK_MIN_SIZE;
  const glyph = size * (isFull ? 0.6 : 0.72);

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center bg-accent text-accent-fg"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}
    >
      <svg
        viewBox="0 0 100 100"
        width={glyph}
        height={glyph}
        className="block"
        style={{ transform: isFull ? 'translateY(4%)' : 'translateY(-1%)' }}
      >
        <path fill="currentColor" d={ANVIL} />
        {isFull && (
          <path
            d={STRIKES}
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </span>
  );
}
