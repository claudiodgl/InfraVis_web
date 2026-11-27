// 5 · NINE NODES, ONE INFRASTRUCTURE. Sweden drawn by hand, the nine
// universities on it — each a circle with its emblem, as large as the work it
// has taken part in — and between them the collaboration network: one line
// per pair of nodes that worked together, as thick as the number of projects
// they share (all 43 projects on infravis.se, data/collab.js).
// The panel lists the projects: hover one and its nodes and lines light up;
// click it for its story. Hover a node or a line to see what it stands for.
import { el, svgEl, drawIn, sleep } from '../../draw/ink.js';
import { comic } from '../../ui/comic.js';
import { installCreditCSS, nodeBadge, nodeIcon, iconURL } from '../../ui/credits.js';
import { NODES, NODE, nodeColor } from '../../data/nodes.js';
import { PROJECTS_DB, EDGES, NODE_COUNTS } from '../../data/collab.js';
import { PROJECTS } from '../../data/projects.js';
import { MINIS } from '../../ui/minis.js';
import { theme } from '../../theme.js';
import { loadSweden, mapBox, nodeXY, nodeR, edgeW, mapToScreen, setZoomVB, resetZoom, nodesRegion } from '../mapLayout.js';

const CSS = `
.map .sw { position: absolute; overflow: hidden; color: var(--ink); }
.map .sweden { fill: var(--paper-2); stroke: var(--ink); stroke-width: 1.6; stroke-linejoin: round; }
.map .neigh { fill: none; stroke: var(--ink-faint); stroke-width: 1.2; }
.map .edge { fill: none; stroke-linecap: round; opacity: .85; transition: opacity .35s; pointer-events: none; }
.map .edge-hit { fill: none; stroke: transparent; stroke-width: 18; cursor: pointer; }
.map .edge { transition: opacity .8s ease, stroke-width 1.2s cubic-bezier(.25,.8,.25,1); }
.map .edge.dim { opacity: .07; }
.map .edge.gone { opacity: 0 !important; }
.map .node .nb { transition: transform 1.2s cubic-bezier(.25,.9,.3,1.15); }
.map .node text.nl { transition: transform 1.2s cubic-bezier(.25,.9,.3,1.15); }
.map .node { transition: opacity .8s ease; }
.map .node.empty { opacity: .3; }
.map .node .cnt { opacity: 0; transition: opacity .6s ease, transform 1.2s cubic-bezier(.25,.9,.3,1.15); pointer-events: none; }
.map.view-growth .node .cnt { opacity: 1; }
.map .node .cnt circle { fill: var(--ink); }
.map .node .cnt text { font: 700 11px var(--font-ui); fill: var(--paper); text-anchor: middle; dominant-baseline: central; stroke: none; }
.map .years { display: none; gap: 6px; align-items: center; flex-wrap: wrap; }
.map.view-growth .years { display: flex; }
.map .years .sk-btn { font-size: 14px; padding: .1em .6em .15em; box-shadow: 2px 2px 0 var(--shadow); }
.map .years .yr-note { font: 18px var(--font-hand); color: var(--ink-soft); margin-left: 6px; }
.map .edge.hot { opacity: 1; stroke-dasharray: 10 7; animation: edge-flow 1.1s linear infinite; }
@keyframes edge-flow { to { stroke-dashoffset: -34; } }
.map .node { cursor: pointer; transition: opacity .35s; }
.map .node .disc { fill: #fff; stroke: var(--ink); stroke-width: 3; }
.map .node .halo { fill: none; stroke: var(--glow); stroke-width: 6; opacity: 0; transition: opacity .3s; }
.map .node.hot .halo { opacity: .9; }
.map .node.dim { opacity: .25; }
.map .node text { font: 700 14px var(--font-ui); fill: var(--ink); paint-order: stroke; stroke: var(--paper); stroke-width: 4px; text-anchor: middle; }
.map .tip { position: absolute; z-index: 30; pointer-events: none; }
.map .tip .nums { display: flex; gap: 14px; margin: 6px 0 4px; }
.map .tip .nums b { display: block; font: 900 26px var(--font-ui); line-height: 1; background: none; }
.map .tip .nums span { font-size: .78em; color: var(--ink-soft); }
.map .tip .pt { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; font-size: .85em; }
.map .tip .pt span { white-space: nowrap; }
.map .panel { position: absolute; right: 3vw; top: 11vh; bottom: 15vh; width: min(42vw, 600px); display: flex; flex-direction: column; gap: 10px; opacity: 0; transform: translateX(30px); transition: opacity .7s, transform .7s; z-index: 12; }
.map .panel.show { opacity: 1; transform: none; }
.map .panel-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.map .panel-head h3 { margin: 0; font: 700 28px var(--font-hand); }
.map .panel-head span { color: var(--ink-soft); font-size: 14px; }
.map .chips { display: flex; gap: 6px; flex-wrap: wrap; }
.map .chips .sk-btn { font-size: 14px; padding: .12em .65em .18em; box-shadow: 2px 2px 0 var(--shadow); }
.map .plist { flex: 1 1 auto; min-height: 120px; overflow: auto; border: 2.5px solid var(--ink); border-radius: 12px 4px 10px 4px / 4px 10px 4px 12px; background: var(--box); box-shadow: 5px 5px 0 var(--shadow); padding: 4px 0; }
.map .prow { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; padding: 6px 12px; cursor: pointer; border-bottom: 1px dashed var(--ink-faint); font-size: 14.5px; line-height: 1.25; }
.map .prow:last-child { border-bottom: 0; }
.map .prow:hover, .map .prow.hot { background: color-mix(in srgb, var(--glow) 18%, transparent); }
.map .prow.sel { background: color-mix(in srgb, var(--glow) 32%, transparent); }
.map .prow.dim { opacity: .35; }
.map .prow .yr { color: var(--ink-soft); font-size: 12px; margin-left: 6px; }
.map .prow .icons { display: flex; gap: 2px; }
.map .prow .icons .node-icon { box-shadow: 0 0 0 1.5px var(--ink-faint); }
.map .detail { position: relative; flex: 0 0 auto; display: grid; grid-template-columns: 150px 1fr; gap: 14px; border: 2.5px solid var(--ink); background: var(--box-caption); padding: 12px; border-radius: 4px 3px 5px 3px; box-shadow: 5px 5px 0 var(--shadow); min-height: 120px; }
.map .detail .pic { position: relative; width: 150px; height: 110px; background: var(--paper-2); border: 2px solid var(--ink); overflow: hidden; }
.map .detail .pic img { width: 100%; height: 100%; object-fit: cover; display: block; }
.map .detail .pic canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.map .detail h4 { margin: 0 0 4px; font: 700 21px var(--font-hand); line-height: 1.1; }
.map .detail p { margin: 0 0 6px; font: 15px/1.3 var(--font-comic); }
.map .detail .row { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; font-size: 12px; color: var(--ink-soft); }
.map .detail a { font-size: 13px; }
@media (max-width: 900px) {
  .map .panel { left: 3vw; right: 3vw; width: auto; top: 56vh; bottom: 70px; gap: 6px; }
  .map .panel-head h3 { font-size: 21px; }
  .map .panel-head span { display: none; }
  .map .chips .sk-btn, .map .years .sk-btn { font-size: 13px; }
  .map .plist { min-height: 0; flex: 1 1 0; }
  .map .prow { font-size: 13px; padding: 5px 9px; }
  .map .detail { grid-template-columns: 1fr; min-height: 0; padding: 8px; }
  .map .detail .pic { display: none; }
  .map .detail p { font-size: 13px; }
  .map .tip .nums b { font-size: 20px; }
  .map .comic.caption:not(.tip) { left: 4vw !important; right: auto !important; top: 58vh !important; }
}
`;

// story projects that have a small moving picture (ui/minis.js)
const MINI_FOR = [['forestvis', 'forestvis'], ['forest-to-fork', 'forest-to-fork'], ['buzz', 'buzz'], ['butterflies', 'butterflies'], ['genomelens', 'genomelens'], ['darkness', 'darkness'], ['truth-is-in', 'eyes']];
const miniOf = (id) => MINI_FOR.find(([k]) => id.includes(k))?.[1] ?? null;

export default function build(root, ctx) {
  root.classList.add('map');
  installCreditCSS();
  const style = el('style', {}, root, CSS);
  const box = mapBox();
  const svg = svgEl('svg', { class: 'sw', viewBox: '0 0 420 900', style: `left:${box.x}px; top:${box.y}px; width:${box.w}px; height:${box.h}px` }, root);
  const defs = svgEl('defs', {}, svg);
  const gBase = svgEl('g', {}, svg), gEdges = svgEl('g', {}, svg), gNodes = svgEl('g', {}, svg);
  // the node card (placed next to its node: showTip)
  const tip = comic(root, { kind: 'caption', html: '', width: 250 });
  tip.el.classList.add('tip');

  // the projects: everything on infravis.se, plus the Amazon story project
  const amazon = PROJECTS.find((p) => p.id === 'amazon');
  const LIST = [...PROJECTS_DB, { id: 'amazon', title: amazon.title, short: amazon.title, url: amazon.url, year: amazon.year, type: 'story', nodes: amazon.nodes, users: [], all: amazon.nodes, domain: amazon.domain, technique: amazon.technique, summary: amazon.blurb, image: null }]
    .sort((a, b) => b.all.length - a.all.length || b.year - a.year);

  const panel = el('div', { class: 'panel' }, root);
  const head = el('div', { class: 'panel-head' }, panel, `<h3>Who made what, together</h3><span>${PROJECTS_DB.length} projects on infravis.se · ${EDGES.length} pairs of nodes working together</span>`);
  const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Show' }, panel);
  // three ways to read the network, each changing the map itself
  const VIEWS = [['growth', 'How it grew'], ['collab', 'Who works together']];
  const viewBtns = Object.fromEntries(VIEWS.map(([k, t]) => [k, el('button', { class: 'sk-btn', type: 'button', 'aria-pressed': String(k === 'growth') }, chips, t)]));
  const yearsRow = el('div', { class: 'years', role: 'group', 'aria-label': 'Year' }, panel);
  const YEARS = [...new Set(PROJECTS_DB.map((p) => p.year))].sort();
  const playBtn = el('button', { class: 'sk-btn', type: 'button', 'aria-label': 'Play the years' }, yearsRow, '▶');
  const yearBtns = YEARS.map((y) => el('button', { class: 'sk-btn', type: 'button', 'aria-pressed': 'false' }, yearsRow, String(y)));
  const yearNote = el('span', { class: 'yr-note' }, yearsRow, '');
  chips.after(yearsRow);
  const plist = el('div', { class: 'plist', role: 'list' }, panel);
  const detail = el('div', { class: 'detail' }, panel, '<div class="pic"></div><div class="txt"><h4>Pick a project</h4><p>Hover a project to see which universities made it. Click it to read about it.</p></div>');

  const c1 = comic(root, { kind: 'caption', html: 'InfraVis is <b>nine universities</b>, from Lund to Umeå.', at: { right: '6vw', top: '18vh' }, width: 320 });
  const c2 = comic(root, { kind: 'caption', html: 'Each line is <b>projects made together</b>. The thicker the line, the more they share.', at: { right: '6vw', top: '34vh' }, width: 330, tilt: 0.7 });

  let g = null, t = 0, sel = null, nodeFilter = null, view = 'growth', year = YEARS[YEARS.length - 1], playTimer = null;
  const nodeEls = {}, edgeEls = [], rowEls = new Map();
  const toScreen = (xy) => mapToScreen(xy, box);   // (through the zoom)

  // ---- drawing ----
  async function drawMap() {
    g = await loadSweden();
    svgEl('path', { class: 'neigh', d: g.neighbours }, gBase);
    const sw = svgEl('path', { class: 'sweden', d: g.sweden }, gBase);
    sw.style.fillOpacity = 0;
    await drawIn(sw, { duration: 2200 });
    sw.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 600, fill: 'forwards' });
  }
  // close in on the region where the nodes are (eased viewBox), so the nodes,
  // their emblems and numbers have room
  function zoomIn(dur = 1700) {
    resetZoom();
    const from = [0, 0, 420, 900], to = nodesRegion(g, NODES.map((n) => n.id));
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), q = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
        const vb = from.map((v, i) => v + (to[i] - v) * q);
        svg.setAttribute('viewBox', vb.map((v) => v.toFixed(2)).join(' '));
        setZoomVB(vb);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }
  function drawNodes() {
    NODES.forEach((n, i) => {
      const [x, y] = nodeXY(g, n.id), r = nodeR(n.id);
      const gn = svgEl('g', { class: 'node', tabindex: 0, role: 'button', 'aria-label': `${n.name}: ${NODE_COUNTS[n.id]} projects`, transform: `translate(${x} ${y})` }, gNodes);
      const nb = svgEl('g', { class: 'nb' }, gn);   // (scaled by the views: its size = its projects)
      svgEl('circle', { class: 'halo', r: r + 6 }, nb);
      // (a neutral ink ring: the nodes take their colours only in the finale, as they become the logo)
      svgEl('circle', { class: 'disc', r }, nb);
      const cp = svgEl('clipPath', { id: `nc-${n.id}` }, defs); svgEl('circle', { r: r - 3 }, cp);
      svgEl('image', { href: iconURL(n.id), x: -(r - 4), y: -(r - 4), width: 2 * (r - 4), height: 2 * (r - 4), 'clip-path': `url(#nc-${n.id})` }, nb);
      const lab = svgEl('text', { class: 'nl', y: r + 16 }, gn); lab.textContent = n.short;
      const cnt = svgEl('g', { class: 'cnt' }, gn);
      svgEl('circle', { r: 10 }, cnt); svgEl('text', {}, cnt);
      gn.style.opacity = 0; gn.style.transformBox = 'fill-box'; gn.style.transformOrigin = 'center';
      setTimeout(() => gn.animate([{ opacity: 0, transform: `translate(${x}px, ${y}px) scale(.3)` }, { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1)` }], { duration: 500, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' }), i * 140);
      gn.addEventListener('mouseenter', () => hoverNode(n.id));
      gn.addEventListener('mouseleave', () => clearHover());
      gn.addEventListener('click', () => { nodeFilter = nodeFilter === n.id ? null : n.id; renderList(); });
      nodeEls[n.id] = gn;
    });
  }
  function drawEdges() {
    for (const e of EDGES) {
      const a = nodeXY(g, e.a), b = nodeXY(g, e.b);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
      const bend = 0.18, c = [mx - dy * bend, my + dx * bend];
      const d = `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
      const gid = `eg-${e.a}-${e.b}`;
      const lg = svgEl('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, defs);
      svgEl('stop', { offset: 0, 'stop-color': nodeColor(e.a) }, lg); svgEl('stop', { offset: 1, 'stop-color': nodeColor(e.b) }, lg);
      const path = svgEl('path', { class: 'edge', d, stroke: `url(#${gid})` }, gEdges);
      path.style.strokeWidth = edgeW(e.weight);
      // (edges are not hovered: they light up from the projects and the nodes)
      edgeEls.push({ e, path });
    }
    return drawIn(edgeEls.map((x) => x.path), { duration: 900, stagger: 60 });
  }

  // ---- the list ----
  function renderList() {
    plist.innerHTML = ''; rowEls.clear();
    LIST.filter((p) => inView(p) && (!nodeFilter || p.all.includes(nodeFilter))).forEach((p) => {
      const r = el('div', { class: `prow${sel?.id === p.id ? ' sel' : ''}`, role: 'listitem', tabindex: 0 }, plist,
        `<div>${p.short}<span class="yr">${p.year}</span></div><div class="icons">${p.all.map((n) => nodeIcon(n, 20)).join('')}</div>`);
      r.addEventListener('mouseenter', () => highlight(p.all, p));
      r.addEventListener('mouseleave', () => clearHover());
      r.addEventListener('click', () => select(p));
      r.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') select(p); });
      rowEls.set(p.id, r);
    });
    const shown = PROJECTS_DB.filter(inView).length;
    const sub = { collab: `${EDGES.length} pairs of universities that made projects together. The thicker the line, the more.`, growth: `${shown} projects up to ${year}: each university as large as its work, the lines as thick as the work shared` }[view];
    head.querySelector('span').textContent = nodeFilter ? `${NODE[nodeFilter].name}: ${NODE_COUNTS[nodeFilter]} projects (click the node again for all)` : sub;
  }

  // ---- the three views ----
  // growth: the projects up to the year; collab: the projects made across universities
  const inView = (p) => (view === 'collab' ? p.all.length > 1 : view === 'growth' ? p.year <= year : true);
  const yearOf = Object.fromEntries(PROJECTS_DB.map((p) => [p.id, p.year]));
  function applyView() {
    root.classList.toggle('view-growth', view === 'growth');
    Object.entries(viewBtns).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === view)));
    yearBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(YEARS[i] === year)));
    yearNote.textContent = view === 'growth' ? `${PROJECTS_DB.filter((p) => p.year <= year).length} projects by ${year}` : '';
    const counted = PROJECTS_DB.filter((p) => view !== 'growth' || p.year <= year);
    NODES.forEach((n) => {
      const gn = nodeEls[n.id]; if (!gn) return;
      const base = nodeR(n.id), c = counted.filter((p) => p.all.includes(n.id)).length;
      // collab: the story's size; growth: much more contrast, by the number of projects so far
      const want = view === 'collab' ? base : c ? 8 + 5.4 * Math.sqrt(c) : base * 0.55;
      const k = want / base;
      gn.querySelector('.nb').style.transform = `scale(${k.toFixed(3)})`;
      gn.querySelector('.nl').style.transform = `translateY(${((k - 1) * base).toFixed(1)}px)`;
      const cnt = gn.querySelector('.cnt');
      cnt.style.transform = `translate(${(want * 0.74).toFixed(1)}px, ${(-want * 0.74).toFixed(1)}px)`;
      cnt.querySelector('text').textContent = c;
      gn.classList.toggle('empty', view === 'growth' && c === 0);
    });
    edgeEls.forEach((x) => {
      const { e, path } = x;
      const w = view === 'growth' ? e.projects.filter((id) => (yearOf[id] ?? 0) <= year).length : e.weight;
      const wasGone = path.classList.contains('gone');
      path.style.strokeWidth = w ? edgeW(w) : 0;
      path.classList.toggle('gone', w === 0);
      // a collaboration that begins this year: the line is drawn in, by hand
      if (w > 0 && wasGone) { path.style.strokeWidth = edgeW(w); drawIn(path, { duration: 1300, easing: 'cubic-bezier(.45,.05,.3,1)' }); }
    });
    renderList();
  }
  function setView(v) { view = v; if (v !== 'growth') stopPlay(); applyView(); }
  function setYear(y) { year = y; view = 'growth'; applyView(); }
  function stopPlay() { clearInterval(playTimer); playTimer = null; playBtn.textContent = '▶'; }
  function play() {
    stopPlay(); view = 'growth'; setYear(YEARS[0]);
    let i = 0; playBtn.textContent = '⏸';
    playTimer = setInterval(() => { i++; if (i >= YEARS.length) { stopPlay(); return; } setYear(YEARS[i]); }, 2100);
  }
  Object.entries(viewBtns).forEach(([k, b]) => b.addEventListener('click', () => { setView(k); if (k === 'growth') ctx.stepDone('grow'); }));
  yearBtns.forEach((b, i) => b.addEventListener('click', () => { stopPlay(); setYear(YEARS[i]); }));
  playBtn.addEventListener('click', () => (playTimer ? stopPlay() : play()));

  // ---- highlighting ----
  function highlight(nodes, project = null) {
    const ns = new Set(nodes);
    Object.entries(nodeEls).forEach(([k, e]) => { e.classList.toggle('dim', !ns.has(k)); e.classList.toggle('hot', ns.has(k) && nodes.length < 9); });
    edgeEls.forEach(({ e, path }) => {
      const on = project ? (e.projects.includes(project.id)) : (ns.has(e.a) && ns.has(e.b));
      path.classList.toggle('hot', on); path.classList.toggle('dim', !on);
    });
  }
  function clearHover() {
    tip.hide();
    if (sel) { highlight(sel.all, sel); return; }
    Object.values(nodeEls).forEach((e) => e.classList.remove('dim', 'hot'));
    edgeEls.forEach(({ path }) => path.classList.remove('hot', 'dim'));
    rowEls.forEach((r) => r.classList.remove('hot', 'dim'));
  }
  // the node card goes as close to its node as it can without covering any
  // node (or its label): tried round the node in order — right, left, the
  // diagonals, above, below — kept on screen and clear of the project panel;
  // the empty corner above the map if nothing fits
  function showTip(html, id) {
    tip.el.style.transform = 'none';
    tip.el.classList.add('show');
    tip.set(html, { reveal: true });   // (after show: its words are revealed at once)
    const w = tip.el.offsetWidth, h = tip.el.offsetHeight, GAP = 14, M = 6;
    const nodeRects = Object.entries(nodeEls).filter(([k]) => k !== id).map(([, e]) => e.getBoundingClientRect());   // (not its own: it sits beside it)
    const me = nodeEls[id].querySelector('.nb').getBoundingClientRect();
    const cx = (me.left + me.right) / 2, cy = (me.top + me.bottom) / 2;
    const narrow = innerWidth < 900;
    const maxX = narrow ? innerWidth - 12 : panel.getBoundingClientRect().left - 12;
    const maxY = narrow ? panel.getBoundingClientRect().top - 8 : innerHeight - 90;
    const cands = [
      [me.right + GAP, cy - h / 2], [me.left - GAP - w, cy - h / 2],
      [me.right + GAP * 0.6, me.top - h - GAP * 0.4], [me.left - w - GAP * 0.6, me.top - h - GAP * 0.4],
      [me.right + GAP * 0.6, me.bottom + GAP * 0.4], [me.left - w - GAP * 0.6, me.bottom + GAP * 0.4],
      [cx - w / 2, me.top - GAP - h], [cx - w / 2, me.bottom + GAP + 18],
    ];
    const fits = ([x, y]) => x >= 12 && x + w <= maxX && y >= 90 && y + h <= maxY
      && !nodeRects.some((r) => x < r.right + M && x + w > r.left - M && y < r.bottom + M && y + h > r.top - M);
    const spot = cands.find(fits) ?? [Math.max(16, box.x - box.w * 0.25), Math.max(box.y + box.h * 0.02, 112)];
    tip.el.style.left = `${spot[0].toFixed(0)}px`;
    tip.el.style.top = `${spot[1].toFixed(0)}px`;
  }
  function hoverNode(id) {
    // the numbers follow the view: up to the year shown in "How it grew"
    const counted = PROJECTS_DB.filter((p) => view !== 'growth' || p.year <= year);
    const mine = counted.filter((p) => p.all.includes(id));
    const share = counted.length ? Math.round((mine.length / counted.length) * 100) : 0;
    const with_ = {};
    mine.forEach((p) => p.all.forEach((o) => { if (o !== id) with_[o] = (with_[o] || 0) + 1; }));
    const partners = Object.entries(with_).sort((a, b) => b[1] - a[1]);
    highlight([id, ...partners.map(([o]) => o)]);
    edgeEls.forEach(({ e, path }) => { const on = (e.a === id || e.b === id) && !path.classList.contains('gone'); path.classList.toggle('hot', on); path.classList.toggle('dim', !on); });
    rowEls.forEach((r, pid) => { const p = LIST.find((x) => x.id === pid); r.classList.toggle('dim', !p.all.includes(id)); });
    const upTo = view === 'growth' && year !== YEARS[YEARS.length - 1] ? ` up to ${year}` : '';
    showTip(`<span class="who">${NODE[id].name}</span>
      <span class="nums"><span><b>${mine.length}</b>projects${upTo}</span><span><b>${share}%</b>of all projects</span><span><b>${partners.length}</b>partner universities</span></span>
      ${partners.length ? `<span class="pt">${partners.slice(0, 4).map(([o, n]) => `<span>${nodeIcon(o, 18)} ${NODE[o].short} ×${n}</span>`).join('')}</span>` : ''}
      <span class="small">Click to list its projects.</span>`, id);
  }


  // ---- selection ----
  let miniCv = null, miniKey = null;
  function select(p) {
    sel = p;
    ctx.stepDone(p.id);   // (a project of the tour, picked by hand, counts as that beat)
    rowEls.forEach((r, pid) => r.classList.toggle('sel', pid === p.id));
    highlight(p.all, p);
    miniKey = miniOf(p.id);
    const pic = miniKey ? '<canvas></canvas>' : (p.image ? `<img src="${p.image}" alt="" referrerpolicy="no-referrer">` : '');
    detail.innerHTML = `<div class="pic">${pic}</div><div class="txt"><h4>${p.title.replace(/:.*$/, '')}</h4><p>${p.summary}</p>
      <div class="row">${p.all.map(nodeBadge).join('')} <span>${p.domain} · ${p.year}</span> <a href="${p.url}" target="_blank" rel="noopener">Read more ↗</a></div></div>`;
    miniCv = detail.querySelector('canvas');
    // (the firefly stays where it sits: the map is what lights up)
    ctx.ready();
  }

  // Next walks through a few collaborations, one project at a time
  const tour = ['genomelens', 'past-platsen', 'truth-is-in', 'forestvis'].map((k) => LIST.find((p) => p.id.includes(k))).filter(Boolean);
  return {
    next: 'Your project next ⟶',
    steps: [
      { key: 'grow', label: 'How it grew', run: () => play(), undo: () => { stopPlay(); setYear(YEARS[YEARS.length - 1]); } },
      ...tour.map((p, k) => ({ key: p.id, label: `Show: ${p.short}`,
      undo: () => { if (k > 0) { select(tour[k - 1]); } else { sel = null; rowEls.forEach((r) => r.classList.remove('sel')); clearHover(); } }, run: () => { select(p); { const r = rowEls.get(p.id); if (r) plist.scrollTo({ top: r.offsetTop - plist.clientHeight / 2, behavior: 'smooth' }); } } }))],
    stepReady: () => panel.classList.contains('show'),
    async enter() {
      await drawMap();
      c1.show();
      drawNodes();
      await sleep(1700);
      await zoomIn();   // (after all nine nodes are on the map)
      c2.show();
      await drawEdges();
      await sleep(1600);
      c1.hide(); c2.hide();
      applyView();
      panel.classList.add('show');
      const first = LIST.find((p) => p.id.includes('forestvis')) ?? LIST[0];
      // one landing, on the panel's heading, and it stays there
      ctx.firefly.perchOnEl(head.querySelector('h3'), 0.92, { duration: 1600 });
      setTimeout(() => ctx.ready(), 4000);
      void first;
    },
    update(dt) {
      t += dt;
      if (!miniCv || !miniKey) return;
      const w = miniCv.clientWidth, h = miniCv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 1.5);
      if (miniCv.width !== Math.round(w * dpr)) { miniCv.width = w * dpr; miniCv.height = h * dpr; }
      const mg = miniCv.getContext('2d');
      mg.setTransform(dpr, 0, 0, dpr, 0, 0); mg.clearRect(0, 0, w, h);
      MINIS[miniKey](mg, w, h, t, theme.css('--ink'));
    },
    leave() { ctx.firefly.land(false); },
    dispose() { stopPlay(); style.remove(); },
  };
}
