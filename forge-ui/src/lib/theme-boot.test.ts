import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * public/theme-boot.js is a plain classic script (it has to be, to run
 * blocking under `script-src 'self'`), so it's executed here by importing it.
 * The path is a variable so TypeScript doesn't try to type the untyped JS file.
 */
const BOOT_SCRIPT = '../../public/theme-boot.js';

async function runBootScript(): Promise<void> {
  vi.resetModules();
  await import(/* @vite-ignore */ BOOT_SCRIPT);
}

function stubPrefersLight(prefersLight: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: prefersLight && query === '(prefers-color-scheme: light)',
    })),
  );
}

const root = document.documentElement;
const themeColor = (): string | null =>
  document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;

describe('theme boot script', () => {
  beforeEach(() => {
    delete root.dataset.palette;
    delete root.dataset.mode;
    document.head.innerHTML = '<meta name="theme-color" content="#000000">';
    stubPrefersLight(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('when nothing is stored', () => {
    it('should apply graphite dark and its theme colour', async () => {
      await runBootScript();

      expect(root.dataset.palette).toBe('graphite');
      expect(root.dataset.mode).toBe('dark');
      expect(themeColor()).toBe('#0b0c0e');
    });
  });

  describe('when a valid theme is stored', () => {
    it('should apply the stored palette and mode', async () => {
      localStorage.setItem('forge-theme', JSON.stringify({ palette: 'navy', mode: 'light' }));

      await runBootScript();

      expect(root.dataset.palette).toBe('navy');
      expect(root.dataset.mode).toBe('light');
      expect(themeColor()).toBe('#f0faff');
    });
  });

  describe('when the stored mode is system', () => {
    it('should resolve to light when the OS prefers light', async () => {
      stubPrefersLight(true);
      localStorage.setItem('forge-theme', JSON.stringify({ palette: 'ink', mode: 'system' }));

      await runBootScript();

      expect(root.dataset.mode).toBe('light');
      expect(themeColor()).toBe('#fcf8f5');
    });

    it('should resolve to dark when the OS prefers dark', async () => {
      localStorage.setItem('forge-theme', JSON.stringify({ palette: 'ink', mode: 'system' }));

      await runBootScript();

      expect(root.dataset.mode).toBe('dark');
      expect(themeColor()).toBe('#0f0c08');
    });
  });

  describe('when the stored value is invalid', () => {
    it.each([
      ['an unknown palette and mode', JSON.stringify({ palette: 'neon', mode: 'dim' })],
      ['markup in the palette', JSON.stringify({ palette: '"><img src=x>', mode: 'light' })],
      ['a prototype key as the palette', JSON.stringify({ palette: 'constructor' })],
      ['JSON null', 'null'],
      ['corrupt JSON', '{palette:'],
    ])('should fall back to the defaults for %s', async (_case, raw) => {
      localStorage.setItem('forge-theme', raw);

      await runBootScript();

      expect(root.dataset.palette).toBe('graphite');
      expect(['dark', 'light']).toContain(root.dataset.mode);
      expect(themeColor()).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('when storage is unavailable', () => {
    it('should apply the defaults without throwing', async () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      await runBootScript();

      expect(root.dataset.palette).toBe('graphite');
      expect(root.dataset.mode).toBe('dark');
    });
  });
});
