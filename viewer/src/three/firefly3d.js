// THE FIREFLY IN 3D: "Lowpoly Firefly" by Caledhril (CC BY 4.0), in full
// quality — its own PBR materials and 2048 px textures (only re-encoded as
// WebP by pipeline/optimize_assets.mjs, 539 KB), lit by a soft studio
// environment, its lantern glowing from its own emissive map, and its own two
// clips: 'Landed_Fly' while it flies or hovers, 'Landed_Idol' when it perches.
//
// It lives in its own small transparent canvas riding inside the firefly's
// DOM node (draw/firefly.js moves it and scales it for the swoops), so it
// costs one small square per frame. The drawn firefly stands in until this
// has loaded, and for browsers without WebGL.
//
// Facing: at yaw 0 the model looks at the camera; +90° it faces right.
// skin.update(dt, { vx, vy, moving, perched, depth }) turns it toward where it
// travels, banks it into turns, and swings it toward the viewer as it swoops
// close (depth), so the transitions show it is a 3D creature.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SIZE = 420;   // CSS px of the canvas; shown at half size at rest, so the swoops stay sharp

export async function createFirefly3D() {
  const canvas = document.createElement('canvas');
  canvas.className = 'ff-canvas';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(0.4, 1, 0.9); scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  camera.position.set(0, 0.07, 0.78);
  camera.lookAt(0, 0, 0);

  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./lib/animals/firefly.glb');
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const pivot = new THREE.Group(); pivot.add(model); scene.add(pivot);

  // the lantern: the body material carries the emissive map; pulse it
  const glowMats = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    const m = o.material;
    if (m.emissiveMap) { m.emissive = new THREE.Color(1, 0.86, 0.35); glowMats.push(m); }
    if (/wing/i.test(m.name)) { m.side = THREE.DoubleSide; m.depthWrite = false; }
  });

  // its own two clips, one at a time: 'Landed_Fly' while it travels,
  // 'Landed_Idol' once it stops — a short crossfade between them, never a mix
  // (its white edge is traced in CSS round the canvas: draw/firefly.js)
  const mixer = new THREE.AnimationMixer(model);
  const clip = (re) => gltf.animations.find((a) => re.test(a.name));
  const fly = mixer.clipAction(clip(/fly/i));
  const idle = mixer.clipAction(clip(/idol|idle/i));
  fly.play();
  let state = 'fly', still = 0;
  function setState(next) {
    if (next === state) return;
    const from = next === 'fly' ? idle : fly, to = next === 'fly' ? fly : idle;
    to.reset().play();
    from.crossFadeTo(to, 0.25, false);
    state = next;
  }

  // WHERE ITS FEET ARE: measured once, on the model itself — the landed
  // clip sampled in the side profile it lands in (camera at eye level), the
  // skinned leg vertices taken where the bones put them, the lowest ones
  // projected to the canvas. feet = { dx, dy } in CSS px from the canvas
  // centre at display size DISPLAY (draw/firefly.js shows it at 250 px),
  // facing right; landings put exactly this point on the edge.
  const DISPLAY = 250;
  const feet = (() => {
    const yaw0 = pivot.rotation.y, camY0 = camera.position.y;
    pivot.rotation.set(0, Math.PI / 2, 0);
    camera.position.y = 0; camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    fly.stop(); idle.reset().play();
    const v = new THREE.Vector3();
    let minY = Infinity; const lows = [];
    for (const time of [0.2, 1.0, 1.8, 2.6, 3.4]) {
      idle.time = time; mixer.update(0);
      scene.updateMatrixWorld(true);
      model.traverse((o) => {
        if (!o.isSkinnedMesh || /wing/i.test(o.material.name)) return;
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld);
          if (v.y < minY + 0.03) { minY = Math.min(minY, v.y); lows.push(v.clone()); }
        }
      });
    }
    // the feet: the bottom band of the legs (all six tips), not one vertex
    const near = lows.filter((p) => p.y < minY + 0.012);
    const mx = near.reduce((a, p) => a + p.x, 0) / Math.max(1, near.length);
    const pr = new THREE.Vector3(mx, minY, 0).project(camera);
    idle.stop(); fly.reset().play();
    pivot.rotation.y = yaw0; camera.position.y = camY0; camera.lookAt(0, 0, 0);
    const out = { dx: pr.x * DISPLAY / 2, dy: -pr.y * DISPLAY / 2 };
    console.info('firefly feet (px from centre at 250 px):', out.dx.toFixed(1), out.dy.toFixed(1));
    return out;
  })();

  let yaw = Math.PI / 2, bank = 0, pitch = 0, t = 0, glow = 1, side = 1;

  return {
    canvas, SIZE, feet,
    setGlow(g) { glow = g; },
    update(dt, { vx = 0, vy = 0, moving = false, perched = false, depth = 0 } = {}) {
      t += dt;
      const speed = Math.hypot(vx, vy);
      if (Math.abs(vx) > 0.5) side = vx > 0 ? 1 : -1;
      // travelling: side-on toward where it goes; swooping close: turned
      // toward the camera; hovering or perched: a three-quarter view
      // LANDED on a 2D edge: a flat side profile (exactly 90°, no sway), the
      // camera level with it, so it stands on the line like a drawing; IN THE
      // AIR: side-on toward where it goes, turned toward the camera as it
      // swoops close, a three-quarter view while hovering — the 3D moves
      let want;
      if (perched) want = side * Math.PI / 2;
      else if (speed > 0.6) want = side * (Math.PI / 2 - depth * 1.1);
      else want = side * 0.62 + Math.sin(t * 0.5) * 0.18;
      yaw += (want - yaw) * (1 - Math.exp(-dt * (perched ? 7 : 4.5)));
      // eye level when landed, slightly above it in flight
      const camY = perched ? 0 : 0.07;
      if (Math.abs(camera.position.y - camY) > 1e-4) { camera.position.y += (camY - camera.position.y) * (1 - Math.exp(-dt * 6)); camera.lookAt(0, 0, 0); }
      // landed only when it stands on something; anywhere else it flies (hovering too)
      setState(perched ? 'idle' : 'fly');
      const flying = state === 'fly';
      const wantBank = flying ? THREE.MathUtils.clamp(vy * 0.05, -0.45, 0.45) * -side : 0;
      bank += (wantBank - bank) * (1 - Math.exp(-dt * 5));
      const wantPitch = flying ? THREE.MathUtils.clamp(vy * 0.03, -0.35, 0.35) : 0;
      pitch += (wantPitch - pitch) * (1 - Math.exp(-dt * 5));
      pivot.rotation.set(pitch, yaw, bank, 'YXZ');
      fly.timeScale = 1 + Math.min(speed * 0.04, 1);
      mixer.update(dt);
      const g = glow * (1.3 + Math.sin(t * 2.4) * 0.6);
      for (const m of glowMats) m.emissiveIntensity = g;
      renderer.render(scene, camera);
    },
    get side() { return side; },
    dispose() { renderer.dispose(); },
  };
}
