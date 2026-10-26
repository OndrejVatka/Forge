import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

/*
 * Forge v2 theme runtime (FO-24). public/theme-boot.js applies the stored
 * theme before first paint; this takes over once React mounts. The two must
 * agree on STORAGE_KEY, the defaults, validation and THEME_COLORS.
 */

export const PALETTES = ['graphite', 'ink', 'slate', 'navy', 'mono'] as const;
export const MODES = ['light', 'dark', 'system'] as const;

export type ForgePalette = (typeof PALETTES)[number];
export type ForgeMode = (typeof MODES)[number];
export type ResolvedMode = Exclude<ForgeMode, 'system'>;

export interface ForgeThemeChoice {
  palette: ForgePalette;
  mode: ForgeMode;
}

export interface PaletteInfo {
  id: ForgePalette;
  name: string;
  note: string;
}

export const FORGE_PALETTES: readonly PaletteInfo[] = [
  { id: 'graphite', name: 'Graphite', note: 'Neutral gray · signal orange' },
  { id: 'ink', name: 'Ink', note: 'Warm ink · brass' },
  { id: 'slate', name: 'Slate', note: 'Cool slate · electric lime' },
  { id: 'navy', name: 'Navy', note: 'Deep navy · coral' },
  { id: 'mono', name: 'Mono', note: 'Monochrome · one data accent' },
];

export const STORAGE_KEY = 'forge-theme';
/** Written by the removed Molten theme toggle; cleared on mount. */
export const LEGACY_STORAGE_KEY = 'forge.theme';
export const DEFAULT_THEME: ForgeThemeChoice = { palette: 'graphite', mode: 'dark' };

/*
 * --bg per palette and mode as sRGB hex, for <meta name="theme-color">. Hex
 * rather than the computed oklch() value because not every browser chrome
 * (PWA title bar, iOS status bar) accepts oklch. Converted from
 * src/styles/forge/colors.css; theme-boot.test.ts keeps the boot script's copy
 * identical to this one.
 */
export const THEME_COLORS: Record<ForgePalette, Record<ResolvedMode, string>> = {
  graphite: { dark: '#0b0c0e', light: '#f8f9fb' },
  ink: { dark: '#0f0c08', light: '#fcf8f5' },
  slate: { dark: '#070d13', light: '#f4faff' },
  navy: { dark: '#050c1b', light: '#f0faff' },
  mono: { dark: '#0c0c0c', light: '#f9f9f9' },
};

/*
 * localStorage is user-editable, so each field is validated on its own: a bad
 * mode doesn't throw away a good palette. Mirrors the boot script.
 */
const storedThemeSchema = z
  .object({
    palette: z.enum(PALETTES).catch(DEFAULT_THEME.palette),
    mode: z.enum(MODES).catch(DEFAULT_THEME.mode),
  })
  .catch(DEFAULT_THEME);

const PREFERS_LIGHT = '(prefers-color-scheme: light)';

/**
 * Parses a raw stored theme value, falling back to the defaults field by field.
 * @param raw - The string from localStorage, or null when nothing is stored.
 * @returns A valid theme choice; never throws.
 * @example parseTheme('{"palette":"navy","mode":"oops"}') // { palette: 'navy', mode: 'dark' }
 */
export function parseTheme(raw: string | null): ForgeThemeChoice {
  if (raw === null) return DEFAULT_THEME;
  try {
    return storedThemeSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Reads the stored theme. Storage can throw (private mode, blocked site data).
 * @returns The stored choice, or the defaults.
 */
export function loadTheme(): ForgeThemeChoice {
  try {
    return parseTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Persists the theme. Failure is ignored: the theme still applies for this
 * session, it just won't survive a reload.
 * @param theme - The choice to store.
 */
export function saveTheme(theme: ForgeThemeChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Storage unavailable; nothing else to do.
  }
}

/**
 * Resolves `system` to light or dark from the OS preference.
 * @param mode - The user's mode choice.
 * @returns The concrete mode to render.
 */
export function resolveMode(mode: ForgeMode): ResolvedMode {
  if (mode !== 'system') return mode;
  return window.matchMedia(PREFERS_LIGHT).matches ? 'light' : 'dark';
}

/**
 * Applies a theme to the document: data-palette and data-mode on the root
 * element (the token CSS keys off both) and the matching theme-color meta.
 * @param theme - The choice to apply.
 * @param root - The element to theme; defaults to <html>.
 */
export function applyTheme(
  theme: ForgeThemeChoice,
  root: HTMLElement = document.documentElement,
): void {
  const mode = resolveMode(theme.mode);
  root.dataset.palette = theme.palette;
  root.dataset.mode = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme.palette][mode]);
}

export interface ForgeThemeState {
  theme: ForgeThemeChoice;
  /** Merges a partial change (palette and/or mode), then applies and stores it. */
  setTheme: (patch: Partial<ForgeThemeChoice>) => void;
}

/**
 * Owns the theme for the app. Call once (AppLayout) and share the result
 * through ForgeThemeContext rather than calling it in several places.
 * @returns The current choice and a setter.
 */
export function useForgeTheme(): ForgeThemeState {
  const [theme, setThemeState] = useState<ForgeThemeChoice>(loadTheme);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage unavailable; the stale key is harmless.
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  // In system mode, follow OS light/dark changes live, without a reload.
  useEffect(() => {
    if (theme.mode !== 'system') return;
    const query = window.matchMedia(PREFERS_LIGHT);
    const handleChange = (): void => applyTheme(theme);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback(
    (patch: Partial<ForgeThemeChoice>) => setThemeState((current) => ({ ...current, ...patch })),
    [],
  );

  return { theme, setTheme };
}
