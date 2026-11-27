// A FOREST PLOT AS THE LASER SEES IT, after ForestVis (LNU): a few dozen
// thousand points made here (no download), coloured by height, by a
// simulated NDVI (greenness), or with one tree picked out, as ForestVis's
// views do. One draw call; the colouring is a uniform, so switching costs
// nothing. Points have a dark rim, so they read as ink dots on the board.
import * as THREE from 'three';
import { rng } from '../draw/ink.js';

const VERT = /* glsl */`
  attribute float aH;      // normalised height 0..1
  attribute float aNdvi;   // 0..1
  attribute float aTree;   // tree index, -1 ground
  uniform float uSize, uMode, uPick, uReveal, uTime;
  varying vec3 vCol; varying float vA;
  vec3 ramp(float t) {     // the InfraVis gradient, low -> high
    vec3 c0 = vec3(.11,.44,.72), c1 = vec3(.58,.11,.51), c2 = vec3(.89,.02,.07), c3 = vec3(.93,.42,.13), c4 = vec3(.98,.70,.20), c5 = vec3(1.,.93,0.);
    t = clamp(t, 0., 1.) * 5.;
    if (t < 1.) return mix(c0, c1, t); if (t < 2.) return mix(c1, c2, t - 1.);
    if (t < 3.) return mix(c2, c3, t - 2.); if (t < 4.) return mix(c3, c4, t - 3.); return mix(c4, c5, t - 4.);
  }
  vec3 ndviRamp(float t) { return mix(vec3(.55,.38,.2), vec3(.12,.62,.25), smoothstep(.15, .85, t)); }
  void main() {
    vec3 p = position;
    // reveal: points rise out of the ground plane, low ones first
    float r = clamp(uReveal * 1.6 - aH * .6, 0., 1.);
    p.y *= r;
    // leaves stir a little
    if (aTree >= 0. && aH > .3) p.x += sin(uTime * 1.3 + p.y * 3. + aTree) * .02 * aH;
    vec3 col = uMode < .5 ? ramp(aH) : ndviRamp(aNdvi);
    vA = 1.;
    if (uMode > 1.5) { bool on = abs(aTree - uPick) < .5; col = on ? ramp(aH) : vec3(.55); vA = on ? 1. : .28; }
    vCol = col;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_PointSize = uSize * (aTree < 0. ? .8 : 1.) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = /* glsl */`
  uniform vec3 uInk;
  varying vec3 vCol; varying float vA;
  void main() {
    vec2 q = gl_PointCoord * 2. - 1.; float d = dot(q, q);
    if (d > 1.) discard;
    vec3 c = mix(vCol, uInk, smoothstep(.45, .9, d) * .55);   // inked rim
    gl_FragColor = vec4(c, vA);
  }`;

export function createPointForest({ trees = 11, seed = 3 } = {}) {
  const r = rng(seed);
  const P = [], H = [], N = [], T = [];
  const spots = [];
  // trees on a jittered ring + centre (a small plot ~ 24 m across, units = m/10)
  for (let i = 0; i < trees; i++) {
    const a = (i / trees) * Math.PI * 2 + r() * 0.5, d = i === 0 ? 0 : 0.6 + r() * 0.55;
    spots.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: 1.1 + r() * 0.9, conifer: r() < 0.65, crown: 0.22 + r() * 0.14 });
  }
  const maxH = Math.max(...spots.map((s) => s.h));
  spots.forEach((s, ti) => {
    const ndviT = 0.45 + r() * 0.5;   // each tree's vigour
    const n = Math.round(1700 * s.h);
    for (let k = 0; k < n; k++) {
      let x, y, z;
      const u = r();
      if (u < 0.1) {   // trunk
        const a = r() * 6.283; y = r() * s.h * 0.45;
        x = s.x + Math.cos(a) * 0.025; z = s.z + Math.sin(a) * 0.025;
      } else if (s.conifer) {   // a cone of tiers
        y = s.h * (0.25 + r() * 0.75);
        const t = (y / s.h - 0.25) / 0.75;
        const rad = (1 - t) * s.crown * (0.8 + 0.2 * Math.cos(t * 30)) * Math.sqrt(r());
        const a = r() * 6.283; x = s.x + Math.cos(a) * rad; z = s.z + Math.sin(a) * rad;
      } else {   // a round broadleaf crown, points on its skin (LiDAR hits the outside)
        const a = r() * 6.283, b = Math.acos(2 * r() - 1), rad = s.crown * 1.25 * (0.85 + r() * 0.15);
        x = s.x + Math.sin(b) * Math.cos(a) * rad; z = s.z + Math.sin(b) * Math.sin(a) * rad;
        y = s.h * 0.62 + Math.cos(b) * rad * 0.8;
      }
      P.push(x, y, z); H.push(y / maxH); N.push(Math.min(1, ndviT * (0.6 + 0.4 * y / s.h) + (r() - 0.5) * 0.15)); T.push(ti);
    }
  });
  // ground returns
  for (let k = 0; k < 5000; k++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * 1.45;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, y = Math.sin(x * 2.1) * Math.cos(z * 1.7) * 0.03;
    P.push(x, y, z); H.push(0); N.push(0.2 + r() * 0.2); T.push(-1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aH', new THREE.Float32BufferAttribute(H, 1));
  g.setAttribute('aNdvi', new THREE.Float32BufferAttribute(N, 1));
  g.setAttribute('aTree', new THREE.Float32BufferAttribute(T, 1));
  const uniforms = {
    uSize: { value: 15 }, uMode: { value: 0 }, uPick: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 },
    uInk: { value: new THREE.Color(0x1f1d24) },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: true });
  const points = new THREE.Points(g, mat);
  return {
    points, uniforms, spots, count: P.length / 3,
    // stats for the comic box of a picked tree (simulated plot, labelled as such)
    treeInfo(i) {
      const s = spots[i];
      return { height: (s.h * 10 * 1.1).toFixed(1), crown: (s.crown * 20).toFixed(1), kind: s.conifer ? 'conifer' : 'broadleaf' };
    },
    dispose() { g.dispose(); mat.dispose(); },
  };
}
