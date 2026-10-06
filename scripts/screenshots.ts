// npm run shots — every slice screen × dark/light × Beginner/Intermediate, plus phone views.
// Uses the system Chrome via puppeteer-core. Needs a running server (BASE, default the Vite dev server).
import puppeteer, { type Page } from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = join(import.meta.dirname, '..', 'shots');
mkdirSync(OUT, { recursive: true });

const ONLY = process.env.ONLY;
const ALL = [
  { id: '1-home', hash: '#/', wait: 1500, full: true },
  { id: '2-cpu-first-view', hash: '#/cpu', wait: 1500, full: false },
  { id: '3-cpu-inside-core', hash: '#/cpu?at=cores', wait: 1500, full: false },
  { id: '4-gpu-first-view', hash: '#/gpu', wait: 1500, full: false },
  { id: '5-gpu-inside-sm', hash: '#/gpu?at=sms', wait: 1500, full: false },
  { id: '6-gpu-server', hash: '#/gpu?at=server', wait: 1500, full: false },
  { id: '7-cache-lesson-hook', hash: '#/lesson/m-cache', wait: 1400, full: false },
  { id: '8-cache-lesson-step4', hash: '#/lesson/m-cache?step=4', wait: 3600, full: true },
  { id: '9-foundations', hash: '#/foundations', wait: 800, full: false },
];
const SCREENS = ALL.filter(s => !ONLY || ONLY.split(',').some(o => s.id.startsWith(o)));
const THEMES = (process.env.THEMES ?? 'dark,light').split(',') as ('dark' | 'light')[];
const LEVELS = ['beginner', 'intermediate'] as const;

async function shoot(page: Page, url: string, file: string, wait: number, full: boolean) {
  const vp = page.viewport()!;
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  if (full) {
    // Grow the viewport to the page height first (more reliable than fullPage capture), then let animations finish.
    await new Promise(r => setTimeout(r, 300));
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewport({ ...vp, height: Math.max(vp.height, h) });
  }
  await new Promise(r => setTimeout(r, wait));
  await page.screenshot({ path: file });
  await page.setViewport(vp);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const made: string[] = [];
for (const s of SCREENS) for (const t of THEMES) for (const l of LEVELS) {
  const f = join(OUT, `${s.id}-${t}-${l}.png`);
  await shoot(page, `${BASE}/?theme=${t}&level=${l}${s.hash}`, f, s.wait, s.full);
  made.push(f); process.stdout.write('.');
}
// phones (vertical layouts)
if (!ONLY) {
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
for (const [id, hash, wait] of [['home', '#/', 1200], ['cpu-map', '#/cpu', 1200], ['lesson-cache', '#/lesson/m-cache?step=3', 3000]] as const) {
  for (const l of LEVELS) {
    const f = join(OUT, `phone-${id}-dark-${l}.png`);
    await shoot(page, `${BASE}/?theme=dark&level=${l}${hash}`, f, wait, true);
    made.push(f); process.stdout.write('.');
  }
}
}

// contact sheets: one per screen, 2 × 2 (dark/light × Beginner/Intermediate)
const sheetPage = await browser.newPage();
await sheetPage.setViewport({ width: 2440, height: 800, deviceScaleFactor: 1 });
for (const s of SCREENS) {
  const img = (t: string, l: string) => `data:image/png;base64,${readFileSync(join(OUT, `${s.id}-${t}-${l}.png`)).toString('base64')}`;
  const cell = (t: string, l: string) => `<figure><figcaption>${t === 'dark' ? 'Phosphor Lab dark' : 'Phosphor Lab light'} · ${l === 'beginner' ? 'Beginner' : 'Intermediate'}</figcaption><img src="${img(t, l)}"></figure>`;
  await sheetPage.setContent(`<!doctype html><style>
    body{margin:0;background:#1b1d1f;font:500 20px system-ui;color:#ddd;padding:20px}
    h1{font:600 24px system-ui;margin:0 0 16px}
    .g{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
    figure{margin:0} figcaption{margin:0 0 8px;color:#aaa} img{width:100%;display:block;border:1px solid #333;border-radius:6px}
  </style><h1>${s.id}</h1><div class="g">${THEMES.flatMap(t => LEVELS.map(l => cell(t, l))).join('')}</div>`, { waitUntil: 'load' });
  await sheetPage.screenshot({ path: join(OUT, `sheet-${s.id}.png`), fullPage: true });
}
await browser.close();
console.log(`\n${made.length} screenshots + ${SCREENS.length} contact sheets in shots/`);
