// INK: the hand-drawn look, all in SVG.
//   el / svgEl           tiny DOM builders
//   drawIn(paths)        draws strokes on, as a pen would (stroke-dashoffset)
//   rough                rough.js on an <svg>, inked in currentColor
//   boil                 the "boiling line" of hand-drawn animation: one SVG
//                        displacement filter whose noise seed steps ~8 times
//                        a second, so drawings stay alive when nothing moves.
//                        Elements opt in with class "boil" (small groups only:
//                        a full-screen filter would cost every frame).
import rough from 'roughjs/bin/rough.js';
import { reducedMotion } from '../theme.js';

export const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent = null, html = null) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v);
  }
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export function svgEl(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export function roughOn(svg) { return rough.svg(svg); }
// default rough options in theme ink (currentColor: the <svg> sets color: var(--ink))
export const R = (o = {}) => ({ stroke: 'currentColor', strokeWidth: 2, roughness: 1.4, bowing: 1.2, ...o });

// draw strokes on. paths: an element, a NodeList or an array (groups are
// searched for their paths). Resolves when the last one is drawn.
export function drawIn(paths, { duration = 1200, delay = 0, stagger = 60, easing = 'cubic-bezier(.45,.05,.3,1)', fill = false } = {}) {
  const list = [];
  const add = (p) => { if (p.tagName === 'g' || p.tagName === 'svg') p.querySelectorAll('path,line,polyline,circle,ellipse,rect').forEach(add); else list.push(p); };
  (paths instanceof Element ? [paths] : Array.from(paths)).forEach(add);
  if (reducedMotion.matches) return Promise.resolve();
  const anims = list.map((p, i) => {
    let L = 0;
    try { L = p.getTotalLength(); } catch { L = 0; }
    if (!L) return null;
    p.style.strokeDasharray = `${L} ${L}`;
    p.style.strokeDashoffset = L;
    const fillOpacity = p.getAttribute('fill') && p.getAttribute('fill') !== 'none' && fill ? 1 : null;
    if (fillOpacity) p.style.fillOpacity = 0;
    const a = p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
      { duration, delay: delay + i * stagger, easing, fill: 'forwards' });
    return a.finished.then(() => {
      p.style.strokeDasharray = ''; p.style.strokeDashoffset = '';
      a.cancel();
      if (fillOpacity) p.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 400, fill: 'forwards' });
    }).catch(() => {});
  });
  return Promise.all(anims);
}

// hide strokes now (to be drawn in later)
export function hideStrokes(root) {
  root.querySelectorAll('path,line,polyline,circle,ellipse,rect').forEach((p) => {
    let L = 0; try { L = p.getTotalLength(); } catch { /* */ }
    if (L) { p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; }
  });
}

// ---- boil: one shared filter, stepped seed ----
let boilTimer = null, turb = null;
export function installInkDefs() {
  if (document.getElementById('iv-ink-defs')) return;
  const s = svgEl('svg', { id: 'iv-ink-defs', width: 0, height: 0, 'aria-hidden': 'true' });
  s.style.position = 'absolute';
  s.innerHTML = `<defs>
    <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="boil-strong" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="1"/>
      <feDisplacementMap in="SourceGraphic" scale="4.5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="chalk" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.25" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter>
  </defs>`;
  document.body.appendChild(s);
  turb = [...s.querySelectorAll('feTurbulence')].slice(0, 2);
  const style = document.createElement('style');
  style.textContent = '.boil{filter:url(#boil)} .boil-strong{filter:url(#boil-strong)}';
  document.head.appendChild(style);
}

export function startBoil() {
  if (boilTimer || reducedMotion.matches) return;
  let seed = 1;
  boilTimer = setInterval(() => {
    if (document.hidden) return;
    seed = (seed % 5) + 1;   // a few frames on a loop, like a redrawn cel
    for (const t of turb) t.setAttribute('seed', seed);
  }, 125);
}
export function stopBoil() { clearInterval(boilTimer); boilTimer = null; }

// a quick random generator with a seed (drawings come out the same each visit)
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
