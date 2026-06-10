import type { ReactElement } from 'react';

/** Full-viewport centered loading indicator. */
export function FullScreenLoader(): ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
