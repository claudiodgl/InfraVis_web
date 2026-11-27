// HAND-DRAWN MOTIFS as SVG path data, jittered by a seeded random so they
// look sketched rather than geometric (and come out the same every visit).
// Every function draws around (x, y) = the motif's foot, in px.
import { rng } from './ink.js';

const f = (n) => n.toFixed(1);

// a wobbly line through points (Catmull-Rom → cubic Béziers)
export function wobble(pts, r, amp = 1.5) {
  const p = pts.map(([x, y]) => [x + (r() - 0.5) * amp * 2, y + (r() - 0.5) * amp * 2]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// a conifer: trunk + zig-zag tiers
export function conifer(x, y, h, seed = 1) {
  const r = rng(seed), w = h * 0.36, out = [];
  out.push(wobble([[x, y], [x, y - h * 0.25]], r, 0.8));
  const tiers = 4 + Math.floor(r() * 2);
  const left = [], right = [];
  for (let i = 0; i <= tiers; i++) {
    const t = i / tiers, yy = y - h * 0.18 - t * h * 0.82, ww = w * (1 - t) + 2;
    left.push([x - ww, yy + (i < tiers ? h * 0.03 : 0)], [x - ww * 0.45, yy - h * 0.05]);
    right.push([x + ww, yy + (i < tiers ? h * 0.03 : 0)], [x + ww * 0.45, yy - h * 0.05]);
  }
  const top = [x, y - h];
  out.push(wobble([...left, top], r, 1.2));
  out.push(wobble([...right, top], r, 1.2));
  return out;
}

// a broadleaf: trunk with a fork and a scalloped cloud crown
export function broadleaf(x, y, h, seed = 2) {
  const r = rng(seed), out = [];
  const cy = y - h * 0.62, rx = h * 0.34, ry = h * 0.3;
  out.push(wobble([[x - 4, y], [x - 3, y - h * 0.3], [x - 6, y - h * 0.45]], r, 0.8));
  out.push(wobble([[x + 4, y], [x + 3, y - h * 0.32], [x + 8, y - h * 0.44]], r, 0.8));
  const n = 9 + Math.floor(r() * 3), pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * 0.62 + (i / n) * Math.PI * 1.76;
    const k = i % 2 ? 1.08 : 0.92;
    pts.push([x + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  out.push(wobble(pts, r, 1.6));
  return out;
}

// a tall rainforest tree: buttressed trunk, one long limb to the right
// (where the jaguar lies), a wide crown
export function emergent(x, y, h, seed = 3) {
  const r = rng(seed), out = [];
  out.push(wobble([[x - 30, y], [x - 12, y - 20], [x - 10, y - h * 0.5], [x - 8, y - h * 0.82]], r, 1));
  out.push(wobble([[x + 30, y], [x + 12, y - 20], [x + 10, y - h * 0.5], [x + 8, y - h * 0.82]], r, 1));
  out.push(wobble([[x - 12, y - 18], [x - 20, y - 4]], r, 1));
  const n = 13, pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * 0.85 + (i / n) * Math.PI * 1.3;
    const k = i % 2 ? 1.07 : 0.93;
    pts.push([x + Math.cos(a) * h * 0.42 * k, y - h * 0.86 + Math.sin(a) * h * 0.16 * k]);
  }
  out.push(wobble(pts, r, 2));
  return out;
}

export function fern(x, y, s, seed = 4) {
  const r = rng(seed), out = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.42 + (r() - 0.5) * 0.2;
    const ex = x + Math.cos(a) * s, ey = y + Math.sin(a) * s;
    out.push(wobble([[x, y], [x + Math.cos(a) * s * 0.5 + (k - 2) * 4, y + Math.sin(a) * s * 0.55], [ex, ey]], r, 0.8));
    for (let j = 1; j < 5; j++) {
      const t = j / 5, px = x + (ex - x) * t, py = y + (ey - y) * t;
      out.push(`M${f(px)} ${f(py)} l${f(Math.cos(a - 1) * 8 * (1 - t))} ${f(Math.sin(a - 1) * 8 * (1 - t))}`);
      out.push(`M${f(px)} ${f(py)} l${f(Math.cos(a + 1) * 8 * (1 - t))} ${f(Math.sin(a + 1) * 8 * (1 - t))}`);
    }
  }
  return out;
}

export function vine(x, y, len, seed = 5) {
  const r = rng(seed), pts = [];
  for (let i = 0; i <= 6; i++) pts.push([x + Math.sin(i * 1.3 + r()) * 7, y + (i / 6) * len]);
  const out = [wobble(pts, r, 1)];
  for (let i = 1; i < 6; i++) {
    const [px, py] = pts[i], s = i % 2 ? 1 : -1;
    out.push(`M${f(px)} ${f(py)} q${f(s * 9)} -2 ${f(s * 12)} 6 q${f(-s * 6)} 2 ${f(-s * 12)} -6`);
  }
  return out;
}

// a flying bird: two arcs ("m" of a child's drawing), wings at phase ph
export function bird(x, y, s, ph) {
  const up = Math.sin(ph) * s * 0.5;
  return `M${f(x - s)} ${f(y - up)} Q${f(x - s * 0.5)} ${f(y - s * 0.45 - up * 0.3)} ${f(x)} ${f(y)} Q${f(x + s * 0.5)} ${f(y - s * 0.45 - up * 0.3)} ${f(x + s)} ${f(y - up)}`;
}

export function grassLine(x0, x1, y, seed = 6) {
  const r = rng(seed), out = [wobble([[x0, y], [(x0 + x1) / 2, y + (r() - 0.5) * 4], [x1, y]], r, 1.2)];
  for (let x = x0 + 8; x < x1; x += 14 + r() * 26) {
    const h = 6 + r() * 10;
    out.push(`M${f(x)} ${f(y)} q${f(-2 + r() * 2)} ${f(-h * 0.6)} ${f(-3 + r() * 6)} ${f(-h)}`);
  }
  return out;
}
