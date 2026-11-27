// 6 · DARKNESS MATTERS (KTH): a planetarium dome drawn on the board, the
// night sky inside it (a 2D canvas: stars, the Milky Way, a horizon of houses
// and trees, a few fireflies of our guide's kind blinking low over the
// grass). A slider turns the city lights up: skyglow climbs the horizon,
// stars go out faintest-first, the fireflies stop finding each other — and
// the guide's own lantern dims with them. Slide it back and the night returns.
import { el, svgEl, drawIn, rng, clamp } from '../../draw/ink.js';
import { wobble } from '../../draw/sketches.js';
import { comic } from '../../ui/comic.js';
import { creditHTML, installCreditCSS } from '../../ui/credits.js';
import { PROJECT } from '../../data/projects.js';

const CSS = `
.dark .dome-wrap { position: absolute; left: 50%; top: 14vh; width: min(70vw, 1000px); aspect-ratio: 2 / 1; transform: translateX(-42%); }
.dark .dome-cv { position: absolute; inset: 0; width: 100%; height: 100%; clip-path: ellipse(50% 100% at 50% 100%); }
.dark .dome-svg { position: absolute; inset: -12px; width: calc(100% + 24px); height: calc(100% + 24px); overflow: visible; color: var(--ink); pointer-events: none; }
.dark .slider { position: absolute; left: 50%; bottom: 14vh; transform: translateX(-42%); width: min(44vw, 560px); display: flex; flex-direction: column; gap: 6px; z-index: 14; opacity: 0; transition: opacity .6s; }
.dark .slider.show { opacity: 1; }
.dark .slider label { font: 22px var(--font-hand); display: flex; justify-content: space-between; color: var(--ink-soft); }
.dark input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 14px; border: 2.5px solid var(--ink); border-radius: 8px 4px 9px 3px;
  background: linear-gradient(90deg, #0b1230, #3b2c5a 50%, #f2a33a); cursor: pointer; }
.dark input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 30px; height: 30px; border-radius: 50%; background: var(--glow); border: 2.5px solid var(--ink); box-shadow: 0 0 14px var(--glow-soft); }
.dark input[type=range]::-moz-range-thumb { width: 26px; height: 26px; border-radius: 50%; background: var(--glow); border: 2.5px solid var(--ink); }
`;

export default function build(root, ctx) {
  root.classList.add('dark');
  installCreditCSS();
  const style = el('style', {}, root, CSS);
  const wrap = el('div', { class: 'dome-wrap' }, root);
  const cv = el('canvas', { class: 'dome-cv' }, wrap);
  const svg = svgEl('svg', { class: 'dome-svg', viewBox: '-12 -12 1024 524', preserveAspectRatio: 'none' }, wrap);
  const r0 = rng(5);
  const domePath = svgEl('path', { class: 'ink boil', 'stroke-width': 3, d: wobble(Array.from({ length: 25 }, (_, i) => { const a = Math.PI + (i / 24) * Math.PI; return [500 + Math.cos(a) * 500, 500 + Math.sin(a) * 500]; }), r0, 2) }, svg);
  const base = svgEl('path', { class: 'ink boil', 'stroke-width': 3, d: wobble([[-10, 500], [500, 503], [1010, 500]], r0, 2) }, svg);

  const slider = el('div', { class: 'slider' }, root, '<label><span>a dark sky</span><span>today</span><span>tomorrow?</span></label><input type="range" min="0" max="100" value="0" aria-label="Light pollution">');
  const input = slider.querySelector('input');

  const c1 = comic(root, { kind: 'caption', html: 'Fireflies find each other by their light.', at: { left: '4vw', top: '16vh' }, width: 260 });
  const c2 = comic(root, { kind: 'speech', html: 'Turn the city lights up, and <b>watch what happens to the night</b>.', at: { left: '4vw', top: '33vh' }, width: 270, tail: 'right', tailAt: 30 });
  const c3 = comic(root, { kind: 'caption', html: 'Skyglow, from satellite measurements of the light we send up at night: <b>how much darkness we have lost</b>, and how much more we stand to lose.', at: { left: '4vw', top: '16vh' }, width: 330 });
  const credit = comic(root, { kind: 'speech', html: creditHTML(PROJECT.darkness) + '<span class="small">A fulldome documentary: the data, on a planetarium sky.</span>', at: { left: '4vw', top: '48vh' }, width: 320, tail: 'top' });
  const c4 = comic(root, { kind: 'caption', html: 'Visualization doesn\'t only inform research. <b>It moves people.</b>', at: { right: '4vw', bottom: '24vh' }, width: 280, tilt: 1 });

  // the sky: stars (brightness-sorted, so the faint ones vanish first), a
  // Milky Way band, a horizon, a few fireflies
  const R = rng(11);
  const stars = Array.from({ length: 900 }, () => ({ x: R(), y: R() * 0.92, m: Math.pow(R(), 3), tw: R() * 6.28 }));
  const band = Array.from({ length: 700 }, () => { const t = R(); const off = (R() + R() + R() - 1.5) * 0.09; return { x: t, y: 0.15 + t * 0.55 + off, m: R() * 0.35 }; });
  const flies = Array.from({ length: 14 }, (_, i) => ({ x: 0.12 + R() * 0.76, y: 0.8 + R() * 0.12, ph: R() * 6.28, sp: 0.6 + R() * 0.8, i }));
  const roofs = [];
  for (let x = 0; x < 1; x += 0.025 + R() * 0.03) roofs.push({ x, w: 0.02 + R() * 0.03, h: R() < 0.3 ? 0.06 + R() * 0.06 : 0.025 + R() * 0.03, tree: R() < 0.35 });

  const g = cv.getContext('2d');
  let W = 1, H = 1, dpr = 1, lp = 0, lpShown = 0, t = 0, moved = 0;
  function resize() { dpr = Math.min(devicePixelRatio || 1, 1.5); const b = wrap.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; }
  const ro = new ResizeObserver(resize); ro.observe(wrap); resize();

  input.addEventListener('input', () => {
    lp = input.value / 100;
    moved++;
    if (moved === 3) { c1.hide(); c2.hide(); c3.show(); }
    if (lp > 0.7 && !credit.el.classList.contains('show')) { credit.show({ delay: 400 }); }
    if (moved > 20) { c4.show({ delay: 1200 }); ctx.ready(); }
  });

  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = lpShown;
    // sky: deep blue -> a sodium-orange wash as skyglow grows
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${8 + k * 40}, ${12 + k * 30}, ${34 + k * 30})`);
    sky.addColorStop(0.65, `rgb(${16 + k * 110}, ${20 + k * 70}, ${52 + k * 20})`);
    sky.addColorStop(1, `rgb(${30 + k * 200}, ${30 + k * 120}, ${60 + k * 10})`);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // stars: one visible if brighter than the sky's limit
    const limit = 0.02 + k * 0.85;
    for (const s of stars) {
      if (s.m < limit) continue;
      const a = clamp((s.m - limit) * 4, 0, 1) * (0.75 + 0.25 * Math.sin(t * 2 + s.tw));
      g.globalAlpha = a; g.fillStyle = '#fff8e8';
      g.beginPath(); g.arc(s.x * W, s.y * H, 0.6 + s.m * 1.8, 0, 6.283); g.fill();
    }
    g.globalAlpha = clamp(1 - k * 2.2, 0, 1) * 0.5; g.fillStyle = '#dfe6ff';
    for (const s of band) { g.fillRect(s.x * W, s.y * H, 1 + s.m * 1.5, 1 + s.m * 1.5); }
    // horizon: houses and trees in silhouette, windows lit with the slider
    g.globalAlpha = 1; g.fillStyle = '#07080c';
    const hy = H * 0.86;
    g.fillRect(0, hy, W, H - hy);
    for (const r of roofs) {
      const x = r.x * W, w = r.w * W, h = r.h * H;
      if (r.tree) { g.beginPath(); g.ellipse(x + w / 2, hy - h * 0.9, w * 0.6, h * 1.1, 0, 0, 6.283); g.fill(); }
      else {
        g.beginPath(); g.moveTo(x, hy); g.lineTo(x, hy - h); g.lineTo(x + w / 2, hy - h - w * 0.4); g.lineTo(x + w, hy - h); g.lineTo(x + w, hy); g.fill();
        if (k > 0.15) { g.fillStyle = `rgba(255, 196, 90, ${clamp((k - 0.15) * 1.5, 0, 1)})`; g.fillRect(x + w * 0.35, hy - h * 0.7, w * 0.3, h * 0.3); g.fillStyle = '#07080c'; }
      }
    }
    // street lamps' glow on the horizon
    if (k > 0.05) {
      const glow = g.createRadialGradient(W / 2, H * 1.15, 10, W / 2, H * 1.15, H * (0.5 + k));
      glow.addColorStop(0, `rgba(255, 170, 80, ${0.55 * k})`); glow.addColorStop(1, 'rgba(255, 170, 80, 0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
    }
    // fireflies: they flash in answer to each other; skyglow drowns them out
    for (const f of flies) {
      const flash = Math.max(0, Math.sin(t * f.sp * 2 + f.ph)) ** 8 * clamp(1 - k * 1.4, 0, 1);
      if (flash < 0.02) continue;
      const x = (f.x + Math.sin(t * 0.3 + f.i) * 0.01) * W, y = (f.y + Math.sin(t * 0.7 + f.i * 2) * 0.01) * H;
      const gr = g.createRadialGradient(x, y, 0, x, y, 14);
      gr.addColorStop(0, `rgba(255, 236, 120, ${flash})`); gr.addColorStop(1, 'rgba(255, 236, 120, 0)');
      g.fillStyle = gr; g.fillRect(x - 14, y - 14, 28, 28);
    }
  }

  return {
    async enter() {
      c1.show({ delay: 200 });
      await drawIn([domePath, base], { duration: 1600 });
      slider.classList.add('show');
      c2.show({ delay: 300 });
      const b = wrap.getBoundingClientRect();
      ctx.firefly.flyTo(b.right - b.width * 0.12, b.bottom - b.height * 0.25, { duration: 1500 }).then(() => ctx.firefly.land(true));
    },
    update(dt) {
      t += dt;
      lpShown += (lp - lpShown) * (1 - Math.exp(-dt * 4));
      ctx.firefly.glow(clamp(1.1 - lpShown * 1.0, 0.1, 1.1));
      draw();
    },
    leave() { ctx.firefly.glow(1); ctx.firefly.land(false); },
    dispose() { ro.disconnect(); style.remove(); },
  };
}
