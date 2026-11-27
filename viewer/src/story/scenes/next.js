// 5 · YOUR PROJECT NEXT. Where the story turns to the visitor: you have data
// like these projects had — this is how InfraVis would help. Three hand-drawn
// cards along a dotted path, one per step of InfraVis's user support (from
// infravis.se/services-resources, 2026-11):
//   1 Ask        send a question: a ticket, a first answer within three hours
//                (Mon–Fri 09–16); help-desk support is free
//   2 Meet       an application expert looks at your data with you;
//                mid-level support is free, up to about 80 hours
//   3 Build      longer projects get in-depth support through the annual
//                call (300 SEK/h) or any time of the year (600 SEK/h)
// Next draws each step in turn (the firefly carries the dotted path along);
// then the way to apply. Desktop: the cards side by side; a phone: stacked.
import { el, svgEl, drawIn, sleep } from '../../draw/ink.js';
import { comic } from '../../ui/comic.js';
import { NODES } from '../../data/nodes.js';
import { PROJECTS_DB } from '../../data/collab.js';

const CSS = `
.next .lead { position: absolute; left: 50%; top: 14vh; translate: -50% 0; width: min(760px, 90vw); text-align: center; }
.next .lead h2 { font: 700 clamp(30px, 3.4vw, 48px) var(--font-hand); margin: 0 0 6px; line-height: 1.05; }
.next .lead p { margin: 0; color: var(--ink-soft); font-size: clamp(15px, 1.25vw, 18px); }
.next .lead p b { color: var(--ink); }
.next .path { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.next .path path { fill: none; stroke: var(--ink-soft); stroke-width: 2.4; stroke-dasharray: 3 10; stroke-linecap: round; }
.next .cards { position: absolute; left: 50%; top: 36vh; translate: -50% 0; width: min(1120px, 92vw); display: grid; grid-template-columns: repeat(3, 1fr); gap: 4vw; }
.next .card { position: relative; background: var(--box); border: 2.5px solid var(--ink); border-radius: 18px 6px 16px 5px / 6px 16px 5px 18px;
  box-shadow: 5px 5px 0 var(--shadow); padding: 18px 20px 20px; opacity: .22; transform: translateY(12px) rotate(var(--t, 0deg)); transition: opacity .7s, transform .7s var(--ease-out), background-color .6s; }
.next .card.on { opacity: 1; transform: rotate(var(--t, 0deg)); }
.next .card .n { position: absolute; top: -18px; left: 16px; width: 36px; height: 36px; border-radius: 50%; background: var(--c); color: #fff;
  font: 900 18px var(--font-ui); display: grid; place-items: center; border: 2.5px solid var(--ink); }
.next .card h3 { margin: 8px 0 6px; font: 700 26px var(--font-hand); line-height: 1.05; }
.next .card p { margin: 0 0 10px; font: 16px/1.35 var(--font-comic); }
.next .card .tag { display: inline-block; font: 700 12px var(--font-ui); letter-spacing: .04em; text-transform: uppercase; padding: 3px 9px; border-radius: 20px; background: color-mix(in srgb, var(--c) 22%, transparent); border: 1.5px solid var(--c); }
.next .card .ico { position: absolute; right: 14px; top: 12px; width: 44px; height: 44px; color: var(--ink); opacity: .85; }
.next .apply { position: absolute; left: 50%; bottom: 13vh; translate: -50% 0; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; justify-content: center; opacity: 0; transition: opacity .7s; }
.next .apply.on { opacity: 1; }
.next .apply a { text-decoration: none; }
.next .apply .mail { font: 18px var(--font-comic); color: var(--ink-soft); }
.next .apply .mail a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 760px) {
  .next .lead { top: 10vh; } .next .lead h2 { font-size: 27px; } .next .lead p { font-size: 13.5px; }
  .next .cards { top: 25vh; grid-template-columns: 1fr; gap: 14px; width: 88vw; }
  .next .card { padding: 12px 14px 12px 52px; box-shadow: 3px 3px 0 var(--shadow); }
  .next .card .n { top: 12px; left: 10px; width: 30px; height: 30px; font-size: 15px; }
  .next .card h3 { font-size: 20px; margin: 0 0 3px; } .next .card p { font-size: 13.5px; margin-bottom: 6px; }
  .next .card .ico { display: none; }
  .next .path { display: none; }
  .next .apply { bottom: 78px; gap: 8px; } .next .apply .sk-btn { font-size: 16px; } .next .apply .mail { font-size: 14px; }
}
`;

// small hand-drawn pictures for the three steps
const ICON = {
  ask: '<svg viewBox="0 0 44 44" class="ico"><path d="M6 10 Q6 6 10 6 H34 Q38 6 38 10 V26 Q38 30 34 30 H18 L10 37 V30 Q6 30 6 26 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 15 Q19 11 22 11 Q26 11 26 15 Q26 18 22 19 V21 M22 25 v.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  meet: '<svg viewBox="0 0 44 44" class="ico"><circle cx="15" cy="15" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="30" cy="15" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 36 Q6 25 15 25 Q22 25 23 30 Q24 25 30 25 Q39 25 40 36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  build: '<svg viewBox="0 0 44 44" class="ico"><rect x="6" y="8" width="32" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 25 L17 18 L22 22 L28 14 L33 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 36 H28 M22 30 V36" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

const STEPS = [
  { key: 'ask', c: '#1d71b8', t: '-1deg', title: 'Ask us', text: 'Send your question about your data or our services. It becomes a ticket, with a first answer <b>within three hours</b> on weekdays.', tag: 'Help desk · free' },
  { key: 'meet', c: '#951b81', t: '.6deg', title: 'Meet an expert', text: 'An application expert looks at your data with you and works out what can be built: a prototype, a workflow, a first visualization.', tag: 'Mid-level · free, up to ~80 h' },
  { key: 'build', c: '#ed6a21', t: '-.5deg', title: 'Build it together', text: 'Bigger projects get in-depth support: apply through the <b>annual call</b> (300 SEK/h), or any time of the year (600 SEK/h).', tag: 'In-depth · user fee' },
];

export default function build(root, ctx) {
  root.classList.add('next');
  const style = el('style', {}, root, CSS);
  const nProj = PROJECTS_DB.length, nNodes = NODES.length;
  el('div', { class: 'lead' }, root, `<h2>Your data could be next</h2><p>Every project in this story started as a question. <b>${nProj} projects</b>, <b>${nNodes} universities</b> and over <b>100 experts</b>: here is how to start yours.</p>`);
  const svg = svgEl('svg', { class: 'path' }, root);
  const cards = el('div', { class: 'cards' }, root);
  const cardEls = STEPS.map((s, i) => el('div', { class: 'card', style: `--c:${s.c}; --t:${s.t}` }, cards,
    `<span class="n">${i + 1}</span>${ICON[s.key]}<h3>${s.title}</h3><p>${s.text}</p><span class="tag">${s.tag}</span>`));
  const apply = el('div', { class: 'apply' }, root,
    `<a class="sk-btn primary" href="https://infravis.se/services-resources/" target="_blank" rel="noopener">Apply for support ⟶</a>
     <span class="mail">or write to <a href="mailto:info@infravis.se">info@infravis.se</a></span>`);
  const cap = comic(root, { kind: 'speech', html: 'Have data you can\'t see into yet? <b>That\'s where we come in.</b>', at: { left: '4vw', bottom: '22vh' }, width: 270, tail: 'right', tailAt: 24 });

  // the dotted path from card to card, drawn as the steps come in (desktop)
  let pathEls = [];
  function drawPath() {
    svg.innerHTML = ''; pathEls = [];
    const R = cardEls.map((c) => c.getBoundingClientRect()), b = root.getBoundingClientRect();
    for (let i = 0; i < R.length - 1; i++) {
      const a = R[i], z = R[i + 1];
      const x0 = a.right - b.left - 6, y0 = a.top - b.top + a.height * 0.35, x1 = z.left - b.left + 6, y1 = z.top - b.top + z.height * 0.35;
      const p = svgEl('path', { d: `M${x0} ${y0} C ${x0 + 40} ${y0 - 60}, ${x1 - 40} ${y1 - 60}, ${x1} ${y1}` }, svg);
      p.style.opacity = 0; pathEls.push(p);
    }
  }

  const shown = new Set();
  function showStep(i, { silent = false } = {}) {
    if (!silent) ctx.stepDone(STEPS[i].key);
    shown.add(i);
    cardEls[i].classList.add('on');
    if (i > 0 && pathEls[i - 1]) { pathEls[i - 1].style.opacity = 1; drawIn(pathEls[i - 1], { duration: 900 }); }
    // the firefly moves along to the card, and lands on its top edge
    ctx.firefly.perchOnEl(cardEls[i], 0.78, { duration: 1300 });
    cap.hide();
    if (i === STEPS.length - 1) setTimeout(() => { apply.classList.add('on'); ctx.ready(); }, 700);
  }
  function hideStep(i) {
    shown.delete(i); cardEls[i].classList.remove('on');
    if (i > 0 && pathEls[i - 1]) pathEls[i - 1].style.opacity = 0;
    apply.classList.remove('on');
    if (i > 0) ctx.firefly.perchOnEl(cardEls[i - 1], 0.78, { duration: 1000 });
  }
  cardEls.forEach((c, i) => { c.style.cursor = 'pointer'; c.addEventListener('click', () => { for (let k = 0; k <= i; k++) if (!shown.has(k)) showStep(k); }); });

  return {
    steps: STEPS.map((s, i) => ({ key: s.key, label: ['Step 1: ask', 'Step 2: meet an expert', 'Step 3: build it together'][i], run: () => showStep(i, { silent: true }), undo: () => hideStep(i) })),
    next: 'See it come together ⟶',
    async enter() {
      drawPath();
      cap.show({ delay: 600 });
      await sleep(400);
      ctx.firefly.perchOnEl(root.querySelector('.lead h2'), 0.92, { duration: 1500 });
    },
    leave() { ctx.firefly.land(false); },
    dispose() { style.remove(); },
  };
}
