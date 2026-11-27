// 2 · A FOREST OF POINTS (ForestVis, Linnaeus University). A forest is
// sketched on the board; then the laser's view rises out of it: a 3D plot of
// points the visitor can turn (drag) and recolour, as ForestVis does —
// height, greenness (NDVI), or one tree picked out with its measurements.
import { el, svgEl, drawIn, sleep } from '../../draw/ink.js';
import { conifer, broadleaf, grassLine } from '../../draw/sketches.js';
import { comic } from '../../ui/comic.js';
import { creditHTML, installCreditCSS } from '../../ui/credits.js';
import { PROJECT } from '../../data/projects.js';
import { theme } from '../../theme.js';

const CSS = `
.forest-mount { left: 34vw; right: 2vw; top: 9vh; bottom: 13vh; cursor: grab; touch-action: none; opacity: 0; transition: opacity 1.4s; z-index: 3; }
.forest-mount.show { opacity: 1; }
.forest-mount:active { cursor: grabbing; }
/* the sketched forest: light, and behind the 3D one, from the first stroke;
   fainter still once the points have risen out of it */
.forest-sketch { z-index: 1; opacity: .42; transition: opacity 1.4s; }
.forest-sketch .ink { stroke: var(--ink-soft); }
.forest-sketch.dim { opacity: .12; }
.forest .tool-row { left: 4vw; bottom: 15vh; }
.forest .legend { position: absolute; right: 4vw; bottom: 15vh; font: 13px var(--font-ui); color: var(--ink-soft); display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity .6s; z-index: 12; }
.forest .legend.show { opacity: 1; }
@media (max-width: 760px) {
  .forest-mount { left: 0; right: 0; top: 30vh; bottom: 20vh; }
  .forest .tool-row { left: 4vw; right: 4vw; bottom: 76px; }
  .forest .legend { display: none; }
  .forest .comic { left: 4vw !important; right: auto !important; top: 12vh !important; bottom: auto !important; }
}
.forest .legend i { display: block; width: 120px; height: 10px; border-radius: 3px; border: 1.5px solid var(--ink); }
`;
const GRAD_H = 'linear-gradient(90deg,#1d71b8,#951b81,#e30613,#ed6a21,#f9b233,#ffed00)';
const GRAD_N = 'linear-gradient(90deg,#8c6133,#1f9e40)';

export default function build(root, ctx) {
  root.classList.add('forest');
  installCreditCSS();
  const style = el('style', {}, root, CSS);
  const W = innerWidth, H = innerHeight;
  const svg = svgEl('svg', { class: 'full forest-sketch', viewBox: `0 0 ${W} ${H}` }, root);
  const g = svgEl('g', { class: 'ink boil', 'stroke-width': 1.8 }, svg);
  const ground = H * 0.8;
  const paths = [];
  // a row of trees across the board, smaller toward the back
  const xs = [0.38, 0.47, 0.55, 0.63, 0.7, 0.78, 0.86, 0.93];
  xs.forEach((fx, i) => {
    const h = H * (0.32 + ((i * 37) % 5) * 0.04);
    const d = i % 3 === 1 ? broadleaf(W * fx, ground, h, 20 + i) : conifer(W * fx, ground, h, 10 + i);
    d.forEach((p) => paths.push(svgEl('path', { d: p }, g)));
  });
  grassLine(W * 0.3, W * 0.98, ground, 9).forEach((p) => paths.push(svgEl('path', { d: p }, g)));
  // the plane and its laser fan, drawn last
  const plane = svgEl('g', { class: 'ink', 'stroke-width': 2 }, svg);
  const px = W * 0.66, py = H * 0.14;
  svgEl('path', { d: `M${px - 40} ${py} q40 -10 80 0 l12 -10 m-92 10 l-14 -6 m50 4 l-16 22 m10 -24 l-12 -20` }, plane);
  const fan = svgEl('g', { stroke: 'var(--iv-red)', 'stroke-width': 1.4, 'stroke-dasharray': '3 6', opacity: 0.8 }, svg);
  for (let k = -3; k <= 3; k++) svgEl('path', { d: `M${px} ${py + 6} L${px + k * 70} ${ground - 40}` }, fan);
  fan.style.opacity = 0;

  const mount = el('div', { class: 'three-mount forest-mount', 'aria-label': 'A 3D point cloud of a forest plot. Drag to turn it.' }, root);
  const tools = el('div', { class: 'tool-row', role: 'group', 'aria-label': 'Colour the points by' }, root);
  const bH = el('button', { class: 'sk-btn', type: 'button', 'aria-pressed': 'true' }, tools, 'Height');
  const bN = el('button', { class: 'sk-btn', type: 'button', 'aria-pressed': 'false' }, tools, 'Greenness (NDVI)');
  const bT = el('button', { class: 'sk-btn', type: 'button', 'aria-pressed': 'false' }, tools, 'Pick a tree');
  const legend = el('div', { class: 'legend' }, root, '<span>low</span><i></i><span>high</span>');
  const hint = el('div', { class: 'hint', style: 'right: 6vw; top: 14vh;' }, root,
    '<svg viewBox="0 0 46 30"><path d="M4 20 C 14 4, 30 4, 40 16 M34 10 l6 6 -8 2"/></svg> drag to turn it');

  const p = PROJECT.forestvis;
  const c1 = comic(root, { kind: 'caption', html: 'In Swedish forests, aircraft scan every tree with lasers. One flight: <b>hundreds of millions of points</b>.', at: { left: '4vw', top: '17vh' }, width: 330 });
  const c2 = comic(root, { kind: 'speech', html: 'And here they are as a 3D forest. Turn it. Colour it. <b>Every tree, measured.</b>', at: { left: '4vw', top: '42vh' }, width: 300, tail: 'right', tailAt: 26 });
  const credit = comic(root, { kind: 'speech', html: creditHTML(p), at: { left: '4vw', top: '17vh' }, width: 340, tail: 'bottom', tailAt: 40 });
  const tree = comic(root, { kind: 'caption', html: '', at: { right: '4vw', top: '14vh' }, width: 240 });
  const bridge = comic(root, { kind: 'caption', html: 'The same lasers, the same questions… in a very different forest, <b>on the other side of the world</b>.', at: { left: '4vw', top: '46vh' }, width: 330, tilt: 0.6 });

  let three = null, forest = null, camera = null, sceneT = null, alive = true, t = 0;
  let yaw = 0.6, pitch = 0.3, dist = 5.4, drag = null, autoSpin = true, uses = 0, pick = 0;

  async function start3D() {
    const [{ getStage }, { createPointForest }] = await Promise.all([import('../../three/stage.js'), import('../../three/pointForest.js')]);
    if (!alive) return;
    three = getStage();
    const T = three.THREE;
    sceneT = new T.Scene();
    camera = new T.PerspectiveCamera(36, 1, 0.05, 50);
    forest = createPointForest();
    sceneT.add(forest.points);
    const setInk = () => forest.uniforms.uInk.value.copy(three.ink());
    setInk(); offTheme = theme.onChange(setInk);
    three.mount(mount);
    mount.classList.add('show');
  }
  let offTheme = null;

  let mode = 0, picked = 0;
  // silent: set by Back (undoing a beat), so it does not count as a new beat
  function setMode(m, { silent = false, back = false } = {}) {
    if (!forest) return;
    uses++;
    // the same beats as Next's (story.js keeps the two in step)
    if (!silent) {
      if (m === 1) ctx.stepDone('ndvi');
      if (m === 2) ctx.stepDone(picked++ ? 'next' : 'pick');
      if (m === 0 && mode !== 0) ctx.stepDone('height');
    }
    if (back && m === 2) { pick = (pick - 2 + forest.spots.length) % forest.spots.length; }   // (the tree before)
    mode = m;
    forest.uniforms.uMode.value = m;
    [bH, bN, bT].forEach((b, i) => b.setAttribute('aria-pressed', String(i === m)));
    legend.querySelector('i').style.background = m === 1 ? GRAD_N : GRAD_H;
    legend.classList.toggle('show', m !== 2);
    if (m === 2) {
      pick = (pick + 1) % forest.spots.length;
      forest.uniforms.uPick.value = pick;
      const s = forest.treeInfo(pick);
      tree.set(`<span class="who">Tree #${pick + 1}</span>${s.kind}, <b>${s.height} m</b> tall, crown ${s.crown} m across.<span class="small">Click again for the next tree. (A simulated plot.)</span>`, { reveal: true });
      tree.show();
      bT.textContent = 'Next tree';
    } else { tree.hide(); bT.textContent = 'Pick a tree'; }
    if (uses >= 2) ctx.ready();
  }
  bH.addEventListener('click', () => setMode(0));
  bN.addEventListener('click', () => setMode(1));
  bT.addEventListener('click', () => setMode(2));

  mount.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; autoSpin = false; mount.setPointerCapture(e.pointerId); hint.classList.remove('show'); });
  mount.addEventListener('pointermove', (e) => { if (!drag) return; yaw = drag.yaw - (e.clientX - drag.x) * 0.008; pitch = Math.max(-0.05, Math.min(1.3, drag.pitch + (e.clientY - drag.y) * 0.006)); });
  mount.addEventListener('pointerup', () => { drag = null; uses++; if (uses >= 2) ctx.ready(); });
  mount.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(2.4, Math.min(7, dist * (1 + e.deltaY * 0.001))); }, { passive: false });

  return {
    next: 'To the Amazon ⟶',
    steps: [
      { key: 'ndvi', label: 'Colour by greenness', run: () => setMode(1), undo: () => setMode(0, { silent: true }) },
      { key: 'pick', label: 'Pick a tree', run: () => setMode(2), undo: () => { picked = 0; setMode(1, { silent: true }); } },
      { key: 'next', label: 'Next tree', run: () => setMode(2), undo: () => { picked = 1; setMode(2, { silent: true, back: true }); } },
      { key: 'height', label: 'Colour by height', run: () => setMode(0), undo: () => setMode(2, { silent: true, back: true }) },
    ],
    stepReady: () => !!forest,
    async enter() {
      // the trees are the subject: the firefly goes small and white, to the
      // far right, on the ground line under the forest, and stays there all chapter
      ctx.firefly.blend(true);
      ctx.firefly.perchAt(W * 0.955, ground, { duration: 2000, toSize: 0.45 });   // (on the sketch's ground line, far right: always there)
      const loading = ctx.whileLoading(start3D());   // fetch three.js while the pen draws
      c1.show({ delay: 300 });
      await drawIn(paths, { duration: 900, stagger: 25 });
      drawIn(plane.querySelectorAll('path'), { duration: 700 });
      fan.animate([{ opacity: 0 }, { opacity: 0.8 }], { duration: 600, fill: 'forwards' });
      await loading;
      await sleep(600);
      svg.classList.add('dim');
      c1.hide(); c2.show({ delay: 300 });
      tools.classList.add('show'); legend.querySelector('i').style.background = GRAD_H; legend.classList.add('show');
      hint.classList.add('show');
      await sleep(5200);
      c2.hide(); credit.show();
      await sleep(4000);
      bridge.show();
      ctx.ready();
    },
    update(dt) {
      t += dt;
      if (!three || !forest) return;
      if (autoSpin) yaw += dt * 0.12;
      forest.uniforms.uTime.value = t;
      forest.uniforms.uReveal.value = Math.min(1, forest.uniforms.uReveal.value + dt / 2.2);
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, 0.55 + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(0, 0.62, 0);
      three.render(sceneT, camera);
    },
    leave() { ctx.firefly.blend(false); ctx.firefly.land(false); },
    dispose() { alive = false; offTheme?.(); if (three) three.unmount(); forest?.dispose(); style.remove(); },
  };
}
