import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

/** `base` is the original Forge skin; `molten` is the 8-bit Molten Forge skin. */
export type Theme = 'base' | 'molten';

const STORAGE_KEY = 'forge.theme';
const THEMES: readonly Theme[] = ['base', 'molten'];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/*
 * Defaults to the base skin rather than throwing when no provider is mounted.
 * Theme is purely presentational, so a component rendered in isolation (tests,
 * Storybook-style previews) should still render — just unthemed.
 */
const ThemeContext = createContext<ThemeContextValue>({
  theme: 'base',
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return THEMES.includes(stored as Theme) ? (stored as Theme) : 'base';
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // The molten skin is a `[data-theme="molten"]` override block in index.css,
  // so switching is a single attribute write — no re-render of the CSS itself.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((current) => (current === 'base' ? 'molten' : 'base')),
    [],
  );

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
