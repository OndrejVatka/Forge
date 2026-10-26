import { act, renderHook } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_THEME,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  applyTheme,
  parseTheme,
  useForgeTheme,
} from './theme.js';
import { ForgeThemeContext, useTheme } from './theme-context.js';

/** A matchMedia stand-in whose prefers-color-scheme answer can change at runtime. */
function stubColorScheme(prefersLight: boolean): {
  setPrefersLight: (value: boolean) => void;
  listenerCount: () => number;
} {
  const listeners = new Set<() => void>();
  const query = {
    matches: prefersLight,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return {
    setPrefersLight: (value) => {
      query.matches = value;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

const root = document.documentElement;
const themeColor = (): string | null =>
  document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;
const stored = (): unknown => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

beforeEach(() => {
  delete root.dataset.palette;
  delete root.dataset.mode;
  document.head.innerHTML = '<meta name="theme-color" content="#000000">';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('parseTheme', () => {
  it('should return the defaults when nothing is stored', () => {
    expect(parseTheme(null)).toEqual(DEFAULT_THEME);
  });

  it('should accept a valid stored theme', () => {
    expect(parseTheme('{"palette":"slate","mode":"system"}')).toEqual({
      palette: 'slate',
      mode: 'system',
    });
  });

  it('should keep a valid field when the other is invalid', () => {
    expect(parseTheme('{"palette":"navy","mode":"dim"}')).toEqual({
      palette: 'navy',
      mode: 'dark',
    });
    expect(parseTheme('{"palette":"neon","mode":"light"}')).toEqual({
      palette: 'graphite',
      mode: 'light',
    });
  });

  it.each([
    ['corrupt JSON', '{palette:'],
    ['JSON null', 'null'],
    ['a bare string', '"navy"'],
    ['a prototype key', '{"palette":"constructor"}'],
  ])('should fall back to the defaults for %s', (_case, raw) => {
    expect(parseTheme(raw)).toEqual(DEFAULT_THEME);
  });
});

describe('applyTheme', () => {
  it('should set both data attributes and the theme colour', () => {
    stubColorScheme(false);

    applyTheme({ palette: 'ink', mode: 'light' });

    expect(root.dataset.palette).toBe('ink');
    expect(root.dataset.mode).toBe('light');
    expect(themeColor()).toBe('#fcf8f5');
  });

  it('should resolve system mode from the OS preference', () => {
    stubColorScheme(true);

    applyTheme({ palette: 'mono', mode: 'system' });

    expect(root.dataset.mode).toBe('light');
    expect(themeColor()).toBe('#f9f9f9');
  });
});

describe('useForgeTheme', () => {
  it('should start from the stored theme and apply it', () => {
    stubColorScheme(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ palette: 'navy', mode: 'dark' }));

    const { result } = renderHook(() => useForgeTheme());

    expect(result.current.theme).toEqual({ palette: 'navy', mode: 'dark' });
    expect(root.dataset.palette).toBe('navy');
    expect(themeColor()).toBe('#050c1b');
  });

  it('should merge, apply and persist a partial change', () => {
    stubColorScheme(false);
    const { result } = renderHook(() => useForgeTheme());

    act(() => result.current.setTheme({ palette: 'slate' }));
    act(() => result.current.setTheme({ mode: 'light' }));

    expect(result.current.theme).toEqual({ palette: 'slate', mode: 'light' });
    expect(root.dataset.palette).toBe('slate');
    expect(root.dataset.mode).toBe('light');
    expect(stored()).toEqual({ palette: 'slate', mode: 'light' });
  });

  it('should remove the stale Molten theme key', () => {
    stubColorScheme(false);
    localStorage.setItem(LEGACY_STORAGE_KEY, 'molten');

    renderHook(() => useForgeTheme());

    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  describe('when the mode is system', () => {
    it('should follow OS colour-scheme changes live', () => {
      const os = stubColorScheme(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ palette: 'graphite', mode: 'system' }));
      renderHook(() => useForgeTheme());
      expect(root.dataset.mode).toBe('dark');

      act(() => os.setPrefersLight(true));

      expect(root.dataset.mode).toBe('light');
      expect(themeColor()).toBe('#f8f9fb');
      // The stored choice stays `system`; only the rendered mode changes.
      expect(stored()).toEqual({ palette: 'graphite', mode: 'system' });
    });

    it('should stop listening once an explicit mode is chosen', () => {
      const os = stubColorScheme(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ palette: 'graphite', mode: 'system' }));
      const { result } = renderHook(() => useForgeTheme());
      expect(os.listenerCount()).toBe(1);

      act(() => result.current.setTheme({ mode: 'dark' }));
      act(() => os.setPrefersLight(true));

      expect(os.listenerCount()).toBe(0);
      expect(root.dataset.mode).toBe('dark');
    });
  });

  describe('when storage is unavailable', () => {
    it('should still apply the theme without throwing', () => {
      stubColorScheme(false);
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useForgeTheme());
      act(() => result.current.setTheme({ palette: 'ink' }));

      expect(root.dataset.palette).toBe('ink');
    });
  });
});

describe('useTheme', () => {
  it('should throw outside the provider', () => {
    // React logs the render error and jsdom reports it as uncaught; both are
    // expected here, so keep them out of the test output.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const swallow = (event: ErrorEvent): void => event.preventDefault();
    window.addEventListener('error', swallow);

    try {
      expect(() => renderHook(() => useTheme())).toThrow(/inside AppLayout/);
    } finally {
      window.removeEventListener('error', swallow);
    }
  });

  it('should return the provided theme state', () => {
    const value = { theme: DEFAULT_THEME, setTheme: vi.fn() };
    const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <ForgeThemeContext.Provider value={value}>{children}</ForgeThemeContext.Provider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current).toBe(value);
  });
});
