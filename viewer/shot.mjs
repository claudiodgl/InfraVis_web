// Headless check of the story / site through the system Microsoft Edge
// (playwright-core, as the Amazon viewer's probes do).
//   node shot.mjs <hash> <out.png> [steps...]
// steps: wait:<ms>  click:<css>  key:<Key>  move:<x>,<y>  theme:dark|light  size:<w>x<h>  shot:<file.png>
// Prints console errors and page errors; the dev server must be running
// (npm run dev, port 5180).
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { chromium } = req('playwright-core');

const [hash = '', out = 'shot.png', ...steps] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let size = { width: 1440, height: 900 };
const pre = steps.find((s) => s.startsWith('size:'));
if (pre) { const [w, h] = pre.slice(5).split('x').map(Number); size = { width: w, height: h }; }
const theme = steps.find((s) => s.startsWith('theme:'))?.slice(6);
const mobile = steps.includes('mobile:1');   // a phone: touch, small screen, 2x pixels
const ctx = await b.newContext({ viewport: size, colorScheme: theme === 'dark' ? 'dark' : 'light', ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await p.goto(`http://localhost:5180/${hash}`, { waitUntil: 'load' });
for (const s of steps) {
  const [k, v] = [s.slice(0, s.indexOf(':')), s.slice(s.indexOf(':') + 1)];
  if (k === 'wait') await p.waitForTimeout(+v);
  else if (k === 'tap') await p.tap(v, { timeout: 5000 }).catch((e) => errors.push(`[tap] ${v}: ${e.message.split('\n')[0]}`));
  else if (k === 'click') await p.click(v, { timeout: 5000 }).catch((e) => errors.push(`[click] ${v}: ${e.message.split('\n')[0]}`));
  else if (k === 'key') await p.keyboard.press(v);
  else if (k === 'move') { const [x, y] = v.split(',').map(Number); await p.mouse.move(x, y, { steps: 12 }); }
  else if (k === 'drag') { const [x, y, x2, y2] = v.split(',').map(Number); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x2, y2, { steps: 15 }); await p.mouse.up(); }
  else if (k === 'shot') await p.screenshot({ path: v });
}
await p.screenshot({ path: out });
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close();
