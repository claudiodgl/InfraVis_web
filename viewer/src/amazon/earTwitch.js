import * as THREE from 'three';

// THE EARS' TWITCH, for every jaguar (walking, swimming, climbing, lying):
// now and then ONE ear shivers — a few quick swings back and forth about the
// head's left-right axis (the relaxed lying pose's tremor, jag-lab.html
// "Orelhas": 15 degrees, 3 swings at 3.5 Hz, ~0.9 s) — then both are still.
// The two ears never twitch together (the user, 2026-11-03): one at a time,
// taking turns — left, right, left — every 1.5-4 s (more often, and always
// the other ear: the user, 2026-11-04, for every cat in the film and live,
// walking or at rest); each cat has its own seed, so no two cats twitch in
// step.
//
// The schedule is a pure function of the cat's clock (a seeded run of
// events), so a film frame is the same every time: clock(t) sets it outright
// (the film), update(dt) runs it on (the live cats). Either then poses the
// ears — call it LAST in the frame, after the clip and every pose over it
// (simplePoses' lying ears are laid back first, the twitch goes on top).
//
// Never accumulated: three's PropertyMixer may or may not have rewritten the
// ear this frame (jaguar.js pose() NaN-fills it, but not every caller poses
// every frame), so the twitch remembers what it wrote: an ear still holding
// that was NOT rewritten and gets its pre-twitch pose back first; anything
// else is a fresh pose this frame, kept as the new base.
export const EAR_TWITCH = {
  on: true,
  amp: 15,           // deg each swing (back and forward again)
  hz: 3.5,           // swings a second
  osc: 3,            // swings in one twitch
  every: [1.5, 4],   // s between one twitch and the next (uniform; > a twitch's ~0.9 s)
  other: 1,          // chance the next twitch is the OTHER ear (1: they take turns)
};

// a small seeded generator (mulberry32): the same run of twitches per seed
function rng(seed) {
  let a = (seed * 4294967296) >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createEarTwitch(J, { seed = Math.random(), cfg = EAR_TWITCH } = {}) {
  const ears = [J.model.getObjectByName('Ear1_L'), J.model.getObjectByName('Ear4_R')];
  if (!ears.every(Boolean)) return { update() {}, clock() {}, at: () => [0, 0] };

  // the run of twitches: start times and which ear (0 left, 1 right), made
  // as far ahead as asked (a seek far into the film extends it)
  const R = rng(seed), starts = [], which = [];
  const between = () => cfg.every[0] + R() * (cfg.every[1] - cfg.every[0]);
  starts.push(R() * cfg.every[1]); which.push(R() < 0.5 ? 0 : 1);   // (the first at a random point)
  function extend(t) {
    while (starts[starts.length - 1] <= t) {
      starts.push(starts[starts.length - 1] + between());
      which.push(R() < cfg.other ? 1 - which[which.length - 1] : which[which.length - 1]);
    }
  }
  // [left, right] at clock t, each 0 (still) .. 1 (swung fully back); at
  // most one of them nonzero — a twitch (osc / hz ≈ 0.9 s) is far shorter
  // than the shortest gap (every[0])
  const out = [0, 0];
  function at(t) {
    out[0] = out[1] = 0;
    if (!cfg.on || t < 0) return out;
    extend(t);
    let lo = 0, hi = starts.length - 1;   // the last start at or before t
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (starts[m] <= t) lo = m; else hi = m; }
    if (starts[lo] > t) return out;
    const n = Math.max(1, Math.round(cfg.osc)), p = (t - starts[lo]) * Math.max(0.1, cfg.hz) / n;
    if (p < 1) out[which[lo]] = 0.5 - 0.5 * Math.cos(p * 2 * Math.PI * n);
    return out;
  }

  const base = ears.map((e) => e.quaternion.clone());
  const wrote = ears.map(() => new THREE.Quaternion(NaN, NaN, NaN, NaN));
  const _ax = new THREE.Vector3(), _q = new THREE.Quaternion(), _im = new THREE.Matrix4();
  let T = 0;
  function apply() {
    const k = at(T);
    J.root.updateMatrixWorld(true);
    ears.forEach((e, i) => {
      if (e.quaternion.equals(wrote[i])) e.quaternion.copy(base[i]);
      else base[i].copy(e.quaternion);
      if (k[i] > 1e-4) {
        // about the cat's left-right axis (its body's: on a trunk, in the
        // water, on a branch alike), taken into the ear's parent space and
        // premultiplied — the same turn the lying pose lays the ears back by
        _ax.set(1, 0, 0).applyQuaternion(J.root.quaternion);
        _ax.transformDirection(_im.copy(e.parent.matrixWorld).invert());
        e.quaternion.premultiply(_q.setFromAxisAngle(_ax, -cfg.amp * k[i] * Math.PI / 180));
      }
      wrote[i].copy(e.quaternion);
      e.updateMatrixWorld(true);
    });
  }
  return {
    // run the clock on by dt (s) and pose the ears; each frame, last
    update(dt) { T += Math.max(0, dt); apply(); },
    // the clock set outright (s: a film's deterministic frame), ears posed
    clock(t) { T = t; apply(); },
    // which ear is how far into a twitch at t (headless checks)
    at: (t) => [...at(t)],
    get time() { return T; },
  };
}
