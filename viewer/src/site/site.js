// THE WEBSITE ("explorer mode", after the story; Skip leads here too), laid
// out as infravis.se is today, section by section: header, grey hero with the
// site's own three-layer wave, partner strip, the grey band (the call block,
// the story block, the highlights carousel, news and newsletter), the purple
// user-support section, the footer. Content from the current site and the
// projects database; what the new site will finally say is still to decide.
//
// Motion, kept gentle: the wave layers breathe, curved lines drift behind the
// hero and the support section, the carousel turns on its own, cards lift —
// and the firefly follows the scroll, perching on an edge of the interface
// (a card's top, a button, a section's border), riding along with it, and
// taking off for the next one when it scrolls away.
import './site.css';
import { el } from '../draw/ink.js';
import { themeButton } from '../theme.js';
import { PROJECTS_DB } from '../data/collab.js';
import { NODE } from '../data/nodes.js';
import { nodeIcon, installCreditCSS } from '../ui/credits.js';
import { liveLockup } from './logoLoop.js';

const NAV = [
  ['Home', '#site', true], ['Projects', 'https://infravis.se/projects/projects/', false, true], ['Services & Resources', 'https://infravis.se/services-resources/'],
  ['News & Events', 'https://infravis.se/news-events/'], ['About InfraVis', 'https://infravis.se/about-infravis/', false, true], ['Our Impact', 'https://infravis.se/our-impact/'],
];
const PARTNERS = [
  ['vr', 'Swedish Research Council', 'https://www.vr.se/english.html'],
  ['chalmers', 'Chalmers', 'https://www.chalmers.se/en/'], ['gu', 'University of Gothenburg', 'https://www.gu.se/en'],
  ['kth', 'KTH', 'https://www.kth.se/en'], ['liu', 'Linköping University', 'https://liu.se/en'],
  ['lnu', 'Linnaeus University', 'https://lnu.se/en/'], ['lu', 'Lund University', 'https://www.lunduniversity.lu.se/'],
  ['miun', 'Mid Sweden University', 'https://www.miun.se/en/'], ['umu', 'Umeå University', 'https://www.umu.se/en/'],
  ['uu', 'Uppsala University', 'https://www.uu.se/en'],
];
const ext = (href) => (href.startsWith('http') ? ' target="_blank" rel="noopener"' : '');

// the header alone: the story's finale builds the same bar before handing over
export function buildHeader(parent, { onStory } = {}) {
  const h = el('header', { class: 's-header' }, parent);
  const w = el('div', { class: 's-wrap' }, h);
  el('a', { class: 's-logo', href: '#site', 'aria-label': 'InfraVis home', 'data-perch': '' }, w, '<img src="./lib/logos/infravis-white-text.svg" alt="InfraVis">');
  const nav = el('nav', { class: 's-nav', 'aria-label': 'Main' }, w);
  NAV.forEach(([t, href, cur, drop]) => nav.insertAdjacentHTML('beforeend', `<a href="${href}" class="${cur ? 'current' : ''} ${drop ? 'drop' : ''}"${ext(href)}>${t}</a>`));
  const right = el('div', { class: 's-right' }, w);
  const story = el('button', { class: 's-story-btn', type: 'button', title: 'Watch the story again' }, right, '✦ <span>The story</span>');
  story.addEventListener('click', () => onStory?.());
  right.appendChild(themeButton());
  el('a', { class: 's-pill', href: 'https://infravis.se/services-resources/', target: '_blank', rel: 'noopener', 'data-perch': '' }, right, 'Apply For Support');
  const burger = el('button', { class: 's-burger', type: 'button', 'aria-label': 'Menu' }, w, '☰');
  burger.addEventListener('click', () => nav.classList.toggle('open'));
  return h;
}

// the hero's wave: three layers in the shape of the site's own divider (a
// long swell, highest on the right), each drawn twice as wide as the screen
// as a seamless repeating curve and slid sideways at its own speed — the
// front layer solid, the two behind it see-through, as on infravis.se
const WAVE_LAYERS = [
  { base: 62, a1: 20, a2: 7, ph: 0.0, op: 1, dur: 38, dir: 1 },
  { base: 55, a1: 24, a2: 9, ph: 1.3, op: 0.4, dur: 29, dir: -1 },
  { base: 50, a1: 28, a2: 8, ph: 2.4, op: 0.4, dur: 46, dir: 1 },
];
function wavePath({ base, a1, a2, ph }) {
  const pts = [];
  for (let x = 0; x <= 2000; x += 20) {
    const t = (x / 1000) * Math.PI * 2;
    pts.push(`${x},${(base - a1 * Math.sin(t + ph) - a2 * Math.sin(2 * t + ph * 1.7)).toFixed(1)}`);
  }
  return `M0,100 L${pts.join(' L')} L2000,100 Z`;
}
const waveSVG = () => `<svg class="wave" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">${WAVE_LAYERS.map((l) =>
  `<g class="wl" style="opacity:${l.op}; animation-duration:${l.dur}s; animation-direction:${l.dir > 0 ? 'normal' : 'reverse'}"><path d="${wavePath(l)}"/></g>`).join('')}</svg>`;
// drifting curved lines (a faint network) behind a section
function linesSVG(n, seed) {
  let s = seed, out = '';
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) {
    const y0 = r() * 100, y1 = r() * 100, c1 = r() * 100, c2 = r() * 100;
    out += `<path d="M-5 ${y0.toFixed(1)} C 30 ${c1.toFixed(1)}, 70 ${c2.toFixed(1)}, 105 ${y1.toFixed(1)}" vector-effect="non-scaling-stroke"/>`;
  }
  return `<svg class="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}

export function heroHTML() {
  return `${linesSVG(9, 7)}<div class="s-wrap">
      <h1>The National Research Infrastructure For Data Visualization</h1>
      <p>InfraVis helps you visualize research data from any scientific domain and gives you access to state-of-the-art visualization competence, support, equipment, training, and methods.</p>
      <a class="s-funded" href="https://www.vr.se/english.html" target="_blank" rel="noopener" data-perch><img src="./lib/logos/partners/vr.svg" alt="">Funded by the Swedish Research Council (Vetenskapsrådet)</a>
    </div>${waveSVG()}`;
}

const ARROW = '<svg viewBox="0 0 40 40"><path d="m15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z"/></svg>';

export function createSite(app, { firefly, onStory }) {
  installCreditCSS();
  const site = el('div', { class: 'site' }, app);
  const header = buildHeader(site, { onStory });
  // the header logo comes alive: it rebuilds itself now and then (logoLoop.js)
  liveLockup(header.querySelector('.s-logo'), { every: 16, first: 6 }).catch(() => {});
  const main = el('main', {}, site);

  // ---- hero ----
  el('section', { class: 's-hero' }, main, heroHTML());

  // ---- partners ----
  const partners = el('section', { class: 's-partners', 'aria-label': 'Funder and partner universities' }, main);
  const prow = el('div', { class: 's-wrap row' }, partners);
  PARTNERS.forEach(([id, name, url]) => prow.insertAdjacentHTML('beforeend', `<a href="${url}" target="_blank" rel="noopener" title="${name}"><img src="./lib/logos/partners/${id}.svg" alt="${name}" loading="lazy"></a>`));

  // ---- the grey band ----
  const band = el('section', { class: 's-band' }, main);
  const bw = el('div', { class: 's-wrap' }, band);
  bw.insertAdjacentHTML('beforeend', `
    <div class="s-call s-reveal">
      <a class="pic" href="https://infravis.se/services-resources/" target="_blank" rel="noopener" data-perch><canvas data-motes="green"></canvas><div class="t">InfraVis <span>2026</span><br>Call for applications</div></a>
      <div><h2>InfraVis Call 2026 Is Now Closed</h2>
        <p>The InfraVis annual call for applications 2026 is now closed. However, you are still always welcome to contact us throughout the year: <a href="mailto:info@infravis.se">info@infravis.se</a></p>
        <a class="s-link" href="https://infravis.se/services-resources/" target="_blank" rel="noopener">Apply now</a></div>
    </div>
    <div class="s-call s-reveal">
      <button class="pic story-pic" type="button" data-perch aria-label="Watch the InfraVis story" style="border:0;padding:0"><canvas data-motes="gold"></canvas><div class="t">The InfraVis <span>story</span></div></button>
      <div><h2>From a single tree to nine universities</h2>
        <p>Follow a firefly through forests scanned by laser, the trade that clears them and the flooded Amazon with its jaguars — and see how InfraVis connects nine universities around every project.</p>
        <button class="s-link story-again" type="button">Watch the story</button></div>
    </div>
    <p class="s-kicker">Highlights</p>`);
  bw.querySelectorAll('.story-again, .story-pic').forEach((b) => b.addEventListener('click', onStory));

  // the highlights carousel: the latest projects, from the projects database
  const latest = [...PROJECTS_DB].filter((p) => p.image).sort((a, b) => (b.year - a.year) || (b.id < a.id ? -1 : 1)).slice(0, 9);
  const car = el('div', { class: 's-carousel' }, bw);
  const vp = el('div', { class: 's-viewport' }, car);
  const track = el('div', { class: 's-track' }, vp);
  latest.forEach((p) => track.insertAdjacentHTML('beforeend', `<article class="s-card">
      <a class="img" href="${p.url}" target="_blank" rel="noopener" data-perch><img src="${p.image}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>
      <div class="bubble">${p.domain} · ${p.technique}</div>
      <div class="body"><h3><a href="${p.url}" target="_blank" rel="noopener">${p.title}</a></h3>
      <div class="meta">Posted ${p.year} · ${p.all.map((n) => nodeIcon(n, 22)).join('')} ${p.all.map((n) => NODE[n].short).join(', ')}</div>
      <p>${p.summary}</p></div></article>`));
  const prev = el('button', { class: 's-arrow prev', type: 'button', 'aria-label': 'Previous' }, car, ARROW);
  const next = el('button', { class: 's-arrow next', type: 'button', 'aria-label': 'Next' }, car, ARROW);
  const dots = el('div', { class: 's-dots' }, bw);
  let page = 0, hovering = false, lastTurn = 0;
  const perView = () => (innerWidth < 700 ? 1 : innerWidth < 1100 ? 2 : 3);
  const pages = () => Math.max(1, latest.length - perView() + 1);
  function go(i) {
    page = (i + pages()) % pages();
    const card = track.children[0];
    const step = card ? card.getBoundingClientRect().width + 30 : 0;
    track.style.transform = `translateX(${-page * step}px)`;
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === page));
    lastTurn = performance.now();
  }
  for (let i = 0; i < latest.length; i++) el('button', { type: 'button', 'aria-label': `Slide ${i + 1}` }, dots).addEventListener('click', () => go(i));
  prev.addEventListener('click', () => go(page - 1)); next.addEventListener('click', () => go(page + 1));
  car.addEventListener('mouseenter', () => { hovering = true; }); car.addEventListener('mouseleave', () => { hovering = false; });
  go(0);
  bw.insertAdjacentHTML('beforeend', `<p class="s-more"><a href="https://infravis.se/news-events/" target="_blank" rel="noopener">Read More News and Events</a> &gt;&gt;</p>
    <div class="s-sub"><a class="s-btn" href="https://infravis.se/news-events/" target="_blank" rel="noopener" data-perch>Subscribe to the InfraVis Newsletter</a></div>`);

  // ---- user support (purple) ----
  const sup = el('section', { class: 's-support', id: 'support' }, main);
  sup.innerHTML = `${linesSVG(12, 31)}<div class="s-wrap">
    <div class="center"><a class="s-btn" href="https://infravis.se/services-resources/" target="_blank" rel="noopener" data-perch>Apply For InfraVis User Support</a></div>
    <div class="s-steps">
      <div class="s-step s-reveal" data-perch><h3>Step 1</h3><p class="sub">Submit your question to InfraVis</p><p>Reach out to InfraVis by clicking "Receive support from InfraVis"</p>
        <div class="box">Do you come from an academic institution and want to discuss visualization opportunities in your data?</div><div class="box">Do you have a question about InfraVis services?</div></div>
      <div class="s-step s-reveal" data-perch><h3>Step 2</h3><p class="sub">A ticket is generated and handled</p><p>Handling Hours:<br>Monday–Friday, 09:00 – 16:00</p>
        <div class="box">You can expect the first response within three hours after submitting your question. Please expect a delay in response during July and around Christmas and New Year.</div></div>
      <div class="s-step s-reveal" data-perch><h3>Step 3</h3><p class="sub">You receive InfraVis user support</p><p>Depending on the nature of your inquiry, you receive three different levels of user support</p>
        <div class="box c"><b>Help-Desk Support</b>Free of charge</div><div class="box c"><b>Mid-Level Support</b>Free of charge</div><div class="box c"><b>In-Depth Support</b>Application process &amp; user fee applies</div></div>
    </div>
    <div class="s-levels s-reveal" data-perch><h3>Three Different Levels Of User Support</h3><div class="cols">
      <div class="col"><h4>Help-Desk Support</h4><ul><li>Internal evaluation of your submitted question</li><li>Guidance to the right InfraVis resources: an InfraVis Expert contacts you and provides you with advice</li></ul></div>
      <div class="col"><h4>Mid-Level Support</h4><p>For projects that typically require up to 80 hours of support</p><p>You meet with an InfraVis Expert to discuss visualization needs and possibilities in your data, and to determine the scope of the needed resources.</p></div>
      <div class="col"><h4>In-Depth Support</h4><p>For projects that typically require more than 80 hours of support</p><p>Through the annual open call (currently 300 SEK/hour) or an application at any other time of the year (600 SEK/hour).</p></div>
    </div></div>
    <div class="center"><a class="s-btn" href="https://infravis.se/services-resources/" target="_blank" rel="noopener" data-perch>Apply For InfraVis User Support</a></div></div>`;

  // ---- footer ----
  const ft = el('footer', { class: 's-footer' }, site);
  ft.innerHTML = `<div class="top">
      <div><img class="logo" src="./lib/logos/infravis-white-text.svg" alt="InfraVis" data-perch></div>
      <div><p>InfraVis is a national research infrastructure funded by the Swedish Research Council (Vetenskapsrådet) in support of scientific advancement through the application of state-of-the-art data analysis and visualization techniques.</p></div>
      <div><h4>Contact Us</h4><p>Email: <a href="mailto:info@infravis.se">info@infravis.se</a></p><p><a href="mailto:webmaster@infravis.se">webmaster@infravis.se</a></p></div>
      <div><h4>Partner universities</h4><p>${['chalmers', 'gu', 'kth', 'liu', 'lnu', 'lu', 'miun', 'umu', 'uu'].map((n) => nodeIcon(n, 26)).join(' ')}</p></div>
    </div>
    <div class="bottom">
      <div class="social"><a href="https://www.linkedin.com/company/infravis/" target="_blank" rel="noopener" aria-label="LinkedIn">in</a><a href="https://www.youtube.com/@infravis" target="_blank" rel="noopener" aria-label="YouTube">▶</a><a href="https://www.instagram.com/infravis/" target="_blank" rel="noopener" aria-label="Instagram">◎</a><a href="https://twitter.com/infravis" target="_blank" rel="noopener" aria-label="X">𝕏</a></div>
      <span>© ${new Date().getFullYear()} InfraVis</span>
      <form class="search" action="https://infravis.se/" method="get" target="_blank"><input name="s" type="search" placeholder="" aria-label="Search infravis.se"><button type="submit">Search</button></form>
    </div>
    <div class="credits">Prototype of a new InfraVis website. 3D firefly: “Lowpoly Firefly” by Caledhril (CC BY 4.0) · jaguar and terns from <a href="https://github.com/claudiodgl/AmazonMamiraua" target="_blank" rel="noopener">Amazon from within</a> · logos © their institutions.</div>`;

  // the footer's logo builds itself too, out of step with the header's
  liveLockup(ft.querySelector('.top > div'), { every: 16, first: 14 }).catch(() => {});

  // ---- reveal on scroll ----
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  site.querySelectorAll('.s-reveal').forEach((e) => io.observe(e));

  // ---- the firefly: following the scroll from perch to perch ----
  let perch = null, lastScroll = performance.now();
  // scrolling: back to the header at once (it waits there while the page moves)
  addEventListener('scroll', () => { lastScroll = performance.now(); if (perch && !perch.header) homePerch(); }, { passive: true });
  // on the website the firefly is a small companion (the story's is larger)
  const SIZE = 0.45;
  firefly.setSize(SIZE);
  firefly.blend(true);   // on the website: always the ink silhouette (black on white, white on dark)
  // (in the header it stands on the bar's lower edge, inside the bar)
  // white on the dark surfaces (the header, the purple support band, the footer), the theme's ink elsewhere
  const toneFor = (el) => (el.closest('.s-header, .s-support, .s-footer, .s-call .pic') ? 'white' : null);
  function perchPoint(p) {
    const r = p.el.getBoundingClientRect(), f = firefly.feet, dx = (firefly.feetDX ?? 0);
    return [r.left + r.width * p.fx - dx, (p.header ? r.bottom - 4 : r.top) - f + 1.5];   // (feet press 1.5 px into the edge)
  }
  // (sideways too: a carousel card it sits on can slide off the screen)
  const visible = ([x, y]) => y > 100 && y < innerHeight - 50 && x > 30 && x < innerWidth - 30;
  function choosePerch() {
    const all = [...site.querySelectorAll('main [data-perch], footer [data-perch]')].filter((e) => e !== perch?.el && e.getClientRects().length);
    const want = innerHeight * 0.4;
    let best = null, bestD = Infinity;
    for (const e of all) {
      const r = e.getBoundingClientRect();
      if (r.width < 30 || r.top < 120 || r.top > innerHeight - 70 || r.right < 0 || r.left > innerWidth) continue;
      const d = Math.abs(r.top - want) + Math.random() * 60;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) return;
    perch = { el: best, fx: 0.15 + Math.random() * 0.7 };
    firefly.tone(toneFor(best));
    const [x, y] = perchPoint(perch);
    firefly.flyTo(x, y, { duration: 1100, arc: 0.3 }).then(() => firefly.land(true));
  }
  // at the top of the page it sits in the header (on the logo); once the
  // visitor scrolls, it follows the page from perch to perch
  const headerBar = site.querySelector('.s-header');
  function homePerch() {
    // the free stretch of the bar between the menu and the buttons
    const nav = site.querySelector('.s-nav a:last-child')?.getBoundingClientRect(), btn = site.querySelector('.s-story-btn')?.getBoundingClientRect();
    const gapX = nav && btn && btn.left > nav.right + 80 ? (nav.right + btn.left) / 2 : innerWidth * 0.62;
    perch = { el: headerBar, fx: gapX / innerWidth, header: true };
    firefly.tone('white');
    const [x, y] = perchPoint(perch);
    firefly.flyTo(x, y, { duration: 1100, arc: 0.25 }).then(() => firefly.land(true));
  }
  setTimeout(homePerch, 300);

  // ---- the call blocks' pictures: drifting motes (drawn only when visible) ----
  const motes = [...site.querySelectorAll('canvas[data-motes]')].map((cv) => {
    const st = { cv, g: cv.getContext('2d'), on: false, kind: cv.dataset.motes, pts: Array.from({ length: 70 }, () => ({ a: Math.random() * 6.28, r: 0.15 + Math.random() * 0.33, p: Math.random() * 6.28, s: 0.2 + Math.random() * 0.6 })) };
    new IntersectionObserver(([e]) => { st.on = e.isIntersecting; }).observe(cv);
    return st;
  });

  return {
    update(dt, t) {
      // carousel: a turn every 7 s unless the visitor is looking at it
      if (!hovering && performance.now() - lastTurn > 7000) go(page + 1);
      // firefly: ride the perch; once it scrolls away (and scrolling has paused), move on
      // firefly: in the header while the page moves; after a few still
      // seconds away from the top, it flies to an edge in view and rides it
      if (perch && !firefly.flying) {
        const pt = perchPoint(perch);
        const still = performance.now() - lastScroll;
        if (perch.header) {
          firefly.stickTo(pt[0], pt[1]);
          if (scrollY > 160 && still > 2500) choosePerch();
        } else if (visible(pt)) firefly.stickTo(pt[0], pt[1]);
        else homePerch();
      }
      for (const m of motes) {
        if (!m.on) continue;
        const w = m.cv.clientWidth, h = m.cv.clientHeight;
        if (m.cv.width !== w) { m.cv.width = w; m.cv.height = h; }
        const { g } = m; g.clearRect(0, 0, w, h);
        const col = m.kind === 'green' ? '120,255,110' : '255,226,110';
        for (const q of m.pts) {
          const a = q.a + t * 0.08 * q.s, x = w / 2 + Math.cos(a) * q.r * w, y = h * 0.42 + Math.sin(a) * q.r * h * 0.9;
          const f = 0.25 + 0.75 * Math.max(0, Math.sin(t * q.s * 2 + q.p)) ** 3;
          const gr = g.createRadialGradient(x, y, 0, x, y, 9);
          gr.addColorStop(0, `rgba(${col},${f})`); gr.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = gr; g.fillRect(x - 9, y - 9, 18, 18);
        }
      }
    },
  };
}
