// npm run validate — content contract, map coverage, quizzes, challenges, bundle budget.
// Exits non-zero on any failure. Pass --skip-build to reuse an existing dist/.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { COMPONENTS } from '../src/content/components';
import { LESSONS } from '../src/content/lessons';
import { CHIP_WORLDS, walk } from '../src/content/chipmaps';
import { SPECS } from '../src/content/specs';
import { CACHE_LABS } from '../src/content/labs';
import { runAll } from '../src/sim/cache';
import type { LT, Scene } from '../src/content/types';
import { PAGE_IDS, loadPage } from '../src/content/parts';
import type { Cue } from '../src/content/parts/types';
import { FIGURE_SPECS } from '../src/figures';
import { term } from '../src/content/glossary';
import { plain } from '../src/lib/prose';

const FIRST_LOAD_BUDGET_KB = 200;
const MAX_WORDS = 45, MAX_SENTENCE = 20;
const stepStats: number[] = [];
const errors: string[] = [];
const notes: string[] = [];
const fail = (m: string) => errors.push(m);
const both = (v: LT | undefined, where: string) => {
  if (v == null) return fail(`${where}: missing text`);
  if (typeof v === 'string') { if (!v.trim()) fail(`${where}: empty text`); return; }
  if (!v.b?.trim() || !v.i?.trim()) fail(`${where}: needs both beginner (b) and intermediate (i) text`);
};
const section = (t: string) => console.log(`\n\x1b[1m${t}\x1b[0m`);
let checks = 0;
const ok = (m: string) => { checks++; console.log(`  \x1b[32m✓\x1b[0m ${m}`); };

// ---------- components & chip maps ----------
section('Map components & chip maps');
const compIds = new Set<string>();
for (const c of COMPONENTS) { if (compIds.has(c.id)) fail(`duplicate component ${c.id}`); compIds.add(c.id); }
const placed = new Set<string>();
const MAX_PER_LEVEL = 6;
for (const w of Object.values(CHIP_WORLDS)) {
  const ids = new Set<string>();
  let levels = 0, maxKids = 0, regions = 0;
  walk(w.root, r => {
    regions++;
    if (ids.has(r.id)) fail(`${w.world} map: duplicate region id ${r.id}`);
    ids.add(r.id);
    both(r.label, `${w.world} region ${r.id}.label`);
    if (r.comp) { if (!compIds.has(r.comp)) fail(`${w.world} region ${r.id}: unknown component ${r.comp}`); placed.add(r.comp); }
    if (!r.rects.length) fail(`${w.world} region ${r.id}: no shape`);
    if (r.children) {
      levels++; maxKids = Math.max(maxKids, r.children.length);
      if (r.children.length > MAX_PER_LEVEL) fail(`${w.world} region ${r.id}: ${r.children.length} clickable regions (max ${MAX_PER_LEVEL})`);
    }
    if (!r.comp && !r.desc && r !== w.root) fail(`${w.world} region ${r.id}: needs a component or a description`);
  });
  if (!ids.has(w.initial)) fail(`${w.world} map: initial region ${w.initial} missing`);
  ok(`${w.world.toUpperCase()} chip map: ${regions} regions over ${levels} zoom levels, max ${maxKids} clickable per level (limit ${MAX_PER_LEVEL})`);
}
for (const c of COMPONENTS) {
  if ((c.world === 'cpu' || c.world === 'gpu') && !placed.has(c.id)) fail(`component ${c.id} is not drawn on the ${c.world} chip map`);
  both(c.hover as LT, `${c.id}.hover`); both(c.teaser as LT, `${c.id}.teaser`);
}
// bridge + foundations components are drawn by the Bridge and Home screens (every one of them)
const onAMap = (id: string) => placed.has(id) || COMPONENTS.some(c => c.id === id && (c.world === 'bridge' || c.world === 'foundations'));
ok(`${COMPONENTS.length} components: ${placed.size} drawn on the chip maps, the rest on the Bridge/Foundations screens`);

// ---------- map tooltips ----------
section('Map tooltips (hover / ⓘ)');
for (const c of COMPONENTS.filter(c => c.world === 'cpu' || c.world === 'gpu')) {
  if (!c.tech || !c.friendly) fail(`${c.id}: tooltip needs a name (tech + friendly)`);
  for (const lv of ['b', 'i'] as const) {
    const h = typeof c.hover === 'string' ? c.hover : c.hover[lv];
    if (!h) fail(`${c.id}: tooltip sentence missing`);
    else if (h.length > 170) fail(`${c.id}: tooltip sentence is ${h.length} chars (max 170, ~3 lines)`);
  }
}
ok('every CPU/GPU component has a name and a one-sentence tooltip of ≤ 3 lines in both levels');

// ---------- component pages ----------
section('Component pages (six sections + Go deeper)');
const BEGINNER_MIN = 350, BEGINNER_SOFT_MAX = 550, DEEPER_MIN = 300;
const words = (xs: string[]) => xs.map(plain).join(' ').split(/\s+/).filter(Boolean).length;
const termsIn = (s: string) => [...s.matchAll(/\[\[(.+?)\]\]/g)].map(m => (m[1].includes('|') ? m[1].split('|')[1] : m[1]));
const partsIn = (s: string) => [...s.matchAll(/\(\((.+?)\|(.+?)\)\)/g)].flatMap(m => m[2].split(',').map(x => x.trim()));
for (const id of PAGE_IDS) {
  const pg = (await loadPage(id))!;
  const where = `page ${id}`;
  if (pg.id !== id) fail(`${where}: id mismatch (${pg.id})`);
  if (!compIds.has(id)) fail(`${where}: no such component`);
  const spec = FIGURE_SPECS[pg.figure];
  if (!spec) { fail(`${where}: unknown figure ${pg.figure}`); continue; }
  const cue = (c: Cue | undefined, w: string) => {
    if (!c) return;
    c.parts?.forEach(p => { if (!spec.parts.includes(p)) fail(`${where} ${w}: figure '${pg.figure}' has no part '${p}'`); });
    if (c.mode && !spec.modes.includes(c.mode)) fail(`${where} ${w}: figure '${pg.figure}' has no mode '${c.mode}'`);
  };
  cue(pg.does.cue, 'does'); pg.how.forEach((h, i) => cue(h.cue, `step ${i + 1}`)); pg.deeper.mechanism.forEach(m => cue(m.cue, m.title));
  if (pg.how.length < 3 || pg.how.length > 5) fail(`${where}: ${pg.how.length} "how" steps (3–5)`);
  if (pg.numbers.length < 2 || pg.numbers.length > 4) fail(`${where}: ${pg.numbers.length} key numbers (2–4)`);
  if (pg.check.length < 1 || pg.check.length > 2) fail(`${where}: ${pg.check.length} check questions (1–2)`);
  pg.check.forEach((q, i) => { if (q.answer < 0 || q.answer >= q.options.length) fail(`${where}: question ${i + 1} answer out of range`); if (!q.why) fail(`${where}: question ${i + 1} has no explanation`); });
  if (pg.connected.length < 2 || pg.connected.length > 3) fail(`${where}: ${pg.connected.length} connected links (2–3)`);
  pg.connected.forEach(x => { if (!compIds.has(x.id)) fail(`${where}: connected to unknown component ${x.id}`); });
  if (pg.lesson && !LESSONS.some(l => l.id === pg.lesson)) fail(`${where}: unknown lesson ${pg.lesson}`);
  if (!pg.sources.length || pg.sources.some(s => !s.title || !(s.year > 1900))) fail(`${where}: every source needs a title and year`);
  // writing contract
  // reading prose of the Beginner view (the quiz is interaction, counted separately)
  const beginner = [pg.what, pg.does.text, ...pg.why, ...pg.how.map(h => h.title + '. ' + h.text), ...pg.numbers.map(n => n.value + ' ' + n.meaning), pg.realWorld];
  const quiz = pg.check.flatMap(q => [q.q, ...q.options, q.why]);
  const deeper = [...pg.deeper.mechanism.map(m => m.title + '. ' + m.text), pg.deeper.formula.where, pg.deeper.worked.q, ...pg.deeper.worked.steps, pg.deeper.worked.answer, ...pg.deeper.choices.map(c => c.title + '. ' + c.text)];
  const bw = words(beginner), dw = words(deeper);
  if (bw < BEGINNER_MIN) fail(`${where}: Beginner view is ${bw} words (minimum ${BEGINNER_MIN})`);
  if (bw > BEGINNER_SOFT_MAX) notes.push(`${where}: Beginner view is ${bw} words (guide ~350–500)`);
  if (dw < DEEPER_MIN) fail(`${where}: Go deeper adds ${dw} words (minimum ${DEEPER_MIN})`);
  if (!/\d/.test(pg.why.join(' '))) fail(`${where}: "Why do we need it?" has no concrete number`);
  if (!beginner.concat(quiz, deeper).some(t => plain(t).includes(pg.example.mustContain) || t.includes(pg.example.mustContain))) fail(`${where}: the concrete example ("${pg.example.mustContain}") isn't in the text`);
  const all = [...beginner, ...quiz, ...deeper, ...pg.connected.map(c => c.why)];
  for (const t of all.flatMap(termsIn)) if (!term(t)) fail(`${where}: undefined glossary term [[${t}]]`);
  for (const p of all.flatMap(partsIn)) if (!spec.parts.includes(p)) fail(`${where}: text highlights unknown part '${p}'`);
  const longParas = all.filter(t => plain(t).split(/(?<=[.!?])\s+(?=[A-Z(])/).length > 5).length;
  if (longParas) notes.push(`${where}: ${longParas} paragraph(s) over 5 sentences`);
  ok(`${id}: Beginner ${bw} words (≈ ${Math.round(bw / 200 * 10) / 10} min) + ${words(quiz)}-word quiz, Go deeper +${dw}; ${pg.how.length} steps, ${pg.numbers.length} numbers, ${pg.check.length} questions; ${new Set(all.flatMap(termsIn)).size} glossary terms; figure '${pg.figure}' cues valid`);
}
const pending = COMPONENTS.filter(c => (c.world === 'cpu' || c.world === 'gpu') && !PAGE_IDS.includes(c.id)).map(c => c.id);
notes.push(`component pages written: ${PAGE_IDS.length}; still to write (batch 2): ${pending.length} — ${pending.join(', ')}`);

// ---------- lessons ----------
section('Lessons');
const lessonIds = new Set<string>();
for (const l of LESSONS) {
  if (lessonIds.has(l.id)) fail(`duplicate lesson ${l.id}`);
  lessonIds.add(l.id);
  if (!l.components.length) fail(`${l.id}: no components`);
  for (const c of l.components) if (!compIds.has(c)) fail(`${l.id}: references unknown component ${c}`);
  if (!l.components.some(onAMap)) fail(`${l.id}: does not appear on any map`);
  if (l.level !== 'beginner' && l.level !== 'intermediate') fail(`${l.id}: missing Beginner/Intermediate tag`);
  both(l.title, `${l.id}.title`);
}
for (const c of COMPONENTS) if (!LESSONS.some(l => l.components.includes(c.id))) fail(`component ${c.id} has no lesson`);
const byWorld = (w: string) => LESSONS.filter(l => l.world === w).length;
ok(`${LESSONS.length} lessons (foundations ${byWorld('foundations')}, CPU ${byWorld('cpu')}, GPU ${byWorld('gpu')}, bridge ${byWorld('bridge')}); every component has ≥1 lesson and every lesson is on a map`);
ok(`level tags: ${LESSONS.filter(l => l.level === 'beginner').length} Beginner, ${LESSONS.filter(l => l.level === 'intermediate').length} Intermediate`);

function sceneIds(s: Scene) {
  const ids = new Set<string>();
  for (const n of s.nodes) {
    ids.add(n.id);
    if (n.type === 'grid') for (let r = 0; r < n.rows; r++) { ids.add(`${n.id}:r${r}`); for (let c = 0; c < n.cols; c++) ids.add(`${n.id}.${r}.${c}`); }
  }
  return ids;
}
const matches = (ids: Set<string>, pat: string) => (pat.endsWith('*') ? [...ids].some(i => i.startsWith(pat.slice(0, -1))) : ids.has(pat));

section('Ready lessons: content contract');
for (const l of LESSONS.filter(x => x.status === 'ready')) {
  if (l.custom) {
    l.custom.takeaways.forEach((t, i) => both(t, `${l.id}.takeaway[${i}]`));
    l.custom.quiz.forEach((q, i) => {
      both(q.q, `${l.id}.quiz[${i}]`); both(q.why, `${l.id}.quiz[${i}].why`);
      if (q.answer < 0 || q.answer >= q.choices.length) fail(`${l.id}.quiz[${i}]: answer ${q.answer} out of range`);
    });
    ok(`${l.id}: custom page, ${l.custom.quiz.length} quiz question(s), answers in range, both levels`);
    continue;
  }
  const b = l.body;
  if (!b) { fail(`${l.id}: status ready but no body`); continue; }
  const ids = sceneIds(b.scene);
  if (b.steps.length < 4 || b.steps.length > 7) fail(`${l.id}: ${b.steps.length} steps (want 4–7)`);
  b.steps.forEach((s, i) => {
    const w = `${l.id}.step[${i}:${s.id}]`;
    both(s.title, `${w}.title`);
    if ('sameForBothLevels' in s.say) { if (!s.say.both.trim()) fail(`${w}: empty say`); }
    else { if (!s.say.beginner?.trim()) fail(`${w}: missing beginner text`); if (!s.say.intermediate?.trim()) fail(`${w}: missing intermediate text`); if (s.say.beginner === s.say.intermediate) fail(`${w}: identical texts; mark sameForBothLevels instead`); }
    const texts = 'sameForBothLevels' in s.say ? { both: s.say.both } : { beginner: s.say.beginner, intermediate: s.say.intermediate };
    for (const [lv, t] of Object.entries(texts)) {
      const plain = t.replace(/\*\*|`|\{(gpu|cpu|mem|math|err):|\}/g, '');
      const sents = plain.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).filter(Boolean);
      const words = plain.split(/\s+/).length, longest = Math.max(...sents.map((x: string) => x.split(/\s+/).length));
      if (sents.length > 4) fail(`${w} (${lv}): ${sents.length} sentences (max 4); move detail into Go deeper`);
      if (words > MAX_WORDS) fail(`${w} (${lv}): ${words} words (max ${MAX_WORDS}); move detail into Go deeper`);
      if (longest > MAX_SENTENCE) fail(`${w} (${lv}): a ${longest}-word sentence (max ${MAX_SENTENCE})`);
      stepStats.push(words);
    }
    if (!matches(ids, s.anchor)) fail(`${w}: anchor ${s.anchor} not in scene`);
    if (s.deeper) both(s.deeper.text, `${w}.deeper`);
    if (!s.timeline.some(k => k.caption)) fail(`${w}: no live caption`);
    s.timeline.forEach((k, j) => {
      if (k.caption && (!k.caption.b.trim() || !k.caption.i.trim())) fail(`${w}.timeline[${j}]: caption needs both levels`);
      k.do?.forEach(a => { if (!matches(ids, a.t)) fail(`${w}.timeline[${j}]: target ${a.t} not in scene`); });
    });
  });
  for (const sid of b.hook.slot) if (!ids.has(sid)) fail(`${l.id}.hook: slot ${sid} not in scene`);
  if (b.hook.options.length !== 3) fail(`${l.id}.hook: needs exactly 3 options`);
  if (b.hook.options.filter(o => o.correct).length !== 1) fail(`${l.id}.hook: needs exactly one correct option`);
  b.hook.options.forEach((o, i) => { both(o.feedback, `${l.id}.hook.option[${i}].feedback`); both(o.sub, `${l.id}.hook.option[${i}].sub`); });
  both(b.hook.prompt, `${l.id}.hook.prompt`);
  if (b.takeaways.length < 2 || b.takeaways.length > 4) fail(`${l.id}: ${b.takeaways.length} takeaways (want 2–4)`);
  b.takeaways.forEach((t, i) => both(t, `${l.id}.takeaway[${i}]`));
  if (b.quiz.length < 1 || b.quiz.length > 2) fail(`${l.id}: ${b.quiz.length} quiz questions (want 1–2)`);
  b.quiz.forEach((q, i) => {
    both(q.q, `${l.id}.quiz[${i}]`); both(q.why, `${l.id}.quiz[${i}].why`);
    if (q.answer < 0 || q.answer >= q.choices.length) fail(`${l.id}.quiz[${i}]: answer ${q.answer} out of range`);
  });
  ok(`${l.id}: ${b.steps.length} steps, every step has Beginner + Intermediate text and captions, hook, ${b.quiz.length} quiz Qs in range`);
  ok(`${l.id}: every step ≤ 4 sentences, ≤ ${MAX_WORDS} words, sentences ≤ ${MAX_SENTENCE} words (longest step ${Math.max(...stepStats)} words)`); stepStats.length = 0;
}

// ---------- specs ----------
section('Hardware specs');
for (const s of SPECS) {
  if (!s.source || !s.year) fail(`${s.id}: needs a source and a year`);
  if (/sparsit/i.test(JSON.stringify({ ...s, source: '' })) && !/dense/i.test(s.source)) fail(`${s.id}: sparsity figure without a dense label`);
}
ok(`${SPECS.length} presets, each with source + year: ${SPECS.map(s => `${s.name.replace(/ \(\d{4}\)$/, '')} (${s.year})`).join(', ')}`);

// ---------- missions & challenges ----------
section('Missions & challenges (simulated)');
for (const lab of CACHE_LABS) {
  const evalCfg = (c: typeof lab.start) => { const r = runAll(c); return { r, pass: lab.checks.every(k => k.test(c, r)) }; };
  const shipped = evalCfg(lab.start), fixed = evalCfg({ ...lab.start, ...lab.fix });
  if (shipped.pass) fail(`${lab.id}: passes as shipped (must fail)`);
  if (!fixed.pass) fail(`${lab.id}: intended fix ${JSON.stringify(lab.fix)} does not pass (hit rate ${(fixed.r.hitRate * 100).toFixed(1)}%)`);
  ok(`${lab.type} ${lab.id}: shipped ${(shipped.r.hitRate * 100).toFixed(1)}% hits → FAIL; with fix ${JSON.stringify(lab.fix)} ${(fixed.r.hitRate * 100).toFixed(2)}% → PASS`);
}

// ---------- bundle budget ----------
section('Bundle budget');
const root = join(import.meta.dirname, '..');
if (!process.argv.includes('--skip-build')) {
  console.log('  building…');
  execSync('npx vite build --logLevel warn', { cwd: root, stdio: 'inherit' });
}
const manPath = join(root, 'dist/.vite/manifest.json');
if (!existsSync(manPath)) fail('no dist/.vite/manifest.json (build failed?)');
else {
  type Chunk = { file: string; imports?: string[]; dynamicImports?: string[]; isEntry?: boolean; css?: string[] };
  const man = JSON.parse(readFileSync(manPath, 'utf8')) as Record<string, Chunk>;
  const gz = (f: string) => gzipSync(readFileSync(join(root, 'dist', f)), { level: 9 }).length;
  const entryKey = Object.keys(man).find(k => man[k].isEntry)!;
  const seen = new Set<string>();
  const walk = (k: string) => { if (seen.has(k)) return; seen.add(k); (man[k].imports ?? []).forEach(walk); };
  walk(entryKey);
  const first = [...seen].map(k => ({ file: man[k].file, gz: gz(man[k].file) }));
  const firstKB = first.reduce((a, b) => a + b.gz, 0) / 1024;
  const firstCss = [...seen].flatMap(k => man[k].css ?? []).reduce((a, f) => a + gz(f), 0) / 1024;
  const lazy = Object.entries(man).filter(([k, c]) => !seen.has(k) && c.file.endsWith('.js')).map(([, c]) => ({ file: c.file, gz: gz(c.file) })).sort((a, b) => b.gz - a.gz);
  console.log(`  First load (JS, gzipped):`);
  first.forEach(f => console.log(`    ${f.file.padEnd(40)} ${(f.gz / 1024).toFixed(1).padStart(7)} KB`));
  console.log(`    ${'TOTAL'.padEnd(40)} ${firstKB.toFixed(1).padStart(7)} KB  (budget ${FIRST_LOAD_BUDGET_KB} KB)`);
  console.log(`  First load CSS (gzipped): ${firstCss.toFixed(1)} KB`);
  console.log(`  Lazy chunks (loaded on demand, gzipped):`);
  lazy.slice(0, 10).forEach(f => console.log(`    ${f.file.padEnd(40)} ${(f.gz / 1024).toFixed(1).padStart(7)} KB`));
  if (firstKB > FIRST_LOAD_BUDGET_KB) fail(`first-load JS ${firstKB.toFixed(1)} KB gz exceeds ${FIRST_LOAD_BUDGET_KB} KB`);
  else ok(`first-load JS ${firstKB.toFixed(1)} KB ≤ ${FIRST_LOAD_BUDGET_KB} KB`);
  if (first.some(f => /katex/i.test(f.file))) fail('KaTeX is in the first load; it must be lazy');
  else ok('KaTeX loads lazily (not in first load)');
}

// ---------- result ----------
section('Result');
notes.forEach(n => console.log('  note: ' + n));
if (errors.length) {
  errors.forEach(e => console.log(`  \x1b[31m✕\x1b[0m ${e}`));
  console.log(`\n\x1b[31m${errors.length} problem(s).\x1b[0m`);
  process.exit(1);
}
console.log(`\x1b[32mAll ${checks} checks passed.\x1b[0m`);
