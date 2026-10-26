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
import { SectionLabel } from './ui/SectionLabel.js';
import { SegmentedControl, type SegmentOption } from './ui/SegmentedControl.js';

const MODE_OPTIONS: readonly SegmentOption<ForgeMode>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Two-tone dot (surface over accent) in a palette's own data-palette/data-mode
 * scope, so it shows that palette's real tokens anywhere on the page.
 */
function PaletteSwatch({
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
          <SectionLabel as="div" id={`${popoverId}-palette`} className="px-2 pt-1.5 pb-1">
            Palette
          </SectionLabel>
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

/** A 16:10 mini board rendered in one palette's own scope, so it shows its real tokens. */
function PalettePreview({
  palette,
  mode,
  isSelected,
}: {
  palette: ForgePalette;
  mode: ResolvedMode;
  isSelected: boolean;
}): ReactElement {
  return (
    <div
      aria-hidden="true"
      data-palette={palette}
      data-mode={mode}
      className={`flex aspect-[16/10] w-full gap-[5px] rounded-md bg-bg p-2 transition-[outline-color] duration-[120ms] ${
        isSelected
          ? 'outline-2 outline-offset-2 outline-accent-text'
          : 'outline-1 outline-border group-hover:outline-border-strong'
      }`}
    >
      {[2, 1].map((cardCount, lane) => (
        <div key={lane} className="flex flex-1 flex-col gap-1 rounded-[4px] bg-bg-subtle p-1">
          <span className="h-[3px] w-[18px] rounded-[2px] bg-fg-tertiary" />
          {Array.from({ length: cardCount }, (_, card) => (
            <span
              key={card}
              className="flex flex-col gap-[3px] rounded-[3px] border border-border bg-surface p-1"
            >
              <span className="h-[3px] w-4/5 rounded-[2px] bg-fg" />
              <span
                className={`h-[3px] w-[45%] rounded-[2px] ${
                  lane === 0 && card === 0 ? 'bg-ai' : 'bg-fg-tertiary'
                }`}
              />
            </span>
          ))}
        </div>
      ))}
      <div className="flex w-[22px] flex-col gap-1">
        <span className="h-[9px] rounded-[3px] bg-accent" />
        <span className="h-[9px] rounded-[3px] border border-border" />
      </div>
    </div>
  );
}

/**
 * Settings › Appearance: a labelled mode control and a grid of palette cards,
 * each a live mini board in that palette.
 */
export function ThemeGrid(): ReactElement {
  const { theme, resolvedMode, setTheme } = useTheme();
  const paletteLabelId = useId();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-fg-secondary">Mode</span>
        <SegmentedControl
          label="Mode"
          options={MODE_OPTIONS}
          value={theme.mode}
          onChange={(mode) => setTheme({ mode })}
        />
      </div>
      <span id={paletteLabelId} className="sr-only">
        Palette
      </span>
      <div
        role="group"
        aria-labelledby={paletteLabelId}
        className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5"
      >
        {FORGE_PALETTES.map((palette) => {
          const isSelected = palette.id === theme.palette;
          return (
            <button
              key={palette.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setTheme({ palette: palette.id })}
              className="group flex cursor-pointer flex-col gap-2 rounded-md text-left"
            >
              <PalettePreview palette={palette.id} mode={resolvedMode} isSelected={isSelected} />
              <span className="flex flex-col gap-px px-0.5">
                <span className="text-sm font-medium text-fg">{palette.name}</span>
                <span className="text-2xs text-fg-tertiary">{palette.note}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
