// Records a short walkthrough to review/walkthrough.mp4 (needs the dev server on :5173 and ffmpeg):
// CPU map → hover the L1 callout (tooltip) → click → L1 data cache page → step through → Go deeper.
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const R = join(import.meta.dirname, '..', 'review');
mkdirSync(R, { recursive: true });
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto(`${BASE}/?theme=dark&level=${process.env.LEVEL ?? 'beginner'}#/cpu?at=cores`, { waitUntil: 'networkidle0' });
await wait(800);
const webm = join(R, 'walkthrough.webm') as `${string}.webm`;
const rec = await p.screencast({ path: webm });
await wait(1200);
await p.hover('[data-id="l1d"] .c-main'); await wait(2200);
await p.click('[data-id="l1d"] .c-main'); await wait(3500);
for (let i = 1; i <= 4; i++) {
  await p.click(`.pp-steps li:nth-child(${i}) .pp-stephead`);
  await p.evaluate(() => scrollTo({ top: 0 }));
  await wait(i === 4 ? 5200 : 3200);
}
await p.evaluate(() => document.querySelector('.pp-deeper')?.scrollIntoView({ block: 'start' }));
await wait(600);
await p.click('.pp-deeper-h'); await wait(1500);
await p.evaluate(() => scrollBy({ top: 500, behavior: 'smooth' })); await wait(2000);
await rec.stop();
await b.close();
execSync(`ffmpeg -y -loglevel error -i "${webm}" -c:v libx264 -pix_fmt yuv420p -crf 22 -movflags +faststart "${join(R, 'walkthrough.mp4')}"`);
console.log('review/walkthrough.mp4');
