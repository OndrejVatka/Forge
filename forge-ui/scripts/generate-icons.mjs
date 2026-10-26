/**
 * Generate the Forge icons (the v2 anvil mark) via sharp.
 * Run: `node forge-ui/scripts/generate-icons.mjs` from the repo root.
 * Outputs forge-ui/public/favicon.svg and forge-ui/public/icons/*.png.
 *
 * Geometry and colours are from the v2 design handoff (FO-24): a Graphite
 * orange tile with a dark anvil glyph. Static files can't follow the in-app
 * palette, so they ship in the default Graphite.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const TILE = '#f2782e';
const GLYPH = '#1c130d';
// Anvil and strike lines on a 100×100 grid (same paths as ForgeMark.tsx).
const ANVIL =
  'M6 44C18 44 26 40 30 40h62v14H76c-7 0-10 5-10 12v4h12v12H22V70h12v-4c0-7-3-11-10-12C15 53 9 50 6 44z';
const STRIKES = 'M60 30V16M46 32l-7-11M74 32l7-11';

/**
 * @param {{ rounded: boolean, strikes: boolean }} options
 *   rounded: 22.5% corners (app icons); square for maskable/iOS, which mask themselves.
 *   strikes: the full mark; dropped for small sizes (favicon), where they blur.
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
    .png()
    .toFile(out);
  console.log('wrote', out);
}

const dir = 'forge-ui/public/icons';
await mkdir(dir, { recursive: true });
await writeFile('forge-ui/public/favicon.svg', `${svg({ rounded: true, strikes: false })}\n`);
console.log('wrote forge-ui/public/favicon.svg');
await render(svg({ rounded: true, strikes: true }), `${dir}/icon-192.png`, 192);
await render(svg({ rounded: true, strikes: true }), `${dir}/icon-512.png`, 512);
await render(svg({ rounded: false, strikes: true }), `${dir}/maskable-512.png`, 512);
await render(svg({ rounded: false, strikes: true }), `${dir}/apple-touch-icon.png`, 180);
