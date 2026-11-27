// 6 · INFRAVIS. The network folds into the mark. The nine universities —
// circles with their emblems, where the map left them — fly to the nine
// circles of the InfraVis logo and become its coloured nodes; the arcs are
// drawn by hand, the rainbow fills in, the name is written beside it, and the
// firefly settles on the yellow tip.
//
// "Enter InfraVis": the website's black bar slides down with an empty logo
// slot, and the logo in the middle of the screen — the official lockup,
// drawn inline in the same coordinates as the header's file — flies into
// that slot, its letters turning white as they reach the bar. The grey hero
// and its wave draw in beneath, and the story hands over to the site, which
// is the same picture, so nothing jumps.
import { el, svgEl, drawIn, sleep } from '../../draw/ink.js';
import { comic } from '../../ui/comic.js';
import { iconURL } from '../../ui/credits.js';
import { NODES, LOGO_NODES, LOGO_NODE_R, nodeColor } from '../../data/nodes.js';
import { loadSweden, mapBox, nodeXY, nodeR, mapToScreen, getZoomVB, zoomScale } from '../mapLayout.js';
import { buildHeader, heroHTML } from '../../site/site.js';
import { uniPulse } from '../../ui/uniPulse.js';

const VB_W = 343.57, VB_H = 149.03;   // the lockup's viewBox (infravis-*-text.svg)

const CSS = `
.logo-scene .stage { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.logo-scene .lockup { position: absolute; transform-origin: 0 0; overflow: visible; z-index: 45; }
.logo-scene .lockup .lstroke { fill: none; stroke: var(--ink); }
.logo-scene .lockup .lfill { opacity: 0; transition: opacity 1.3s; }
.logo-scene .lockup .lfill.on { opacity: 1; }
.logo-scene .lockup .letter { fill: var(--ink); fill-opacity: 0; stroke: var(--ink); stroke-width: .5; transition: fill .5s, stroke .5s; }
.logo-scene .lockup.white .letter { fill: #fff; stroke: #fff; }
.logo-scene .tag { position: absolute; left: 0; right: 0; text-align: center; font-size: clamp(16px, 1.5vw, 22px); color: var(--ink-soft); opacity: 0; transition: opacity 1s; }
.logo-scene .tag.on { opacity: 1; }
.logo-scene .cta { position: absolute; left: 50%; bottom: 10vh; transform: translateX(-50%); display: flex; gap: 14px; opacity: 0; transition: opacity .8s; z-index: 30; }
.logo-scene .cta.on { opacity: 1; }
.logo-scene .cta .sk-btn { white-space: nowrap; }
@media (max-width: 760px) { .logo-scene .cta { bottom: 14vh; gap: 10px; } .logo-scene .cta .sk-btn { font-size: 16px; } .logo-scene .tag { font-size: 14px; padding: 0 6vw; } }
.logo-scene .handoff { position: absolute; inset: 0; z-index: 40; pointer-events: none; }
.logo-scene .handoff .bg { position: absolute; inset: 0; background: var(--s-bg); opacity: 0; transition: opacity .9s .3s; }
.logo-scene .handoff .bg.in { opacity: 1; }
.logo-scene .handoff .s-header { position: absolute; left: 0; right: 0; top: 0; transform: translateY(-100%); transition: transform .7s cubic-bezier(.65,0,.35,1); }
.logo-scene .handoff .s-header.in { transform: none; }
.logo-scene .handoff .s-header .s-logo img { opacity: 0; }
.logo-scene .handoff .s-hero { position: absolute; left: 0; right: 0; top: 88px; clip-path: inset(0 0 100% 0); transition: clip-path 1.1s cubic-bezier(.65,0,.35,1) .5s; }
.logo-scene .handoff .s-hero.in { clip-path: inset(0 0 0 0); }
`;

export default function build(root, ctx) {
  root.classList.add('logo-scene');
  const style = el('style', {}, root, CSS);
  const W = innerWidth, H = innerHeight;
  const stage = svgEl('svg', { class: 'stage', viewBox: `0 0 ${W} ${H}` }, root);
  const gMap = svgEl('g', {}, stage), gNodes = svgEl('g', {}, stage);
  const defs = svgEl('defs', {}, stage);

  // the lockup, centred: mark + name, the official proportions
  const LW = Math.min(W * 0.62, 820), s = LW / VB_W, LH = VB_H * s;
  const L = { x: (W - LW) / 2, y: H * 0.42 - LH / 2 };
  const lock = svgEl('svg', { class: 'lockup', viewBox: `0 0 ${VB_W} ${VB_H}`, width: LW, height: LH, style: `left:${L.x}px; top:${L.y}px` }, root);
  const tag = el('div', { class: 'tag', style: `top:${L.y + LH + 22}px` }, root, 'The National Research Infrastructure for Data Visualization');
  const cta = el('div', { class: 'cta' }, root);
  const enter = el('button', { class: 'sk-btn primary', type: 'button' }, cta, 'Enter InfraVis ⟶');
  const again = el('button', { class: 'sk-btn', type: 'button' }, cta, '↺ Watch again');
  const c1 = comic(root, { kind: 'caption', html: 'Nine nodes. One infrastructure. <b>Any science.</b>', at: { left: '50%', top: `${L.y + LH + 70}px` }, width: 320, tilt: -1 });
  c1.el.style.marginLeft = '-160px';
  const handoff = el('div', { class: 'handoff' }, root);

  const box = mapBox();
  const nodes = [];
  let pulse = null;
  let done = false;

  async function play() {
    const [g, txt] = await Promise.all([loadSweden(), fetch('./lib/logos/infravis-black-text.svg').then((r) => r.text())]);
    // the map as the network chapter left it, fading away
    // (through the map chapter's zoom: the nodes start exactly where it left them)
    const zk = zoomScale(box), [zvx, zvy] = getZoomVB();
    const sw = svgEl('path', { d: g.sweden, fill: 'var(--paper-2)', stroke: 'var(--ink)', 'stroke-width': 1.6 / zk, transform: `translate(${box.x - zvx * zk} ${box.y - zvy * zk}) scale(${zk})` }, gMap);
    // the lockup's parts: the mark's path (split into its strokes) and the letters
    const markD = txt.match(/class="cls-1" d="([^"]+)"/)[1];
    const letters = [...txt.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    lock.innerHTML = `<defs><linearGradient id="fin-grad" x1="5.99" y1="129.28" x2="120.57" y2="12.21" gradientUnits="userSpaceOnUse">
      <stop offset=".12" stop-color="#1d71b8"/><stop offset=".32" stop-color="#951b81"/><stop offset=".5" stop-color="#e30613"/>
      <stop offset=".56" stop-color="#e41915"/><stop offset=".67" stop-color="#e94e1b"/><stop offset=".72" stop-color="#ed6a21"/>
      <stop offset=".84" stop-color="#f9b233"/><stop offset="1" stop-color="#ffed00"/></linearGradient></defs>
      <path class="lfill" fill="url(#fin-grad)" d="${markD}"/>`;
    const strokes = markD.split(/(?=M)/).map((d) => svgEl('path', { class: 'lstroke', d, 'stroke-width': 0.9 }, lock));
    const letterEls = letters.map((d) => svgEl('path', { class: 'letter', d }, lock));
    strokes.forEach((p) => { p.style.opacity = 0; });
    letterEls.forEach((p) => { p.style.opacity = 0; });

    // the nine nodes: emblem circles where the map had them
    NODES.forEach((n) => {
      const [mx, my] = nodeXY(g, n.id);
      const r0 = nodeR(n.id) * zk;
      const [fx, fy] = mapToScreen([mx, my], box);
      const gN = svgEl('g', {}, gNodes);
      const disc = svgEl('circle', { r: r0, fill: '#fff', stroke: 'var(--ink)', 'stroke-width': 3 }, gN);
      const cp = svgEl('clipPath', { id: `lc-${n.id}` }, defs); const cc = svgEl('circle', { r: r0 - 3 }, cp);
      const img = svgEl('image', { href: iconURL(n.id), x: -(r0 - 4), y: -(r0 - 4), width: 2 * (r0 - 4), height: 2 * (r0 - 4), 'clip-path': `url(#lc-${n.id})` }, gN);
      const to = LOGO_NODES[n.logo];
      nodes.push({ n, gN, disc, cc, img, r0, from: [fx, fy], to: [L.x + to.x * s, L.y + to.y * s], r1: LOGO_NODE_R * s, col: to.color });
    });
    nodes.forEach((e) => e.gN.setAttribute('transform', `translate(${e.from[0]} ${e.from[1]})`));
    await sleep(500);
    sw.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1300, fill: 'forwards' });
    // fly: each on a gentle arc, staggered; the emblem gives way to the logo's colour
    await Promise.all(nodes.map((e, i) => new Promise((res) => {
      const t0 = performance.now() + 200 + i * 110, dur = 1900;
      const step = (now) => {
        const k = Math.min(1, Math.max(0, (now - t0) / dur)), q = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
        const x = e.from[0] + (e.to[0] - e.from[0]) * q, y = e.from[1] + (e.to[1] - e.from[1]) * q - Math.sin(Math.PI * q) * 70;
        const r = e.r0 + (e.r1 - e.r0) * q;
        e.gN.setAttribute('transform', `translate(${x} ${y})`);
        e.disc.setAttribute('r', r); e.cc.setAttribute('r', Math.max(0, r - 3));
        e.img.setAttribute('x', -(r - 4)); e.img.setAttribute('y', -(r - 4)); e.img.setAttribute('width', Math.max(0, 2 * (r - 4))); e.img.setAttribute('height', Math.max(0, 2 * (r - 4)));
        const f = Math.max(0, (q - 0.6) / 0.4);   // last stretch: emblem -> colour
        e.img.style.opacity = 1 - f;
        e.disc.setAttribute('fill', f > 0 ? e.col : '#fff');
        e.disc.setAttribute('stroke', f > 0.4 ? e.col : 'var(--ink)');   // (the colour arrives here, in the logo)
        e.disc.style.fillOpacity = f > 0 ? f : 1;
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    })));
    // the arcs between them, by hand; then the rainbow; then the name
    strokes.forEach((p) => { p.style.opacity = 1; });
    await drawIn(strokes, { duration: 1400, stagger: 80 });
    lock.querySelector('.lfill').classList.add('on');
    nodes.forEach((e) => e.gN.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, delay: 300, fill: 'forwards' }));
    strokes.forEach((p) => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1200, delay: 400, fill: 'forwards' }));
    letterEls.forEach((p) => { p.style.opacity = 1; });
    await drawIn(letterEls, { duration: 900, stagger: 70 });
    letterEls.forEach((p) => { p.style.transition = 'fill-opacity .6s'; p.style.fillOpacity = 1; });
    tag.classList.add('on');
    // now and then, the nine universities show in white in their circles
    pulse = uniPulse(lock, { first: 3, every: 25 });
    // the firefly lands on the yellow tip
    const tip = LOGO_NODES[1];
    // on the yellow tip, as a white silhouette (black on paper), as in the Amazon
    ctx.firefly.blend(true);
    ctx.firefly.perchAt(L.x + tip.x * s, L.y + (tip.y - LOGO_NODE_R) * s, { duration: 1800 });
    await sleep(1000);
    c1.show();
    cta.classList.add('on');
    done = true;
  }

  async function toSite() {
    if (!done) return;
    done = false;
    ctx.hideNav(true); c1.hide(); cta.classList.remove('on'); tag.classList.remove('on');
    pulse?.stop();
    document.querySelector('.story-top')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    ctx.firefly.glow(1); ctx.firefly.land(false);   // (it stays the ink silhouette: the website keeps it so)
    // the site's frame arrives: the board turns to page, the black bar slides down
    const bg = el('div', { class: 'bg' }, handoff);
    const site = el('div', { class: 'site', style: 'background:transparent; position:absolute; inset:0' }, handoff);
    const header = buildHeader(site);
    const hero = el('section', { class: 's-hero' }, site, heroHTML());
    header.style.position = 'absolute';
    void header.offsetWidth;
    header.classList.add('in'); bg.classList.add('in'); hero.classList.add('in');
    // the logo flies into the empty slot: same viewBox, so scaling the whole
    // lockup onto the slot's box lands every node and letter where the header's own file has it
    await sleep(380);
    const slot = header.querySelector('.s-logo img').getBoundingClientRect();
    const k = slot.width / LW, dx = slot.left - L.x, dy = (slot.top + (slot.height - LH * k) / 2) - L.y;
    const fly = lock.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }], { duration: 1250, easing: 'cubic-bezier(.6,0,.25,1)', fill: 'forwards' });
    setTimeout(() => lock.classList.add('white'), 850);   // letters turn white as they reach the black bar
    ctx.firefly.flyTo(slot.left + slot.width * 0.36, slot.top + slot.height * 0.18, { duration: 1250, arc: 0.2 });
    await fly.finished.catch(() => {});
    header.querySelector('.s-logo img').style.opacity = 1;
    lock.style.opacity = 0;
    await sleep(200);
    ctx.goSite({ seamless: true });
  }

  enter.addEventListener('click', toSite);
  again.addEventListener('click', () => { location.hash = ''; location.reload(); });

  return {
    hideNav: true,   // its own two buttons: Enter / Watch again
    onNext: toSite,
    async enter() { await play(); },
    leave() { ctx.firefly.land(false); ctx.firefly.glow(1); },
    dispose() { pulse?.stop(); style.remove(); },
  };
}
