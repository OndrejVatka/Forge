import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import {
  FORGE_PALETTES,
  type ForgeMode,
  type ForgePalette,
  type ResolvedMode,
} from '../lib/theme.js';
import { useTheme } from '../lib/theme-context.js';
import { Icon } from './ui/Icon.js';
import { SegmentedControl, type SegmentOption } from './ui/SegmentedControl.js';

export const MODE_OPTIONS: readonly SegmentOption<ForgeMode>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Two-tone dot (surface over accent) in a palette's own data-palette/data-mode
 * scope, so it shows that palette's real tokens anywhere on the page.
 */
export function PaletteSwatch({
  palette,
  mode,
}: {
  palette: ForgePalette;
  mode: ResolvedMode;
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-palette={palette}
      data-mode={mode}
      className="relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--border-strong)]"
    >
      <span className="absolute inset-x-0 top-1/2 bottom-0 bg-accent" />
    </span>
  );
}

/**
 * Header theme picker: a swatch trigger opening a popover with the five
 * palettes and a Light/Dark/System control. Closes on outside click or Esc.
 */
export function ThemeMenu(): ReactElement {
  const { theme, resolvedMode, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        aria-label="Theme"
        title="Theme"
        onClick={() => setIsOpen((open) => !open)}
        className={`tap-target inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm pr-1.5 pl-2 text-fg-secondary transition-[background-color] duration-[120ms] hover:bg-surface-hover ${
          isOpen ? 'bg-surface-hover' : ''
        }`}
      >
        <PaletteSwatch palette={theme.palette} mode={resolvedMode} />
        <Icon icon={ChevronDown} size={13} />
      </button>

      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Theme"
          className="absolute top-[calc(100%+6px)] right-0 z-60 w-[280px] rounded-md border border-border bg-surface-raised p-1 shadow-pop"
        >
          <div
            id={`${popoverId}-palette`}
            className="px-2 pt-1.5 pb-1 text-2xs font-medium tracking-[0.04em] text-fg-tertiary uppercase"
          >
            Palette
          </div>
          <div role="group" aria-labelledby={`${popoverId}-palette`}>
            {FORGE_PALETTES.map((palette) => {
              const isSelected = palette.id === theme.palette;
              return (
                <button
                  key={palette.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setTheme({ palette: palette.id })}
                  className="tap-target flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 text-left text-fg hover:bg-surface-hover"
                >
                  <PaletteSwatch palette={palette.id} mode={resolvedMode} />
                  <span className="text-sm font-medium">{palette.name}</span>
                  <span className="text-2xs whitespace-nowrap text-fg-tertiary">
                    {palette.note.split(' · ')[1]}
                  </span>
                  <Icon
                    icon={Check}
                    size={14}
                    className={`ml-auto text-accent-text ${isSelected ? '' : 'invisible'}`}
                  />
                </button>
              );
            })}
          </div>
          <div className="-mx-1 my-1 h-px bg-border" />
          <div className="p-1">
            <SegmentedControl
              label="Mode"
              options={MODE_OPTIONS}
              value={theme.mode}
              onChange={(mode) => setTheme({ mode })}
              block
            />
          </div>
        </div>
      )}
    </div>
  );
}
