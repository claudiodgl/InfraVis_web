import * as THREE from 'three';

// A GALLOP built from the jaguar's walk clip — the GLB has no run (its other
// clips share the walk's 2.13 s cadence: a walk variant and an idle).
//
// A walk is a lateral sequence: the four feet land one after another, a
// quarter cycle apart, each on the ground ~65% of the cycle. A gallop pairs
// them: the hind feet land close together, then the front feet half a
// stride later, each foot down only ~35% of the time, with a moment in the
// air. Played faster, the walk clip just looks frantic. So the clip is split
// into five parts — the four legs and the body — and each leg is played at
// its own phase:
//   - its INHERENT phase in the walk is measured once (when its paw is
//     lowest in the clip), and its clip time shifted so it lands where the
//     gallop wants it (GALLOP below: a rotary gallop);
//   - its stance is compressed: gallop phase p maps to clip phase so the
//     paw's ~65% on the ground in the walk becomes ~35%;
// and the body gets what a run adds: the spine flexing and extending once a
// stride, the body rising in the airborne moment, the head dropping.
//
// apply(distance, dt, run) poses the model AFTER jaguar.js's pose() has set
// the walk: walk (weight 1 - w) and the five gallop parts (weight w) are
// mixed in one AnimationMixer, w easing toward `run` (0 walk .. 1 gallop),
// so speeding up blends from a walk into the gallop.

// gallop phase at which each foot lands (rotary gallop: hind left, hind right,
// then front right, front left)
const GALLOP = { HL: 0.0, HR: 0.11, FR: 0.5, FL: 0.6 };
const STANCE_WALK = 0.65, STANCE_RUN = 0.36;

const LIMB_OF = (bone) => {
  const side = /_L(\b|_|$)/.test(bone) ? 'L' : /_R(\b|_|$)/.test(bone) ? 'R' : null;
  if (!side) return 'BODY';
  if (/Shoulder|Elbow|Wrist|Finger|Fingers|Thumb|Pinky|Index|Middle|Ring/.test(bone) && !/Toe/.test(bone)) return 'F' + side;
  if (/Hip|Knee|Ankle|Toe|Toes/.test(bone)) return 'H' + side;
  return 'BODY';
};
const PAW = { HL: 'Toes1_L', HR: 'Toes1_R', FL: 'Wrist_L', FR: 'Wrist_R' };

// A REAL RUN — createGait(J, { clip: 'Run' }): where the GLB carries a run
// clip (jaguar.glb's 'Run', a closed 0.67 s gallop stride retargeted from
// BPoole's "Smilodon Game Animations", CC BY 4.0: assets/external-animals/
// CREDITS.md, merged in by merge_run_clips.mjs), it is played instead of the
// gallop built from the walk. Same interface (apply / applyRoot / weight), so
// a caller only opts in. Without the clip it falls back to the built gallop.
//
// The run's stride is set by the ground covered: one clip cycle per
// RUN_STRIDE m (the cutaway's tuning, jaguar-seasons slice.js: the clip's
// stride suits ~2.5 m/s at its own rate, i.e. ~1.7 m a cycle), so at follow
// mode's 2x / 3x (2.2 / 3.3 m/s) it plays at ~0.9x / ~1.3x its own rate and
// the paws keep pace with the ground. Bones are SAMPLED and slerped here, not
// mixed (see jaguar.js CLIPS ARE SAMPLED): walk at 1 - w, run at w.
const RUN_NATURAL = 2.5;   // m/s at which the run clip plays at its own rate (scale 1)

function createClipGait(J, walk, run) {
  const model = J.model;
  const D = walk.duration, R = run.duration;
  const scale = model.scale.x;
  const runStride = RUN_NATURAL * R * scale;
  // track pairs: [target, walk interpolant | null, run interpolant, kind]
  const walkBy = new Map(walk.tracks.map((t) => [t.name, t]));
  const pairs = [];
  for (const tr of run.tracks) {
    const dot = tr.name.lastIndexOf('.');
    const node = model.getObjectByName(tr.name.slice(0, dot)), prop = tr.name.slice(dot + 1);
    if (!node || !['quaternion', 'position', 'scale'].includes(prop)) continue;
    const w = walkBy.get(tr.name);
    pairs.push({ target: node[prop], wi: w ? w.createInterpolant() : null, ri: tr.createInterpolant(), quat: prop === 'quaternion' });
  }
  const _a = new THREE.Quaternion(), _b = new THREE.Quaternion(), _va = new THREE.Vector3(), _vb = new THREE.Vector3();
  const sampleRun = (t) => { for (const p of pairs) p.target.fromArray(p.ri.evaluate(t)); };
  const sampleWalk = (t) => { for (const p of pairs) if (p.wi) p.target.fromArray(p.wi.evaluate(t)); };

  // THE PADS: the run's stance can sit lower or higher in the model than the
  // walk's (jaguar.js stands the body by the walk's padY). Each clip's lowest
  // paw marker over its cycle, in model space; the run is lifted by the
  // difference so its planted paws land on the same ground
  const paws = Object.values(PAW).map((n) => model.getObjectByName(n));
  const _p = new THREE.Vector3();
  const lowestPaw = () => {
    model.updateMatrixWorld(true);
    let lo = Infinity;
    for (const b of paws) { model.worldToLocal(b.getWorldPosition(_p)); lo = Math.min(lo, _p.y); }
    return lo;
  };
  const N = 64;
  let walkFloor = Infinity, runFloor = Infinity;
  for (let i = 0; i < N; i++) { sampleWalk(i / N * D); walkFloor = Math.min(walkFloor, lowestPaw()); }
  for (let i = 0; i < N; i++) { sampleRun(i / N * R); runFloor = Math.min(runFloor, lowestPaw()); }
  const padLift = (walkFloor - runFloor) * scale;   // m (world) to raise the body while running
  sampleWalk(J.clipTimeAt ? J.clipTimeAt(0) : 0);   // leave the rig on the walk
  model.updateMatrixWorld(true);

  let w = 0, phase = 0;
  return {
    get weight() { return w; },
    clip: run.name,
    apply({ walkTime, step, dt, run: want }) {
      w += (want - w) * Math.min(1, dt * 2.2);
      if (w < 0.01) { w = 0; return { lift: 0, pitch: 0 }; }   // jaguar.js's own walk stands
      phase = (phase + step / runStride) % 1;
      const tw = J.clipTimeAt ? J.clipTimeAt(walkTime) : walkTime % D, tr = phase * R;
      for (const p of pairs) {
        const rv = p.ri.evaluate(tr);
        if (!p.wi || w >= 0.999) { p.target.fromArray(rv); continue; }
        const wv = p.wi.evaluate(tw);
        if (p.quat) p.target.copy(_a.fromArray(wv).slerp(_b.fromArray(rv), w));
        else p.target.copy(_va.fromArray(wv).lerp(_vb.fromArray(rv), w));
      }
      return { lift: w * padLift, pitch: 0 };
    },
    applyRoot(root, { lift, pitch }) {
      if (!lift && !pitch) return;
      root.position.y += lift;
      if (pitch) root.quaternion.multiply(_b.setFromAxisAngle(_va.set(1, 0, 0), pitch));
      root.updateMatrixWorld(true);
    },
  };
}

export function createGait(J, { clip = null } = {}) {
  const walk = J.animations.find((a) => a.name === 'Action');
  const runClip = clip ? J.animations.find((a) => a.name === clip) : null;
  if (clip && !runClip) console.warn(`gait: no clip '${clip}' in the GLB, using the gallop built from the walk`);
  if (runClip) return createClipGait(J, walk, runClip);
  const D = walk.duration;
  const walkStride = J.speed * D;   // m of ground per walk cycle
  const mixer = new THREE.AnimationMixer(J.model);

  // the clip split by limb
  const parts = { HL: [], HR: [], FL: [], FR: [], BODY: [] };
  for (const tr of walk.tracks) parts[LIMB_OF(tr.name.split('.')[0])].push(tr);
  const act = {};
  for (const [k, tracks] of Object.entries(parts)) {
    act[k] = mixer.clipAction(new THREE.AnimationClip(`gallop-${k}`, D, tracks));
    act[k].play();
  }
  const walkAct = mixer.clipAction(walk);
  walkAct.play();

  // each paw's inherent phase in the walk: where in the cycle it is lowest
  const inherent = {};
  {
    const probe = mixer.clipAction(walk);
    for (const a of Object.values(act)) a.setEffectiveWeight(0);
    probe.setEffectiveWeight(1);
    const N = 96, low = {};
    for (let i = 0; i < N; i++) {
      probe.time = i / N * D;
      mixer.update(0);
      J.model.updateMatrixWorld(true);
      for (const [k, b] of Object.entries(PAW)) {
        const y = J.model.getObjectByName(b).getWorldPosition(new THREE.Vector3()).y;
        if (!(k in low) || y < low[k].y) low[k] = { y, p: i / N };
      }
    }
    for (const k of Object.keys(PAW)) inherent[k] = low[k].p;
  }

  // gallop phase (0 = this foot lands) -> walk phase relative to its landing,
  // the stance squeezed from 65% to 36% of the cycle
  const warp = (p) => (p < STANCE_RUN ? p / STANCE_RUN * STANCE_WALK
    : STANCE_WALK + (p - STANCE_RUN) / (1 - STANCE_RUN) * (1 - STANCE_WALK));
  const wrap = (x) => x - Math.floor(x);

  let w = 0, phase = 0;
  const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _q = new THREE.Quaternion();
  return {
    get weight() { return w; },
    // distance travelled this frame (m), speed (m/s), target 0 walk .. 1 run
    apply({ walkTime, step, speed, dt, run }) {
      w += (run - w) * Math.min(1, dt * 2.2);
      if (w < 0.01) { w = 0; return { lift: 0, pitch: 0 }; }   // jaguar.js's own walk stands
      // one gallop cycle per walk stride's worth of ground: the legs cycle
      // exactly 2x / 3x as fast as the walk at 2x / 3x (follow.js SPEEDS). A
      // ~1.9 m stride had them at 2.5x / 3.7x the walk's cadence — frantic
      phase = wrap(phase + step / walkStride);
      // the frame jaguar.js's pose() shows (its walk plays the clip's own
      // loop, not the raw clip from 0), so blending in the gallop does not pop
      walkAct.time = J.clipTimeAt ? J.clipTimeAt(walkTime) : walkTime % D;
      walkAct.setEffectiveWeight(1 - w);
      for (const k of ['HL', 'HR', 'FL', 'FR']) {
        const p = wrap(phase - GALLOP[k]);
        act[k].time = wrap(inherent[k] + warp(p)) * D;
        act[k].setEffectiveWeight(w);
      }
      // the body: spine and tail through the walk's own motion, quickened
      act.BODY.time = wrap(phase) * D;
      act.BODY.setEffectiveWeight(w);
      mixer.update(0);
      // the run's whole-body motion: one airborne lift per stride (after the
      // front feet push off), the body pitching nose-down onto the forefeet
      const s = Math.sin(2 * Math.PI * (phase - 0.72));
      return { lift: w * Math.max(0, s) * 0.11 * Math.min(1, speed / 8),
        pitch: w * Math.sin(2 * Math.PI * (phase - 0.3)) * 0.07 };
    },
    applyRoot(root, { lift, pitch }) {
      if (!lift && !pitch) return;
      root.position.y += lift;
      _q.setFromEuler(_e.set(pitch, 0, 0));
      root.quaternion.multiply(_q);
      root.updateMatrixWorld(true);
    },
  };
}
