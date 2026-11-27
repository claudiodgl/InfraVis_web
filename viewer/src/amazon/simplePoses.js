import * as THREE from 'three';

// SIMPLE POSES, set bone by bone by AIMING each bone of a chain (from the
// shoulder / hip down) at a direction: each bone is turned once, by the
// shortest arc, so the next joint lies the way asked (the uakari's rig does
// the same). No walk cycle under them, no measured signs, no accumulated
// turns: nothing can spin.
//
// On a branch (apply), in its frame (x the cat's left, y up, z along the
// branch the way the cat faces; what hangs, hangs straight down):
//   'sit'  A: sitting on the branch as a cat sits on the floor — haunches
//          down on it, the hind legs folded under (thigh forward, shin
//          back), the forelegs straight down in front onto the branch, the
//          chest up, the head up; the tail hanging down
//   'lie'  B: lying relaxed along the branch (the reference drawing): chest
//          and belly ON it, both forelegs hanging free either side, the hind
//          legs dangling, the neck and head forward and down, the chin on the
//          branch; the tail off to one SIDE of the branch and hanging straight
//          down; legs and tail sway a little, slowly, out of step
// The body follows the branch's slope (at.slope: rise per metre ahead).
//
// FIXED poses for the climb and the leap (fixed): 'cling' (up a trunk: the
// forelegs held open round it, the hind legs bunched or pushing), 'leap'
// (crouched .. stretched), 'land'.
//
// P (the lab's sliders; defaults DEFAULTS): bodyY (m: the body up or down
// off the branch, + up), legDroop (0 straight down .. 1 forward/out), headPitch
// (rad, + up), tailDroop (0 back along the branch .. 1 straight down), sitPitch
// (rad: how upright the chest sits), tailSide (+1 the cat's left, -1 right).

export const DEFAULTS = {
  // (foreCurl / hindCurl: deg the paw / the hind foot is turned forward from
  // hanging straight down; fore/hindSwayA, F: the legs' swing, amplitude and speed)
  lie: { bodyY: 0, legDroop: 0.15, headPitch: 0.05, tailDroop: 1, sitPitch: 0, tailSide: -1,
    foreCurl: 19, hindCurl: 14, foreSwayA: 0.09, foreSwayF: 1.7, hindSwayA: 0.06, hindSwayF: 0.75,
    // the forepaws curling and uncurling, forever: curlMin..curlMax deg, a
    // cycle every curlPeriod s (0: held at foreCurl), the two out of step
    curlMin: -15, curlMax: 45, curlPeriod: 3.5,
    // ...and the hind feet the same way, gentler: hindCurlMin..Max, same period
    hindCurlMin: 0, hindCurlMax: 20,
    // the TAIL while lying: sideways sway (amplitude, speed), a fore-aft swing
    // of the hanging part, and the tip's curl (0 straight .. 1 hooked up, a J)
    // with a slow curl loop (tailCurlPeriod s; 0 = held)
    neckPitch: -0.79, neckYaw: -0.16, headYaw: 0,   // (the user's choice, with headPitch 0.05)
    tailLow: 0.4,
    tailOut: 0.5,   // how far to the side the tail's root swings off the body (0 .. 1.5)
    tailHang: 0.56,  // and where the hanging part hangs, sideways (−1 .. 1, × the side)   // the tail's root part: how steeply it drops off the rump (0 level .. 2 steep)
    tailSwayA: 0.04, tailSwayF: 0.75, tailSwingA: 0.06, tailCurl: 0, tailCurlLoop: 0.4, tailCurlPeriod: 3.5 },   // (the user's choice, 2026-11-01)
  sit: { bodyY: 0, legDroop: 0, headPitch: 0.45, tailDroop: 1, sitPitch: 0.75, tailSide: -1 },
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createSimplePoses(J) {
  const b = (n) => J.model.getObjectByName(n);
  const B = {
    root: b('Root_M'), spine1: b('Spine1_M'), spine2: b('Spine2_M'), spine3: b('Spine3_M'), chest: b('Chest_M'),
    neck: b('Neck_M'), neck1: b('Neck1_M'), neck2: b('Neck2_M'), head: b('Head_M'),
    headEnd: b('Nose_M'), jawEnd: b('JawEnd_M'),   // (the nose: the head aims it; the jaw's tip: the chin)
  };
  const ears = [b('Ear1_L'), b('Ear4_R')];
  // (their pose in the walk clip — its ears are held still — read from the
  // clip itself, not the bone: the bone may hold a twitch just now, earTwitch.js)
  const earClip = J.animations?.find((a) => a.name === (J.clip ?? 'Action'));
  const earBase = ears.map((e) => {
    if (!e) return null;
    const tr = earClip?.tracks.find((t) => t.name === `${e.name}.quaternion`);
    return tr ? new THREE.Quaternion().fromArray(tr.values, 0) : e.quaternion.clone();
  });
  const legs = ['L', 'R'].map((s) => ({
    s: s === 'L' ? 1 : -1,
    fore: [b(`Shoulder_${s}`), b(`Elbow_${s}`), b(`Wrist_${s}`), b(`MiddleFinger4_${s}`)],
    hind: [b(`Hip_${s}`), b(`Knee_${s}`), b(`Ankle_${s}`), b(`Toes2_${s}`)],
  }));
  const tail = [];
  for (let i = 0; i <= 16; i++) { const t = b(`Tail${i}_M`); if (t) tail.push(t); }
  if (Object.values(B).some((x) => !x) || legs.some((l) => [...l.fore, ...l.hind].some((x) => !x))) return null;

  const _a = V(0, 0, 0), _c = V(0, 0, 0), _d = V(0, 0, 0), _t = V(0, 0, 0);
  const _q = new THREE.Quaternion(), _pw = new THREE.Quaternion(), _bw = new THREE.Quaternion(), _f = new THREE.Quaternion();
  // level: the branch's way, no slope (what hangs, hangs straight down);
  // body: along the branch with its slope (or the body's own turn: the climb)
  const level = new THREE.Quaternion(), body = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function aim(bone, child, dir, fq) {
    bone.updateWorldMatrix(true, false);
    child.updateWorldMatrix(false, false);
    bone.getWorldPosition(_a); child.getWorldPosition(_c);
    _d.subVectors(_c, _a);
    if (_d.lengthSq() < 1e-10) return;
    _d.normalize();
    _t.copy(dir).normalize().applyQuaternion(fq);
    _q.setFromUnitVectors(_d, _t);
    bone.getWorldQuaternion(_bw);
    bone.parent.getWorldQuaternion(_pw);
    bone.quaternion.copy(_pw.invert().multiply(_q.multiply(_bw)));
    bone.updateMatrixWorld(true);
  }
  const D = { n: V(0, 0, 0), h: V(0, 0, 0), t: V(0, 0, 0) };
  const saved = new Map();
  const all = [B.root, B.spine1, B.spine2, B.spine3, B.chest, B.neck, B.neck1, B.neck2, B.head, ...tail, ...legs.flatMap((l) => [...l.fore, ...l.hind])];
  for (const x of all) saved.set(x, new THREE.Quaternion());
  const _p = V(0, 0, 0), _p2 = V(0, 0, 0);
  let T = 0;
  const spreadFor = { r: -1, sp: 1 };
  const sway = (ph, amp, f = 0.75) => amp * Math.sin(T * f + ph);
  // a leg (bones[0..3]) from a pair of keys blended by u: [upper, lower, paw]
  // directions [x, y, z], x mirrored by side s; the upper one swaying a little
  const _k = V(0, 0, 0);
  function legKey(bones, s, A, Bk, u, fq, swayPh = 0, swayA = 0, spread = 1, swayF = 0.75) {
    for (let i = 0; i < 3; i++) {
      const a = A[i], c = Bk[i];
      // (the sway: a pendulum along the body only — forward and back, never in and out)
      _k.set((a[0] + (c[0] - a[0]) * u) * s * (i < 2 ? spread : 1),
        a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u + (i === 0 ? sway(swayPh + 1.3, swayA, swayF) : 0));
      aim(bones[i], bones[i + 1], _k, fq);
    }
  }
  // lying: the neck and head forward and DOWN (extra: tilted up by it); the
  // head's slight idle movement (a slow few degrees of turn and nod)
  function neckLie(P, extra) {
    // (neckPitch / neckYaw: the neck up-down / sideways; headYaw the head
    // sideways — the lab's sliders; headPitch the head up-down as before)
    aim(B.neck, B.head, D.n.set((P.neckYaw ?? 0) + 0.03 * Math.sin(T * 0.37), -0.55 + 0.6 * P.headPitch + (P.neckPitch ?? 0) + extra, 1), body);
    aim(B.head, B.headEnd, D.h.set((P.neckYaw ?? 0) + (P.headYaw ?? 0) + 0.05 * Math.sin(T * 0.37 + 0.8), -0.2 + P.headPitch + (P.neckPitch ?? 0) * 0.5 + extra * 0.5 + 0.03 * Math.sin(T * 0.53), 1), body);
  }
  // THE EARS, lying: laid back (angle, held), set outright from the clip's
  // ear pose (never added to the last frame's). Their twitch — one ear at a
  // time, now and then — is earTwitch.js's, shared by every cat and put on
  // top of this after the frame's pose
  const _eq = new THREE.Quaternion(), _ex = V(0, 0, 0), _im = new THREE.Matrix4();
  // (the lab's sliders can change it): angle (deg, held), axis ('lat' the
  // head's left-right, 'up', 'fwd' — or 'x' | 'y' | 'z' the ear bone's own),
  // which ('both' | 'left' | 'right')
  const earCfg = { angle: -40, axis: 'lat', which: 'both' };
  function earHold() {
    ears.forEach((e, i) => {
      if (!e) return;
      e.quaternion.copy(earBase[i]);
      const on = earCfg.which === 'both' || earCfg.which === (i ? 'right' : 'left');
      const ang = on ? earCfg.angle * Math.PI / 180 : 0;
      if (Math.abs(ang) < 1e-4) { e.updateMatrixWorld(true); return; }
      const ax = earCfg.axis;
      if (ax === 'x' || ax === 'y' || ax === 'z') {
        // about the bone's own axis
        _ex.set(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0);
        e.quaternion.multiply(_eq.setFromAxisAngle(_ex, -ang));
      } else {
        // about the HEAD's axis (the body's), taken into the ear's parent
        // space through its matrix (scale and all), premultiplied on the
        // ear's rest pose
        _ex.set(ax === 'lat' ? 1 : 0, ax === 'up' ? 1 : 0, ax === 'fwd' ? 1 : 0).applyQuaternion(body);
        e.parent.updateWorldMatrix(true, false);
        _ex.transformDirection(_im.copy(e.parent.matrixWorld).invert());
        e.quaternion.premultiply(_eq.setFromAxisAngle(_ex, -ang));
      }
      e.updateMatrixWorld(true);
    });
  }

  function pose(kind, P, r = 0.2, sp = 1) {
    const dr = P.legDroop;
    if (kind === 'lie') {
      const fc = (P.foreCurl ?? 19) * Math.PI / 180, hc = (P.hindCurl ?? 14) * Math.PI / 180;
      const F = [[0.42, -1, 0.12 + 0.5 * dr], [0.12, -1, 0.05 + 0.4 * dr], [0, -Math.cos(fc), Math.sin(fc)]];
      const per = P.curlPeriod ?? 0;
      const H = [[0.5, -1, 0.1 + 0.4 * dr], [0.1, -1, -0.3 + 0.3 * dr], [0, -Math.cos(hc), Math.sin(hc)]];
      for (const L of legs) {
        if (per > 0) {
          const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * T / per + (L.s > 0 ? 0 : 0.9));
          const c = ((P.curlMin ?? -15) + ((P.curlMax ?? 45) - (P.curlMin ?? -15)) * k) * Math.PI / 180;
          F[2] = [0, -Math.cos(c), Math.sin(c)];
          // the hind foot too (a little behind the forepaw in phase)
          const kh = 0.5 - 0.5 * Math.cos(2 * Math.PI * T / per + (L.s > 0 ? 0.6 : 1.5));
          const ch = ((P.hindCurlMin ?? 0) + ((P.hindCurlMax ?? 20) - (P.hindCurlMin ?? 0)) * kh) * Math.PI / 180;
          H[2] = [0, -Math.cos(ch), Math.sin(ch)];
        }
        legKey(L.fore, L.s, F, F, 0, level, L.s * 0.6, P.foreSwayA ?? 0.09, sp, P.foreSwayF ?? 1.7);   // (the forelegs: a quicker, livelier swing)
        legKey(L.hind, L.s, H, H, 0, level, 2 + L.s * 0.9, P.hindSwayA ?? 0.06, sp, P.hindSwayF ?? 0.75);
      }
      neckLie(P, 0);
    } else {
      const F = [[0.08, -1, 0.1 + 0.3 * dr], [0.04, -1, 0.03], [0, -0.25, 1]];
      const H = [[0.25, -0.35, 1], [0.1, -0.25, -1], [0, -0.15, 1]];
      for (const L of legs) { legKey(L.fore, L.s, F, F, 0, level); legKey(L.hind, L.s, H, H, 0, body); }
      aim(B.neck, B.head, D.n.set(0, 0.9 + P.headPitch, 1), level);
      aim(B.head, B.headEnd, D.h.set(0, P.headPitch - 0.15, 1), level);
    }
    const td = P.tailDroop, ts = P.tailSide ?? 1, n = tail.length - 1;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      if (kind === 'lie') {
        // off to the side of the branch first (clear of it), then straight down
        if (u < 0.42) D.t.set(ts * (P.tailOut ?? 0.5), -0.35 - 0.3 * td - (P.tailLow ?? 0.4), -0.9);   // (back past the hind leg, to the side)
        else {
          // the tip's curl (a J: the last third bends forward/up), held or looping
          const cp = P.tailCurlPeriod ?? 0;
          const curl = (P.tailCurl ?? 0) + (cp > 0 ? (P.tailCurlLoop ?? 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * T / cp)) : 0);
          const tip = Math.max(0, (u - 0.66) / 0.34);
          D.t.set(ts * (P.tailHang ?? 0.56) + sway(u * 2, (P.tailSwayA ?? 0.04) * u, P.tailSwayF ?? 0.75),
            -1 + curl * tip * 1.6,
            -(1 - td) * 0.6 + u * u * 0.25 + sway(u * 2 + 1, (P.tailSwingA ?? 0.06) * u, P.tailSwayF ?? 0.75) + curl * tip * 1.2);
        }
      } else if (u < 0.35) D.t.set(ts * 0.7, -0.4 - 0.3 * td, -0.7);   // (sitting: back and off to the side)
      else D.t.set(ts * 0.1 + sway(u * 2, 0.1 * u), -1, -(1 - td) * 0.6 + u * u * 0.2);
      aim(tail[i], tail[i + 1], D.t, level);
    }
  }

  // FIXED POSES (the climb, the leap): keys in the BODY's frame
  const K = {
    // up a trunk: forelegs OPEN round it, hooked; reaching higher in a hop
    wrap: [[0.85, -0.55, 0.45], [0.15, -0.9, 0.35], [-0.4, -0.8, 0.2]],
    reach: [[0.55, -0.35, 1], [0.1, -0.5, 1], [0, -1, 0.3]],
    // hind legs bunched under (gripping), or pushed out straight in the spring
    bunch: [[0.55, -0.55, 0.65], [0.15, -0.55, -0.8], [0, -0.9, 0.4]],
    push: [[0.35, -0.5, -0.8], [0.1, -0.35, -1], [0, -0.6, -0.8]],
    // the leap: crouched on the branch, stretched in the air, landing
    crouchF: [[0.12, -0.7, -0.6], [0, -0.8, 0.6], [0, -0.3, 1]],
    crouchH: [[0.2, -0.5, 0.85], [0.1, -0.4, -1], [0, -1, 0.15]],
    stretchF: [[0.12, -0.2, 1], [0.05, -0.15, 1], [0, -0.5, 1]],
    stretchH: [[0.12, -0.3, -1], [0.05, -0.2, -1], [0, 0.1, -1]],
    landF: [[0.12, -1, 0.45], [0, -1, 0.2], [0, -0.3, 1]],
    // head first DOWN a trunk (z ahead = down it): the forelegs braced out
    // in front, stiff, round the bark; the hind legs gripping behind
    braceF: [[0.7, -0.45, 0.8], [0.15, -0.6, 0.8], [-0.3, -0.9, 0.3]],
    braceH: [[0.6, -0.6, -0.35], [0.15, -0.6, -0.8], [-0.2, -0.9, -0.2]],
    landH: [[0.2, -0.6, 0.5], [0.1, -0.6, -0.8], [0, -1, 0.2]],
  };
  const _n = V(0, 0, 0), _s = V(0, 0, 0), _w = V(0, 0, 0);
  // THE TORSO'S DEPTH under the chest / the middle of the back: from the
  // skinned mesh itself (once per cat), along the body's up, in the pose it
  // has the first time — how far its underside lies below those two bones
  let depth = null;
  function torsoDepth() {
    if (depth) return depth;
    depth = { chest: 0.2 * scale(), belly: 0.2 * scale() };
    const up = V(0, 1, 0).applyQuaternion(J.root.quaternion), v = V(0, 0, 0), c = V(0, 0, 0), bl = V(0, 0, 0);
    B.chest.getWorldPosition(c); B.spine2.getWorldPosition(bl);
    const r2 = (0.22 * scale()) ** 2;
    let mc = Infinity, mb = Infinity;
    J.model.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i += 2) {
        o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld);
        if (v.distanceToSquared(c) < r2) mc = Math.min(mc, v.dot(up));
        if (v.distanceToSquared(bl) < r2) mb = Math.min(mb, v.dot(up));
      }
    });
    if (mc < Infinity) depth.chest = c.dot(up) - mc;
    if (mb < Infinity) depth.belly = bl.dot(up) - mb;
    return depth;
  }
  // sitting: how far the haunches' underside lies below the pelvis bone
  let sitD = null;
  function sitDepth() {
    if (sitD !== null) return sitD;
    sitD = 0.17 * scale();
    const v = V(0, 0, 0), c = V(0, 0, 0), fw = V(0, 0, 1).applyQuaternion(level);
    B.root.getWorldPosition(c);
    const r2 = (0.3 * scale()) ** 2;
    let m = Infinity;
    J.model.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const n = o.geometry.attributes.position.count;
      // (ahead of the pelvis only: not the tail hanging off behind it)
      for (let i = 0; i < n; i += 2) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); if (v.distanceToSquared(c) < r2 && (v.x - c.x) * fw.x + (v.z - c.z) * fw.z > -0.04 * scale()) m = Math.min(m, v.y); }
    });
    if (m < Infinity) sitD = c.y - m;
    return sitD;
  }
  // the least clearance of the legs' joints (elbow, wrist, paw; knee, ankle,
  // toes) outside a trunk (axis R behind the bark point along -n), m
  const _j = V(0, 0, 0);
  function trunkInside(ct, R) {
    let lo = Infinity;
    for (const L of legs) for (const b of [L.fore[1], L.fore[2], L.fore[3], L.hind[1], L.hind[2], L.hind[3]]) {
      b.getWorldPosition(_j);
      _w.set(_j.x - ct.px, _j.y - ct.py, _j.z - ct.pz);
      lo = Math.min(lo, Math.hypot(_w.dot(_s), _w.dot(_n) + R) - R);
    }
    return lo;
  }
  // the same round a BRANCH lying along `at` (radius r, its top at.y)
  function branchInside(at, r, top) {
    let lo = Infinity;
    _s.set(1, 0, 0).applyQuaternion(level);
    for (const L of legs) for (const b of [L.fore[1], L.fore[2], L.fore[3], L.hind[1], L.hind[2], L.hind[3]]) {
      b.getWorldPosition(_j);
      const lat = (_j.x - at.x) * _s.x + (_j.z - at.z) * _s.z;
      lo = Math.min(lo, Math.hypot(lat, _j.y - (top(_j) - r)) - r);
    }
    return lo;
  }
  const paws = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
  const scale = () => J.model.scale.x;
  // A LEG PUT ON A POINT (the latched climb): ch [upper, mid, end, tip]; the
  // tip onto F (world), the last bone along meta (world: the foot / the paw
  // onto the bark), the knee / elbow bent toward pole — the two upper bones
  // solved as a triangle (their lengths from the rig, any scale)
  const ID = new THREE.Quaternion();
  const _h = V(0, 0, 0), _kn = V(0, 0, 0), _en = V(0, 0, 0), _tp = V(0, 0, 0), _u = V(0, 0, 0), _pl = V(0, 0, 0), _m = V(0, 0, 0), _t2 = V(0, 0, 0);
  function limbTo(ch, F, meta, pole) {
    ch[0].getWorldPosition(_h); ch[1].getWorldPosition(_kn); ch[2].getWorldPosition(_en); ch[3].getWorldPosition(_tp);
    const l1 = _h.distanceTo(_kn), l2 = _kn.distanceTo(_en), l3 = _en.distanceTo(_tp);
    _m.copy(meta).normalize();
    _u.copy(F).addScaledVector(_m, -l3).sub(_h);
    const d = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min((l1 + l2) * 0.999, _u.length()));
    _u.normalize();
    const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    _pl.copy(pole).addScaledVector(_u, -pole.dot(_u)).normalize();
    _kn.copy(_h).addScaledVector(_u, l1 * ca).addScaledVector(_pl, l1 * sa);
    _en.copy(_h).addScaledVector(_u, d);
    aim(ch[0], ch[1], _t2.subVectors(_kn, _h), ID);
    aim(ch[1], ch[2], _t2.subVectors(_en, _kn), ID);
    aim(ch[2], ch[3], _m, ID);
  }
  // the last frame's pose, for easing from one pose into the next (mix)
  const prev = new Map(all.map((x) => [x, new THREE.Quaternion()]));
  const prevRoot = { p: V(0, 0, 0), q: new THREE.Quaternion(), ok: false };

  return {
    // FIXED: 'cling' (u: 0 hind legs bunched .. 1 pushed; reach: 0 forelegs
    // wrapped .. 1 reaching up), 'leap' (u: 0 crouched .. 1 stretched), 'land'
    // (u: 0 stretched .. 1 landed), in the body frame q (the root's turn).
    // contact { R (trunk radius; Infinity: a branch's top), px, py, pz (the
    // surface under the body) }: the root moved along its up so the lowest
    // paw meets that surface
    fixed(kind, q, u, reach = 0, contact = null) {
      body.copy(q);
      const onTrunk = contact && contact.R !== Infinity;
      // round a trunk: the legs open as wide as it is thick (for this cat's
      // size) — and wider still while any joint of them is inside the bark
      let sp = onTrunk ? Math.max(0.45, Math.min(1.7, (contact.R / scale() + 0.15) / 0.6)) : 1;
      const legsAt = (spr) => {
        for (const L of legs) {
          const s = L.s;
          if (kind === 'cling') { legKey(L.fore, s, K.wrap, K.reach, reach, body, 0, 0, spr); legKey(L.hind, s, K.bunch, K.push, u, body, 0, 0, spr); }
          else if (kind === 'brace') { legKey(L.fore, s, K.braceF, K.braceF, 0, body, 0, 0, spr); legKey(L.hind, s, K.braceH, K.braceH, 0, body, 0, 0, spr); }
          else if (kind === 'leap') { legKey(L.fore, s, K.crouchF, K.stretchF, u, body); legKey(L.hind, s, K.crouchH, K.stretchH, u, body); }
          else { legKey(L.fore, s, K.stretchF, K.landF, u, body); legKey(L.hind, s, K.stretchH, K.landH, u, body); }
        }
      };
      legsAt(sp);
      // the head held still on the body (no look, no turn): along it, a
      // little up off the bark
      const hy = kind === 'cling' ? 0.35 : kind === 'brace' ? 0.4 : 0.15;
      aim(B.neck, B.head, D.n.set(0, hy, 1), body);
      aim(B.head, B.headEnd, D.h.set(0, hy * 0.4 - 0.1, 1), body);
      for (let i = 0; i + 1 < tail.length; i++) aim(tail[i], tail[i + 1], D.t.set(0, kind === 'cling' || kind === 'brace' ? 0.25 : 0.12, -1), body);
      J.root.updateMatrixWorld(true);
      if (!contact) return;
      _n.set(0, 1, 0).applyQuaternion(q); _s.set(1, 0, 0).applyQuaternion(q);
      const R = contact.R;
      const surfAt = (pw) => {
        _w.set(pw.x - contact.px, pw.y - contact.py, pw.z - contact.pz);
        const x = _w.dot(_s);
        return _w.dot(_n) - (R === Infinity ? 0 : -(R - Math.sqrt(Math.max(0, R * R - Math.min(x * x, R * R)))));
      };
      if (!onTrunk) {
        // on a branch / the ground: the lowest paw onto its top
        let lo = Infinity;
        legs.forEach((L, i) => { L.fore[3].getWorldPosition(paws[i * 2]); L.hind[3].getWorldPosition(paws[i * 2 + 1]); });
        for (const pw of paws) lo = Math.min(lo, surfAt(pw));
        J.root.position.addScaledVector(_n, -lo + 0.01 * scale());
        J.root.updateMatrixWorld(true);
        return;
      }
      // ON A TRUNK: the chest and belly pressed to the bark — the underside
      // of the real mesh (torsoDepth) 5 cm off it
      const dep = torsoDepth();
      B.chest.getWorldPosition(_p); B.spine2.getWorldPosition(_p2);
      const under = Math.min(surfAt(_p) - dep.chest, surfAt(_p2) - dep.belly);
      J.root.position.addScaledVector(_n, 0.05 * scale() - under);
      J.root.updateMatrixWorld(true);
      // and every joint of the legs OUTSIDE the trunk (a paw's thickness off
      // it): the legs opened wider until they are
      for (let it = 0; it < 6 && trunkInside(contact, R) < 0.025 * scale(); it++) { sp *= 1.22; legsAt(sp); }
      J.root.updateMatrixWorld(true);
    },
    // UP A TRUNK, LATCHED (the climber's scale), in two calls a frame:
    // scaleBody — q the body's turn (tilted: the head in to the bark, the rump
    // out), arch 0..1 the back bowed out between them; the chest pressed to
    // the bark (contact as for fixed); then limbRoots (where the shoulders and
    // hips are now, so the climber can say where each paw goes); then
    // scaleLimbs — each paw onto its point F[i] (order L fore, L hind, R fore,
    // R hind), its last bone along M[i], the knee / elbow toward Pl[i]; the
    // head up the trunk; the tail out from the bark and lifted (tail: the
    // trunk's out n, its axis a — world — and a sway phase)
    scaleBody(q, arch, contact) {
      body.copy(q);
      const sp = [B.root, B.spine1, B.spine2, B.spine3, B.chest, B.neck], bow = [0.32, 0.14, -0.02, -0.18, -0.3];
      for (let i = 0; i < 5; i++) aim(sp[i], sp[i + 1], D.t.set(0, bow[i] * arch, 1), body);
      J.root.updateMatrixWorld(true);
      _n.set(0, 1, 0).applyQuaternion(q); _s.set(1, 0, 0).applyQuaternion(q);
      const R = contact.R;
      _w.set(0, 0, 0);
      const surfAt = (pw) => {
        _w.set(pw.x - contact.px, pw.y - contact.py, pw.z - contact.pz);
        const x = _w.dot(_s);
        return _w.dot(_n) + (R - Math.sqrt(Math.max(0, R * R - Math.min(x * x, R * R))));
      };
      // (the chest alone: the belly is held off the bark by the tilt)
      const dep = torsoDepth();
      B.chest.getWorldPosition(_p);
      J.root.position.addScaledVector(_n, 0.04 * scale() - (surfAt(_p) - dep.chest));
      J.root.updateMatrixWorld(true);
    },
    limbRoots(out) { legs.forEach((L, i) => { L.fore[0].getWorldPosition(out[i * 2]); L.hind[0].getWorldPosition(out[i * 2 + 1]); }); },
    scaleLimbs(F, M, Pl, tail2) {
      legs.forEach((L, i) => { limbTo(L.fore, F[i * 2], M[i * 2], Pl[i * 2]); limbTo(L.hind, F[i * 2 + 1], M[i * 2 + 1], Pl[i * 2 + 1]); });
      // the head: up the trunk, a little out from it
      aim(B.neck, B.head, D.n.set(0, 0.45, 1), body);
      aim(B.head, B.headEnd, D.h.set(0, 0.12, 1), body);
      // THE TAIL: off the rump OUT from the bark (a little down), then curving
      // up — the counterweight; swaying slowly side to side
      const { n, a, side, ph } = tail2, N = tail.length;
      for (let i = 0; i + 1 < N; i++) {
        const v = i / Math.max(1, N - 2);
        D.t.copy(n).multiplyScalar(0.85 - 0.35 * v).addScaledVector(a, -0.55 + 1.15 * v).addScaledVector(side, 0.25 * v * Math.sin(ph - v * 2));
        aim(tail[i], tail[i + 1], D.t, ID);
      }
      J.root.updateMatrixWorld(true);
    },
    // EASING between poses: keep this frame's pose (keep), and next frame,
    // after the new pose is set, ease it from the kept one by k (0 the kept
    // pose .. 1 the new) — bones, and the cat's place and turn
    keep() {
      for (const x of all) prev.get(x).copy(x.quaternion);
      prevRoot.p.copy(J.root.position); prevRoot.q.copy(J.root.quaternion); prevRoot.ok = true;
    },
    mix(k) {
      if (!prevRoot.ok || k >= 1) return;
      for (const x of all) { _q.copy(x.quaternion); x.quaternion.copy(prev.get(x)).slerp(_q, k); }
      J.root.position.lerpVectors(prevRoot.p, J.root.position, k);
      J.root.quaternion.slerpQuaternions(prevRoot.q, J.root.quaternion, k);
      J.root.updateMatrixWorld(true);
    },
    // the lying ears' settings (earHold): read and changed in place
    ears: earCfg,
    // the head, world (the lab's close-up)
    headAt: (out) => B.head.getWorldPosition(out),
    // the idle sway's clock set outright (s): a film's deterministic frame
    clock(t) { T = t; },
    // ON A BRANCH: kind 'sit' | 'lie'; at { x, y (the top), z, heading, slope };
    // w < 1: eased in from the pose the bones hold; dt: the idle sway's clock
    apply(kind, P, at, w = 1, dt = 0) {
      T += dt;
      if (w < 1) for (const x of all) saved.get(x).copy(x.quaternion);
      const slope = at.slope ?? 0, sl = Math.atan(slope);
      level.setFromEuler(_e.set(0, at.heading, 0));
      body.setFromEuler(_e.set(-sl, at.heading, 0));
      J.root.position.set(at.x, at.y, at.z);
      J.root.quaternion.copy(body);
      // (sitting: upright against gravity, not tilted with the branch)
      if (kind === 'sit') J.root.quaternion.copy(level).multiply(_f.setFromEuler(_e.set(-P.sitPitch, 0, 0)));
      J.root.updateMatrixWorld(true);
      const r = at.r ?? 0.2;
      // the hanging legs open with the branch's thickness (for this cat's size)
      // (found once per branch radius — not per frame, which made the legs flick)
      const cached = kind === 'lie' && spreadFor.r === r;
      let sp = cached ? spreadFor.sp : Math.max(0.5, Math.min(1.9, (r / scale() + 0.08) / 0.28));
      pose(kind, P, r, sp);
      J.root.updateMatrixWorld(true);
      const fx = Math.sin(at.heading), fz = Math.cos(at.heading);
      const top = (p) => at.y + slope * ((p.x - at.x) * fx + (p.z - at.z) * fz);
      if (kind === 'lie') {
        // the belly on the branch's top (under the chest and the middle of the back)
        const dep = torsoDepth();
        B.spine2.getWorldPosition(_p); B.chest.getWorldPosition(_p2);
        const lift = Math.max(top(_p) - (_p.y - dep.belly), top(_p2) - (_p2.y - dep.chest));
        J.root.position.y += lift + P.bodyY;
        J.root.updateMatrixWorld(true);
        // no leg inside the branch: opened wider until all are outside it
        if (!cached) {
          for (let it = 0; it < 6 && branchInside(at, r, top) < 0.02 * scale(); it++) { sp *= 1.2; pose(kind, P, r, sp); J.root.updateMatrixWorld(true); }
          spreadFor.r = r; spreadFor.sp = sp * 1.05;   // (a little margin for the sway)
        }
        // the chin down ON the branch: the neck's tilt halved in on until
        // the jaw's underside just meets the top
        let lo = -0.6, hi = 1.0;
        for (let k = 0; k < 7; k++) {
          const mid = (lo + hi) / 2;
          neckLie(P, mid);
          B.jawEnd.getWorldPosition(_p);
          if (_p.y - 0.035 * scale() < top(_p)) lo = mid; else hi = mid;
        }
        neckLie(P, hi);
        earHold();
      } else {
        // SITTING: the haunches ON the branch's top under them (the real
        // mesh's underside there), the forepaws on its top under THEM: how
        // upright the chest sits is found so both touch (a few halvings
        // round the slider's value) — on a slope as on the level
        const placeSit = (p) => {
          J.root.position.set(at.x, at.y, at.z);
          J.root.quaternion.copy(level).multiply(_f.setFromEuler(_e.set(-p, 0, 0)));
          J.root.updateMatrixWorld(true);
          pose(kind, P);
          J.root.updateMatrixWorld(true);
          B.root.getWorldPosition(_p);   // the pelvis
          J.root.position.y += top(_p) - (_p.y - sitDepth()) + P.bodyY;
          J.root.position.x += at.x - _p.x; J.root.position.z += at.z - _p.z;
          J.root.updateMatrixWorld(true);
          let gap = Infinity;
          for (const L of legs) { L.fore[3].getWorldPosition(_p2); gap = Math.min(gap, _p2.y - top(_p2)); }
          return gap;
        };
        // (the slider's own angle when the forepaws clear the branch there;
        // more upright only as far as they need — uphill)
        if (placeSit(P.sitPitch) < 0) {
          let lo = P.sitPitch, hi = Math.min(1.5, P.sitPitch + 0.7);
          for (let k = 0; k < 6; k++) { const mid = (lo + hi) / 2; if (placeSit(mid) < 0) lo = mid; else hi = mid; }
          placeSit(hi);
        }
      }
      J.root.updateMatrixWorld(true);
      if (w < 1) for (const x of all) { _q.copy(x.quaternion); x.quaternion.copy(saved.get(x)).slerp(_q, w); }
      J.root.updateMatrixWorld(true);
    },
  };
}
