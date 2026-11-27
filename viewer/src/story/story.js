// THE STORY: a row of scenes on one long whiteboard. Each scene is its own
// module, loaded when the scene before it starts (so three.js and the models
// arrive only if the visitor gets near them). A scene plays its opening, then
// waits: the visitor plays with it for as long as they like and moves on with
// Next (→ / space), back with ← , or leaves for the website (Esc).
//
// A scene module's default export: build(root, ctx) -> {
//   enter()   the opening (may return a Promise); the firefly flies in first
//   update(dt, t)  every frame while it is the current scene
//   leave()   before the pan away;  dispose()  after it
//   next?     label of the Next button;  hideNav?  the scene draws its own
// }
// ctx: { firefly, next(), back(), ready(), goSite(), registerCleanup(fn) }
import { el, sleep } from '../draw/ink.js';
import { themeButton, reducedMotion } from '../theme.js';

export const SCENES = [
  { id: 'title', load: () => import('./scenes/title.js') },
  { id: 'spark', chapter: 'Data in the dark', load: () => import('./scenes/spark.js') },
  { id: 'forest', chapter: 'A forest of points', load: () => import('./scenes/forest.js') },
  { id: 'amazon', chapter: 'Into the Amazon', load: () => import('./scenes/amazon.js') },
  // (the trade-flow chapter 'From forest to fork' was removed, 2026-11-27: the
  //  Amazon chapter opens with its own bridge from the Swedish forest)
  // (cut for length, 2026-11-27; kept in scenes/ to bring back:
  //  'pollinators' Small things, big data · 'darkness' Darkness matters)
  { id: 'map', chapter: 'Nine nodes, one infrastructure', load: () => import('./scenes/map.js') },
  { id: 'logo', chapter: 'InfraVis', fade: true, load: () => import('./scenes/logo.js') },
];

export function createStory(app, { firefly, onSite }) {
  const shell = el('div', { class: 'story board' }, app);
  const track = el('div', { class: 'story-track' }, shell);

  // chrome: brand, skip, theme, and the bottom navigation
  const top = el('div', { class: 'story-top' }, shell);
  const brand = el('button', { class: 'story-brand', type: 'button', 'aria-label': 'Back to the start' }, top,
    '<img src="./lib/logos/infravis-white-text.svg" alt="InfraVis" style="height:30px">');
  // the full logo in the theme's ink, building itself now and then
  import('../site/logoLoop.js').then(({ liveLockup }) => liveLockup(brand, { every: 18, first: 8, stroke: 'currentColor', letters: 'currentColor', height: 30 })).catch(() => {});
  const right = el('div', { class: 'story-top-r' }, top);
  const skip = el('button', { class: 'sk-btn ghost story-skip', type: 'button' }, right, 'Skip to the website ⟶');
  right.appendChild(themeButton());

  const nav = el('nav', { class: 'story-nav', 'aria-label': 'Story navigation' }, shell);
  const backBtn = el('button', { class: 'sk-btn ghost nav-back', type: 'button', 'aria-label': 'Previous scene' }, nav, '⟵');
  const dots = el('ol', { class: 'nav-dots' }, nav);
  const nextBtn = el('button', { class: 'sk-btn primary nav-next', type: 'button' }, nav, 'Next ⟶');
  const live = el('div', { class: 'sr-only', 'aria-live': 'polite' }, shell);

  SCENES.forEach((s, i) => {
    if (!s.chapter) return;
    const li = el('li', {}, dots);
    const b = el('button', { type: 'button', title: s.chapter, 'aria-label': `Chapter ${i}: ${s.chapter}` }, li);
    // its colour: along the logo's rainbow, blue to yellow, chapter by chapter
    const RAIN = ['#1d71b8', '#951b81', '#e30613', '#ed6a21', '#f9b233', '#ffd200'];
    const n = SCENES.filter((x) => x.chapter).length;
    b.style.setProperty('--c', RAIN[Math.round(((i - 1) / Math.max(1, n - 1)) * (RAIN.length - 1))]);
    b.addEventListener('click', () => go(i));
  });

  let index = -1, current = null, busy = false, disposed = false;
  const mods = new Map();
  const load = (i) => {
    if (i < 0 || i >= SCENES.length) return null;
    if (!mods.has(i)) mods.set(i, SCENES[i].load().then((m) => m.default));
    return mods.get(i);
  };

  const ctx = {
    firefly,
    next: () => advance(),
    back: () => retreat(),
    goSite: (opts) => finish(opts),
    hideNav: (on = true) => nav.classList.toggle('hidden', on),
    // a scene says "the visitor has seen what matters": Next starts to glow
    ready: () => { nextBtn.classList.add('pulse'); if (!current?.scene?.steps?.length) progress(1); },
    stepDone: (key) => stepDone(key),
    // a scene waiting on a model: ctx.whileLoading(promise) loops the firefly
    whileLoading: (p) => { const stop = firefly.loading(); return Promise.resolve(p).finally(stop); },
    setNextLabel: (t) => { nextBtn.textContent = t; },
  };

  // replay: after the chapter opens, run its first `replay` beats again (Back
  // lands on a beat, not on a chapter's beginning); force: rebuild the same chapter
  async function go(i, { instant = false, replay = 0, force = false } = {}) {
    if (busy || (i === index && !force) || i < 0) return;
    if (i >= SCENES.length) { finish(); return; }
    busy = true;
    const dir = i > index ? 1 : i < index ? -1 : 0;
    // the code arrives fast from cache; if it does not, the firefly loops
    // in place with its lantern up until it does (no spinner anywhere)
    let stopLoops = null;
    const slow = setTimeout(() => { stopLoops = firefly.loading(); }, 120);
    const build = await load(i);
    clearTimeout(slow); stopLoops?.();
    load(i + 1);   // prefetch the next scene's code (and what it imports)
    const root = el('section', { class: 'scene', 'data-scene': SCENES[i].id, 'aria-label': SCENES[i].chapter || 'InfraVis' }, track);
    if (SCENES[i].chapter) el('div', { class: 'chapter-tag' }, root, `<b>${i}</b> · ${SCENES[i].chapter}`);
    firefly.blend(false); firefly.tone(null);   // each chapter starts with the firefly in colour; a chapter may blend it
    const scene = build(root, ctx) || {};
    const prev = current;
    current = { scene, root, i };
    index = i;
    nextBtn.classList.remove('pulse');
    done.clear(); stepIdx = 0;
    nextBtn.textContent = labelFor(scene);
    progress(0);
    nav.classList.toggle('hidden', !!scene.hideNav);
    backBtn.disabled = i <= 1 && !replay;
    // every dot set afresh, whichever way the story moved: the chapters before
    // this one full, this one empty (its beats fill it), the ones after empty
    [...dots.children].forEach((li, k) => {
      li.classList.toggle('on', k + 1 === i); li.classList.toggle('seen', k + 1 < i);
      li.querySelector('button')?.style.setProperty('--p', k + 1 < i ? '1' : '0');
    });
    live.textContent = SCENES[i].chapter ? `Chapter ${i}: ${SCENES[i].chapter}` : '';
    history.replaceState(null, '', i ? `#story/${SCENES[i].id}` : '#');

    // the pan: the old scene slides away, the new one arrives from the side
    if (prev) {
      prev.scene.leave?.();
      const dur = instant || reducedMotion.matches ? 1 : 1100;
      if ((SCENES[i].fade && dir > 0) || dir === 0) {   // (the same chapter rebuilt: a crossfade too)
        // the finale grows out of the map in place: a crossfade, no pan
        const a = root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, fill: 'forwards' });
        prev.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: 'forwards' });
        await a.finished.catch(() => {});
        a.cancel(); prev.scene.dispose?.(); prev.root.remove();
        busy = false;
        replayBeats(scene, replay);
        try { await scene.enter?.(); } catch (e) { console.error(e); }
        return;
      }
      root.style.transform = `translateX(${dir * 100}%)`;
      root.getBoundingClientRect();
      const ease = 'cubic-bezier(.65,0,.35,1)';
      prev.root.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-dir * 100}%)` }], { duration: dur, easing: ease, fill: 'forwards' });
      const a = root.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'translateX(0)' }], { duration: dur, easing: ease, fill: 'forwards' });
      // the firefly crosses with the pan, leading the way
      // (swoop: mid-pan it comes close to the camera, turning toward us)
      firefly.flyTo(dir > 0 ? innerWidth * 0.82 : innerWidth * 0.18, innerHeight * (0.3 + Math.random() * 0.2), { duration: dur * 1.3, arc: 0.2, swoop: 0.45, toSize: 0.55 });
      await a.finished.catch(() => {});
      root.style.transform = ''; a.cancel();
      prev.scene.dispose?.();
      prev.root.remove();
    }
    busy = false;
    replayBeats(scene, replay);
    try { await scene.enter?.(); } catch (e) { console.error(e); }
  }

  // seamless: the finale has already drawn the site's header and hero over
  // the board, so the site is built underneath first and the story fades
  // off the top of it (nothing visibly changes)
  function finish({ seamless = false } = {}) {
    if (disposed) return;
    disposed = true;
    removeEventListener('keydown', onKey);
    if (seamless) {
      onSite();
      shell.style.zIndex = 80;
      shell.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay: 250, fill: 'forwards' }).finished.then(() => {
        current?.scene.leave?.(); current?.scene.dispose?.(); shell.remove();
      });
      return;
    }
    current?.scene.leave?.();
    current?.scene.dispose?.();
    shell.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished.then(() => {
      shell.remove();
      onSite();
    });
  }
  // NEXT walks through the chapter's own beats first: a scene lists them as
  // steps: [{ label, run }] — each does what the visitor would have clicked
  // (visualize, recolour, change the season, pick a project...). Only when
  // its beats are done does Next leave the chapter. (stepReady(): false while
  // the chapter's opening is still drawing what the beat needs.)
  // Each step has a key; a beat is done whether Next ran it or the visitor
  // clicked it in the scene (the scene calls ctx.stepDone(key)), so the two
  // stay in step: Next always runs the first beat not done yet.
  const done = new Set();
  let stepIdx = 0;
  const firstOpen = (sc) => { const st = sc?.steps || []; const k = st.findIndex((x, i) => !done.has(x.key ?? i)); return k < 0 ? st.length : k; };
  const labelFor = (sc) => {
    const st = sc?.steps;
    if (st && stepIdx < st.length) return `${st[stepIdx].label} ⟶`;
    return sc?.next || (index === SCENES.length - 1 ? 'Enter InfraVis ⟶' : 'Next chapter ⟶');
  };
  // the chapter's dot fills, a slice per beat done, in the chapter's colour
  function progress(p) {
    const li = [...dots.children][index - 1];
    li?.querySelector('button')?.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
  }
  function syncSteps() {
    const sc = current?.scene, st = sc?.steps;
    stepIdx = firstOpen(sc);
    nextBtn.textContent = labelFor(sc);
    if (st?.length) { progress(done.size / st.length); nextBtn.classList.toggle('pulse', stepIdx >= st.length); }
    backBtn.disabled = index <= 1 && done.size === 0;
  }
  function stepDone(key) {
    const st = current?.scene?.steps;
    if (!st || !st.some((x, i) => (x.key ?? i) === key) || done.has(key)) return;
    done.add(key);
    syncSteps();
  }
  // run a chapter's first n beats again, once it is ready for them
  async function replayBeats(scene, n) {
    if (!n || !scene.steps?.length) return;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    while (current?.scene === scene && scene.stepReady && !scene.stepReady()) await wait(150);
    for (let k = 0; k < Math.min(n, scene.steps.length); k++) {
      if (current?.scene !== scene) return;
      const st = scene.steps[stepIdx]; if (!st) return;
      st.run(); stepDone(st.key ?? stepIdx);
      await wait(220);
    }
  }
  // BACK: one beat back — inside a chapter, the chapter again up to the beat
  // before; at a chapter's first beat, the chapter before, at its last beat
  function retreat() {
    const st = current?.scene?.steps, n = done.size;
    if (st?.length && n > 0) {
      // undo the last beat in place (nothing restarts): each step knows its reverse
      let k = -1; st.forEach((x, i) => { if (done.has(x.key ?? i)) k = i; });
      const step = st[k];
      if (step?.undo) { step.undo(); done.delete(step.key ?? k); syncSteps(); return; }
      return go(index, { force: true, replay: n - 1 });   // (a beat without a reverse: rebuild up to it)
    }
    if (index <= 1) return;
    const prev = index - 1;
    load(prev).then(() => go(prev, { replay: 99 }));
  }
  function advance() {
    const sc = current?.scene;
    if (sc?.steps && stepIdx < sc.steps.length) {
      if (sc.stepReady && !sc.stepReady()) return;
      const step = sc.steps[stepIdx];
      step.run();
      stepDone(step.key ?? stepIdx);
      return;
    }
    if (sc?.onNext) return sc.onNext();
    go(index + 1);
  }

  function onKey(e) {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight' || (e.key === ' ' && e.target === document.body)) { e.preventDefault(); advance(); }
    else if (e.key === 'ArrowLeft') retreat();
    else if (e.key === 'Escape') finish();
  }
  addEventListener('keydown', onKey);
  nextBtn.addEventListener('click', advance);
  backBtn.addEventListener('click', retreat);
  skip.addEventListener('click', finish);
  brand.addEventListener('click', () => go(0));

  // deep link: #story/<scene>
  const m = location.hash.match(/^#story\/(\w+)/);
  const start = m ? Math.max(0, SCENES.findIndex((s) => s.id === m[1])) : 0;
  go(start, { instant: true });

  return {
    update(dt, t) { if (!disposed) current?.scene.update?.(dt, t); },
    get index() { return index; },
  };
}
