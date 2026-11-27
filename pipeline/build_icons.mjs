// University ICONS for every place a node appears (map circles, badges,
// credits, the site): the emblem cut out of each partner logo, trimmed,
// centred on a square and saved as a small WebP (a few KB each, instead of
// 15-80 KB SVG seals).
//   static/lib/logos/icons/<id>.webp   (192 px, transparent)
// Crops are fractions of the logo's rendered box [x0, y0, x1, y1], read off
// a render of each logo; null = the whole logo (already an emblem).
// Run from the repo root:  node pipeline/build_icons.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(path.join(root, 'viewer', 'package.json'));
const sharp = (await import(pathToFileURL(req.resolve('sharp')).href)).default;

const SRC = path.join(root, 'assets', 'logos', 'partners');
const OUT = path.join(root, 'static', 'lib', 'logos', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const ICONS = {
  chalmers: { file: 'chalmers-seal.svg', crop: null },   // the seal, not the wordmark
  gu: { crop: null },
  kth: { crop: null },
  liu: { crop: [0, 0, 0.455, 1] },          // the "LiU" mark, without the words
  lnu: { crop: [0.885, 0, 1, 1] },         // the Linnaeus tree
  lu: { crop: [0, 0, 1, 0.62] },          // the seal above "Lunds universitet"
  miun: { crop: [0.3, 0, 0.7, 0.42] },    // the yellow-blue symbol
  umu: { crop: null },
  uu: { crop: null },
  vr: { crop: [0, 0, 0.5, 1] },           // the Swedish Research Council's symbol
};
const SIZE = 192, PAD = 0.1;

for (const [id, spec] of Object.entries(ICONS)) {
  const f = path.join(SRC, spec.file ?? `${id}.svg`);
  let img = sharp(f, { density: 600 }).resize({ width: 1400, height: 1400, fit: 'inside' });
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  let piece = sharp(buf);
  if (spec.crop) {
    const [x0, y0, x1, y1] = spec.crop;
    piece = piece.extract({ left: Math.round(x0 * meta.width), top: Math.round(y0 * meta.height), width: Math.round((x1 - x0) * meta.width), height: Math.round((y1 - y0) * meta.height) });
  }
  const trimmed = await sharp(await piece.png().toBuffer()).trim({ threshold: 8 }).png().toBuffer();
  const inner = Math.round(SIZE * (1 - 2 * PAD));
  const fitted = await sharp(trimmed).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const out = path.join(OUT, `${id}.webp`);
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, gravity: 'center' }]).webp({ quality: 88, alphaQuality: 90 }).toFile(out);
  console.log(id.padEnd(9), (fs.statSync(out).size / 1024).toFixed(1), 'KB');
}
