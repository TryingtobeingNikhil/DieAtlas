// npm run perf — worst-case map redraw time per view (forces a full re-render of the art 8×).
// Needs `npx vite preview` (port 4173) on a fresh build. Budget: no frame over 50 ms.
import puppeteer from 'puppeteer-core';
const MEASURE = `new Promise(res => {
  const g = document.querySelector('.cm-art > g'); const t0 = g.getAttribute('transform');
  const times = []; let n = 0;
  function frame() {
    const s = performance.now();
    g.setAttribute('transform', t0.replace(/scale\\(([\\d.]+)\\)/, (m, k) => 'scale(' + (+k * (n % 2 ? 1.0001 : 0.9999)) + ')'));
    requestAnimationFrame(() => { times.push(performance.now() - s); if (++n < 8) setTimeout(frame, 50); else res(times.map(x => Math.round(x))); });
  }
  frame();
})`;
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
let worst = 0;
for (const [view, url] of [['CPU board', '#/cpu?at=board'], ['CPU die', '#/cpu'], ['CPU core', '#/cpu?at=cores'], ['GPU server', '#/gpu?at=server'], ['GPU package', '#/gpu'], ['GPU compute unit', '#/gpu?at=cu']]) {
  await p.goto('http://localhost:4173/' + url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const t = (await p.evaluate(MEASURE)) as number[];
  const max = Math.max(...t); worst = Math.max(worst, max);
  console.log(`${view.padEnd(18)} redraw ms: ${t.join(' ')}   max ${max}`);
}
await b.close();
console.log(worst <= 50 ? `\nOK: worst redraw ${worst} ms ≤ 50 ms` : `\nOVER BUDGET: worst redraw ${worst} ms`);
process.exit(worst <= 50 ? 0 : 1);
