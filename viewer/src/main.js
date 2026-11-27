// InfraVis: the story (an interactive introduction, for first visits and
// for pitching the infrastructure) and the website it opens onto.
//   #            title -> the story
//   #story/<id>  straight to a chapter
//   #site[/...]  the website (explorer mode), also where Skip leads
import './style/base.css';
import './style/story.css';
import { installInkDefs, startBoil } from './draw/ink.js';
import { createFirefly } from './draw/firefly.js';

installInkDefs();
startBoil();

const app = document.getElementById('app');
const firefly = createFirefly();
let view = null;   // { update(dt, t) }

// the firefly: only the 3D one (it stays invisible until loaded). In the
// story it is fetched as soon as the page has painted; when the website is
// opened directly it waits until the page has settled, so it never competes
// with the first load. Without WebGL the drawn firefly stands in.
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
function loadFirefly() {
  import('./three/firefly3d.js').then((m) => m.createFirefly3D()).then((skin) => { if (skin) firefly.attach(skin); else firefly.useDrawn(); })
    .catch((e) => { console.warn('firefly 3D not loaded, using the drawn one:', e.message); firefly.useDrawn(); });
}
const siteFirst = location.hash.startsWith('#site');
const startFirefly = () => setTimeout(() => idle(loadFirefly, { timeout: 2000 }), siteFirst ? 3500 : 0);
if (document.readyState === 'complete') startFirefly(); else addEventListener('load', startFirefly, { once: true });

async function showSite(section) {
  const { createSite } = await import('./site/site.js');
  view = createSite(app, { firefly, section, onStory: () => { location.hash = ''; location.reload(); } });
}

async function showStory() {
  const { createStory } = await import('./story/story.js');
  view = createStory(app, { firefly, onSite: () => { history.replaceState(null, '', '#site'); showSite(); } });
}

if (location.hash.startsWith('#site')) showSite(location.hash.split('/')[1]); else showStory();

// one loop for everything that moves
let last = performance.now(), t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  if (!document.hidden) {
    firefly.update(dt);
    view?.update?.(dt, t);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
