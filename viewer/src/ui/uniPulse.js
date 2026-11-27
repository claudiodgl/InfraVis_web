// THE NINE UNIVERSITIES INSIDE THE MARK, on the big InfraVis logos (the
// story's title and finale):
//   - now and then (rarely) every node circle shows, in white, the emblem of
//     the university it stands for (data/nodes.js), one after another
//   - and when the pointer comes close to a node, that node shows its
//     university: the white emblem in the circle and its short name beside it
//
// uniPulse(svg) — svg is drawn in the mark's own units (its nodes at
// LOGO_NODES); returns { stop() }.
import { svgEl } from '../draw/ink.js';
import { NODES, LOGO_NODES, LOGO_NODE_R } from '../data/nodes.js';
import { reducedMotion } from '../theme.js';

export function uniPulse(svg, { every = 25, first = 3, scale = 0.78, hover = true } = {}) {   // (rare: an accent, not a loop)
  const g = svgEl('g', { class: 'uni-pulse', 'aria-hidden': 'true' }, svg);
  const items = NODES.map((n) => {
    const c = LOGO_NODES[n.logo], s = LOGO_NODE_R * 2 * scale;
    const im = svgEl('image', { href: `./lib/logos/icons/${n.id}.webp`, x: c.x - s / 2, y: c.y - s / 2, width: s, height: s, opacity: 0 }, g);
    im.style.filter = 'brightness(0) invert(1)';   // the emblem as a white silhouette
    im.style.transformBox = 'fill-box'; im.style.transformOrigin = 'center';
    im.style.transition = 'opacity .25s ease, transform .3s cubic-bezier(.3,1.5,.5,1)';
    // its name, just above the node (clear of the neighbouring nodes)
    const lab = svgEl('text', { x: c.x, y: c.y - LOGO_NODE_R - 2.5, 'text-anchor': 'middle', opacity: 0 }, g);
    lab.textContent = n.short;
    lab.style.cssText = 'font: 700 7.5px Lato, sans-serif; fill: var(--ink); paint-order: stroke; stroke: var(--paper); stroke-width: 2.2px; transition: opacity .25s ease; pointer-events: none;';
    return { im, lab, c };
  });

  let timer = null, alive = true;
  function play() {
    if (!alive || document.hidden || reducedMotion.matches) return;
    items.forEach(({ im }, i) => im.animate([
      { opacity: 0, transform: 'scale(.4)' },
      { opacity: 1, transform: 'scale(1.08)', offset: 0.14 },
      { opacity: 1, transform: 'scale(1)', offset: 0.2 },
      { opacity: 1, transform: 'scale(1)', offset: 0.8 },
      { opacity: 0, transform: 'scale(.8)' },
    ], { duration: 3200, delay: i * 110, easing: 'ease-out' }));
  }
  const t0 = setTimeout(() => { play(); timer = setInterval(play, every * 1000); }, first * 1000);

  // hover: the node nearest the pointer, if close enough, shows its university
  let hot = -1;
  const pt = svg.createSVGPoint ? svg.createSVGPoint() : null;
  function onMove(e) {
    if (!pt || !svg.isConnected) return;
    const m = svg.getScreenCTM(); if (!m) return;
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(m.inverse());
    let best = -1, bestD = LOGO_NODE_R * 2.4;
    items.forEach(({ c }, i) => { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bestD) { bestD = d; best = i; } });
    if (best === hot) return;
    if (hot >= 0) { const o = items[hot]; o.im.setAttribute('opacity', 0); o.im.style.transform = 'scale(.6)'; o.lab.setAttribute('opacity', 0); }
    hot = best;
    if (hot >= 0) { const o = items[hot]; o.im.setAttribute('opacity', 1); o.im.style.transform = 'scale(1)'; o.lab.setAttribute('opacity', 1); }
  }
  if (hover) addEventListener('pointermove', onMove, { passive: true });

  return { stop() { alive = false; clearTimeout(t0); clearInterval(timer); removeEventListener('pointermove', onMove); g.remove(); } };
}
