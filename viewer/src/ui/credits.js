// Project credits in comic form: the project, the nodes that did it (in the
// logo colour each node takes in the finale), and the faces of the people on
// it (portraits from infravis.se; initials when there is none).
import { PEOPLE } from '../data/people.js';
import { NODE, nodeColor } from '../data/nodes.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();
const byName = new Map(PEOPLE.map((p) => [norm(p.name), p]));
export const findPerson = (name) => byName.get(norm(name)) ?? null;

export function initials(name) {
  return name.split(/\s+/).filter((w) => /^[A-ZÅÄÖÉ]/.test(w)).map((w) => w[0]).slice(0, 2).join('');
}

export function face(name, { size = 34, node = null } = {}) {
  const p = findPerson(name);
  const ring = node ? nodeColor(node) : 'var(--ink)';
  if (!p) return '';   // no portrait: no circle (initials were not readable)
  return `<span class="face" style="--s:${size}px;--ring:${ring}" title="${name}"><img src="${p.img}" alt="${name}" loading="lazy"></span>`;
}

// the university's emblem (static/lib/logos/icons, pipeline/build_icons.mjs)
export const iconURL = (id) => `./lib/logos/icons/${id}.webp`;
export function nodeIcon(id, size = 22) {
  const n = NODE[id];
  return n ? `<img class="node-icon" src="${iconURL(id)}" alt="${n.name}" title="${n.name}" width="${size}" height="${size}" style="--s:${size}px">` : '';
}
export function nodeBadge(id) {
  const n = NODE[id];
  return n ? `<span class="node-badge" style="--c:${nodeColor(id)}" title="${n.name}">${nodeIcon(id, 20)}${n.short}</span>` : '';
}

// only the people we have a portrait of (initials in a circle read as nothing)
export function creditHTML(p, { faces = 5 } = {}) {
  const ppl = p.people.filter((x) => findPerson(x.name)).slice(0, faces).map((x) => face(x.name, { node: x.node })).join('');
  return `<span class="who">${p.title}</span>${p.subtitle}<span class="credit-row">${p.nodes.map(nodeBadge).join('')}${ppl ? `<span class="faces">${ppl}</span>` : ''}</span>`;
}

export const CREDIT_CSS = `
.face { width: var(--s); height: var(--s); border-radius: 50%; display: inline-grid; place-items: center; overflow: hidden;
  border: 2px solid var(--ring); background: var(--paper-2); box-shadow: 0 0 0 1.5px var(--box); flex: none;
  font: 700 calc(var(--s) * .36) var(--font-ui); color: var(--ink); }
.face img { width: 100%; height: 100%; object-fit: cover; display: block; }
.faces { display: inline-flex; }
.faces .face + .face { margin-left: -8px; }
.node-icon { width: var(--s); height: var(--s); border-radius: 50%; background: #fff; padding: 2px; box-sizing: border-box; object-fit: contain; vertical-align: middle; flex: none; }
/* a university: its round emblem, ringed in its node colour, and its short name (no box) */
.node-badge { display: inline-flex; align-items: center; gap: 5px; padding: 0 6px 0 0;
  font: 700 12px var(--font-ui); letter-spacing: .03em; color: var(--ink); }
.node-badge .node-icon { box-shadow: 0 0 0 2px var(--c); }
.credit-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.credit-row .faces { margin-left: 6px; }
`;
let installed = false;
export function installCreditCSS() {
  if (installed) return; installed = true;
  const s = document.createElement('style'); s.textContent = CREDIT_CSS; document.head.appendChild(s);
}
