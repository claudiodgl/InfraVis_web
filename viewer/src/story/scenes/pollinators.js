// 5 · SMALL THINGS, BIG DATA. Three projects, three nodes, all drawn on the
// board and each one a toy:
//   the bee and the Solanum flower (Buzz Pollination: KTH for Uppsala) —
//     click the flower: the bee lands and buzzes, pollen shakes out
//   the butterfly (Butterflies in VR: Lund) — click it: a microCT scan
//     sweeps through its head, slice by slice
//   the krill and its genome (GenomeLens: Umeå, LNU, GU) — click: a strand
//     of DNA unwinds and the places that differ between populations light up
// Pollen is a few hundred dots on a 2D canvas, drawn only while it flies.
import { el, svgEl, drawIn, sleep, rng } from '../../draw/ink.js';
import { wobble } from '../../draw/sketches.js';
import { comic } from '../../ui/comic.js';
import { creditHTML, installCreditCSS } from '../../ui/credits.js';
import { PROJECT } from '../../data/projects.js';

const CSS = `
.poll svg.full { pointer-events: none; }
.poll .toy { position: absolute; cursor: pointer; background: none; border: 0; padding: 0; border-radius: 30%; }
.poll .toy:focus-visible { outline-offset: 8px; }
.poll .toy svg { width: 100%; height: 100%; overflow: visible; color: var(--ink); }
.poll .toy .lbl { position: absolute; left: 50%; bottom: -34px; transform: translateX(-50%); white-space: nowrap; font: 22px var(--font-hand); color: var(--ink-soft); }
.poll .pollen-cv { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 7; }
.poll .petal { fill: var(--box); stroke: var(--ink); stroke-width: 2.2; }
.poll .anther { fill: var(--iv-amber); stroke: var(--ink); stroke-width: 2; }
.poll .flower.buzz { animation: buzz .05s linear infinite alternate; }
@keyframes buzz { from { transform: translate(-1.5px, 0); } to { transform: translate(1.5px, .5px); } }
.poll .bee .wing { fill: var(--paper); fill-opacity: .6; stroke: var(--ink); stroke-width: 1.6; transform-box: fill-box; transform-origin: 50% 100%; animation: bee-wing .06s linear infinite alternate; }
@keyframes bee-wing { to { transform: scaleY(.3); } }
.poll .bee .stripe { fill: var(--ink); }
.poll .bee .body { fill: var(--iv-amber); stroke: var(--ink); stroke-width: 2; }
.poll .bfly .wl, .poll .bfly .wr { fill: color-mix(in srgb, var(--iv-purple) 45%, var(--box)); stroke: var(--ink); stroke-width: 2; transform-box: fill-box; }
.poll .bfly .wl { transform-origin: 100% 50%; animation: bf-l 1.1s ease-in-out infinite; }
.poll .bfly .wr { transform-origin: 0% 50%; animation: bf-r 1.1s ease-in-out infinite; }
@keyframes bf-l { 50% { transform: scaleX(.25); } }
@keyframes bf-r { 50% { transform: scaleX(.25); } }
.poll .scan { stroke: var(--iv-red); stroke-width: 2.5; opacity: 0; }
.poll .scan.go { animation: scan 2.4s ease-in-out 2; }
@keyframes scan { 0% { opacity: 1; transform: translateY(-40px); } 100% { opacity: 1; transform: translateY(40px); } }
.poll .slices rect { fill: none; stroke: var(--iv-red); stroke-width: 1.2; opacity: 0; }
.poll .slices.on rect { animation: slice-in .3s forwards; }
@keyframes slice-in { to { opacity: .7; } }
.poll .dna path { fill: none; stroke: var(--ink); stroke-width: 2.2; }
.poll .dna line { stroke: var(--ink-soft); stroke-width: 1.6; }
.poll .dna line.hot { stroke: var(--iv-red); stroke-width: 3; }
.poll .dna g.helix { animation: dna-sway 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes dna-sway { 50% { transform: skewY(6deg); } }
.poll .krill { fill: color-mix(in srgb, var(--iv-red) 35%, var(--box)); stroke: var(--ink); stroke-width: 2; }
`;

export default function build(root, ctx) {
  root.classList.add('poll');
  installCreditCSS();
  const style = el('style', {}, root, CSS);
  const W = innerWidth, H = innerHeight;
  const cv = el('canvas', { class: 'pollen-cv' }, root);
  const g2 = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  cv.width = W * dpr; cv.height = H * dpr;

  // ---- the flower and the bee ----
  const fl = el('button', { class: 'toy flower-toy', type: 'button', 'aria-label': 'A Solanum flower: click to let the bee buzz it', style: `left:${W * 0.17}px; top:${H * 0.36}px; width:230px; height:300px` }, root);
  fl.innerHTML = `<svg viewBox="-115 -120 230 300"><g class="flower boil">
    <path class="ink" d="${wobble([[0, 0], [-6, 60], [4, 120], [0, 175]], rng(3), 1)}" style="stroke-width:2.4"/>
    <path class="ink" d="M-2 110 q-40 -10 -56 -40 q30 4 56 30" style="stroke-width:2"/>
    ${[0, 1, 2, 3, 4].map((i) => `<path class="petal" transform="rotate(${i * 72 - 90})" d="M0 0 C 18 -12, 34 -56, 0 -88 C -34 -56, -18 -12, 0 0 Z"/>`).join('')}
    <path class="anther" d="M-15 -8 L 0 -58 L 15 -8 Z"/>
    <path class="ink" d="M-7 -8 L 0 -50 M7 -8 L 0 -50" style="stroke-width:1.2"/>
  </g></svg><span class="lbl">buzz pollination</span>`;
  const flower = fl.querySelector('.flower');
  const bee = svgEl('svg', { class: 'bee', viewBox: '-30 -24 60 48', width: 64, height: 52, style: 'position:absolute; left:0; top:0; z-index:8; pointer-events:none; overflow:visible' }, root);
  bee.innerHTML = `<g class="boil"><ellipse class="wing" cx="-2" cy="-12" rx="9" ry="13"/><ellipse class="wing" cx="8" cy="-12" rx="8" ry="11"/>
    <ellipse class="body" cx="0" cy="2" rx="20" ry="13"/><path class="stripe" d="M-6 -10 q4 12 0 24 l5 0 q4 -12 0 -24 Z M6 -9 q4 11 0 22 l5 -1 q3 -10 0 -20 Z"/>
    <circle cx="20" cy="0" r="7" class="body"/><circle cx="22" cy="-2" r="1.6" class="stripe"/>
    <path class="ink" d="M-20 2 l-6 2" style="stroke-width:2"/></g>`;

  // ---- the butterfly ----
  const bf = el('button', { class: 'toy bfly-toy', type: 'button', 'aria-label': 'A butterfly: click to scan its head', style: `left:${W * 0.45}px; top:${H * 0.26}px; width:200px; height:170px` }, root);
  bf.innerHTML = `<svg viewBox="-100 -85 200 170"><g class="bfly boil">
    <path class="wl" d="M-4 -4 C -40 -80, -100 -60, -84 -20 C -76 2, -40 4, -4 0 Z M-4 4 C -30 10, -70 30, -56 62 C -40 80, -14 46, -4 8 Z"/>
    <path class="wr" d="M4 -4 C 40 -80, 100 -60, 84 -20 C 76 2, 40 4, 4 0 Z M4 4 C 30 10, 70 30, 56 62 C 40 80, 14 46, 4 8 Z"/>
    <path class="ink" d="M0 -26 C 6 -10, 6 30, 0 46 C -6 30, -6 -10, 0 -26 Z" style="fill:var(--ink)"/>
    <circle cx="0" cy="-32" r="8" style="fill:var(--box); stroke:var(--ink); stroke-width:2"/>
    <path class="ink" d="M-3 -38 C -10 -56, -18 -62, -24 -60 M3 -38 C 10 -56, 18 -62, 24 -60" style="stroke-width:1.8"/>
    <g class="slices">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="-14" y="${-44 + i * 4}" width="28" height="3" style="animation-delay:${i * 0.25}s"/>`).join('')}</g>
    <line class="scan" x1="-30" y1="-32" x2="30" y2="-32"/>
  </g></svg><span class="lbl">a microCT scan, in VR</span>`;

  // ---- the krill and its genome ----
  const kr = el('button', { class: 'toy krill-toy', type: 'button', 'aria-label': 'Krill and its genome: click to compare populations', style: `left:${W * 0.7}px; top:${H * 0.4}px; width:220px; height:250px` }, root);
  const rungs = Array.from({ length: 14 }, (_, i) => i);
  const HOT = new Set([3, 4, 9]);
  kr.innerHTML = `<svg viewBox="-110 -125 220 250"><g class="boil">
    <path class="krill" d="M-80 -70 C -50 -100, 10 -100, 40 -80 C 60 -70, 64 -54, 50 -48 C 20 -40, -40 -46, -80 -60 Z"/>
    <path class="ink" d="M40 -80 l30 -24 M44 -78 l40 -12 M-60 -52 l-6 16 M-40 -48 l-4 18 M-20 -46 l-2 18 M0 -46 l0 18 M20 -48 l2 16" style="stroke-width:1.6"/>
    <circle cx="36" cy="-70" r="3" style="fill:var(--ink)"/>
  </g><g class="dna" transform="translate(0 30)"><g class="helix">
    <path d="${rungs.map((i) => `${i ? 'L' : 'M'}${(Math.sin(i * 0.8) * 34).toFixed(1)} ${-70 + i * 11}`).join(' ')}"/>
    <path d="${rungs.map((i) => `${i ? 'L' : 'M'}${(-Math.sin(i * 0.8) * 34).toFixed(1)} ${-70 + i * 11}`).join(' ')}"/>
    ${rungs.map((i) => `<line data-i="${i}" x1="${(Math.sin(i * 0.8) * 34).toFixed(1)}" y1="${-70 + i * 11}" x2="${(-Math.sin(i * 0.8) * 34).toFixed(1)}" y2="${-70 + i * 11}"/>`).join('')}
  </g></g></svg><span class="lbl">genomes, compared</span>`;

  const intro = comic(root, { kind: 'caption', html: 'Some of the biggest datasets in science are about the smallest things.', at: { left: '4vw', top: '15vh' }, width: 320 });
  const hint = comic(root, { kind: 'speech', html: 'Three drawings, three projects, three nodes. <b>Click each one.</b>', at: { left: '40vw', top: '64vh' }, width: 290, tail: 'top', tailAt: 120 });
  const boxes = {
    buzz: comic(root, { kind: 'speech', html: creditHTML(PROJECT.buzz) + '<span class="small">10,000 simulated pollen grains, shaken out by a bumblebee\'s buzz. KTH did it for an Uppsala biologist.</span>', at: { left: '4vw', top: '15vh' }, width: 330, tail: 'bottom', tailAt: 160 }),
    butterflies: comic(root, { kind: 'speech', html: creditHTML(PROJECT.butterflies) + '<span class="small">Carving microCT scans by hand, in virtual reality.</span>', at: { left: '38vw', top: '58vh' }, width: 320, tail: 'top', tailAt: 130 }),
    genomelens: comic(root, { kind: 'speech', html: creditHTML(PROJECT.genomelens) + '<span class="small">Atlantic and Mediterranean krill, compared along every chromosome. Three nodes, one tool.</span>', at: { right: '4vw', top: '14vh' }, width: 320, tail: 'bottom', tailAt: 120 }),
  };
  const outro = comic(root, { kind: 'caption', html: 'Bees in Uppsala, butterflies in Lund, krill genomes across three universities. <b>Different sciences, one visualization infrastructure.</b>', at: { left: '4vw', bottom: '20vh' }, width: 380 });
  const seen = new Set();
  function saw(k) {
    seen.add(k);
    Object.entries(boxes).forEach(([kk, b]) => (kk === k ? b.show() : b.hide()));
    hint.hide(); intro.hide();
    if (seen.size === 3) { setTimeout(() => { Object.values(boxes).forEach((b) => b.hide()); outro.show(); ctx.ready(); }, 5200); }
  }

  // bee flight: circles the flower; on click, lands on the anther and buzzes
  let t = 0, beeMode = 'fly', beeT = 0;
  const pollen = [];
  const R = rng(9);
  const flowerCentre = () => { const r = fl.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.4]; };
  fl.addEventListener('click', () => { if (beeMode !== 'fly') return; beeMode = 'land'; beeT = 0; saw('buzz'); });
  bf.addEventListener('click', () => {
    const scan = bf.querySelector('.scan'), sl = bf.querySelector('.slices');
    scan.classList.remove('go'); sl.classList.remove('on'); void scan.getBBox();
    scan.classList.add('go'); sl.classList.add('on');
    ctx.firefly.perchOn(bf, 70, 10, { duration: 900 });
    saw('butterflies');
  });
  kr.addEventListener('click', () => {
    kr.querySelectorAll('.dna line').forEach((l, i) => setTimeout(() => l.classList.toggle('hot', HOT.has(+l.dataset.i)), i * 70));
    saw('genomelens');
  });

  return {
    async enter() {
      intro.show({ delay: 200 });
      await drawIn(root.querySelectorAll('.toy svg'), { duration: 1300, stagger: 18 });
      hint.show({ delay: 300 });
      ctx.firefly.flyTo(W * 0.38, H * 0.6, { duration: 1300 }).then(() => ctx.firefly.land(true));
    },
    update(dt) {
      t += dt;
      const [fx, fy] = flowerCentre();
      let bx, by;
      if (beeMode === 'fly') { bx = fx + Math.cos(t * 1.4) * 150; by = fy - 40 + Math.sin(t * 2.1) * 60; }
      else {
        beeT += dt;
        const k = Math.min(1, beeT / 0.8);
        bx = fx + Math.cos(t * 1.4) * 150 * (1 - k) + 8; by = fy - 40 * (1 - k) - 50 * k;
        if (beeT > 0.8 && beeT < 3.2) {
          flower.classList.add('buzz');
          bx += (R() - 0.5) * 3; by += (R() - 0.5) * 3;
          for (let i = 0; i < 6; i++) pollen.push({ x: fx + (R() - 0.5) * 10, y: fy - 70, vx: (R() - 0.5) * 120, vy: -60 - R() * 120, life: 1.6 });
        } else flower.classList.remove('buzz');
        if (beeT > 3.6) beeMode = 'fly';
      }
      bee.style.transform = `translate(${bx - 32}px, ${by - 26}px) scaleX(${beeMode === 'fly' && Math.sin(t * 1.4) > 0 ? -1 : 1})`;
      // pollen
      if (pollen.length) {
        g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, H);
        g2.fillStyle = '#f9b233'; g2.strokeStyle = 'rgba(0,0,0,.35)';
        for (let i = pollen.length - 1; i >= 0; i--) {
          const p = pollen[i]; p.life -= dt; if (p.life <= 0) { pollen.splice(i, 1); continue; }
          p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          g2.globalAlpha = Math.min(1, p.life); g2.beginPath(); g2.arc(p.x, p.y, 2.6, 0, 6.283); g2.fill(); g2.stroke();
        }
        g2.globalAlpha = 1;
        if (!pollen.length) g2.clearRect(0, 0, W, H);
      }
    },
    leave() { ctx.firefly.land(false); },
    dispose() { style.remove(); },
  };
}
