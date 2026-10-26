import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Read from disk: Vitest stubs CSS imports (even `?raw`) to an empty string.
// import.meta.url goes in as a string, since jsdom replaces the URL class.
const colorsCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'colors.css'), 'utf8');

/*
 * WCAG contrast regression for the v2 tokens (FO-24). The handoff's values
 * shipped tertiary text at 3.8–4.4:1; this resolves colors.css for every
 * palette × mode and keeps each text token at ≥ 4.5:1 on every surface it can
 * sit on, so a future token tweak can't silently regress it.
 *
 * It's a small resolver for exactly the syntax colors.css uses: oklch(L C H),
 * var(--x), calc(a * b) and color-mix(in oklch, var(--x) N%, white|black).
 */

const css = colorsCss.replace(/\/\*[\s\S]*?\*\//g, '');

type Declarations = Record<string, string>;

const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector = '', body = '']) => ({
  selector: selector.replace(/\s+/g, ' ').trim(),
  declarations: Object.fromEntries(
    body
      .split(';')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('--'))
      .map((line) => {
        const colon = line.indexOf(':');
        return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
      }),
  ),
}));

const merge = (predicate: (selector: string) => boolean): Declarations =>
  blocks
    .filter((block) => predicate(block.selector))
    .reduce<Declarations>((merged, block) => ({ ...merged, ...block.declarations }), {});

const PALETTES = ['graphite', 'ink', 'slate', 'navy', 'mono'] as const;
const MODES = ['dark', 'light'] as const;

/** The declarations in effect for one palette × mode, in cascade order. */
function scope(palette: string, mode: string): Declarations {
  const darkRamp = merge((s) => s.includes('[data-mode]') && !s.includes("[data-mode='light']"));
  const lightRamp = merge((s) => s === "[data-mode='light']");
  const knobs = merge((s) => s.includes(`[data-palette='${palette}']`));
  return { ...darkRamp, ...(mode === 'light' ? lightRamp : {}), ...knobs };
}

type Oklch = [number, number, number];

function resolve(value: string, declarations: Declarations, depth = 0): string {
  if (depth > 10) throw new Error(`Unresolvable: ${value}`);
  const substituted = value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
    const next = declarations[name];
    if (next === undefined) throw new Error(`Undefined token ${name}`);
    return resolve(next, declarations, depth + 1);
  });
  return substituted.replace(/calc\(([\d.]+) \* ([\d.]+)\)/g, (_, a: string, b: string) =>
    String(Number(a) * Number(b)),
  );
}

function toOklch(value: string): Oklch {
  const mix = value.match(/^color-mix\(in oklch, oklch\(([^)]+)\) ([\d.]+)%, (white|black)\)$/);
  if (mix) {
    const [l, c, h] = toOklch(`oklch(${mix[1]})`);
    const weight = Number(mix[2]) / 100;
    const target = mix[3] === 'white' ? 1 : 0;
    // Achromatic white/black carry no hue, so the mix keeps the colour's hue.
    return [l * weight + target * (1 - weight), c * weight, h];
  }
  const parts = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (!parts) throw new Error(`Not an opaque oklch colour: ${value}`);
  return [Number(parts[1]), Number(parts[2]), Number(parts[3])];
}

/** oklch → linear sRGB → relative luminance (clamped to the sRGB gamut). */
function luminance([l, c, h]: Oklch): number {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lms = [
    l + 0.3963377774 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b,
  ].map((v) => v ** 3) as [number, number, number];
  const [x, y, z] = lms;
  const rgb = [
    4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
    -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    -0.0041960863 * x - 0.7034186147 * y + 1.707612701 * z,
  ].map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0);
}

function contrast(foreground: Oklch, background: Oklch): number {
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const TEXT = ['--text', '--text-secondary', '--text-tertiary', '--accent-text', '--ai', '--danger'];
const SURFACES = ['--bg', '--bg-subtle', '--surface', '--surface-hover', '--surface-raised'];
const PAIRS: [string, string][] = [
  ...TEXT.flatMap((text) => SURFACES.map((surface): [string, string] => [text, surface])),
  // Primary button labels (and the shortcut hint) on the fill, at rest and hovered.
  ['--accent-fg', '--accent'],
  ['--accent-fg', '--accent-hover'],
];

describe('v2 colour tokens', () => {
  const combinations = PALETTES.flatMap((palette) => MODES.map((mode) => [palette, mode]));

  it.each(combinations)('should keep every text pair at ≥ 4.5:1 in %s %s', (palette, mode) => {
    const declarations = scope(palette, mode);
    const color = (token: string): Oklch => {
      const raw = declarations[token];
      if (raw === undefined) throw new Error(`Undefined token ${token}`);
      return toOklch(resolve(raw, declarations));
    };

    const failures = PAIRS.map(([fg, bg]) => ({
      pair: `${fg} on ${bg}`,
      ratio: contrast(color(fg), color(bg)),
    }))
      .filter(({ ratio }) => ratio < 4.5)
      .map(({ pair, ratio }) => `${pair} = ${ratio.toFixed(2)}`);

    expect(failures).toEqual([]);
  });

  it('should catch a regression (sanity check on the resolver)', () => {
    // The handoff's original light tertiary (L 0.58) failed on bg-subtle.
    const declarations: Declarations = {
      ...scope('navy', 'light'),
      '--text-tertiary': 'oklch(0.58 var(--n-c) var(--n-h))',
    };
    const ratio = contrast(
      toOklch(resolve(declarations['--text-tertiary'] ?? '', declarations)),
      toOklch(resolve(declarations['--bg-subtle'] ?? '', declarations)),
    );
    expect(ratio).toBeLessThan(4.5);
  });
});
