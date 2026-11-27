import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// (the Amazon viewer's sun/cloud/fog shader hooks are not needed on the whiteboard)
const prepareSunMaterial = () => {};

// One animated jaguar (assets/external-animals/jaguar.glb, staged to
// tiles/lib/animals/), posed explicitly each frame so an offline render
// (movie/shotMamiraua.mjs) is deterministic: pose({ x, z, heading, time }).
//
// The GLB's walk clips ('Action', 30 s, and '...#1.001', 11.8 s: the same leg
// cycle, the second with body bob, a sniff and a crouch) walk IN PLACE: the
// body stays at the origin and each planted paw slides backwards under it.
// The other two original clips are posed for the unscaled rest rig (the bind
// pose is ~0.15 m long; the walk clips' bone scales bring it to ~1.7 m) and
// are unused. A GLB that also carries 'Run', 'Jump' and 'Idle' (retargeted
// from BPoole's smilodon, CC BY 4.0, on the jaguar-seasons branch) can load
// them alongside the main clip: clips: { key: name }, and pose() plays one by
// its key or crossfades two.
//
// THE LEFT FORE PAW: the walk clips key the left fore leg 33 degrees off its
// mirrored partner (the paw tips down and the wrist rides 1.5 cm low, so it
// read as stopping short and slipped). assets/external-animals/
// rekey_jaguar.py fixes that in the GLB itself; run it after repair_jaguar.py.
//
// NO SLIDING: the forward travel is extracted from the clip itself. At load,
// the clip is sampled and, frame to frame, the body advances by however far
// the planted paws moved backwards (contact = a paw's marker bone within a few
// mm of its lowest height in that stance: the lowest within a half stride
// either side, not in the whole cycle, as the loop's drift ramp and the clip's
// own stride-to-stride variation shift a stance's floor by several mm, and a
// stance that missed a cycle-wide band never latched). travel(time) is that
// integral, so a planted paw stays put on the ground to within the sampling —
// including where the clip's own stride speeds up and slows down — rather
// than skating under a constant-speed body.
//
// FEET ON THE GROUND: the clip assumes flat ground at y = 0. The body is
// stood on the DRAWN TIN (terrain.surfaceAt, as groundcover plants on it, not
// height.bin) by sampling the ground under the four paws' rest stations:
// height = their mean, pitch from hind-to-front, roll from left-to-right. The
// paws then land on the plane through those four points; groundResidual()
// reports how far the real surface strays from that plane under each paw,
// which on this forest floor is millimetres (see the shot script's log).

// marker bones: planted paws hold these still (hind toes, front wrists)
const PAWS = [
  { bone: 'Toes1_L', front: false, side: 1 },
  { bone: 'Toes1_R', front: false, side: -1 },
  { bone: 'Wrist_L', front: true, side: 1 },
  { bone: 'Wrist_R', front: true, side: -1 },
];
const CONTACT_EPS = 0.004;   // m above the stance's lowest marker height
const FLOOR_WINDOW = 1.0;    // s either side for a stance's floor: about half a stride
const PLANTED_RISE = 0.06;   // m: a clip whose paws all stay this close to their lowest is standing
const SAMPLE_HZ = 120;
// url|clip -> the clip's loop and sampled tables (analyse below), once per
// GLB and clip: a second cat (wildlife/otherJaguar.js, the cubs, the resting
// pair) reuses the first one's. The loop search and the sampling pose the
// skinned model a few thousand times and took ~2 s of one frame. Bones are
// kept by NAME, each cat binding its own.
const CALIB = new Map();
// LOOP: neither walk clip closes on itself. The 11.8 s clip is 5.5 strides
// long, so its last frame has the legs half a stride from its first (the
// hind paws swapped: a plain loop, or a crossfade across the clip's ends,
// puts both hind paws down together once a cycle, a double tap), and its
// head is 24 degrees from where it started. At load the clip's own loop is
// found: the leg bones are sampled over the clip, and the period and start
// are chosen where the legs at the start and one period later agree best,
// the longest such period within tolerance (the 11.8 s clip: 5 strides,
// [1.0, 11.67] s, legs 3 degrees apart). What still differs between the
// loop's two ends (the head's slow turn, a degree or two in the legs) is
// DRIFT: each bone's difference is taken as a linear ramp over the loop and
// subtracted, so the loop closes exactly on every bone and nothing is
// crossfaded.
const LOOP_HZ = 60;
const LEG_BONE = /Hip|Knee|Ankle|Toes1|Shoulder|Elbow|Wrist|Scapula/;
const IDENT = new THREE.Quaternion();

// the loop [start, start + period] of a clip, from its leg bones' rotations:
// setRaw(t) poses the rig at raw clip time t
function findLoop(setRaw, legs, D) {
  const n = Math.floor(D * LOOP_HZ) + 1, L = legs.length;
  const q = new Float32Array(n * L * 4);
  for (let i = 0; i < n; i++) {
    setRaw(Math.min(i / LOOP_HZ, D));
    legs.forEach((b, k) => b.quaternion.toArray(q, (i * L + k) * 4));
  }
  const diff = (i, j) => {   // the worst leg bone's angle between two samples
    let worst = 0;
    for (let k = 0; k < L; k++) {
      const a = (i * L + k) * 4, b = (j * L + k) * 4;
      const d = Math.abs(q[a] * q[b] + q[a + 1] * q[b + 1] + q[a + 2] * q[b + 2] + q[a + 3] * q[b + 3]);
      worst = Math.max(worst, 2 * Math.acos(Math.min(1, d)));
    }
    return worst;
  };
  // for every period from half the clip up, the start where the legs agree best
  const best = [];
  for (let iT = Math.round(n * 0.5); iT < n; iT++) {
    let w = Infinity, i0 = 0;
    for (let i = 0; i + iT < n; i++) { const d = diff(i, i + iT); if (d < w) { w = d; i0 = i; } }
    best.push({ iT, i0, w });
  }
  const floor = Math.min(...best.map((b) => b.w));
  const tol = Math.max(floor * 2, 5 * Math.PI / 180);
  // the longest period that is a local minimum within tolerance
  let pick = null;
  for (let k = 0; k < best.length; k++) {
    const b = best[k];
    if (b.w > tol) continue;
    const lo = k > 0 ? best[k - 1].w : Infinity, hi = k < best.length - 1 ? best[k + 1].w : Infinity;
    if (b.w <= lo && b.w <= hi) pick = b;
  }
  // a clip that never repeats (a jump): the whole of it
  pick ??= { i0: 0, iT: n - 1, w: diff(0, n - 1) };
  return { start: pick.i0 / LOOP_HZ, period: pick.iT / LOOP_HZ, legsDeg: pick.w * 180 / Math.PI };
}
// FOOT LOCK (footIk): whatever the body does, a planted paw stays where it
// came down. When the clip puts a paw in contact its world position is
// taken, the ground sampled under it, and that point held as the target of
// an IK chain up the leg (three's CCD solver: ankle, knee, hip for a hind
// leg; elbow, shoulder for a fore leg) until the clip lifts the paw, when
// the chain eases back to the clip's own pose over RELEASE s. The leg
// stretches through whatever the body carried past the clip's travel and
// over the ground's departures from the four-paw plane. The solver wants its
// targets in the skeleton: four bones are appended and the meshes rebound.
const TILT_EASE = 0.1;   // s: the body's pitch and roll follow the ground this smoothly
const RELEASE = 0.25;   // s (0.12 snapped a paw held far from the clip's place back in 3 frames)

// A BLACK (melanistic) COAT — setBlack(true): the coat material's base colour
// swapped for a texture of its own on the same UV layout (a darkened spotted
// coat reads as a spotted cat in shadow, not as a black jaguar). Made by
// assets/external-animals/make_black_jaguar.py: a near-uniform warm
// brown-black with the painted fur strands kept at low contrast, the rosettes
// only a shade darker and duller (a roughnessMap: glossy fur between them), as
// they show on a real black jaguar in sun. The eyes keep their gold, the
// tongue its pink (neither is on this texture). Loaded once, shared by every
// cat; each cat's materials are its own (the GLB is parsed anew per
// createJaguar), so one cat's coat never changes another's.
const BLACK_COAT = { map: './lib/animals/jaguar_black.jpg', rough: './lib/animals/jaguar_black_rough.jpg' };
let blackCoat = null;   // promise of { map, rough }
function loadBlackCoat() {
  if (!blackCoat) {
    const L = new THREE.TextureLoader();
    blackCoat = Promise.all([L.loadAsync(BLACK_COAT.map), L.loadAsync(BLACK_COAT.rough)]).then(([map, rough]) => {
      for (const t of [map, rough]) { t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; }   // glTF UVs
      map.colorSpace = THREE.SRGBColorSpace;
      return { map, rough };
    });
  }
  return blackCoat;
}

// castShadow: false keeps the cat out of the cached sun shadow map (no
// per-frame shadow re-render of the whole forest while it walks; the live
// intro passes false and draws a contact shadow of its own). It still
// receives the forest's shadows. The offline movie keeps the default.
// tint: multiplies the spotted coat (a cub: a shade paler and warmer).
// clips: { key: name } further motions (above); footIk: the foot lock.
export async function createJaguar(viewer, {
  url = './lib/animals/jaguar.glb', clip = 'Action', clips = {}, scale = 1, footIk = false,
  castShadow = true, tint = null,
} = {}) {
  const { scene, world, terrain, env } = viewer;
  const [gltf, blackTex] = await Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url), loadBlackCoat()]);
  const model = gltf.scene;
  const anim = gltf.animations.find((a) => a.name === clip);
  if (!anim) throw new Error(`jaguar: no clip '${clip}' (has ${gltf.animations.map((a) => a.name).join(', ')})`);

  const prepared = new Set();   // meshes share materials (the eyes): wrap each once
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material;
    // EXPORT FIXES (the GLB is left as it is):
    // - the coat's normalTexture is the SAME jpeg as its base colour (an
    //   Arnold aiStandardSurface that lost its normal map on the way out):
    //   fur colours read as normals bend the shading at random and pick up
    //   the canopy's green sky light in blotches. No normal map instead.
    if (mat.normalMap && mat.map && mat.normalMap.source === mat.map.source) mat.normalMap = null;
    // - the eyes paint iris and pupil in their SECOND vertex-colour set
    //   (COLOR_1); three only reads COLOR_0, which is white on every mesh, so
    //   the eye drew as a flat orange cap. Draw it with COLOR_1. Roughness 0
    //   makes the sun's highlight a delta the bloom smears over the pupil:
    //   a little roughness keeps it a wet glint.
    if (mat.name === 'Ojos' && o.geometry.getAttribute('color_1')) {
      o.geometry.setAttribute('color', o.geometry.getAttribute('color_1'));
      mat.vertexColors = true;
      mat.roughness = Math.max(mat.roughness, 0.25);
    }
    o.castShadow = castShadow;
    o.receiveShadow = true;
    // the bounding sphere is the tiny bind pose's; the walk scales the bones
    // up ~12x, so culling against it would drop the cat at the frame edge
    o.frustumCulled = false;
    // (no edge-vine bark painting: that is for trees)
    if (!prepared.has(o.material)) prepareSunMaterial(o.material, { vine: false });
    prepared.add(o.material);
  });

  // the coat: the fur material (not the eyes, not the tongue), and its own
  // base colour / roughness to restore
  const coats = [];
  for (const m of prepared) if (m.map && m.name !== 'Ojos' && m.name !== 'Lengua')
    coats.push({ m, map: m.map, roughnessMap: m.roughnessMap, c: m.color.clone(), r: m.roughness });
  if (tint) for (const k of coats) { k.c.multiply(tint); k.m.color.copy(k.c); }
  let black = false;
  function setBlack(on) {
    black = !!on;
    for (const k of coats) {
      const { m } = k;
      if (black) {
        blackTex.map.anisotropy = blackTex.rough.anisotropy = k.map.anisotropy;
        m.map = blackTex.map; m.roughnessMap = blackTex.rough; m.color.setRGB(1, 1, 1); m.roughness = 1;
      } else { m.map = k.map; m.roughnessMap = k.roughnessMap; m.color.copy(k.c); m.roughness = k.r; }
      m.needsUpdate = true;   // roughnessMap on/off changes the program
    }
  }

  const bones = {}, allBones = [];
  model.traverse((o) => { if (o.isBone) { bones[o.name] = o; allBones.push(o); } });
  for (const p of PAWS) if (!bones[p.bone]) throw new Error(`jaguar: no bone ${p.bone}`);

  // CLIPS ARE SAMPLED, not mixed: each track's interpolant writes its bone
  // every time. (three's mixer rewrites a bone only when its value changed
  // since its own last write, so code that poses bones over the clip — the
  // raised head, the climb, the lying poses — piled up on its own last frame
  // whenever the clip time stood still, and with more than one clip on the
  // rig a clip could leave a bone where another put it)
  function samplerOf(a) {
    const binds = [];
    for (const tr of a.tracks) {
      const dot = tr.name.lastIndexOf('.');
      const node = model.getObjectByName(tr.name.slice(0, dot)), prop = tr.name.slice(dot + 1);
      if (!node || !['quaternion', 'position', 'scale'].includes(prop)) continue;
      binds.push({ target: node[prop], interp: tr.createInterpolant() });
    }
    return (t) => { for (const b of binds) b.target.fromArray(b.interp.evaluate(t)); };
  }

  // MOTIONS: the main clip, and any others asked for (clips: { key: name }),
  // each with its own loop, drift, contacts and travel (analyse below).
  // pose() plays one, or crossfades two
  const motions = { main: analyse(anim) };
  for (const [key, name] of Object.entries(clips)) {
    const a = gltf.animations.find((x) => x.name === name);
    if (!a) throw new Error(`jaguar: no clip '${name}'`);
    motions[key] = analyse(a);
  }
  const M0 = motions.main;
  const { L0, P, legsDeg, drift, evalRaw, n, marks, floorAt, floorOf, contact, perLoop } = M0;
  const station = M0.station, padY = M0.padY;
  const frontZ = (station[2][1] + station[3][1]) / 2, hindZ = (station[0][1] + station[1][1]) / 2;
  const halfW = (Math.abs(station[0][0] - station[1][0]) + Math.abs(station[2][0] - station[3][0])) / 4;

  function analyse(anim) {
    const D = anim.duration;
    const sample = samplerOf(anim);
    const setRaw = (t) => sample(Math.max(0, Math.min(t, D)));
    const _dq = new THREE.Quaternion();
    // the rig at loop phase ph (0 .. P): the clip, less the drift so far (the
    // sampler rewrites every keyed bone, so the drift added at the last phase
    // never stacks)
    const phaseSetter = (L0, P, drift) => (ph) => {
      setRaw(L0 + ph);
      const u = ph / P;
      for (const d of drift) {
        d.bone.quaternion.multiply(_dq.slerpQuaternions(IDENT, d.dq, u));
        d.bone.position.addScaledVector(d.dp, u);
        d.bone.scale.addScaledVector(d.ds, u);
      }
    };

    const key = url + '|' + anim.name;
    let cal = CALIB.get(key);
    if (!cal) {
      // --- the loop (LOOP above) ----------------------------------------------
      const { start: L0, period: P, legsDeg } = findLoop(setRaw, allBones.filter((b) => LEG_BONE.test(b.name)), D);
      console.info(`jaguar: '${anim.name}' loops [${L0.toFixed(3)}, ${(L0 + P).toFixed(3)}] of ${D.toFixed(3)} s (legs ${legsDeg.toFixed(1)} deg apart at the seam)`);
      // the drift: what each bone is at the loop's end that it was not at its start
      setRaw(L0);
      const atStart = allBones.map((b) => ({ q: b.quaternion.clone(), p: b.position.clone(), s: b.scale.clone() }));
      setRaw(L0 + P);
      const drift = [];
      allBones.forEach((b, k) => {
        const a = atStart[k];
        const dq = b.quaternion.clone().invert().multiply(a.q);   // end * dq = start
        const dp = a.p.clone().sub(b.position), ds = a.s.clone().sub(b.scale);
        if (1 - Math.abs(dq.w) < 1e-7 && dp.lengthSq() < 1e-10 && ds.lengthSq() < 1e-10) return;
        drift.push({ bone: b, dq, dp, ds });
      });
      const setPhase = phaseSetter(L0, P, drift);

      // --- sample the loop once: paw markers in model space (unscaled) --------
      const n = Math.round(P * SAMPLE_HZ) + 1;
      const _v = new THREE.Vector3();
      const marks = PAWS.map(() => new Float32Array(n * 3));
      const lowest = new Float32Array(n);   // lowest skinned vertex, per sample (sparse)
      const box = new THREE.Box3();
      const s0 = model.scale.x;
      model.scale.setScalar(1);
      for (let i = 0; i < n; i++) {
        setPhase(Math.min(i / SAMPLE_HZ, P));
        model.updateMatrixWorld(true);
        PAWS.forEach((p, k) => {
          bones[p.bone].getWorldPosition(_v);
          marks[k].set([_v.x, _v.y, _v.z], i * 3);
        });
        lowest[i] = i % 6 === 0 ? box.setFromObject(model, true).min.y : NaN;
      }
      model.scale.setScalar(s0);
      const floorOf = marks.map((m) => { let lo = Infinity; for (let i = 0; i < n; i++) lo = Math.min(lo, m[i * 3 + 1]); return lo; });
      // each sample's local floor: the lowest marker height within FLOOR_WINDOW
      // either side, round the loop
      const W = Math.round(FLOOR_WINDOW * SAMPLE_HZ);
      const floorAt = marks.map((m) => Float32Array.from({ length: n }, (_, i) => {
        let lo = Infinity;
        for (let d = -W; d <= W; d++) lo = Math.min(lo, m[(((i + d) % n) + n) % n * 3 + 1]);
        return lo;
      }));
      // a STANDING clip (every paw within PLANTED_RISE of its lowest all loop
      // long: an Idle) has its paws down throughout, at their lowest: its
      // contact test would otherwise flip on a paw's few cm of shuffle, and the
      // foot lock would let go and grab again, a paw sliding each time
      const planted = marks.every((m) => {
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < n; i++) { lo = Math.min(lo, m[i * 3 + 1]); hi = Math.max(hi, m[i * 3 + 1]); }
        return hi - lo < PLANTED_RISE;
      });
      if (planted) floorAt.forEach((f, k) => f.fill(floorOf[k]));
      const down = planted ? () => true : (k, i) => marks[k][i * 3 + 1] < floorAt[k][i] + CONTACT_EPS;

      // travel table: forward (+z, the way the model faces) distance at each sample
      const travel = new Float32Array(n);
      let lastStep = 0;
      for (let i = 1; i < n; i++) {
        let sum = 0, cnt = 0;
        for (let k = 0; k < PAWS.length; k++) {
          if (!down(k, i) || !down(k, i - 1)) continue;
          sum += marks[k][(i - 1) * 3 + 2] - marks[k][i * 3 + 2];
          cnt++;
        }
        const step = cnt ? sum / cnt : lastStep;   // airborne: carry the last step
        travel[i] = travel[i - 1] + step;
        lastStep = step;
      }

      // ground offset: the model's lowest point in a typical frame is its pads on
      // the clip's floor; the median over the cycle ignores the odd claw tip
      const lows = [...lowest].filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
      const padY = lows[Math.floor(lows.length / 2)];

      // rest stations of the four paws (cycle means), for the ground plane
      const stationRaw = marks.map((m) => {
        let x = 0, z = 0;
        for (let i = 0; i < n; i++) { x += m[i * 3]; z += m[i * 3 + 2]; }
        return [x / n, z / n];
      });
      cal = { D, L0, P, legsDeg, n, marks, floorAt, floorOf, planted, travel, perLoop: travel[n - 1], padY, stationRaw,
        drift: drift.map(({ bone, dq, dp, ds }) => ({ name: bone.name, dq, dp, ds })) };
      CALIB.set(key, cal);
    }

    // this cat's bones and scale over the shared tables
    const { L0, P, legsDeg, n, marks, floorAt, floorOf, planted, travel, perLoop, padY } = cal;
    const drift = cal.drift.filter((d) => bones[d.name]).map((d) => ({ ...d, bone: bones[d.name] }));
    const setPhase = phaseSetter(L0, P, drift);
    const contact = planted ? () => true : (k, i) => marks[k][i * 3 + 1] < floorAt[k][i] + CONTACT_EPS;
    const station = cal.stationRaw.map(([x, z]) => [x * scale, z * scale]);
    const travelAt = (time) => {
      const loops = Math.floor(time / P), ph = time - loops * P;
      const u = Math.max(0, ph) * SAMPLE_HZ;
      const i = Math.min(Math.floor(u), n - 2), f = u - i;
      return (loops * perLoop + travel[i] + (travel[i + 1] - travel[i]) * f) * scale;
    };
    return { name: anim.name, D, L0, P, legsDeg, drift, evalRaw: setRaw, setPhase, n, marks, floorAt, floorOf,
      contact, planted, perLoop, padY, station, travelAt, perCycle: perLoop * scale, speed: perLoop * scale / P };
  }

  // --- placement -----------------------------------------------------------------
  const root = new THREE.Group();   // world placement; model is the clip's space
  root.name = 'jaguar';
  model.scale.setScalar(scale);
  model.position.y = -padY * scale;
  root.add(model);
  root.visible = false;
  scene.add(root);
  // warm-blooded: the thermal camera filter picks it out (cameraFilter.js)
  viewer.post?.filter?.addHot(root);

  const ex = () => world.exaggeration;
  const groundAt = (x, z) => (terrain.surfaceAt?.(x, z) ?? world.sampleElevation(x, z)) * ex();
  // the ground the BODY is stood on (terrain.bodyAt, default the same): where
  // a terrain's surfaceAt includes fallen wood, a paw station passing over a
  // branch tipped the whole body 12 degrees in a frame; the body takes the
  // bare ground
  const bodyAt = terrain.bodyAt ? (x, z) => terrain.bodyAt(x, z) * ex() : groundAt;

  const travelAt = M0.travelAt;

  // world xz of a model-space station, for a body at (x, z) facing `heading`
  // (radians, 0 = +z i.e. south, the model's own forward)
  const toWorld = (x, z, heading, sx, sz) => {
    const c = Math.cos(heading), s = Math.sin(heading);
    return [x + sx * c + sz * s, z - sx * s + sz * c];
  };

  const _e = new THREE.Euler(0, 0, 0, 'YXZ');
  // the ground under each paw station, the plane the body is stood on, and the
  // residual per paw (metres: + ground above the plane, - below)
  function standOn(x, z, heading) {
    const g = station.map(([sx, sz]) => bodyAt(...toWorld(x, z, heading, sx, sz)));
    const hind = (g[0] + g[1]) / 2, front = (g[2] + g[3]) / 2;
    const left = (g[0] + g[2]) / 2, right = (g[1] + g[3]) / 2;
    const pitch = Math.atan2(hind - front, frontZ - hindZ);   // + nose down
    const roll = Math.atan2(left - right, 2 * halfW);
    // centre height at the body origin, interpolated along the wheelbase
    const y = hind + (front - hind) * (0 - hindZ) / (frontZ - hindZ);
    const plane = station.map(([sx, sz]) =>
      y + (front - hind) * sz / (frontZ - hindZ) + (left - right) * sx / (2 * halfW));
    return { y, pitch, roll, residual: g.map((v, k) => v - plane[k]) };
  }

  // --- foot lock --------------------------------------------------------------------
  function setupFootIk() {
    const skinned = [];
    model.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
    if (!skinned.length) return null;
    const skel = skinned[0].skeleton;
    const targets = PAWS.map((p) => { const b = new THREE.Bone(); b.name = 'IK_' + p.bone; root.add(b); return b; });
    const all = new THREE.Skeleton([...skel.bones, ...targets],
      [...skel.boneInverses.map((m) => m.clone()), ...targets.map(() => new THREE.Matrix4())]);
    for (const m of skinned) m.bind(all, m.bindMatrix);
    const idx = (name) => all.bones.findIndex((b) => b.name === name);
    const chains = PAWS.map((p, k) => {
      const side = p.side > 0 ? '_L' : '_R';
      const links = (p.front ? ['Elbow', 'Shoulder'] : ['Ankle', 'Knee', 'Hip']).map((nm) => ({ index: idx(nm + side) }));
      if (links.some((l) => l.index < 0)) throw new Error(`jaguar: no IK chain for ${p.bone}`);
      // gentle: the targets sit near the clip's own pose, so small steps reach them
      return { target: skel.bones.length + k, effector: idx(p.bone), links, iteration: 4, maxAngle: 0.08, blendFactor: 0 };
    });
    const solver = new CCDIKSolver(skinned[0], chains);
    const state = PAWS.map(() => ({ locked: false, release: 0, pos: new THREE.Vector3() }));
    return { solver, chains, targets, state };
  }
  const ik = footIk ? setupFootIk() : null;
  const _w = new THREE.Vector3();
  let ikLast = null;
  const freePaws = () => {
    if (!ik) return;
    for (const st of ik.state) { st.locked = false; st.release = 0; }
    for (const ch of ik.chains) ch.blendFactor = 0;
  };
  // a jump in the walk clock (a film seek, a cat re-placed, back from a
  // rest or a climb that posed it on its own clock): a held paw would be
  // somewhere the cat no longer is, so every hold is dropped first
  const IK_GAP = 0.6;   // s of clip time
  function stepFootIk(ph, time, lock, M) {
    const { n, contact, floorAt, padY } = M;
    if (ikLast != null && (time < ikLast - 1e-4 || time - ikLast > IK_GAP)) { freePaws(); ikLast = null; }
    const dt = ikLast == null ? 0 : Math.max(0, time - ikLast);
    ikLast = time;
    if (lock <= 0) { freePaws(); return; }   // the paws free (a turn, a gallop, a pose): drop every hold
    // the clip's contact at this phase
    const i = Math.min(n - 1, Math.round(ph * SAMPLE_HZ));
    PAWS.forEach((p, k) => {
      const st = ik.state[k], ch = ik.chains[k];
      bones[p.bone].getWorldPosition(_w);     // the clip's paw, after the sampler
      const down = contact(k, i);
      if (down && !st.locked) {
        st.locked = true;
        // the marker's height over its pad when the pad is on the ground
        st.pos.set(_w.x, groundAt(_w.x, _w.z) + (floorAt[k][i] - padY) * scale, _w.z);
      } else if (!down && st.locked) {
        st.locked = false;
        st.release = RELEASE;
      }
      let blend = 0;
      if (st.locked) blend = 1;
      else if (st.release > 0) { blend = st.release / RELEASE; st.release -= dt; }
      blend *= lock;
      ch.blendFactor = blend;
      if (blend <= 0) return;
      ik.targets[k].position.copy(root.worldToLocal(_w.copy(st.pos)));
      ik.targets[k].updateMatrixWorld(true);
      ik.solver.updateOne(ch);
    });
  }

  let last = null;
  // the foot lock's weight, eased (easeLock below)
  let lockW = 0;
  const LOCK_EASE = 0.2;   // s for the lock to come on or let go
  // the crossfade: the first motion's pose held while the second is sampled
  const held = allBones.map(() => ({ q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }));
  const phaseOf = (M, time) => ((time % M.P) + M.P) % M.P;
  const _qb = new THREE.Quaternion();
  return {
    root, model, clip: anim.name, duration: P, footIk: !!ik, paws: PAWS.map((p) => p.bone),
    // every clip of the GLB, for a gait built over the walk (intro/gait.js)
    animations: gltf.animations,
    perCycle: perLoop * scale, speed: perLoop * scale / P,
    padY: padY, stations: station, groundAt, travelAt, standOn,
    // the RAW clip time pose() shows for this time (the loop's start plus the
    // phase): for code that samples the clip itself (intro/gait.js), so its
    // walk lines up with this one
    clipTimeAt: (time, motion = 'main') => { const M = motions[motion] ?? M0; return M.L0 + phaseOf(M, time); },
    // each motion's loop and travel: { key: { clip, duration, speed, perCycle, travelAt } }
    motions: Object.fromEntries(Object.entries(motions).map(([k, M]) => [k,
      { clip: M.name, duration: M.P, speed: M.speed, perCycle: M.perCycle, travelAt: M.travelAt }])),
    // pose the cat for this frame. time = clip seconds; (x, z) the body origin
    // on the ground, heading as toWorld
    // lock: the foot lock's weight this frame (0 frees the paws, for a turn)
    // motion: which clip (a key of motions, 'main' by default); blend:
    // { motion, time, w } crossfades to another, w of it, bone by bone
    // dt: see the tilt easing below (0 = none)
    pose({ x, z, heading, time, visible = true, lock = 1, motion = 'main', blend = null, dt = 0 }) {
      root.visible = visible;
      if (!visible) { freePaws(); ikLast = null; lockW = 0; return; }
      const M = motions[motion] ?? M0;
      const ph = phaseOf(M, time);
      M.setPhase(ph);
      let pad = M.padY, Mc = M, phc = ph;
      if (blend && blend.w > 0 && motions[blend.motion]) {
        const B = motions[blend.motion], w = Math.min(1, blend.w);
        allBones.forEach((b, k) => { held[k].q.copy(b.quaternion); held[k].p.copy(b.position); held[k].s.copy(b.scale); });
        const phB = phaseOf(B, blend.time);
        B.setPhase(phB);
        allBones.forEach((b, k) => {
          // (slerpQuaternions copies its first argument into the target
          // first, so the second must not be the target itself)
          b.quaternion.slerpQuaternions(held[k].q, _qb.copy(b.quaternion), w);
          b.position.lerpVectors(held[k].p, b.position, w);
          b.scale.lerpVectors(held[k].s, b.scale, w);
        });
        pad += (B.padY - M.padY) * w;
        // the lock reads the stronger one's contacts, but the incoming one's
        // from the start where either is a standing clip: into it, so a paw
        // the walk had just lifted is not let go and grabbed again by the
        // standing clip's a frame later (a snap); out of it, so the leg the
        // walk swings is not held where the stand had it until halfway, and
        // then flung forward
        if (w > 0.5 || B.planted || M.planted) { Mc = B; phc = phB; }
      }
      model.position.y = -pad * scale;
      const s = standOn(x, z, heading);
      // dt (s, film; given by a caller that steps frame by frame): pitch and
      // roll eased over TILT_EASE so a bump under one paw station rocks the
      // body rather than jolting it; the height is not (it would lag the
      // body behind the ground on a slope at a run)
      if (dt > 0 && last) {
        const k = Math.min(1, dt / TILT_EASE);
        s.pitch = last.pitch + (s.pitch - last.pitch) * k;
        s.roll = last.roll + (s.roll - last.roll) * k;
      }
      root.position.set(x, s.y, z);
      // +x is the cat's left: a positive z turn lifts it
      _e.set(s.pitch, heading, s.roll);
      root.quaternion.setFromEuler(_e);
      root.updateMatrixWorld(true);
      if (ik) stepFootIk(phc, time, lock, Mc);
      last = s;
      // the shadow map is cached (viewer.js autoUpdate off): a moving caster
      // has to ask for its shadow to be redrawn
      if (castShadow) env.requestShadowUpdate?.();
    },
    groundResidual: () => last?.residual ?? null,
    // the foot lock's weight for this frame, eased toward `on` (true: a plain
    // walk on the ground; false: a gallop, a swim, a rest, a climb, a pose
    // that moves the legs) over LOCK_EASE: pass it as pose({ lock }). 0 when
    // the cat has no foot lock
    easeLock(on, dt) {
      if (!ik) return 0;
      lockW += ((on ? 1 : 0) - lockW) * (dt > 0 ? Math.min(1, dt / LOCK_EASE) : 0);
      return lockW < 0.02 ? 0 : lockW;
    },
    setBlack, get black() { return black; },
    // which paws the foot lock holds this frame, in PAWS order (for probes)
    lockState: () => ik?.state.map((st) => st.locked) ?? null,
    // the contact table the lock reads: per paw, the marker's height over the
    // loop (model space, SAMPLE_HZ) and its floor (for probes)
    contactTable: () => ({ hz: SAMPLE_HZ, eps: CONTACT_EPS, paws: PAWS.map((p, k) => ({
      bone: p.bone, floor: floorOf[k], y: Array.from({ length: n }, (_, i) => marks[k][i * 3 + 1]),
      floorAt: Array.from(floorAt[k]), contact: Array.from({ length: n }, (_, i) => contact(k, i)) })) }),
    // the raw clip at time t: no loop, no drift removed (for probes)
    rawPose(t) { evalRaw(t); model.updateMatrixWorld(true); },
    loop: { start: L0, period: P, raw: M0.D, legsDeg, drifted: drift.length },
    dispose() { scene.remove(root); viewer.post?.filter?.removeHot(root); },
  };
}
