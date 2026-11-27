import * as THREE from 'three';

// THE EYELIDS. The GLB rigs both lids of each eye as three joints pivoting on
// the eye (L/R_UpBlinkBaseN_JNT, L/R_DownBlinkBaseN_JNT, N = 1..3); its walk
// clip holds them open. A blink turns each upper lid down toward its lower
// one about the pivot (the upper lid does most of the travel, as in cats),
// the lower lid meeting it.
//
// The timing follows what is measured, which is little: no blink rate has
// been recorded for jaguars, and for cats the one laboratory figure (Gruart
// et al., alert domestic cats) is spontaneous blinks at random intervals,
// 0.2-0.5 a minute, each a fast lid fall and a slower rise. At that rate no
// visitor ever saw one, so the rate and length here are raised ON PURPOSE
// for legibility — about one every ten seconds, slow enough to read on
// screen — keeping the measured SHAPE: a Poisson process, fast down, slower
// up. A RESTING cat lowers its lids part way and gives the slow, relaxed
// eye-narrowing cats are known for (the "slow blink", Humphrey et al. 2020).
export const BLINK = {
  perMin: 6,                 // blinks a minute (measured in cats: 0.2-0.5; raised to be seen)
  down: 0.12, hold: 0.1, up: 0.26,    // s: quicker fall, a beat closed, slower rise
  restLower: 0.45,           // how far the lids sit lowered at rest (0 open .. 1 shut)
  slowEvery: [6, 15],        // s between slow blinks at rest
  slowDur: 2.2,              // s for a slow blink, closing and opening
  upShare: 0.78,             // of the gap closed by the upper lid
};

export function createBlink(J) {
  const get = (n) => J.model.getObjectByName(n);
  const lids = [];
  for (const s of ['L', 'R']) {
    for (let i = 1; i <= 3; i++) {
      const lid = { ub: get(`${s}_UpBlinkBase${i}_JNT`), db: get(`${s}_DownBlinkBase${i}_JNT`),
        ue: get(`${s}_UpBlink${i}_JNT_end`), de: get(`${s}_DownBlink${i}_JNT_end`) };
      if (Object.values(lid).every(Boolean)) lids.push(lid);
    }
  }
  if (!lids.length) return { update() {} };

  const _p = new THREE.Vector3(), _u = new THREE.Vector3(), _d = new THREE.Vector3(), _ax = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _r = new THREE.Quaternion();
  // turn joint b by `angle` about the WORLD axis, after its (clip-set) pose
  function turn(b, axis, angle) {
    b.parent.getWorldQuaternion(_q);
    _r.setFromAxisAngle(_ax.copy(axis).applyQuaternion(_q.invert()), angle);
    b.quaternion.premultiply(_r);
    b.updateMatrixWorld(true);
  }
  // close every lid by c (0 open .. 1 shut), from the open pose the clip set
  function close(c) {
    if (c <= 0.001) return;
    J.model.updateMatrixWorld(true);
    for (const L of lids) {
      L.ub.getWorldPosition(_p);
      L.ue.getWorldPosition(_u).sub(_p);
      L.de.getWorldPosition(_d).sub(_p);
      const gap = _u.angleTo(_d);
      const axis = _u.clone().cross(_d);
      if (gap < 1e-3 || axis.lengthSq() < 1e-12) continue;
      axis.normalize();
      turn(L.ub, axis, gap * BLINK.upShare * c);
      turn(L.db, axis, -gap * (1 - BLINK.upShare) * c);
    }
  }

  const expo = (mean) => -Math.log(1 - Math.random()) * mean;
  let nextBlink = expo(60 / BLINK.perMin), blinkT = -1;
  let nextSlow = 3, slowT = -1, lower = 0;
  const quick = (t) => {
    const { down, hold, up } = BLINK;
    if (t < down) return t / down;
    if (t < down + hold) return 1;
    return Math.max(0, 1 - (t - down - hold) / up);
  };
  return {
    // each frame, after everything else has posed the model
    update(dt, { resting = false } = {}) {
      // the quick spontaneous blink
      if (blinkT < 0 && (nextBlink -= dt) <= 0) blinkT = 0;
      let c = 0;
      if (blinkT >= 0) {
        c = quick(blinkT);
        blinkT += dt;
        if (blinkT > BLINK.down + BLINK.hold + BLINK.up) { blinkT = -1; nextBlink = expo(60 / BLINK.perMin); }
      }
      // at rest: the lids lowered, and the slow blink
      lower += ((resting ? BLINK.restLower : 0) - lower) * Math.min(1, dt / 0.8);
      if (resting) {
        if (slowT < 0 && (nextSlow -= dt) <= 0) slowT = 0;
      } else { slowT = -1; nextSlow = 3; }
      if (slowT >= 0) {
        const u = slowT / BLINK.slowDur;
        c = Math.max(c, lower + (1 - lower) * Math.sin(Math.PI * Math.min(u, 1)) ** 2);
        slowT += dt;
        if (u >= 1) { slowT = -1; const [a, b] = BLINK.slowEvery; nextSlow = a + Math.random() * (b - a); }
      }
      close(Math.max(c, lower));
    },
  };
}
