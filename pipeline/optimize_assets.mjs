// Shrinks the 3D assets borrowed from the Amazon project into static/lib/.
// The story is the front door of the InfraVis website, so every byte counts:
//   jaguar.glb  8.5 MB -> keep only the clips the story plays ('Action' is the
//               base frame gait.js / simplePoses.js pose from, 'Look around'
//               the idle with the tongue lick), coat
//               texture at 1024 px WebP, animation keys resampled,
//               geometry + animation meshopt-quantised.
//   firefly.glb the story's guide: two clips, full-resolution textures.
//   tern.glb    a static low-poly bird (flapped in the shader): meshopt only.
// Run from the repo root:  node pipeline/optimize_assets.mjs
// (uses viewer/node_modules, as the Amazon pipeline uses treegen/node_modules)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(path.join(root, 'viewer', 'package.json'));
const { NodeIO } = await import(pathToFileURL(req.resolve('@gltf-transform/core')).href);
const { ALL_EXTENSIONS, EXTMeshoptCompression } = await import(pathToFileURL(req.resolve('@gltf-transform/extensions')).href);
const { resample, textureCompress, meshopt, dedup, prune } = await import(pathToFileURL(req.resolve('@gltf-transform/functions')).href);
const { MeshoptEncoder, MeshoptDecoder } = await import(pathToFileURL(req.resolve('meshoptimizer')).href);
const sharp = (await import(pathToFileURL(req.resolve('sharp')).href)).default;

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});

const SRC = path.join(root, 'assets', 'external-animals');
const OUT = path.join(root, 'static', 'lib', 'animals');
fs.mkdirSync(OUT, { recursive: true });

async function jaguar() {
  const doc = await io.read(path.join(SRC, 'jaguar.glb'));
  const KEEP = new Set(['Action', 'Look around (Ear.Rodriguez)']);
  for (const a of doc.getRoot().listAnimations()) if (!KEEP.has(a.getName())) {
    for (const c of a.listChannels()) c.dispose();
    for (const s of a.listSamplers()) s.dispose();
    a.dispose();
  }
  await doc.transform(
    // (keepLeaves: end bones like Nose_M / JawEnd_M are aimed at by simplePoses.js)
    prune({ keepLeaves: true, keepAttributes: true }),
    dedup(),
    resample({ tolerance: 2e-3 }),
    // the coat at 1024 px: at 512 the spots smeared at close range; the full
    // 2048 doubles the file (2 MB) for no difference at the size it is drawn
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 86 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await io.write(path.join(OUT, 'jaguar.glb'), doc);
}

async function tern() {
  const doc = await io.read(path.join(SRC, 'tern.glb'));
  await doc.transform(dedup(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  await io.write(path.join(OUT, 'tern.glb'), doc);
}

async function coat() {
  // the melanistic coat (jaguar.js loads it with the model): 256 px is enough
  // for an ink-shaded cat a few hundred pixels long
  for (const f of ['jaguar_black.jpg', 'jaguar_black_rough.jpg'])
    await sharp(path.join(SRC, f)).resize(256, 256).jpeg({ quality: 72 }).toFile(path.join(OUT, f));
}

async function firefly() {
  // the guide (assets/external-firefly, Caledhril, CC BY 4.0) in full
  // quality: both clips, every texture at its own 2048 px, only re-encoded
  // as high-quality WebP (it loads after first paint)
  const doc = await io.read(path.join(root, 'assets', 'external-firefly', 'scene.gltf'));
  await doc.transform(
    prune({ keepLeaves: true, keepAttributes: true }), dedup(), resample({ tolerance: 1e-3 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(path.join(OUT, 'firefly.glb'), doc);
}

await Promise.all([jaguar(), tern(), coat(), firefly()]);
for (const f of fs.readdirSync(OUT)) console.log(f.padEnd(26), (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0), 'KB');
