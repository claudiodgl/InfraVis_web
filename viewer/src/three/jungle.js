// THE AMAZON ON THE WHITEBOARD: the jaguar of "Amazon from within" (its
// rig, clips and pose code borrowed from the Amazon viewer: src/amazon/*),
// drawn with toon shading and an ink outline, on a 3D limb of a tree whose
// rest is sketched in SVG; and a flock of terns crossing, as ink silhouettes
// whose wings flap in the vertex shader (one draw call for the flock).
//
//   wet season  the forest floods: the jaguar lies along the limb, legs
//               hanging (simplePoses 'lie'), blinking, ears twitching
//   dry season  it is down on the ground: standing, looking round, licking
//               ('Look around (Ear.Rodriguez)', the Amazon film's idle)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createJaguar } from '../amazon/jaguar.js';
import { createGait } from '../amazon/gait.js';
import { createSimplePoses, DEFAULTS } from '../amazon/simplePoses.js';
import { createBlink } from '../amazon/blink.js';
import { createEarTwitch } from '../amazon/earTwitch.js';

const IDLE = 'Look around (Ear.Rodriguez)';
export const LIMB = { x0: -1.5, y0: 2.05, x1: 1.9, y1: 2.25, r0: 0.2, r1: 0.1 };

export async function createJungle(stage, { season: season0 = 'wet' } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0.4, 1.7, 9.2);
  camera.lookAt(0.3, 1.25, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 5, 4); scene.add(sun);
  const ramp = stage.toonRamp([110, 200, 255]);

  // the limb and the trunk it grows from: toon "paper" with an ink outline
  const bark = new THREE.MeshToonMaterial({ color: 0xcdb89a, gradientMap: ramp });
  bark.userData.outlineParameters = { thickness: 0.006 };
  const L = LIMB;
  const len = Math.hypot(L.x1 - L.x0, L.y1 - L.y0);
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(L.r1, L.r0, len, 10, 1), bark);
  limb.position.set((L.x0 + L.x1) / 2, (L.y0 + L.y1) / 2, 0);
  limb.rotation.z = -Math.PI / 2 + Math.atan2(L.y1 - L.y0, L.x1 - L.x0);
  scene.add(limb);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 6, 12, 1), bark);
  trunk.position.set(L.x0 - 0.05, 2.6, -0.1);
  scene.add(trunk);
  const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.9, 6), bark);
  twig.position.set(1.2, 2.55, 0); twig.rotation.z = -0.7; scene.add(twig);
  // their ink line: a slightly larger shell of each, back faces only, in the
  // ink colour (still objects, so this is clean — unlike an outline pass on
  // the skinned cat, which smeared)
  const inkMat = new THREE.MeshBasicMaterial({ color: 0x1f1d24, side: THREE.BackSide });
  const shell = (mesh, rTop, rBot, len, seg, grow) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(rTop + grow, rBot + grow, len + grow * 2, seg, 1), inkMat);
    s.position.copy(mesh.position); s.rotation.copy(mesh.rotation); scene.add(s);
  };
  shell(limb, L.r1, L.r0, len, 10, 0.022);
  shell(trunk, 0.2, 0.3, 6, 12, 0.026);
  shell(twig, 0.03, 0.06, 0.9, 6, 0.014);

  // ---- the jaguar ----
  const viewer = { scene, world: { exaggeration: 1, sampleElevation: () => 0 }, terrain: {}, env: {}, post: null };
  const J = await createJaguar(viewer, { castShadow: false, clips: { idle: IDLE } });
  J.root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    // sharp coat at grazing angles (the fur seen along the body)
    if (m.map) { m.map.anisotropy = stage.renderer.capabilities.getMaxAnisotropy(); m.map.needsUpdate = true; }
    const toon = new THREE.MeshToonMaterial({ map: m.map, color: m.color, gradientMap: ramp, vertexColors: m.vertexColors, transparent: m.transparent, side: m.side });
    toon.name = m.name;
    // only the coat gets the ink line: on whiskers, teeth and eyes the
    // outline swells thin geometry into black blobs
    const fine = /whisker|dientes|Ojos|Lengua/i.test(m.name);
    toon.userData.outlineParameters = fine ? { visible: false } : { thickness: 0.005 };
    o.material = toon;
  });
  createGait(J);
  const simple = createSimplePoses(J);
  const blink = createBlink(J);
  const ears = createEarTwitch(J, { seed: 0.37 });
  const slope = (L.y1 - L.y0) / (L.x1 - L.x0);
  const lieAt = { x: 0.15, y: L.y0 + (0.15 - L.x0) * slope + 0.15, z: 0, heading: Math.PI / 2, slope, r: 0.15 };
  const P = { ...DEFAULTS.lie };
  simple.apply('sit', { ...DEFAULTS.sit }, lieAt, 1, 0);   // (settle, as restingJaguar.js does)
  const ground = { x: 1.1, z: 0.6, heading: -Math.PI / 2 + 0.55 };


  let season = season0, t = 0, idleT = 0, swap = null, footFix = 0;
  const pawBones = (J.paws || []).map((n) => J.model.getObjectByName(n)).filter(Boolean);
  const _pw = new THREE.Vector3();
  const PAW_SOLE = 0.03;   // m from the paw bone down to the sole

  // ---- terns ----
  const gl = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./lib/animals/tern.glb');
  let tg = null;
  gl.scene.updateMatrixWorld(true);
  gl.scene.traverse((o) => { if (o.isMesh && !tg) { tg = o.geometry.clone(); tg.applyMatrix4(o.matrixWorld); } });
  tg.computeBoundingBox();
  const bb = tg.boundingBox, c = bb.getCenter(new THREE.Vector3());
  tg.translate(-c.x, -c.y, -c.z);
  tg.rotateY(Math.PI / 2);   // body along +x (flying right)
  const half = (bb.max.x - bb.min.x) / 2;
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x1f1d24, side: THREE.DoubleSide });
  birdMat.userData.outlineParameters = { visible: false };
  const uT = { value: 0 };
  birdMat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float span = abs(transformed.z) / ${half.toFixed(3)};
      float ph = uT * 9.0 + float(gl_InstanceID) * 1.9;
      transformed.y += sin(ph) * pow(span, 1.4) * ${(half * 0.75).toFixed(3)};`);
  };
  const NB = 7;
  const flock = new THREE.InstancedMesh(tg, birdMat, NB);
  flock.frustumCulled = false;
  scene.add(flock);
  const slots = Array.from({ length: NB }, (_, i) => ({ back: Math.ceil(i / 2) * 0.55, lat: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.35, dy: Math.sin(i * 2.3) * 0.15 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(0.09, 0.09, 0.09), v3 = new THREE.Vector3();
  let flockX = -9, flockY = 4.2;

  function inkColours() {
    const ink = stage.ink();
    birdMat.color.copy(ink); inkMat.color.copy(ink);
    stage.setOutlineColor(scene, ink);
    bark.color.set(stage.paper()).lerp(new THREE.Color(0xb59a74), 0.45);
  }
  inkColours();

  const _p = new THREE.Vector3();
  // (before the first frame the camera's view matrix is still the identity:
  // update it too, or every projection comes out ~80 px low)
  function fit(w, h) { if (h > 0 && Math.abs(camera.aspect - w / h) > 1e-4) { camera.aspect = w / h; camera.updateProjectionMatrix(); } camera.updateMatrixWorld(); }
  return {
    scene, camera,
    get season() { return season; },
    // where the ground (y = 0) and the limb's tip fall on screen, so the SVG
    // sketch can be drawn to meet the 3D (px within the mount)
    // (the camera is fitted to the canvas first: before the first frame it
    // still had the default aspect, and the sketch came out of register)
    project(x, y, z, w, h) { fit(w, h); _p.set(x, y, z).project(camera); return [(_p.x + 1) / 2 * w, (1 - _p.y) / 2 * h]; },
    jaguarScreen(w, h) { fit(w, h); J.root.getWorldPosition(_p); _p.y += 0.4; _p.project(camera); return [(_p.x + 1) / 2 * w, (1 - _p.y) / 2 * h]; },
    setSeason(s) { if (s !== season) { swap = { to: s, t: 0 }; } },
    inkColours,
    update(dt) {
      t += dt; uT.value = t;
      // the season swap: the cat vanishes in a puff (the scene draws it), reappears
      if (swap) { swap.t += dt; if (swap.t > 0.35 && season !== swap.to) { season = swap.to; idleT = 0; } if (swap.t > 0.7) swap = null; }
      const hidden = swap && swap.t > 0.15 && swap.t < 0.55;
      if (season === 'wet') {
        J.pose({ x: lieAt.x, z: lieAt.z, heading: lieAt.heading, time: 0.5 });
        simple.apply('lie', P, lieAt, 1, dt);
        blink.update(dt, { resting: true });
        ears.update?.(dt);
      } else {
        // standing still: the walk held at one frame, the look-round clip
        // laid fully over it (as the Amazon film's paused cat does) — played
        // as its own motion, the clip's root travel would slide the cat away
        idleT += dt;
        const D = J.motions?.idle?.duration ?? 14;
        J.pose({ x: ground.x, z: ground.z, heading: ground.heading, time: 0.5, blend: { motion: 'idle', time: idleT % (D - 1e-3), w: 1 }, dt });
        // feet on the ground: the look-round clip shifts its weight and the
        // body rides up and down with it; pin the lowest paw to the floor
        J.root.updateMatrixWorld(true);
        let low = Infinity;
        for (const b of pawBones) { b.getWorldPosition(_pw); low = Math.min(low, _pw.y); }
        if (low < Infinity) { footFix += ((PAW_SOLE - low) - footFix) * (1 - Math.exp(-dt * 10)); J.root.position.y += footFix; J.root.updateMatrixWorld(true); }
        blink.update(dt);
      }
      J.root.visible = !hidden;
      // terns: a pass every ~14 s, high over the canopy, the flock bobbing
      flockX += dt * 1.7;
      if (flockX > 10) { flockX = -10 - Math.random() * 8; flockY = 3.9 + Math.random() * 0.9; }
      for (let i = 0; i < NB; i++) {
        const sl = slots[i];
        v3.set(flockX - sl.back * 0.5, flockY + sl.dy * 0.6 + Math.sin(t * 0.9 + i) * 0.05, -7 + sl.lat * 0.6);
        q.setFromAxisAngle(_p.set(0, 0, 1), Math.sin(t * 0.7 + i) * 0.08);
        m4.compose(v3, q, s3);
        flock.setMatrixAt(i, m4);
      }
      flock.instanceMatrix.needsUpdate = true;
      // (no outline pass: on the skinned cat it left dark smears round the
      // paws and legs; the sketch around it carries the ink)
      stage.render(scene, camera);
    },
    dispose() { J.dispose(); tg.dispose(); birdMat.dispose(); bark.dispose(); },
  };
}
