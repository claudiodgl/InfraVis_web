// Bakes the map the story ends on into a few KB of SVG path data:
//   static/lib/geo/sweden.json = { viewBox, sweden: "M..", neighbours: "M..",
//                                  nodes: { id: [x, y] } }
// Sweden from Natural Earth 1:50m (world-atlas), Norway / Finland / Denmark
// from 1:110m as faint context; projected once here (transverse Mercator on
// 15°E) so the browser needs neither d3-geo nor the 750 KB atlas.
// Run from the repo root:  node pipeline/build_geo.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(path.join(root, 'viewer', 'package.json'));
const imp = async (m) => import(pathToFileURL(req.resolve(m)).href);
const d3 = await imp('d3-geo');
const topo = await imp('topojson-client');
const atlas = (res) => JSON.parse(fs.readFileSync(req.resolve(`world-atlas/countries-${res}.json`), 'utf8'));

const a50 = atlas('50m'), a110 = atlas('110m');
const pick = (a, id) => topo.feature(a, a.objects.countries).features.find((f) => +f.id === id);
const sweden = pick(a50, 752);
const W = 420, H = 900, PAD = 24;
const proj = d3.geoTransverseMercator().rotate([-15, 0]).fitExtent([[PAD, PAD], [W - PAD, H - PAD]], sweden);
proj.clipExtent([[-40, -40], [W + 40, H + 40]]);
const round = (s) => s.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1));
// whole numbers, and repeated points (after rounding) dropped
const round0 = (s) => s.replace(/-?\d+(\.\d+)?/g, (n) => String(Math.round(+n))).replace(/L(-?\d+),(-?\d+)(?=L\1,\2(?![\d.]))/g, '');
const pathOf = (f) => round(d3.geoPath(proj)(f));

// drop Sweden's specks (islets under ~3 px across) — the hand-drawn outline
// only wants the mainland, Öland and Gotland
function bigParts(f, minArea) {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const keep = polys.filter((p) => d3.geoPath(proj).area({ type: 'Polygon', coordinates: p }) > minArea);
  return { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: keep } };
}

// university nodes: [lon, lat] of the campus the node works from
const NODES = {
  umu: [20.307, 63.820],    // Umeå
  miun: [17.310, 62.392],   // Sundsvall (Mid Sweden University, also Östersund)
  uu: [17.633, 59.858],     // Uppsala
  kth: [18.070, 59.350],    // Stockholm
  liu: [15.577, 58.398],    // Linköping (and Norrköping's Visualization Center)
  chalmers: [11.973, 57.689],
  gu: [11.975, 57.705],     // Gothenburg (drawn apart from Chalmers in the browser)
  lnu: [14.826, 56.855],    // Växjö (and Kalmar)
  lu: [13.204, 55.712],     // Lund
};

const out = {
  viewBox: [0, 0, W, H],
  sweden: pathOf(bigParts(sweden, 4)),
  neighbours: [578, 246, 208].map((id) => pathOf(pick(a110, id))).join(''),
  nodes: Object.fromEntries(Object.entries(NODES).map(([k, ll]) => [k, proj(ll).map((v) => +v.toFixed(1))])),
};
const dir = path.join(root, 'static', 'lib', 'geo');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'sweden.json'), JSON.stringify(out));
// the world, for the forest-to-fork flows: land at 1:110m on Equal Earth,
// plus the points the trade lines start and end at
{
  const WW = 1000, WH = 520;
  const land = topo.feature(a110, a110.objects.land);
  const wp = d3.geoEqualEarth().rotate([-10, 0]).fitExtent([[10, 10], [WW - 10, WH - 10]], { type: 'Sphere' });
  const P = {
    brazil: [-55, -9], amazonas: [-65, -3.5], paraguay: [-58, -23], indonesia: [113, -1], malaysia: [102, 3.5],
    ivory: [-5.5, 7.5], ghana: [-1.2, 7.5], sweden: [15.5, 59.5], europe: [6, 50],
  };
  const world = {
    viewBox: [0, 0, WW, WH],
    // whole pixels are plenty for a hand-drawn world 1000 px wide
    land: round0(d3.geoPath(wp)(land)),
    sphere: round0(d3.geoPath(wp)({ type: 'Sphere' })),
    points: Object.fromEntries(Object.entries(P).map(([k, ll]) => [k, wp(ll).map((v) => +v.toFixed(1))])),
  };
  fs.writeFileSync(path.join(dir, 'world.json'), JSON.stringify(world));
  console.log('world.json', (fs.statSync(path.join(dir, 'world.json')).size / 1024).toFixed(1), 'KB');
}
console.log('sweden.json', (fs.statSync(path.join(dir, 'sweden.json')).size / 1024).toFixed(1), 'KB', out.nodes);
