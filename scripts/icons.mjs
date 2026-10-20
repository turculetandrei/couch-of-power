// Generates PWA icons from an inline SVG. Run: node scripts/icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const couch = (scale) => `
  <g transform="translate(256 262) scale(${scale}) translate(-12 -12)" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/>
    <path d="M2.5 12.5a2 2 0 0 1 4 0V15h11v-2.5a2 2 0 0 1 4 0V17a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z"/>
    <path d="M5 19v1.5M19 19v1.5"/>
  </g>`;

// "any": white disc on black, like the wordmark. "maskable": glyph inside the safe zone.
const any = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#000"/>
  <circle cx="256" cy="256" r="200" fill="#F5F5F7"/>
  <circle cx="380" cy="132" r="34" fill="#30D158" stroke="#000" stroke-width="14"/>
  ${couch(11)}</svg>`;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F5F5F7"/>
  ${couch(8.5)}</svg>`;

mkdirSync('public/icons', { recursive: true });
const out = [
  [any, 192, 'icon-192.png'],
  [any, 512, 'icon-512.png'],
  [maskable, 512, 'maskable-512.png'],
  [maskable, 192, 'maskable-192.png'],
];
for (const [svg, size, name] of out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${name}`);
}
// Apple ignores transparency; give it a full-bleed black tile.
await sharp(Buffer.from(any.replace('rx="112"', ''))).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
await sharp(Buffer.from(any)).resize(48, 48).png().toFile('public/icons/favicon-48.png');
console.log('icons written');
