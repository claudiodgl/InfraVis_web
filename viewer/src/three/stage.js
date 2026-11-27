// ONE WEBGL RENDERER for every 3D moment of the story (the forest point
// cloud, the jaguar), made the first time a scene asks for it and moved from
// scene to scene with its canvas. Kept light on purpose:
//   - pixel ratio capped at 1.5, antialias only where the GPU is not tiny
//   - renders only while mounted, visible and the tab is shown
//   - the ink outline (OutlineEffect) is opt-in per scene
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { theme } from '../theme.js';

let stage = null;

export function getStage() {
  if (stage) return stage;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const outline = new OutlineEffect(renderer, { defaultThickness: 0.004, defaultColor: [0.12, 0.11, 0.14] });
  let host = null, ro = null, w = 1, h = 1;

  function fit() {
    if (!host) return;
    const r = host.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
  }

  stage = {
    THREE, renderer, canvas,
    get aspect() { return w / h; },
    get size() { return { w, h }; },
    mount(el) {
      host = el; el.appendChild(canvas);
      ro?.disconnect(); ro = new ResizeObserver(fit); ro.observe(el); fit();
    },
    unmount() { ro?.disconnect(); ro = null; canvas.remove(); host = null; },
    render(scene, camera, { ink = false } = {}) {
      if (!host || document.hidden) return;
      if (camera.isPerspectiveCamera && Math.abs(camera.aspect - w / h) > 1e-3) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
      if (ink) outline.render(scene, camera); else renderer.render(scene, camera);
    },
    // the theme's ink as a THREE.Color (outlines, point colours on paper)
    ink() { return new THREE.Color(theme.css('--ink') || '#1f1d24'); },
    paper() { return new THREE.Color(theme.css('--paper') || '#f7f4ec'); },
    toonRamp(steps = [90, 190, 255]) {
      const data = new Uint8Array(steps.flatMap((v) => [v, v, v, 255]));
      const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
      t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
      return t;
    },
    setOutlineColor(scene, color) {
      const c = color.toArray();
      scene.traverse((o) => { if (o.isMesh && o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((x) => { x.userData.outlineParameters = { ...(x.userData.outlineParameters || {}), color: c }; }); } });
    },
  };
  return stage;
}
