import type { ReactElement } from 'react';

interface ColorWellProps {
  value: string;
  onChange: (color: string) => void;
  /** Accessible name, e.g. "Tag color". */
  label: string;
}

/**
 * A 28px colour control: swatch plus mono hex, with the native colour picker
 * laid transparently over it so the platform picker still opens. The focus
 * ring is drawn on the wrapper because the input itself is invisible.
 * @example <ColorWell label="Tag color" value={color} onChange={setColor} />
 */
export function ColorWell({ value, onChange, label }: ColorWellProps): ReactElement {
  return (
    <label className="tap-target relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface pr-2.5 pl-1.5 shadow-card hover:border-border-strong has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--focus)]">
      <span
        aria-hidden="true"
        className="size-4 rounded-xs shadow-[inset_0_0_0_1px_oklch(0_0_0/0.15)]"
        style={{ backgroundColor: value }}
      />
      <span className="font-mono text-2xs text-fg-secondary">{value}</span>
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
