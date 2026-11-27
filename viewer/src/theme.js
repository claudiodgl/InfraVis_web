// LIGHT / DARK: a whiteboard by day, a blackboard by night. index.html sets
// <html data-theme> before first paint (saved choice, else the system's);
// this module keeps it in step with the system until the visitor picks one,
// and tells canvases (three.js, 2D) when the palette changes, since they
// cannot read CSS variables by themselves.

const listeners = new Set();
const root = document.documentElement;
const mq = matchMedia('(prefers-color-scheme: dark)');

function saved() { try { return localStorage.getItem('iv-theme'); } catch { return null; } }

export const theme = {
  get mode() { return root.dataset.theme === 'dark' ? 'dark' : 'light'; },
  set(mode, { persist = true } = {}) {
    if (mode === this.mode) return;
    root.dataset.theme = mode;
    if (persist) try { localStorage.setItem('iv-theme', mode); } catch { /* private mode */ }
    for (const fn of listeners) fn(mode);
  },
  toggle() { this.set(this.mode === 'dark' ? 'light' : 'dark'); },
  // a CSS custom property's current value, e.g. theme.css('--ink')
  css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

mq.addEventListener('change', (e) => { if (!saved()) theme.set(e.matches ? 'dark' : 'light', { persist: false }); });

// the sun / moon switch: one disc that turns into a crescent (a masking
// "bite" slides in) while the rays fold away. Each button has its own mask id
// (there is one in the story's bar and one in the site's header).
let btnCount = 0;
export function themeButton() {
  const b = document.createElement('button');
  b.className = 'iv-theme-btn';
  b.type = 'button';
  const id = `ivtm-${++btnCount}`;
  const label = () => (theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  const sync = () => { b.setAttribute('aria-label', label()); b.title = label(); b.setAttribute('aria-pressed', String(theme.mode === 'dark')); };
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">
    <mask id="${id}"><rect x="0" y="0" width="24" height="24" fill="#fff"/><circle class="bite" cx="17" cy="7" r="6" fill="#000"/></mask>
    <circle class="core" cx="12" cy="12" r="5" mask="url(#${id})"/>
    <g class="rays">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="12" y1="2.2" x2="12" y2="4.6" transform="rotate(${a} 12 12)"/>`).join('')}</g>
  </svg>`;
  b.addEventListener('click', () => theme.toggle());
  sync();
  theme.onChange(sync);
  return b;
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
