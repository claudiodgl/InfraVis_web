// THE HEADER LOGO, ALIVE: the InfraVis lockup drawn inline (the same file as
// the header's image, so it sits exactly where the image was), and once in a
// while it builds itself again as it did at the end of the story — the
// rainbow fades back, the arcs are drawn by hand, the nine nodes pop in their
// colours, the rainbow returns. The letters stay put.
import { svgEl, drawIn } from '../draw/ink.js';
import { LOGO_NODES, LOGO_NODE_R } from '../data/nodes.js';
import { reducedMotion } from '../theme.js';

let cache = null, uid = 0;
const load = () => (cache ??= fetch('./lib/logos/infravis-white-text.svg').then((r) => r.text()));

// replace the <img> inside `slot` with the live lockup; every `every` s (first
// after `first` s) the build plays again. Returns { play(), stop() }.
// letters / stroke: the name's colour and the pen's (white on the black bar;
// 'currentColor' to follow the theme's ink, as in the story's top bar)
export async function liveLockup(slot, { every = 16, first = 5, stroke = '#fff', letters: letterFill = '#fff', height = null } = {}) {
  const img = slot.querySelector('img');
  const gid = `lockup-grad-${++uid}`;
  const txt = await load();
  const vb = txt.match(/viewBox="([^"]+)"/)[1];
  const markD = txt.match(/class="cls-1" d="([^"]+)"/)[1];
  // every path but the mark's (the letters; their class differs between the files)
  const letters = [...txt.matchAll(/<path([^>]*?)\sd="([^"]+)"/g)].filter((m) => !/cls-1"/.test(m[1])).map((m) => m[2]);
  const svg = svgEl('svg', { viewBox: vb, class: 's-logo-live', role: 'img', 'aria-label': 'InfraVis' });
  svg.innerHTML = `<defs><linearGradient id="${gid}" x1="5.99" y1="129.28" x2="120.57" y2="12.21" gradientUnits="userSpaceOnUse">
    <stop offset=".12" stop-color="#1d71b8"/><stop offset=".32" stop-color="#951b81"/><stop offset=".5" stop-color="#e30613"/>
    <stop offset=".56" stop-color="#e41915"/><stop offset=".67" stop-color="#e94e1b"/><stop offset=".72" stop-color="#ed6a21"/>
    <stop offset=".84" stop-color="#f9b233"/><stop offset="1" stop-color="#ffed00"/></linearGradient></defs>
    <path class="mfill" fill="url(#${gid})" d="${markD}"/>
    ${letters.map((d) => `<path class="ltr" fill="${letterFill}" stroke="${letterFill}" stroke-width="0" d="${d}"/>`).join('')}`;
  const strokes = markD.split(/(?=M)/).map((d) => svgEl('path', { d, fill: 'none', stroke, 'stroke-width': 1.6, opacity: 0 }, svg));
  const nodes = LOGO_NODES.map((n) => svgEl('circle', { cx: n.x, cy: n.y, r: 0, fill: n.color }, svg));
  const fill = svg.querySelector('.mfill');
  // the letters in writing order, left to right (by where each path starts)
  const ltrs = [...svg.querySelectorAll('.ltr')].sort((a, b) => parseFloat(a.getAttribute('d').slice(1)) - parseFloat(b.getAttribute('d').slice(1)));
  const [, , vw, vh] = vb.split(/[\s,]+/).map(Number);
  const h = height || (img && parseFloat(getComputedStyle(img).height)) || 40;
  svg.style.height = `${h}px`; svg.style.width = `${(h * vw) / vh}px`;
  svg.style.display = 'block'; svg.style.overflow = 'visible';
  // (keeps the image's class and its perch for the firefly)
  if (img) { if (img.className) svg.setAttribute('class', `${img.className} s-logo-live`); if (img.hasAttribute('data-perch')) svg.setAttribute('data-perch', ''); img.replaceWith(svg); }
  else slot.appendChild(svg);

  let timer = null, busy = false;
  async function play() {
    if (busy || document.hidden || reducedMotion.matches) return;
    busy = true;
    fill.animate([{ opacity: 1 }, { opacity: 0.08 }], { duration: 250, fill: 'forwards' });
    // the name fades out with the mark, to be written again
    ltrs.forEach((p) => p.animate([{ fillOpacity: 1 }, { fillOpacity: 0 }], { duration: 220, fill: 'forwards' }));
    strokes.forEach((p) => p.setAttribute('opacity', 1));
    await drawIn(strokes, { duration: 520, stagger: 28 });
    nodes.forEach((c, i) => c.animate([{ r: 0 }, { r: LOGO_NODE_R * 1.5 }, { r: LOGO_NODE_R }], { duration: 230, delay: i * 35, easing: 'ease-out', fill: 'forwards' }));
    await new Promise((r) => setTimeout(r, 9 * 35 + 240));
    fill.animate([{ opacity: 0.08 }, { opacity: 1 }], { duration: 420, fill: 'forwards' });
    // ...and the name is written, letter by letter: the pen traces each
    // outline, then the letter fills in
    ltrs.forEach((p) => p.setAttribute('stroke-width', 1.1));
    await Promise.all(ltrs.map((p, i) => drawIn(p, { duration: 260, delay: i * 70 }).then(() =>
      p.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 160, fill: 'forwards' }).finished)));
    ltrs.forEach((p) => { p.getAnimations().forEach((a) => a.cancel()); p.style.fillOpacity = ''; p.setAttribute('stroke-width', 0); });
    strokes.forEach((p) => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, delay: 100, fill: 'forwards' }).finished.then(() => { p.setAttribute('opacity', 0); p.getAnimations().forEach((a) => a.cancel()); }));
    nodes.forEach((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 150, fill: 'forwards' }).finished.then(() => { c.getAnimations().forEach((a) => a.cancel()); c.setAttribute('r', 0); }));
    setTimeout(() => { busy = false; }, 700);
  }
  setTimeout(() => { play(); timer = setInterval(play, every * 1000); }, first * 1000);
  slot.addEventListener('mouseenter', play);   // and on demand, when the visitor points at it
  return { play, stop: () => clearInterval(timer) };
}
