// 0 · TITLE: the mark sketched in ink, the name, and the choice — the story
// (about four minutes, at the visitor's own pace) or straight to the website.
import { el, svgEl, drawIn, sleep } from '../../draw/ink.js';
import { NODES } from '../../data/nodes.js';
import { uniPulse } from '../../ui/uniPulse.js';

const CSS = `
.title-wrap { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
.title-inner { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 0 6vw; transform: translateY(-2vh); }
.title-mark { width: clamp(120px, 16vw, 210px); height: auto; color: var(--ink); overflow: visible; }
.title-mark path { fill: none; stroke: currentColor; stroke-width: .7; }
.title-mark .fillg { fill: url(#title-grad); stroke: none; opacity: 0; transition: opacity 1.2s; }
.title-mark.filled .fillg { opacity: 1; }
.title-name { font-weight: 900; font-size: clamp(48px, 7.5vw, 112px); letter-spacing: .01em; line-height: .95; margin: 0; }
.title-sub { font-size: clamp(16px, 1.5vw, 22px); color: var(--ink-soft); margin: 0; max-width: 34em; }
.title-q { font-family: var(--font-hand); font-size: clamp(26px, 2.6vw, 40px); margin: 8px 0 4px; }
.title-btns { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
.title-btns .sk-btn { font-size: 21px; }
.title-fade { opacity: 0; transform: translateY(10px); transition: opacity .8s var(--ease-out), transform .8s var(--ease-out); }
.title-fade.on { opacity: 1; transform: none; }
.title-credit { position: absolute; bottom: 22px; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 14px; font-size: 14px; color: var(--ink-soft); }
.title-credit a { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.title-credit img.vr { height: 40px; width: auto; }
:root[data-theme='dark'] .title-credit img.vr { filter: brightness(0) invert(1); opacity: .9; }
.title-credit .sep { width: 1px; height: 28px; background: var(--ink-faint); }
/* the nine universities: their emblems in a row, popping in one by one */
.title-credit .unis { display: flex; gap: 8px; }
.title-credit .unis img { width: 34px; height: 34px; border-radius: 50%; background: #fff; padding: 3px; box-sizing: border-box; object-fit: contain;
  box-shadow: 0 0 0 1.5px var(--ink-faint); opacity: 0; transform: scale(.4); animation: uni-pop .45s cubic-bezier(.3,1.5,.5,1) forwards; }
@keyframes uni-pop { to { opacity: 1; transform: scale(1); } }
@media (max-width: 760px) {
  .title-name { font-size: 54px; } .title-q { font-size: 23px; } .title-btns .sk-btn { font-size: 18px; } .title-credit { flex-direction: column; gap: 8px; } .title-credit .sep { display: none; } .title-credit .unis img { width: 28px; height: 28px; } }
`;

export default function build(root, ctx) {
  const style = el('style', {}, root, CSS);
  const wrap = el('div', { class: 'title-wrap' }, root);
  const inner = el('div', { class: 'title-inner' }, wrap);
  const mark = svgEl('svg', { class: 'title-mark', viewBox: '-2 -2 135.18 153.03', 'aria-hidden': 'true' }, inner);
  const name = el('h1', { class: 'title-name title-fade' }, inner, 'InfraVis');
  const sub = el('p', { class: 'title-sub title-fade' }, inner, 'The National Research Infrastructure for Data Visualization');
  const q = el('p', { class: 'title-q title-fade' }, inner, 'What could your data show you, if you could see it?');
  const btns = el('div', { class: 'title-btns title-fade' }, inner);
  const go = el('button', { class: 'sk-btn primary', type: 'button' }, btns, '▶ Begin the story');
  const site = el('button', { class: 'sk-btn', type: 'button' }, btns, 'Go to the website');
  const credit = el('div', { class: 'title-credit title-fade' }, root,
    '<a href="https://www.vr.se/english.html" target="_blank" rel="noopener"><img class="vr" src="./lib/logos/partners/vr.svg" alt="Swedish Research Council"><span>Funded by the Swedish Research Council</span></a><i class="sep"></i>'
    + `<span class="unis" aria-label="Nine Swedish universities">${NODES.map((n, i) => `<img src="./lib/logos/icons/${n.id}.webp" alt="${n.name}" title="${n.name}" style="animation-delay:${1.9 + i * 0.09}s">`).join('')}</span>`);
  go.addEventListener('click', () => ctx.next());
  site.addEventListener('click', () => ctx.goSite());

  let pulse = null;
  // the mark: the official path, stroked first (drawn by hand), then filled
  fetch('./lib/logos/infravis-mark.svg').then((r) => r.text()).then(async (txt) => {
    const d = txt.match(/ d="([^"]+)"/)[1];
    mark.innerHTML = `<defs><linearGradient id="title-grad" x1="5.99" y1="129.28" x2="120.57" y2="12.21" gradientUnits="userSpaceOnUse">
      <stop offset=".12" stop-color="#1d71b8"/><stop offset=".32" stop-color="#951b81"/><stop offset=".5" stop-color="#e30613"/>
      <stop offset=".72" stop-color="#ed6a21"/><stop offset=".84" stop-color="#f9b233"/><stop offset="1" stop-color="#ffed00"/></linearGradient></defs>
      <path class="fillg" d="${d}"/>`;
    // one stroke per sub-path, so the pen lifts between them
    d.split(/(?=M)/).forEach((sp) => svgEl('path', { d: sp, class: 'stroke' }, mark));
    await drawIn(mark.querySelectorAll('.stroke'), { duration: 1800, stagger: 120 });
    mark.classList.add('filled');
    await sleep(500);
    mark.querySelectorAll('.stroke').forEach((p) => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: 'forwards' }));
    pulse = uniPulse(mark, { first: 3, every: 26 });   // the universities, in white, in their circles
  });

  return {
    hideNav: true,
    async enter() {
      const steps = [name, sub, q, btns, credit];
      steps.forEach((e, i) => setTimeout(() => e.classList.add('on'), 600 + i * 380));
      // the guide arrives and settles by the button that starts the story
      await sleep(1400);
      const r = go.getBoundingClientRect();
      // (it lands on the button's top edge)
      await ctx.firefly.enter(r.left + r.width * 0.2, r.top - ctx.firefly.feet, { from: 'left', duration: 2200 });
      ctx.firefly.land(true);
    },
    leave() { ctx.firefly.land(false); },
    dispose() { pulse?.stop(); style.remove(); },
  };
}
