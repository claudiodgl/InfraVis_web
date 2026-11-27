// THE FIREFLY: the guide of the whole story. A small hand-drawn beetle with a
// glowing tail that flies ahead from scene to scene, perches where a scene
// wants it, and never stands quite still (it bobs, flutters, its light
// breathes). Everything is one absolutely positioned SVG moved by transform
// from the shared loop (update(dt)), plus a short dotted trail on a small 2D
// canvas that only draws while the firefly travels.
//
// api: flyTo(x, y, { duration, arc }) -> Promise   (x, y in viewport px)
//      follow(on)          chase the pointer (scenes that want a flashlight)
//      perchOn(el, dx, dy) fly to an element's corner
//      glow(level)         0..1.5 brightness of the light
//      say(...)            the scenes place comic balloons near firefly.pos
import { el } from './ink.js';
import { reducedMotion, theme } from '../theme.js';

const SVG = `
<svg viewBox="-40 -40 80 80" class="ff-svg" aria-hidden="true">
  <defs>
    <radialGradient id="ff-glow-g">
      <stop offset="0" stop-color="var(--glow)" stop-opacity="1"/>
      <stop offset=".35" stop-color="var(--glow)" stop-opacity=".55"/>
      <stop offset="1" stop-color="var(--glow)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle class="ff-halo" cx="-13" cy="6" r="34" fill="url(#ff-glow-g)"/>
  <g class="ff-body boil">
    <!-- hind wing pair (back), drawn as loose loops -->
    <path class="ff-wing ff-wing-b" d="M2 -4 C -6 -26, -24 -28, -22 -16 C -20 -8, -8 -6, 2 -4 Z"/>
    <!-- abdomen: the lantern -->
    <path class="ff-tail" d="M-4 2 C -10 -2, -22 0, -24 6 C -25 12, -14 15, -6 10 C -2 8, -1 4, -4 2 Z"/>
    <path class="ff-seg ink" d="M-11 1 C -12 5, -11 10, -9 12 M-17 1.5 C -18 6, -17 11, -15 13"/>
    <!-- thorax and head -->
    <path class="ff-thorax ink" d="M-4 2 C -3 -4, 5 -6, 9 -2 C 12 2, 8 7, 2 7 C -2 7, -5 5, -4 2 Z"/>
    <circle class="ff-head ink" cx="13" cy="0" r="4.2"/>
    <circle class="ff-eye" cx="14.6" cy="-1" r="1.1"/>
    <!-- antennae -->
    <path class="ink ff-ant" d="M15 -3 C 18 -10, 22 -13, 27 -13 M14 -3.5 C 15 -11, 18 -16, 22 -18"/>
    <!-- legs -->
    <path class="ink ff-legs" d="M0 6 L -3 12 M4 7 L 3 13 M8 5 L 10 11"/>
    <!-- front wing (over) -->
    <path class="ff-wing ff-wing-f" d="M4 -3 C 0 -30, 20 -34, 22 -20 C 23 -10, 12 -5, 4 -3 Z"/>
  </g>
</svg>`;

const CSS = `
.ff-layer { position: fixed; inset: 0; pointer-events: none; z-index: 75; overflow: hidden; }
.ff-trail { position: absolute; inset: 0; width: 100%; height: 100%; }
.ff { position: absolute; left: 0; top: 0; width: 76px; height: 76px; margin: -38px 0 0 -38px; will-change: transform; opacity: 0; transition: opacity .8s ease; }
/* only the 3D firefly is shown: invisible until it has loaded (the drawn
   body is a fallback for browsers without WebGL: .ff.drawn) */
.ff.ready { opacity: 1; }

/* its shadow on whatever is below it, and (dark mode) the pool of light its lantern throws there */
.ff-shadow, .ff-pool { position: absolute; left: 0; top: 0; border-radius: 50%; pointer-events: none; opacity: 0; will-change: transform, opacity; }
.ff-shadow { width: 100px; height: 22px; margin: -11px 0 0 -50px; background: radial-gradient(closest-side, rgba(10, 8, 14, .85), rgba(10, 8, 14, .35) 55%, rgba(10, 8, 14, 0)); }
.ff-pool { width: 220px; height: 70px; margin: -35px 0 0 -110px; background: radial-gradient(closest-side, var(--glow-soft), transparent); mix-blend-mode: screen; }
:root[data-theme='light'] .ff-pool { display: none; }
.ff:not(.drawn) .ff-body { display: none; }
.ff-svg { width: 100%; height: 100%; overflow: visible; }
.ff-canvas { position: absolute; left: 50%; top: 50%; width: 250px; height: 250px; margin: -125px 0 0 -125px; pointer-events: none;
  /* a white edge traced round the rendered silhouette (the 3D render is left
     as it is). Every state below uses the same list of filter functions, so
     the change into the blended silhouette is animated, not a jump. */
  filter: brightness(1) invert(0) sepia(0) drop-shadow(0 0 .6px #fff) drop-shadow(0 0 .6px #fff) drop-shadow(0 0 .4px #fff);
  transition: filter 1.6s ease; }
:root[data-theme='dark'] .ff-canvas { filter: brightness(1) invert(0) sepia(0) drop-shadow(0 0 .8px #fff) drop-shadow(0 0 .8px #fff) drop-shadow(0 0 .8px #fff); }
/* blended: a solid silhouette in the theme's ink — the colour of the birds in
   the scene (black on paper, chalk-white on the blackboard), its glow put out */
:root[data-theme='light'] .ff.blend .ff-canvas { filter: brightness(0) invert(0) sepia(0) drop-shadow(0 0 .6px rgba(255,255,255,0)) drop-shadow(0 0 .6px rgba(255,255,255,0)) drop-shadow(0 0 .4px rgba(255,255,255,0)); }
:root[data-theme='dark'] .ff.blend .ff-canvas { filter: brightness(0) invert(.92) sepia(.12) drop-shadow(0 0 .8px rgba(0,0,0,0)) drop-shadow(0 0 .8px rgba(0,0,0,0)) drop-shadow(0 0 .8px rgba(0,0,0,0)); }
.ff.blend.tone-white .ff-canvas { filter: brightness(0) invert(.95) sepia(.08) drop-shadow(0 0 .8px rgba(0,0,0,0)) drop-shadow(0 0 .8px rgba(0,0,0,0)) drop-shadow(0 0 .8px rgba(0,0,0,0)) !important; }
.ff.blend.tone-black .ff-canvas { filter: brightness(0) invert(0) sepia(0) drop-shadow(0 0 .6px rgba(255,255,255,0)) drop-shadow(0 0 .6px rgba(255,255,255,0)) drop-shadow(0 0 .4px rgba(255,255,255,0)) !important; }
.ff .ff-svg { transition: opacity 1.4s ease; }
.ff.blend .ff-svg { opacity: 0; }
.ff.has3d .ff-svg { position: absolute; inset: 0; }
.ff-svg .ink { stroke: var(--ink); stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.ff-thorax, .ff-head { fill: var(--paper) !important; }
.ff-eye { fill: var(--ink); }
.ff-tail { fill: var(--glow); stroke: var(--ink); stroke-width: 1.8; transition: fill .6s; }
.ff-wing { fill: var(--paper); fill-opacity: .55; stroke: var(--ink); stroke-width: 1.5; transform-box: fill-box; }
.ff-wing-f { transform-origin: 0% 100%; animation: ff-flap .11s ease-in-out infinite alternate; }
.ff-wing-b { transform-origin: 100% 100%; animation: ff-flap .11s ease-in-out .05s infinite alternate; }
.ff.resting .ff-wing-f, .ff.resting .ff-wing-b { animation-duration: 1.6s; }
.ff-halo { transform-box: fill-box; transform-origin: center; animation: ff-breathe 2.4s ease-in-out infinite; mix-blend-mode: var(--ff-blend, normal); }
:root[data-theme='light'] .ff-halo { opacity: .55; }
:root[data-theme='dark'] { --ff-blend: screen; }
@keyframes ff-flap { from { transform: scaleY(1) rotate(0deg); } to { transform: scaleY(.35) rotate(-8deg); } }
@keyframes ff-breathe { 0%,100% { transform: scale(.82); opacity: var(--ff-o1, .55); } 50% { transform: scale(1.08); opacity: var(--ff-o2, 1); } }
`;

export function createFirefly() {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const layer = el('div', { class: 'ff-layer' }, document.body);
  const trail = el('canvas', { class: 'ff-trail' }, layer);
  const ctx = trail.getContext('2d');
  const pool = el('div', { class: 'ff-pool' }, layer);
  const shadow = el('div', { class: 'ff-shadow' }, layer);
  const node = el('div', { class: 'ff' }, layer, SVG);
  let shAlt = 0;   // eased height of the firefly above the surface it is over
  const halo = node.querySelector('.ff-halo');
  const svgBox = node.querySelector('.ff-svg');

  const pos = { x: -100, y: innerHeight * 0.4 };
  let flight = null;          // { from, to, c1, c2, t, dur, resolve }
  let following = false, pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  let home = { x: pos.x, y: pos.y }, face = 1, time = 0, glowLevel = 1;
  let skin = null, depth = 0, vy = 0, perched = false, size = 0.55, blendWanted = false;
  let startleToken = 0, lastStartle = 0, startling = false;   // (a hop away from the pointer, and back)   // (small in the story: it guides, it should not distract)   // size: 1 in the story, smaller on the website
  let loading = 0;   // >0: looping in place while a scene loads
  const dots = [];            // trail points {x, y, age}
  let dpr = 1;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    trail.width = innerWidth * dpr; trail.height = innerHeight * dpr;
  }
  resize(); addEventListener('resize', resize);
  let realPointer = false;   // (no startle until the visitor has actually moved the pointer)
  addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY }; realPointer = true; }, { passive: true });
  document.addEventListener('pointerleave', () => { realPointer = false; });

  function bez(a, b, c, d, t) {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  }

  const api = {
    pos, node,
    // swoop: 0..1, how close to the camera it comes mid-flight (the 3D skin
    // grows and turns toward the viewer; the 2D one simply grows)
    // toSize: it grows or shrinks along the way and arrives at that size
    flyTo(x, y, { duration = 2000, arc = 0.16, swoop = 0, toSize = null, _startle = false } = {}) {
      if (!_startle) { startleToken++; startling = false; }   // a flight from the story cancels a hop's way back
      perched = false; node.classList.remove('resting');
      following = false;
      if (flight?.resolve) flight.resolve();
      if (reducedMotion.matches) { pos.x = home.x = x; pos.y = home.y = y; return Promise.resolve(); }
      return new Promise((resolve) => {
        const from = { x: pos.x, y: pos.y };
        const dx = x - from.x, dy = y - from.y, d = Math.hypot(dx, dy) || 1;
        // a lazy S through the air: control points off the straight line
        const nx = -dy / d, ny = dx / d, k = d * arc;
        const c1 = { x: from.x + dx * 0.3 + nx * k, y: from.y + dy * 0.3 + ny * k - k * 0.3 };
        const c2 = { x: from.x + dx * 0.7 - nx * k * 0.6, y: from.y + dy * 0.7 - ny * k * 0.6 };
        flight = { from, to: { x, y }, c1, c2, t: 0, dur: duration / 1000, resolve, swoop, size0: size, size1: toSize };
        node.classList.remove('resting');
      });
    },
    // fly in from off-screen left/right to (x, y)
    enter(x, y, { from = 'left', duration = 1800 } = {}) {
      pos.x = from === 'left' ? -60 : innerWidth + 60;
      pos.y = y + (Math.random() - 0.5) * 120;
      return api.flyTo(x, y, { duration, arc: 0.35 });
    },
    follow(on = true) { following = on; flight = null; perched = false; node.classList.toggle('resting', false); },
    // settle (the 3D skin plays its landed idle): after flyTo, on a perch
    land(on = true) { perched = on; },
    // loop-the-loops in place while something loads; returns a stop function
    loading() { loading++; perched = false; return () => { loading = Math.max(0, loading - 1); }; },
    // no WebGL: the drawn firefly instead
    useDrawn() { node.classList.add('drawn', 'ready'); },
    get ready() { return node.classList.contains('ready'); },
    // the 3D skin (three/firefly3d.js), the only body shown
    attach(s) {
      skin = s;
      // the 3D body is bigger than the drawn one: its glow moves back to its lantern
      halo.setAttribute('cx', -34); halo.setAttribute('cy', 4); halo.setAttribute('r', 44);
      const box = node.querySelector('.ff-svg');
      node.appendChild(s.canvas);
      node.classList.add('has3d');
      requestAnimationFrame(() => node.classList.add('ready'));   // fades in, already in place
      box && box.after(s.canvas);
    },
    perchOn(target, dx = 0, dy = -30, opts) {
      const r = target.getBoundingClientRect();
      return api.flyTo(r.left + r.width / 2 + dx, r.top + dy, opts);
    },
    glow(level) { glowLevel = level; },
    setSize(k) { size = k; },
    // step back: blend into the board while it rests (it comes back when it flies)
    // (it applies at once — also in flight — and lasts until blend(false))
    blend(on = true) { blendWanted = on; node.classList.toggle('blend', on); },
    // px from its centre down to its feet (the 3D model's), at the current size
    // STARTLED: the pointer came close while it sat — it hops up and aside,
    // hovers a moment, and comes back to land on the very same spot
    startle() {
      const my = ++startleToken, back = { x: home.x, y: home.y }, wasPerched = perched;
      lastStartle = performance.now(); startling = true;
      const dir = pointer.x > pos.x ? -1 : 1;   // away from the pointer
      const end = () => { if (my === startleToken) startling = false; };
      api.flyTo(back.x + dir * (24 + 26 * size), back.y - (30 + 34 * size), { duration: 650, arc: 0.18, _startle: true })
        .then(() => new Promise((r) => setTimeout(r, 450)))   // a soft hover up there
        .then(() => (my === startleToken ? api.flyTo(back.x, back.y, { duration: 900, arc: -0.12, _startle: true }) : null))
        .then(() => { if (my === startleToken && wasPerched) api.land(true); end(); });
    },
    // the silhouette's tone, when the surface asks for it: 'white' on a dark
    // surface (the site's black header), 'black' on a light one, null = the theme's ink
    tone(t) { node.classList.toggle('tone-white', t === 'white'); node.classList.toggle('tone-black', t === 'black'); },
    get feet() { return (skin ? skin.feet.dy : 41) * size; },
    // how far its feet sit ahead of its centre, toward where it faces (px, current size)
    get feetDX() { return skin ? skin.feet.dx * size * skin.side : 0; },
    // land ON something: (x, yTop) is a point on the top edge of what it
    // stands on; it flies there (flying clip) and lands (landed clip)
    // (the feet sit forward of its centre, under the thorax: the centre goes
    // behind them, on the side it will face as it arrives)
    perchAt(x, yTop, opts = {}) {
      const facing = x >= pos.x ? 1 : -1, f = skin ? skin.feet : { dx: 0, dy: 41 };
      const SINK = 1.5;   // px the feet press into the edge: contact, not hovering
      const k = opts.toSize ?? size;   // (its feet where they will be at the size it lands at)
      return api.flyTo(x - f.dx * k * facing, yTop - f.dy * k + SINK, opts).then(() => api.land(true));
    },
    // ...on an element's top edge, fx along it (0 left .. 1 right)
    perchOnEl(target, fx = 0.5, opts) { const r = target.getBoundingClientRect(); return api.perchAt(r.left + r.width * fx, r.top, opts); },
    // stay on a spot that moves (a perch on a scrolling page): when not
    // flying, its home follows (x, y) at once
    stickTo(x, y) { if (!flight && !startling) { home = { x, y }; } },   // (not mid-hop: it would snap back)
    get flying() { return !!flight; },
    hide(on = true) { node.style.opacity = on ? '0' : '1'; },
    get following() { return following; },
    update(dt) {
      time += dt;
      let vx = 0;
      if (flight) {
        flight.t = Math.min(1, flight.t + dt / flight.dur);
        const t = flight.t < 0.5 ? 2 * flight.t * flight.t : 1 - Math.pow(-2 * flight.t + 2, 2) / 2;
        const nx = bez(flight.from.x, flight.c1.x, flight.c2.x, flight.to.x, t);
        const ny = bez(flight.from.y, flight.c1.y, flight.c2.y, flight.to.y, t);
        vx = nx - pos.x; vy = ny - pos.y; pos.x = nx; pos.y = ny;
        depth = flight.swoop * Math.sin(Math.PI * flight.t);
        if (flight.size1 != null) size = flight.size0 + (flight.size1 - flight.size0) * t;   // (eased with the path)
        if (flight.t > 0.02) dots.push({ x: pos.x, y: pos.y, age: 0 });
        if (flight.t >= 1) { home = { ...flight.to }; const r = flight.resolve; flight = null; node.classList.add('resting'); r(); }
      } else if (following) {
        const tx = pointer.x + 26, ty = pointer.y - 22;
        const k = 1 - Math.exp(-dt * 3);   // a lazy follower
        vx = (tx - pos.x) * k; pos.x += vx; pos.y += (ty - pos.y) * k;
        home = { x: pos.x, y: pos.y };
        if (Math.abs(vx) > 0.5) dots.push({ x: pos.x, y: pos.y, age: 0 });
      } else if (loading) {
        // waiting on a download: tight glowing loops around its spot
        const a = time * 2.4, r = 16;   // (small, unhurried loops)
        const nx = home.x + Math.cos(a) * r, ny = home.y + Math.sin(a) * r * 0.6;
        vx = nx - pos.x; vy = ny - pos.y; pos.x = nx; pos.y = ny;
        dots.push({ x: pos.x, y: pos.y, age: 0 });
      } else {
        // hovering: a small figure-of-eight around its spot, never frozen
        // (the 3D body lands when it stops: then it only breathes in place)
        // standing: still; in the air: a slow, small hover (it should not pull the eye)
        const a = skin ? (perched ? 0.03 : 0.35) : 0.6;
        const ox = Math.sin(time * 0.8) * 6 * a, oy = (Math.sin(time * 1.6) * 4 + Math.sin(time * 0.5) * 3) * a;
        vx = home.x + ox - pos.x; pos.x = home.x + ox; pos.y = home.y + oy;
      }
      // resting or riding a perch that moves (a scrolling page): its own
      // motion is not flight — the 3D body stays landed and keeps its facing
      if (!flight && !following && !loading) vx = 0;
      if (!flight) depth += (0 - depth) * (1 - Math.exp(-dt * 4));
      if (!flight && !loading) vy = 0;
      // the pointer close to it while it sits: a little hop, then back
      if (realPointer && perched && !flight && !following && !loading && node.classList.contains('ready')
        && performance.now() - lastStartle > 1600
        && Math.hypot(pointer.x - pos.x, pointer.y - pos.y) < 30 + 60 * size) api.startle();
      if (Math.abs(vx) > 0.4) face = vx > 0 ? 1 : -1;
      const scale = (1 + depth * 2.6) * size;
      this.castShadow(dt, scale);
      if (skin) {
        // the 3D skin turns itself; the node only moves and grows
        node.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        // the glow sits behind the lantern, which is behind the body
        svgBox.style.transform = `scaleX(${skin.side})`;
        skin.setGlow(glowLevel * (loading ? 1.6 : 1));
        const travelling = !!flight || following || !!loading;
        skin.update(dt, { vx: travelling ? vx / Math.max(dt, 1e-3) / 60 : 0, vy: travelling ? vy / Math.max(dt, 1e-3) / 60 : 0, moving: travelling, perched: perched && !flight, depth });
      } else {
        const tilt = flight ? Math.max(-14, Math.min(14, vx * 2)) : Math.sin(time * 1.3) * 4;
        node.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) scaleX(${face}) rotate(${tilt.toFixed(1)}deg)`;
      }
      halo.style.setProperty('--ff-o1', (0.35 * glowLevel).toFixed(2));
      halo.style.setProperty('--ff-o2', Math.min(1, 0.95 * glowLevel).toFixed(2));
      this.drawTrail(dt);
    },
    // THE SHADOW: under its feet when it has landed (small, dark, sharp); in
    // the air it falls away below it, larger, softer and fainter, the higher
    // it flies (mid-flight and in a swoop toward the camera), and closes in
    // under the feet as it comes down to land
    castShadow(dt, scale) {
      if (!node.classList.contains('ready') || node.classList.contains('drawn')) { shadow.style.opacity = pool.style.opacity = 0; return; }
      const feet = (skin ? skin.feet.dy : 41) * scale;   // the 3D model's feet, below its centre (measured)
      let alt;
      if (flight) alt = Math.sin(Math.PI * flight.t) * 110 * size + depth * 160 + (1 - flight.t) * 10;
      else if (following || loading) alt = 60 * size;
      else alt = perched ? 0 : 14 * size;
      shAlt += (alt - shAlt) * (1 - Math.exp(-dt * 8));
      const k = Math.min(shAlt / 160, 1);
      const w = (0.5 + 0.5 * size) * scale * (1 + k * 1.2);
      const x = pos.x + (skin ? skin.side * skin.feet.dx : -face * 6) * scale, y = pos.y + feet + shAlt * 0.55;
      shadow.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${w.toFixed(3)}, ${(w * (1 - k * 0.3)).toFixed(3)})`;
      const ghost = node.classList.contains('blend') ? 0.3 : 1;
      shadow.style.opacity = ((perched && !flight ? 0.6 : 0.38) * (1 - k * 0.75) * ghost).toFixed(3);
      shadow.style.filter = `blur(${(1 + k * 7).toFixed(1)}px)`;
      pool.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${(y - 4).toFixed(1)}px, 0) scale(${(w * 1.1).toFixed(3)})`;
      pool.style.opacity = (glowLevel * (0.75 + 0.25 * Math.sin(time * 2.4)) * (1 - k * 0.85) * (perched ? 1 : 0.6) * ghost).toFixed(3);
    },
    drawTrail(dt) {
      if (!node.classList.contains('ready')) dots.length = 0;
      if (!dots.length) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const glow = theme.css('--glow') || '#f6b500';
      ctx.fillStyle = glow;
      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i]; d.age += dt;
        if (d.age > 1.1) { dots.splice(i, 1); continue; }
        if (i % 3) continue;   // dotted, like a sketched flight line
        ctx.globalAlpha = (1 - d.age / 1.1) * 0.8;
        ctx.beginPath(); ctx.arc(d.x - face * 12, d.y + 6, 2.2 * (1 - d.age / 1.4), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!dots.length) ctx.clearRect(0, 0, innerWidth, innerHeight);
    },
  };
  return api;
}
