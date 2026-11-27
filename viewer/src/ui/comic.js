// COMIC BOXES: the story is told in short texts, never narrated. Two kinds:
//   caption  the square yellow narrator box of a comic
//   speech   a balloon with a tail (the firefly speaking, or a researcher)
// comic(parent, { html, kind, at: { left|right|top|bottom }, tail, who, width })
// returns { el, show(), hide(), set(html) }. show() lets the words appear one
// after another (a reading pace, not a typewriter's).
import { el, sleep } from '../draw/ink.js';
import { reducedMotion } from '../theme.js';

function wordWrap(html) {
  // wrap each word of the text nodes in <span class="w">, leaving tags alone
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = (node) => {
    for (const c of [...node.childNodes]) {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) frag.appendChild(document.createTextNode(t));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.appendChild(s); }
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) walk(c);
    }
  };
  walk(tpl.content);
  return tpl.content;
}

export function comic(parent, { html = '', kind = 'speech', at = {}, tail = 'bottom', tailAt = null, who = null, width = null, tilt = null } = {}) {
  const box = el('div', { class: `comic ${kind}${kind === 'speech' && tail !== 'bottom' ? ' tail-' + tail : ''}`, role: 'note' }, parent);
  for (const [k, v] of Object.entries(at)) box.style[k] = typeof v === 'number' ? `${v}px` : v;
  if (width) box.style.maxWidth = typeof width === 'number' ? `${width}px` : width;
  if (tilt != null) box.style.setProperty('--tilt', `${tilt}deg`);
  if (tailAt != null) box.style.setProperty(tail === 'left' || tail === 'right' ? '--tail-y' : '--tail-x', typeof tailAt === 'number' ? `${tailAt}px` : tailAt);
  let token = 0;
  function fill(h) {
    box.innerHTML = '';
    if (who) box.appendChild(el('span', { class: 'who' }, null, who));
    box.appendChild(wordWrap(h));
  }
  fill(html);
  return {
    el: box,
    async show({ delay = 0, pace = 55 } = {}) {
      const my = ++token;
      if (delay) await sleep(delay);
      if (my !== token) return;
      box.classList.add('show');
      const words = box.querySelectorAll('.w');
      if (reducedMotion.matches) { words.forEach((w) => w.classList.add('on')); return; }
      await sleep(180);
      for (const w of words) { if (my !== token) return; w.classList.add('on'); await sleep(pace); }
    },
    hide() { token++; box.classList.remove('show'); },
    set(h, { reveal = true } = {}) { fill(h); if (reveal && box.classList.contains('show')) box.querySelectorAll('.w').forEach((w) => w.classList.add('on')); },
    remove() { token++; box.remove(); },
  };
}
