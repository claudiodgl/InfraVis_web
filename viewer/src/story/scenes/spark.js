// 1 · DATA IN THE DARK. The board goes dark and fills with faint numbers:
// measurements, too many to read. The firefly follows the pointer and its
// light shows the numbers around it — still meaningless up close. "Visualize"
// gathers every reading to where it belongs, and the pattern appears: a tree,
// coloured by height (the bridge to the next chapter, ForestVis).
// A 2D canvas, ~2,200 glyphs; it stops drawing once the picture has settled.
import { el, rng, sleep, clamp } from '../../draw/ink.js';
import { comic } from '../../ui/comic.js';
import { theme } from '../../theme.js';

const CSS = `
.spark-cv { position: absolute; inset: 0; width: 100%; height: 100%; }
/* dark: the board is night, the firefly's light a lamp. light: the board is
   lost in a pale paper haze, and the firefly's light clears a warm window
   through it where the numbers show in ink */
.spark-veil { position: absolute; inset: 0; pointer-events: none; transition: opacity 1.2s; }
:root[data-theme='dark'] .spark-veil {
  background: radial-gradient(circle var(--r, 170px) at var(--fx, 50%) var(--fy, 50%), transparent 0, transparent 35%, rgba(5, 6, 9, .88) 100%); }
:root[data-theme='light'] .spark-veil {
  background: radial-gradient(circle 190px at var(--fx, 50%) var(--fy, 50%),
    rgba(255, 214, 90, .16) 0, rgba(255, 214, 90, .1) 38%, rgba(247, 244, 236, .55) 62%, rgba(247, 244, 236, .94) 100%); }
.spark-veil.off { opacity: 0; }
/* centred with translate (not transform: the button's hover sets transform,
   which undid the centring, moved it from under the pointer, and flickered) */
.spark-btn { position: absolute; left: 50%; bottom: 120px; translate: -50% 0; z-index: 22; opacity: 0; transition: opacity .6s, transform .15s, box-shadow .15s; }
.spark-btn.show { opacity: 1; }
.spark .comic.caption { z-index: 23; }
`;

const N = 2200;
// height ramp of the logo's own colours (low = blue, high = yellow)
const RAMP = ['#1d71b8', '#951b81', '#e30613', '#ed6a21', '#f9b233', '#ffed00'];
function rampAt(t) {
  const x = clamp(t, 0, 0.999) * (RAMP.length - 1), i = Math.floor(x), f = x - i;
  const a = RAMP[i], b = RAMP[i + 1];
  const p = (h, k) => parseInt(h.slice(k, k + 2), 16);
  const m = (k) => Math.round(p(a, k) + (p(b, k) - p(a, k)) * f);
  return `rgb(${m(1)},${m(3)},${m(5)})`;
}

// the hidden picture: a conifer-ish tree, in unit space (0..1 wide, 0..1 tall, y up)
function treeSample(r) {
  const u = r();
  if (u < 0.12) {   // trunk
    return { x: 0.5 + (r() - 0.5) * 0.06, y: r() * 0.28 };
  }
  if (u < 0.2) {    // ground
    return { x: 0.12 + r() * 0.76, y: (r() - 0.5) * 0.025 };
  }
  // crown: stacked tiers, wider below, with some fuzz (leaves in LiDAR are noisy)
  for (;;) {
    const y = 0.22 + r() * 0.76;
    const tier = (y - 0.22) / 0.76;
    const wave = 0.5 + 0.5 * Math.cos(tier * Math.PI * 7);   // the tiers' scalloped edge
    const half = (1 - tier) * 0.36 * (0.75 + 0.25 * wave) + 0.02;
    const x = 0.5 + (r() * 2 - 1) * half;
    if (r() < 0.92) return { x, y: y + (r() - 0.5) * 0.02 };
  }
}

export default function build(root, ctx) {
  root.classList.add('spark');
  const style = el('style', {}, root, CSS);
  const cv = el('canvas', { class: 'spark-cv' }, root);
  const veil = el('div', { class: 'spark-veil' }, root);
  const g = cv.getContext('2d');
  const btn = el('button', { class: 'sk-btn primary spark-btn', type: 'button' }, root, '✦ Visualize it');

  const c1 = comic(root, { kind: 'caption', html: 'Every day, science produces more data than anyone could ever read.', at: { left: '6vw', top: '20vh' }, width: 330 });
  // the firefly's line follows the board: night in dark mode, haze on paper in light mode
  const lineFor = () => (theme.mode === 'dark' ? 'It\'s dark in here.' : 'Too much to see — it all blurs together.') + ' <b>Move me around</b> — let\'s look closer.';
  const c2 = comic(root, { kind: 'speech', html: lineFor(), at: { left: '50%', top: '55%' }, width: 280, tail: 'top', tailAt: 30 });
  const offTheme = theme.onChange(() => c2.set(lineFor()));
  const c3 = comic(root, { kind: 'caption', html: 'Up close, it\'s just numbers. The pattern is in there, but numbers alone won\'t show it.', at: { right: '6vw', top: '20vh' }, width: 330, tilt: 0.8 });
  const c4 = comic(root, { kind: 'caption', html: 'Put every value where it belongs, and the pattern appears. <b>This is what visualization does.</b>', at: { left: '6vw', top: '20vh' }, width: 360 });
  const c5 = comic(root, { kind: 'speech', html: 'This one is a tree, made of laser measurements. Shall we see the whole forest?', at: { right: '7vw', bottom: '24vh' }, width: 300, tail: 'right', tailAt: 30 });

  const r = rng(7);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const tgt = treeSample(r);
    pts.push({
      sx: r(), sy: r(),                    // scattered: anywhere on the board
      tx: tgt.x, ty: tgt.y, h: tgt.y,      // its true place, and its height
      v: (r() * 99).toFixed(r() < 0.5 ? 1 : 0), // the number it shows while scattered
      k: r(), lit: 0,
    });
  }

  let W = 1, H = 1, dpr = 1, phase = 'dark', morph = 0, explored = 0, timeIn = 0, settled = false;
  const seen = new Set();   // grid cells the light has visited
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    const b = root.getBoundingClientRect(); W = b.width; H = b.height;
    cv.width = W * dpr; cv.height = H * dpr;
    settled = false;
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  function treeBox() {
    const s = Math.min(W * 0.42, H * 0.7);
    return { x0: W / 2 - s / 2, y0: H * 0.86, s };
  }

  btn.addEventListener('click', async () => {
    if (phase !== 'dark') return;
    ctx.stepDone('visualize');
    phase = 'gather'; btn.classList.remove('show'); c2.hide(); c3.hide(); c1.hide();
    ctx.firefly.follow(false);
    veil.classList.add('off');
    const tb = treeBox();
    // it lands on the top of the tree as it forms
    ctx.firefly.perchAt(tb.x0 + tb.s * 0.5, tb.y0 - tb.s * 0.985, { duration: 2200 });
    await sleep(2400);
    c4.show();
    await sleep(2600);
    // (it stays on the tree top: the tree is what to look at)
    await sleep(1500);
    c5.show();
    ctx.ready();
  });

  // Back: the picture scatters into numbers again, in the dark
  function unvisualize() {
    phase = 'dark'; morph = 0; settled = false;
    veil.classList.remove('off');
    c4.hide(); c5.hide(); c3.show();
    btn.classList.add('show');
    ctx.firefly.land(false); ctx.firefly.follow(true);
  }
  return {
    // Next: the beat of this chapter
    steps: [{ key: 'visualize', label: '✦ Visualize it', run: () => btn.click(), undo: () => unvisualize() }],
    async enter() {
      c1.show({ delay: 300 });
      await ctx.firefly.flyTo(W * 0.5, H * 0.5, { duration: 1200 });
      c2.show({ delay: 200 });
      ctx.firefly.follow(true);
    },
    update(dt) {
      timeIn += dt;
      const fx = ctx.firefly.pos.x, fy = ctx.firefly.pos.y;
      const b = root.getBoundingClientRect();
      const lx = fx - b.left, ly = fy - b.top;
      veil.style.setProperty('--fx', `${lx}px`); veil.style.setProperty('--fy', `${ly}px`);
      if (phase === 'dark') {
        seen.add(`${Math.floor(lx / (W / 8))},${Math.floor(ly / (H / 6))}`);
        explored = seen.size / 48;
        if ((explored > 0.22 || timeIn > 9) && !btn.classList.contains('show')) {
          btn.classList.add('show'); c2.hide(); c3.show();
        }
      }
      if (phase === 'gather') { morph = Math.min(1, morph + dt / 2.6); if (morph >= 1) phase = 'done'; }
      if (phase === 'done' && settled) return;   // nothing moves: stop drawing

      const ink = theme.css('--ink');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const tb = treeBox();
      const e = morph < 0.5 ? 4 * morph ** 3 : 1 - (-2 * morph + 2) ** 3 / 2;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '11px "Patrick Hand", sans-serif';
      for (const p of pts) {
        const delay = p.k * 0.35, mm = clamp((e - delay) / (1 - 0.35), 0, 1);
        const sx = p.sx * W, sy = p.sy * H;
        const tx = tb.x0 + p.tx * tb.s, ty = tb.y0 - p.ty * tb.s;
        const x = sx + (tx - sx) * mm, y = sy + (ty - sy) * mm;
        if (phase === 'dark') {
          const d = Math.hypot(x - lx, y - ly);
          const lit = clamp(1 - d / 190, 0, 1);
          p.lit = Math.max(p.lit * 0.985, lit);
          g.globalAlpha = 0.08 + p.lit * 0.85;
          // lit: warm chalk on the night board, dark ink through the haze on paper
          g.fillStyle = lit > 0.05 ? (theme.mode === 'dark' ? '#f4ecd2' : ink) : ink;
          g.fillText(p.v, x, y);
        } else {
          // numbers shrink into points as they arrive, and take their colour
          g.globalAlpha = 0.9;
          if (mm < 0.98) { g.fillStyle = ink; g.globalAlpha = 0.6 * (1 - mm) + 0.2; g.fillText(p.v, x, y); }
          g.globalAlpha = mm;
          g.fillStyle = rampAt(p.h);
          g.beginPath(); g.arc(x, y, 1.1 + 1.3 * mm, 0, 6.283); g.fill();
        }
      }
      g.globalAlpha = 1;
      if (phase === 'done') settled = true;
    },
    leave() { ctx.firefly.follow(false); ctx.firefly.land(false); },
    dispose() { ro.disconnect(); offTheme(); style.remove(); },
  };
}
