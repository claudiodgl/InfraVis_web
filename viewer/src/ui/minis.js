// SMALL MOVING PICTURES of each project for the map chapter's side panel:
// one 2D canvas, one tiny drawing function per project, in ink + the logo's
// colours. Cheap enough to run beside the map (a few hundred shapes).
import { rng } from '../draw/ink.js';

const RAMP = ['#1d71b8', '#951b81', '#e30613', '#ed6a21', '#f9b233', '#ffed00'];
const ramp = (t) => RAMP[Math.max(0, Math.min(5, Math.round(t * 5)))];

function pts(n, seed, f) { const r = rng(seed); return Array.from({ length: n }, () => f(r)); }
const TREE = pts(900, 2, (r) => {
  const u = r();
  if (u < 0.12) return [(r() - 0.5) * 0.04, r() * 0.3, (r() - 0.5) * 0.04];
  const y = 0.25 + r() * 0.75, rad = (1 - (y - 0.25) / 0.75) * 0.32 * Math.sqrt(r()), a = r() * 6.28;
  return [Math.cos(a) * rad, y, Math.sin(a) * rad];
});
const STARS = pts(160, 3, (r) => [r(), r() * 0.8, r()]);
const ATOMS = [[0, 0, 0, '#888'], [0.5, 0.2, 0.1, '#e30613'], [-0.45, 0.3, -0.2, '#888'], [-0.2, -0.45, 0.3, '#1d71b8'], [0.3, -0.35, -0.35, '#888'], [0.9, 0.3, 0.3, '#ddd'], [-0.85, 0.5, -0.1, '#ddd']];
const BONDS = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6]];

export const MINIS = {
  forestvis(g, w, h, t, ink) {   // a point-cloud tree, turning
    const c = Math.cos(t * 0.6), s = Math.sin(t * 0.6);
    for (const [x, y, z] of TREE) {
      const X = x * c - z * s;
      g.fillStyle = ramp(y); g.fillRect(w / 2 + X * h * 0.9 - 1.2, h * 0.92 - y * h * 0.82 - 1.2, 2.4, 2.4);
    }
    g.strokeStyle = ink; g.beginPath(); g.moveTo(w * 0.2, h * 0.93); g.lineTo(w * 0.8, h * 0.93); g.stroke();
  },
  'forest-to-fork'(g, w, h, t, ink) {   // goods flowing along arcs to a pin
    const to = [w * 0.78, h * 0.3], from = [[w * 0.22, h * 0.75], [w * 0.4, h * 0.85], [w * 0.15, h * 0.45]];
    g.strokeStyle = ink; g.lineWidth = 1.5;
    from.forEach(([x, y], i) => {
      const cx = (x + to[0]) / 2, cy = Math.min(y, to[1]) - h * 0.25;
      g.setLineDash([5, 7]); g.lineDashOffset = -t * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx, cy, to[0], to[1]); g.stroke();
      g.setLineDash([]); g.fillStyle = ['#2b8a3e', '#e30613', '#ed6a21'][i]; g.beginPath(); g.arc(x, y, 6, 0, 6.28); g.fill(); g.stroke();
    });
    g.fillStyle = '#f9b233'; g.beginPath(); g.arc(to[0], to[1], 8, 0, 6.28); g.fill(); g.stroke();
  },
  amazon(g, w, h, t, ink) {   // the flood rising and falling under a tree; a bird crossing
    const lvl = h * (0.72 + Math.sin(t * 0.6) * 0.1);
    g.strokeStyle = ink; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w * 0.35, h); g.lineTo(w * 0.37, h * 0.3); g.moveTo(w * 0.45, h); g.lineTo(w * 0.43, h * 0.3); g.stroke();
    g.beginPath(); g.ellipse(w * 0.4, h * 0.25, w * 0.25, h * 0.15, 0, 0, 6.28); g.stroke();
    g.beginPath(); g.moveTo(w * 0.42, h * 0.45); g.lineTo(w * 0.75, h * 0.4); g.stroke();
    // a cat on the limb: a long body, a tail hanging
    g.fillStyle = '#d9a441'; g.beginPath(); g.ellipse(w * 0.6, h * 0.39, w * 0.08, h * 0.035, -0.1, 0, 6.28); g.fill(); g.stroke();
    g.beginPath(); g.arc(w * 0.69, h * 0.37, h * 0.035, 0, 6.28); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(w * 0.52, h * 0.4); g.quadraticCurveTo(w * 0.5, h * (0.5 + Math.sin(t) * 0.02), w * 0.52, h * 0.58); g.stroke();
    g.fillStyle = 'rgba(29,113,184,.3)'; g.fillRect(0, lvl, w, h - lvl);
    g.beginPath(); for (let x = 0; x <= w; x += 20) g.lineTo(x, lvl + Math.sin(x * 0.1 + t * 2) * 2); g.stroke();
    const bx = ((t * 40) % (w + 60)) - 30, by = h * 0.12, up = Math.sin(t * 9) * 5;
    g.beginPath(); g.moveTo(bx - 10, by - up); g.quadraticCurveTo(bx - 5, by - 6, bx, by); g.quadraticCurveTo(bx + 5, by - 6, bx + 10, by - up); g.stroke();
  },
  buzz(g, w, h, t, ink) {
    const cx = w / 2, cy = h * 0.55, shake = Math.sin(t * 60) * (Math.sin(t) > 0 ? 1.5 : 0);
    g.strokeStyle = ink; g.lineWidth = 2; g.fillStyle = '#fffaf0';
    for (let i = 0; i < 5; i++) { g.save(); g.translate(cx + shake, cy); g.rotate(i * 1.2566 - 1.57); g.beginPath(); g.ellipse(0, -h * 0.17, h * 0.08, h * 0.17, 0, 0, 6.28); g.fill(); g.stroke(); g.restore(); }
    g.fillStyle = '#f9b233'; g.beginPath(); g.moveTo(cx - 8 + shake, cy); g.lineTo(cx + shake, cy - h * 0.2); g.lineTo(cx + 8 + shake, cy); g.fill(); g.stroke();
    if (Math.sin(t) > 0) for (let i = 0; i < 24; i++) { const a = i * 2.4 + t, d = ((t * 40 + i * 9) % 60); g.fillStyle = '#f9b233'; g.fillRect(cx + Math.cos(a) * d, cy - h * 0.22 - Math.abs(Math.sin(a)) * d, 3, 3); }
  },
  butterflies(g, w, h, t, ink) {
    const k = 0.35 + 0.65 * Math.abs(Math.cos(t * 2.4)), cx = w / 2, cy = h / 2;
    g.strokeStyle = ink; g.lineWidth = 2; g.fillStyle = 'rgba(149,27,129,.35)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * h * 0.2 * k, cy - h * 0.1, h * 0.2 * k, h * 0.18, 0, 0, 6.28); g.fill(); g.stroke(); g.beginPath(); g.ellipse(cx + s * h * 0.13 * k, cy + h * 0.14, h * 0.13 * k, h * 0.12, 0, 0, 6.28); g.fill(); g.stroke(); }
    g.fillStyle = ink; g.fillRect(cx - 2, cy - h * 0.2, 4, h * 0.42);
    const sy = cy - h * 0.25 + ((t * 30) % (h * 0.15)); g.strokeStyle = '#e30613'; g.beginPath(); g.moveTo(cx - 20, sy); g.lineTo(cx + 20, sy); g.stroke();
  },
  genomelens(g, w, h, t, ink) {
    g.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const y = h * 0.1 + i * h * 0.05, a = Math.sin(i * 0.7 + t * 1.5) * w * 0.12;
      g.strokeStyle = [4, 5, 11].includes(i) ? '#e30613' : ink; g.beginPath(); g.moveTo(w / 2 - a, y); g.lineTo(w / 2 + a, y); g.stroke();
      g.fillStyle = ink; g.fillRect(w / 2 - a - 2, y - 2, 4, 4); g.fillRect(w / 2 + a - 2, y - 2, 4, 4);
    }
  },
  darkness(g, w, h, t) {
    const k = 0.5 + 0.5 * Math.sin(t * 0.5);
    g.fillStyle = `rgb(${10 + k * 90},${14 + k * 50},${40})`; g.beginPath(); g.ellipse(w / 2, h, w * 0.48, h * 0.95, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#fff8e8';
    for (const [x, y, m] of STARS) { if (m < k * 0.9) continue; const X = w / 2 + (x - 0.5) * w * 0.85, Y = h - y * h * 0.85; if (((X - w / 2) / (w * 0.48)) ** 2 + ((Y - h) / (h * 0.95)) ** 2 < 1) g.fillRect(X, Y, 2, 2); }
  },
  eyes(g, w, h, t, ink) {   // a molecule turning, with a gaze dot visiting atoms
    const c = Math.cos(t * 0.7), s = Math.sin(t * 0.7), P = ATOMS.map(([x, y, z, col]) => [w / 2 + (x * c - z * s) * h * 0.35, h / 2 + y * h * 0.35, col]);
    g.strokeStyle = ink; g.lineWidth = 3; for (const [a, b] of BONDS) { g.beginPath(); g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); g.stroke(); }
    g.lineWidth = 1.5; for (const [x, y, col] of P) { g.fillStyle = col; g.beginPath(); g.arc(x, y, 9, 0, 6.28); g.fill(); g.stroke(); }
    const f = P[Math.floor(t / 1.2) % P.length]; g.strokeStyle = '#1d71b8'; g.lineWidth = 3; g.beginPath(); g.arc(f[0], f[1], 16 + Math.sin(t * 6) * 2, 0, 6.28); g.stroke();
  },
  generic(g, w, h, t, ink) {   // a little scatterplot that breathes
    const r = rng(4); g.strokeStyle = ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(w * 0.15, h * 0.1); g.lineTo(w * 0.15, h * 0.85); g.lineTo(w * 0.88, h * 0.85); g.stroke();
    for (let i = 0; i < 60; i++) { const x = r(), y = x * 0.7 + (r() - 0.5) * 0.3; g.fillStyle = ramp(y); g.beginPath(); g.arc(w * (0.18 + x * 0.68), h * (0.82 - y * 0.68) + Math.sin(t * 2 + i) * 1.5, 3, 0, 6.28); g.fill(); }
  },
};
