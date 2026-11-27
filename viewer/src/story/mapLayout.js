// Where the map of Sweden sits on screen, shared by the map chapter and the
// finale (which starts with the nodes exactly where the map left them).
// Sweden's baked viewBox is 420 x 900 (static/lib/geo/sweden.json).

let geo = null;
export async function loadSweden() {
  geo ??= fetch('./lib/geo/sweden.json').then((r) => r.json());
  return geo;
}

// the map fills the left part of the screen, as tall as it can be
export function mapBox(W = innerWidth, H = innerHeight) {
  const narrow = W < 900;
  const areaW = narrow ? W : W * 0.5, areaH = H * (narrow ? 0.62 : 0.84);
  const s = Math.min(areaW / 420, areaH / 900);
  const w = 420 * s, h = 900 * s;
  const x = narrow ? (W - w) / 2 : W * 0.05 + (areaW - w) / 2 - W * 0.02;
  const y = narrow ? H * 0.1 : H * 0.08;
  return { x, y, w, h, s };
}

// Chalmers and GU share Gothenburg, Uppsala and Stockholm are close: drawn a little apart
export const NUDGE = { chalmers: [-16, 14], gu: [14, -16], uu: [-18, -22], kth: [16, 14] };
export function nodeXY(g, id) {
  const [x, y] = g.nodes[id], [dx, dy] = NUDGE[id] || [0, 0];
  return [x + dx, y + dy];
}

// a node's circle (map units) grows with the projects it has taken part in
import { NODE_COUNTS } from '../data/collab.js';
export const nodeR = (id) => 13 + 3 * Math.sqrt(NODE_COUNTS[id] || 1);
// an edge's width (map units) with the projects two nodes share
export const edgeW = (w) => 1.6 + w * 2.3;

// THE ZOOM: after Sweden is drawn the map closes in on the region where the
// nodes are (the viewBox it shows, in map units). The finale reads it to
// start its nodes exactly where the map left them.
let zoomVB = [0, 0, 420, 900];
export const getZoomVB = () => zoomVB;
export const setZoomVB = (vb) => { zoomVB = vb; };
export const resetZoom = () => { zoomVB = [0, 0, 420, 900]; };
// map units -> screen px, through the current zoom (box: mapBox())
export function mapToScreen([x, y], box) {
  const [vx, vy, vw] = zoomVB, k = box.w / vw;
  return [box.x + (x - vx) * k, box.y + (y - vy) * k];
}
export const zoomScale = (box) => box.w / zoomVB[2];   // screen px per map unit
// the region round the nodes, padded, in the map's own proportions
export function nodesRegion(g, ids, pad = 60) {
  const pts = ids.map((id) => nodeXY(g, id));
  let x0 = Math.min(...pts.map((p) => p[0])) - pad, x1 = Math.max(...pts.map((p) => p[0])) + pad;
  let y0 = Math.min(...pts.map((p) => p[1])) - pad, y1 = Math.max(...pts.map((p) => p[1])) + pad;
  const aspect = 420 / 900;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < aspect) { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; y0 -= (nh - h) / 2; h = nh; }
  return [x0, y0, w, h];
}
