// Review artefacts: before/after sheets and a 10 s screen recording of the GPU views.
// npm run review  (needs the dev server on :5173 and ffmpeg on PATH)
import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const R = join(import.meta.dirname, '..', 'review');
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });

// before / after sheets
const sheet = await b.newPage();
await sheet.setViewport({ width: 2440, height: 800 });
for (const [id, title] of [['4-gpu-first-view', 'GPU world · first view'], ['5-gpu-inside-sm', 'GPU world · inside one SM']]) {
  const img = (dir: string, lv: string) => {
    const f = join(R, dir, `${id}-dark-${lv}.png`);
    return existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : '';
  };
  const row = (lv: string) => `<div class="lv">${lv === 'beginner' ? 'Beginner' : 'Intermediate'}</div><div class="g"><figure><figcaption>Before</figcaption><img src="${img('before', lv)}"></figure><figure><figcaption>After</figcaption><img src="${img('after', lv)}"></figure></div>`;
  await sheet.setContent(`<!doctype html><style>body{margin:0;background:#16191a;color:#ddd;font:500 20px system-ui;padding:20px}h1{font:600 26px system-ui;margin:0 0 10px}.lv{margin:18px 0 8px;color:#9ab}.g{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}figcaption{margin:0 0 6px;color:#aaa}img{width:100%;display:block;border:1px solid #333;border-radius:4px}</style><h1>${title}</h1>${row('beginner')}${row('intermediate')}`, { waitUntil: 'load' });
  await sheet.screenshot({ path: join(R, `compare-${id}.png`), fullPage: true });
}

// 10 s recording: package view, then zoom into one SM
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.goto(`${BASE}/?theme=dark&level=intermediate#/gpu`, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 1500));
const rec = await p.screencast({ path: join(R, 'gpu-signals.webm') as `${string}.webm` });
await new Promise(r => setTimeout(r, 4500));
await p.evaluate(`[...document.querySelectorAll('.callout')].find(e => /SMs/.test(e.textContent))?.click()`);
await new Promise(r => setTimeout(r, 5800));
await rec.stop();
await b.close();
execSync(`ffmpeg -y -loglevel error -i "${join(R, 'gpu-signals.webm')}" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart "${join(R, 'gpu-signals.mp4')}"`);
console.log('review/: compare-*.png, gpu-signals.mp4');
