/**
 * Generate Forge PWA icons (a white ⚡ on indigo) from SVG via sharp.
 * Run: `node forge-ui/scripts/generate-icons.mjs` from the repo root.
 * Outputs to forge-ui/public/icons/.
 */
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const BG = '#6366f1';
// Lucide "zap" path on a 24x24 grid (closed, fill-able).
const BOLT =
  '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>';

/** @param {number} size @param {boolean} rounded */
function svg(size, rounded) {
  const rx = rounded ? Math.round(size * 0.22) : 0;
  const boltBox = size * 0.5; // keep within the maskable safe zone
  const scale = boltBox / 24;
  const offset = (size - boltBox) / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${rx}" fill="${BG}"/><g transform="translate(${offset},${offset}) scale(${scale})" fill="#ffffff">${BOLT}</g></svg>`;
}

async function render(svgString, out, size) {
  await sharp(Buffer.from(svgString)).resize(size, size).png().toFile(out);
  console.log('wrote', out);
}

const dir = 'forge-ui/public/icons';
await mkdir(dir, { recursive: true });
await render(svg(192, true), `${dir}/icon-192.png`, 192);
await render(svg(512, true), `${dir}/icon-512.png`, 512);
await render(svg(512, false), `${dir}/maskable-512.png`, 512); // full-bleed for maskable
await render(svg(180, false), `${dir}/apple-touch-icon.png`, 180); // iOS home screen
