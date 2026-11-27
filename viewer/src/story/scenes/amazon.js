// 4 · INTO THE AMAZON ("Amazon from within", Linnaeus University). The
// flooded forest of Mamirauá sketched on the board, and in it the 3D jaguar
// of the Amazon project, ink-shaded: lying along a limb in the wet season,
// down on the forest floor (looking round, licking) in the dry one. The
// visitor turns the seasons (buttons, or a click on the cat) and the flood
// rises and falls in the sketch. Terns cross overhead now and then.
// The jaguar (~0.9 MB) loads only when this scene starts; the firefly loops
// with its lantern up while it does.
import { el, svgEl, drawIn, sleep } from '../../draw/ink.js';
import { emergent, fern, vine, wobble, conifer, broadleaf } from '../../draw/sketches.js';
import { comic } from '../../ui/comic.js';
import { creditHTML, installCreditCSS } from '../../ui/credits.js';
import { PROJECT } from '../../data/projects.js';
import { rng } from '../../draw/ink.js';
import { theme } from '../../theme.js';

const CSS = `
.amazon .back, .amazon .front { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--ink); overflow: visible; pointer-events: none; }
.amazon .front { z-index: 6; }
.amazon .jungle-mount { left: 30vw; right: 0; top: 0; bottom: 0; z-index: 5; }
.amazon .water { fill: color-mix(in srgb, var(--iv-blue) 22%, var(--paper)); fill-opacity: .82; stroke: var(--ink); stroke-width: 2; transition: transform 2.2s cubic-bezier(.65,0,.35,1); }
.amazon .ripples { stroke: var(--ink-soft); stroke-width: 1.4; fill: none; transition: transform 2.2s cubic-bezier(.65,0,.35,1); }
.amazon .tool-row { left: 4vw; top: 70vh; z-index: 14; }
.amazon .col { position: absolute; left: 4vw; top: 15vh; width: min(25vw, 360px); display: flex; flex-direction: column; gap: 16px; z-index: 13; }
.amazon .col .comic { position: relative; left: auto; top: auto; right: auto; bottom: auto; max-width: none; display: none; }
.amazon .col .comic.show { display: block; }
.amazon .puff { position: absolute; width: 140px; height: 110px; margin: -55px 0 0 -70px; pointer-events: none; z-index: 8; opacity: 0; }
.amazon .puff.go { animation: puff .7s ease-out; }
@keyframes puff { 0% { opacity: 0; transform: scale(.4); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.4); } }
/* the bridge: one forest turning into another */
.amazon .bridge { position: absolute; inset: 0; z-index: 20; color: var(--ink); }
.amazon .bridge .comic { z-index: 21; }
.amazon .cat-hit { position: absolute; width: 230px; height: 150px; margin: -75px 0 0 -115px; z-index: 9; cursor: pointer; border-radius: 50%; }
`;

export default function build(root, ctx) {
  root.classList.add('amazon');
  installCreditCSS();
  const style = el('style', {}, root, CSS);
  const W = innerWidth, H = innerHeight;
  const back = svgEl('svg', { class: 'back', viewBox: `0 0 ${W} ${H}` }, root);
  const mount = el('div', { class: 'three-mount jungle-mount' }, root);
  const front = svgEl('svg', { class: 'front', viewBox: `0 0 ${W} ${H}` }, root);
  const puff = el('div', { class: 'puff' }, root, '<svg viewBox="0 0 140 110" class="ink" style="width:100%;height:100%;stroke:var(--ink);fill:var(--paper);stroke-width:2.5"><path d="M30 70 C10 70 10 45 32 46 C30 25 58 20 66 36 C74 16 108 22 104 44 C128 44 130 74 106 76 C104 94 76 96 70 82 C58 98 30 94 30 70 Z"/></svg>');
  const hit = el('button', { class: 'cat-hit', type: 'button', 'aria-label': 'The jaguar: click to change the season' }, root);
  hit.style.background = 'transparent'; hit.style.border = '0';

  const tools = el('div', { class: 'tool-row', role: 'group', 'aria-label': 'Season' }, root);
  const bDry = el('button', { class: 'sk-btn', type: 'button', 'aria-pressed': 'true' }, tools, '☀ Dry season');
  const bWet = el('button', { class: 'sk-btn', type: 'button', 'aria-pressed': 'false' }, tools, '🌧 Wet season');

  const p = PROJECT.amazon;
  const col = el('div', { class: 'col' }, root);
  const c1 = comic(col, { kind: 'caption', html: 'The Amazon, Mamirauá: a forest that stands <b>in water</b> for months every year.' });
  const c2 = comic(col, { kind: 'speech', html: 'In the dry season the jaguar walks the forest floor. <b>When the river rises</b>, where does it go? Try the wet season, or click the cat.', tail: 'right', tailAt: 30 });
  const c3 = comic(col, { kind: 'caption', html: '<b>Amazon from within</b> rebuilt 97 km of this forest from satellite, elevation and flood data, and let jaguars live in it — as a film, and as a world to explore.' });
  const cDry = comic(col, { kind: 'speech', html: 'Dry season again: the water is gone, and the cat is back on the forest floor.', tail: 'right', tailAt: 24 });
  const cWet = comic(col, { kind: 'speech', html: 'The river rises, and the jaguar moves <b>up into the trees</b>, for months.', tail: 'right', tailAt: 24 });
  const credit = comic(col, { kind: 'speech', html: creditHTML(p) + '<span class="small">The jaguar you see is that project&#39;s own 3D cat.</span>', tail: 'right', tailAt: 24 });

  let jungle = null, three = null, alive = true, toggles = 0, waterG = null, ripG = null, groundY = H * 0.82, offTheme = null;

  function sketch(limbStart, limbEnd, catX) {
    const r = rng(42);
    const gB = svgEl('g', { class: 'ink boil', 'stroke-width': 2 }, back);
    const paths = [];
    const add = (arr, g = gB) => arr.forEach((d) => paths.push(svgEl('path', { d }, g)));
    // background giants, faint, behind everything
    // (the background giants are the bridge's, kept: crossing())
    // the crown over the 3D trunk and limb, and vines hanging from it
    const tx = limbStart[0], span = limbEnd[0] - tx;
    const crown = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * 1.02 + (i / 16) * Math.PI * 0.98, k = i % 2 ? 1.06 : 0.94;
      crown.push([tx + span * 0.5 + Math.cos(a) * span * 0.75 * k, H * 0.16 + Math.sin(a) * H * 0.09 * k]);
    }
    add([wobble(crown, r, 3)]);
    [0.3, 0.55, 0.92].forEach((t, i) => add(vine(tx + span * t, H * 0.15 + (i % 2) * 18, (limbEnd[1] - H * 0.15) * 0.8 + i * 20, 50 + i)));
    // the ground line and the ferns: behind the 3D, so the cat always stands
    // in front of every sketched line (only the flood water is drawn over it)
    const gF = svgEl('g', { class: 'ink boil', 'stroke-width': 2 }, back);
    add([wobble([[W * 0.3, groundY], [W * 0.55, groundY + 6], [W * 0.8, groundY - 4], [W, groundY + 3]], r, 2)], gF);
    [0.36, 0.52, 0.95].map((fx) => W * fx).filter((x) => Math.abs(x - catX) > 170).forEach((x, i) => add(fern(x, groundY + 8, 40 + (i % 3) * 12, 60 + i), gF));
    // the flood: a body of water whose surface rises in the wet season
    waterG = svgEl('g', {}, front);
    const wy = groundY - H * 0.1, x0 = W * 0.3 - 20;
    let d = `M${x0} ${wy}`;
    for (let x = x0; x <= W + 40; x += 60) d += ` q15 -7 30 0 t30 0`;
    d += ` L${W + 40} ${H + 40} L${x0} ${H + 40} Z`;
    svgEl('path', { class: 'water', d }, waterG);
    ripG = svgEl('g', { class: 'ripples' }, front);
    for (let k = 0; k < 7; k++) {
      const x = W * 0.32 + r() * W * 0.66, y = wy + 24 + r() * (H - wy - 60);
      svgEl('path', { d: `M${x} ${y} q12 -5 24 0 m10 0 q8 -3 16 0` }, ripG);
    }
    return paths;
  }

  function setWater(wet) {
    const off = wet ? 0 : H * 0.6;   // dry: the water drains away entirely
    waterG.style.transform = `translateY(${off}px)`;
    ripG.style.transform = `translateY(${off}px)`;
  }

  // FROM ONE FOREST TO ANOTHER (no map, no journey): the light conifers of
  // the ForestVis chapter are still on the board; they un-draw while tall
  // rainforest trees and their vines draw in where they stood, the water
  // rises — and the drawing gives way to the 3D forest. The jaguar loads
  // meanwhile.
  const GY = H * 0.868;   // ≈ the jungle's ground line on screen (corrected once the 3D is in)
  async function crossing() {
    if (!alive) return null;
    const ov = el('div', { class: 'bridge board' }, root);
    const sv = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, style: 'position:absolute; inset:0; width:100%; height:100%' }, ov);
    const gy = H * 0.8;
    const gOld = svgEl('g', { class: 'ink', 'stroke-width': 1.8, opacity: 0.55 }, sv);
    const gNew = svgEl('g', { class: 'ink', 'stroke-width': 2 }, sv);
    const old = [], neu = [];
    [0.38, 0.47, 0.55, 0.63, 0.7, 0.78, 0.86, 0.93].forEach((fx, i) => {
      const h = H * (0.32 + ((i * 37) % 5) * 0.04);
      const d = i % 3 === 1 ? broadleaf(W * fx, gy, h, 20 + i) : conifer(W * fx, gy, h, 10 + i);
      d.forEach((p) => old.push(svgEl('path', { d: p, style: 'stroke: var(--ink-soft)' }, gOld)));
    });
    // the rainforest giants: they stay on as the chapter's background (no second
    // set of trees later), standing on the jungle's ground line; the 3D trunk
    // will take the place on the left
    [0.62, 0.84, 0.97].forEach((fx, i) => emergent(W * fx, GY, H * (0.56 + i * 0.05), 30 + i).forEach((p) => neu.push(svgEl('path', { d: p }, gNew))));
    neu.forEach((p) => { p.style.opacity = 0; });
    // the water, below the frame, to rise later
    let wd = `M${W * 0.3} ${gy - 20}`;
    for (let x = W * 0.3; x <= W + 40; x += 60) wd += ' q15 -7 30 0 t30 0';
    wd += ` L${W + 40} ${H + 40} L${W * 0.3} ${H + 40} Z`;
    const water = svgEl('path', { d: wd, style: 'fill: color-mix(in srgb, var(--iv-blue) 22%, var(--paper)); fill-opacity: .82; stroke: var(--ink); stroke-width: 2' }, sv);
    water.style.transform = `translateY(${H * 0.3}px)`;
    const cap = comic(ov, { kind: 'caption', html: 'The same lasers, the same questions… <b>in a forest that floods.</b>', at: { left: '4vw', top: '15vh' }, width: 320 });
    cap.show();
    // its first flight here makes the change: smaller, and in the birds' ink
    ctx.firefly.blend(true);
    ctx.firefly.perchOnEl(cap.el, 0.85, { duration: 2000, toSize: 0.45 });
    await sleep(700);
    // the old forest is erased stroke by stroke, the new one drawn in
    old.forEach((p, i) => { const L = p.getTotalLength?.() || 0; if (!L) return; p.style.strokeDasharray = `${L} ${L}`; p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: L }], { duration: 480, delay: i * 7, easing: 'ease-in', fill: 'forwards' }); });
    await sleep(300);
    neu.forEach((p) => { p.style.opacity = 1; });
    await drawIn(neu, { duration: 700, stagger: 12 });
    water.remove();   // (it starts dry: the river rises later, with the wet season)
    await sleep(700);
    cap.hide();
    // the giants move to the chapter's back layer and soften; only the paper
    // and the caption fade — the drawing itself stays
    back.appendChild(gNew);
    gNew.style.transition = 'opacity 1s ease, transform .8s ease';
    requestAnimationFrame(() => { gNew.style.opacity = 0.32; });
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }).finished.catch(() => {});
    ov.remove();
    return gNew;
  }

  function placeHit() {
    if (!jungle) return;
    const [x, y] = jungle.jaguarScreen(mount.clientWidth, mount.clientHeight);
    hit.style.left = `${x + mount.offsetLeft}px`; hit.style.top = `${y}px`;
  }

  function setSeason(s) {
    if (!jungle || jungle.season === s && !jungle._pending) return;
    jungle.setSeason(s);
    ctx.stepDone(s);   // (the same beat as Next's)
    toggles++;
    bWet.setAttribute('aria-pressed', String(s === 'wet')); bDry.setAttribute('aria-pressed', String(s === 'dry'));
    setWater(s === 'wet');
    const [x, y] = jungle.jaguarScreen(mount.clientWidth, mount.clientHeight);
    puff.style.left = `${x + mount.offsetLeft}px`; puff.style.top = `${y}px`;
    puff.classList.remove('go'); void puff.offsetWidth; puff.classList.add('go');
    c1.hide(); c2.hide();
    if (s === 'wet') { cDry.hide(); cWet.show({ delay: 500 }); c3.show({ delay: 1200 }); }
    else { cWet.hide(); cDry.show({ delay: 500 }); }
  }
  bWet.addEventListener('click', () => setSeason('wet'));
  bDry.addEventListener('click', () => setSeason('dry'));
  hit.addEventListener('click', () => setSeason(jungle?.season === 'wet' ? 'dry' : 'wet'));
  // the last beat changes only the words: the project behind the forest
  function about() { ctx.stepDone('about'); cWet.hide(); cDry.hide(); credit.show({ delay: 200 }); ctx.ready(); }

  async function load3D() {
    const [{ getStage }, { createJungle, LIMB }] = await Promise.all([import('../../three/stage.js'), import('../../three/jungle.js')]);
    if (!alive) return null;
    three = getStage();
    three.mount(mount);
    const j = await createJungle(three, { season: 'dry' });   // it opens in the dry season
    if (!alive) { j.dispose(); return null; }
    offTheme = theme.onChange(() => j.inkColours());
    return { j, LIMB };
  }

  return {
    steps: [
      { key: 'wet', label: '🌧 Wet season', run: () => setSeason('wet'), undo: () => setSeason('dry') },
      { key: 'about', label: 'About the project', run: () => about(), undo: () => { credit.hide(); cWet.show({ delay: 200 }); } },
    ],
    stepReady: () => !!jungle,
    async enter() {
      // the jaguar loads while the firefly crosses the ocean
      const loading = load3D();
      const giants = await crossing();
      c1.show({ delay: 200 });
      const got = await ctx.whileLoading(loading);
      if (!got) return;
      jungle = got.j;
      const w = mount.clientWidth, h = mount.clientHeight, ox = mount.offsetLeft;
      const sc = (xy) => [xy[0] + ox, xy[1]];
      groundY = jungle.project(1.1, 0, 0.6, w, h)[1];   // the ground at the cat's own depth: its paws meet this line
      if (giants) giants.style.transform = `translateY(${(groundY - GY).toFixed(1)}px)`;   // (onto the real ground line)
      const ls = sc(jungle.project(got.LIMB.x0, got.LIMB.y0, 0, w, h)), le = sc(jungle.project(got.LIMB.x1, got.LIMB.y1, 0, w, h));
      const catX = sc(jungle.project(1.1, 0, 0.6, w, h))[0];
      const paths = sketch(ls, le, catX);
      setWater(false);   // the chapter opens in the dry season
      drawIn(paths, { duration: 600, stagger: 8 });
      placeHit();
      await sleep(800);
      tools.classList.add('show');
      c2.show();
      // on the limb, near its tip (its top: the axis less the limb's radius on screen)
      const lx = ls[0] + (le[0] - ls[0]) * 0.88, ly = ls[1] + (le[1] - ls[1]) * 0.88;
      // and it steps back: small, in the birds' ink, at the top left — the
      // jaguar is the subject here
      void lx; void ly;
      // at the top of the screen: on the chapter's title, out of the way (already small and inked)
      ctx.firefly.perchOnEl(root.querySelector('.chapter-tag'), 0.9, { duration: 2000 });
    },
    update(dt) {
      if (!jungle) return;
      jungle.update(dt);
      placeHit();
    },
    leave() { ctx.firefly.blend(false); ctx.firefly.land(false); },   // (it grows back during the flight to the next chapter: story.js)
    dispose() { alive = false; offTheme?.(); jungle?.dispose(); three?.unmount(); style.remove(); },
  };
}
