/**
 * Generate the Forge icons (the v2 anvil mark) via sharp.
 * Run: `node forge-ui/scripts/generate-icons.mjs` from the repo root.
 * Outputs forge-ui/public/favicon.svg and forge-ui/public/icons/*.png.
 *
 * An orange anvil on a dark tile. The v2 handoff's dark glyph on an orange
 * tile vanished under iOS's Dark home-screen appearance, which swaps the
 * background for its own dark gradient and keeps the foreground. So the glyph
 * has to be the light/colour part. Static files can't follow the in-app
 * palette, so they use Graphite's orange.
 *
 * App icons are square, opaque and full-bleed with no alpha channel: iOS and
 * Android launchers apply their own mask, and iOS fills transparent pixels
 * with black. Only the SVG favicon keeps rounded corners (tabs show it as-is).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const TILE = '#17171a';
const GLYPH = '#f2782e';
// Anvil and strike lines on a 100×100 grid (same paths as ForgeMark.tsx).
const ANVIL =
  'M6 44C18 44 26 40 30 40h62v14H76c-7 0-10 5-10 12v4h12v12H22V70h12v-4c0-7-3-11-10-12C15 53 9 50 6 44z';
const STRIKES = 'M60 30V16M46 32l-7-11M74 32l7-11';

/**
 * @param {{ rounded: boolean, strikes: boolean }} options
 *   rounded: 22.5% corners, for the favicon only.
 *   strikes: the full mark; dropped for the favicon, where they blur.
 */
function svg({ rounded, strikes }) {
  const rx = rounded ? 22.5 : 0;
  // The full mark's glyph spans at most ~33% from centre, inside the 40%
  // maskable safe zone; the favicon glyph is larger since it's never masked.
  const glyph = strikes
    ? `<g transform="translate(20 21) scale(0.6)"><path fill="${GLYPH}" d="${ANVIL}"/><path d="${STRIKES}" stroke="${GLYPH}" stroke-width="6" stroke-linecap="round" fill="none"/></g>`
    : `<g transform="translate(15 15) scale(0.7)"><path fill="${GLYPH}" d="${ANVIL}"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="${rx}" fill="${TILE}"/>${glyph}</svg>`;
}

async function render(svgString, out, size) {
  await sharp(Buffer.from(svgString), { density: 72 * (size / 100) })
    .resize(size, size)
    .removeAlpha()
    .png()
    .toFile(out);
  console.log('wrote', out);
}

const dir = 'forge-ui/public/icons';
await mkdir(dir, { recursive: true });
await writeFile('forge-ui/public/favicon.svg', `${svg({ rounded: true, strikes: false })}\n`);
console.log('wrote forge-ui/public/favicon.svg');
const appIcon = svg({ rounded: false, strikes: true });
await render(appIcon, `${dir}/icon-192.png`, 192);
await render(appIcon, `${dir}/icon-512.png`, 512);
await render(appIcon, `${dir}/maskable-512.png`, 512);
await render(appIcon, `${dir}/apple-touch-icon.png`, 180);
