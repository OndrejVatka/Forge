import type { ReactElement } from 'react';

/**
 * Thin neutral ring spinner (track --border-strong, head --text), so it never
 * competes with the accent. Uses `@keyframes forge-spin` from base.css.
 * @param size - px; 16 inline, 20 for the full-screen loader.
 */
export function Spinner({ size = 16 }: { size?: number }): ReactElement {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="shrink-0 animate-[forge-spin_0.65s_linear_infinite] rounded-full border-border-strong border-t-fg"
      style={{ width: size, height: size, borderWidth: size > 20 ? 2 : 1.5 }}
    />
  );
}

/** Centers a 20px spinner in its parent. */
export function FullScreenLoader(): ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner size={20} />
    </div>
  );
}
