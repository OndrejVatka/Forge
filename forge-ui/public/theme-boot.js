/*
 * Forge theme boot (FO-24). Loaded as a blocking classic <script> in <head>,
 * before the stylesheet and app bundle, so the first paint already carries the
 * stored palette and mode: no flash of the default theme.
 *
 * It's a same-origin file rather than an inline <script> because the CSP is
 * `script-src 'self'`; inline scripts are blocked. It's served from public/
 * untouched by Vite, so keep it dependency-free plain JS.
 *
 * The theme runtime in the app takes over after this. Both read the same
 * localStorage key, so the key and the defaults must stay in sync.
 */
/* global window, document, localStorage */
(function () {
  var STORAGE_KEY = 'forge-theme';

  /*
   * --bg per palette and mode, as sRGB hex, for <meta name="theme-color">
   * (PWA title bar, iOS status bar). The stylesheet hasn't loaded yet, so --bg
   * can't be read from computed style here. Converted from
   * src/styles/forge/colors.css: dark = oklch(0.155 c h), light =
   * oklch(0.982 c*0.7 h). Regenerate if a palette's neutrals change.
   */
  /** @type {Record<string, Record<string, string>>} */
  var BG = {
    graphite: { dark: '#0b0c0e', light: '#f8f9fb' },
    ink: { dark: '#0f0c08', light: '#fcf8f5' },
    slate: { dark: '#070d13', light: '#f4faff' },
    navy: { dark: '#050c1b', light: '#f0faff' },
    mono: { dark: '#0c0c0c', light: '#f9f9f9' },
  };

  var palette = 'graphite';
  var mode = 'dark';

  // localStorage is user-controlled, so only whitelisted values reach the DOM.
  try {
    /** @type {unknown} */
    var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (stored && typeof stored === 'object') {
      var storedPalette = 'palette' in stored ? stored.palette : undefined;
      var storedMode = 'mode' in stored ? stored.mode : undefined;
      if (
        typeof storedPalette === 'string' &&
        Object.prototype.hasOwnProperty.call(BG, storedPalette)
      ) {
        palette = storedPalette;
      }
      if (storedMode === 'light' || storedMode === 'dark') {
        mode = storedMode;
      } else if (storedMode === 'system') {
        mode = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
    }
  } catch {
    // Storage blocked (private mode) or corrupt JSON: keep the defaults.
  }

  var root = document.documentElement;
  root.dataset.palette = palette;
  root.dataset.mode = mode;

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BG[palette][mode]);
})();
