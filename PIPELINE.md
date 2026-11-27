# Pipeline: assets/ → static/

Everything the browser downloads is produced from `assets/` by three Node
scripts, run from the repo root. They use the packages in
`viewer/node_modules` (run `npm ci` in `viewer/` first), as the Amazon
project's pipeline uses `treegen/node_modules`.

```sh
node pipeline/optimize_assets.mjs   # 3D models
node pipeline/build_geo.mjs         # maps
node pipeline/prepare_people.mjs    # portraits, people.js, partner logos
node pipeline/build_icons.mjs       # university emblems for nodes and badges
node pipeline/build_collab.mjs      # the collaboration network (projects database)
```

## optimize_assets.mjs

| In | Out | What |
|---|---|---|
| `assets/external-animals/jaguar.glb` (8.5 MB, 9 clips) | `static/lib/animals/jaguar.glb` (0.94 MB, 0.46 MB gzip) | keeps the clips `Action` (the base frame the pose code needs) and `Look around (Ear.Rodriguez)` (standing idle, licks); coat texture 512 px WebP; animation keys resampled; meshopt. `prune` keeps leaf bones (Nose_M, JawEnd_M are aimed at by simplePoses.js) |
| `assets/external-animals/jaguar_black*.jpg` | same names, 256 px | the melanistic coat jaguar.js loads with the model |
| `assets/external-animals/tern.glb` | 65 KB | meshopt only (static; wings flap in the shader) |
| `assets/external-firefly/scene.gltf` (3 MB) | `static/lib/animals/firefly.glb` (539 KB) | full quality: both clips (`Landed_Idol`, `Landed_Fly`), every texture at its own 2048 px, re-encoded as WebP q92 |

The browser decodes meshopt with three's `meshopt_decoder.module.js`.

## build_geo.mjs

From `world-atlas` (Natural Earth):

- `static/lib/geo/sweden.json` (8 KB): Sweden at 1:50m without islets, its
  neighbours at 1:110m, projected (transverse Mercator on 15°E) into a
  420 × 900 box, and the nine nodes' campus points in the same box.
- `static/lib/geo/world.json` (37 KB, 14 KB gzip): land at 1:110m on Equal
  Earth (whole pixels), the sphere outline, and the start/end points of the
  forest-to-fork trade lines.

## prepare_people.mjs

- `assets/portraits/*` (originals from infravis.se) → `static/lib/portraits/*.webp`,
  128 px, attention-cropped.
- `assets/portraits/people.json` → `viewer/src/data/people.js` (generated; do not edit).
- `assets/logos/partners/*.svg` → `static/lib/logos/partners/`.

The InfraVis logos (`static/lib/logos/infravis-*.svg`) are copied as-is from
the official logo pack (`assets/logos/infravis/`).

Note: the original portraits are not in git (see `.gitignore`); `assets/portraits/people.json` keeps each `image_url` to fetch them again.

## build_icons.mjs

Each partner logo's emblem (`assets/logos/partners/*.svg`: crops listed in
the script, e.g. the LiU mark without its words, the Linnaeus tree, Lund's
seal, Chalmers' seal instead of its wordmark), trimmed and centred →
`static/lib/logos/icons/<id>.webp` (192 px, 2–22 KB). Used in the network's
node circles, node badges, the forest-to-fork map, the site.

## build_collab.mjs

`assets/data/projects_db.json` — every project on infravis.se (43: 36
support, 7 development), with the nodes that took part and the evidence for
each (post tags, page text, people's affiliations; see
`assets/data/README.md`) — → `viewer/src/data/collab.js`: the projects, the
edges (a pair of nodes, weighted by the projects both took part in, as a
node or as the users' home university: 20 pairs, weights 1–4) and each
node's project count.
