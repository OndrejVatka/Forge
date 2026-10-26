import { createContext, useContext } from 'react';
import type { ForgeThemeState } from './theme.js';

/** Provided by AppLayout, which owns the single useForgeTheme() instance. */
export const ForgeThemeContext = createContext<ForgeThemeState | null>(null);

/**
 * Reads the app theme from AppLayout.
 * @returns The current theme choice and its setter.
 * @throws When rendered outside AppLayout, where a theme control would silently do nothing.
 */
export function useTheme(): ForgeThemeState {
  const value = useContext(ForgeThemeContext);
  if (!value) throw new Error('useTheme must be used inside AppLayout (ForgeThemeContext)');
  return value;
}
