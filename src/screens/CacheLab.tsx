import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, StepForward, Link2, Lightbulb, Check, Circle } from 'lucide-react';
import { CacheSim, addresses, configValid, decodeConfig, encodeConfig, numSets, DEFAULT_CONFIG, type CacheConfig, type Pattern, type Policy } from '../sim/cache';
import { CACHE_LABS, pct } from '../content/labs';
import { T, pick } from '../lib/text';
import { useLevel } from '../state/store';
import { useRoute, replaceQuery } from '../lib/router';
import type { LT } from '../content/types';

const SIZES = [1024, 2048, 4096, 8192, 16384, 32768, 65536];
const WAYS = [1, 2, 4, 8, 16];
const LINES = [32, 64, 128];
const SPEEDS = [{ v: 4, l: '4 / s' }, { v: 30, l: '30 / s' }, { v: 300, l: '300 / s' }, { v: Infinity, l: 'Instant' }];
const PATTERNS: Record<Pattern, LT> = {
  seq: { b: 'Read in order', i: 'Sequential' },
  stride: { b: 'Every Nth number', i: 'Strided' },
  random: { b: 'Random jumps', i: 'Random' },
  row: { b: 'Grid, row by row', i: 'Matrix · row-major walk' },
  col: { b: 'Grid, column by column', i: 'Matrix · column-major walk' },
};
const MAX_ROWS = 64;
const kb = (b: number) => (b >= 1024 ? `${b / 1024} KB` : `${b} B`);
const hex = (n: number) => '0x' + n.toString(16).toUpperCase();

interface Result { hits: number; misses: number; compulsory: number; capacity: number; conflict: number; hitRate: number }

export default function CacheLab() {
  const level = useLevel();
  const route = useRoute();
  const labId = route.query.get('lab') ?? 'free';
  const lab = CACHE_LABS.find(l => l.id === labId) ?? null;
  const [cfg, setCfg] = useState<CacheConfig>(() => decodeConfig(route.query, lab?.start ?? DEFAULT_CONFIG));
  const [speedI, setSpeedI] = useState(route.query.get('run') === 'end' ? 3 : 1);
  const [phase, setPhase] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [hints, setHints] = useState(0);
  const [copied, setCopied] = useState(false);

  const valid = configValid(cfg) && numSets(cfg) >= 1;
  const sets = valid ? numSets(cfg) : 0;
  const shown = Math.min(sets, MAX_ROWS);
  const addrs = useMemo(() => (valid ? addresses(cfg) : []), [cfg, valid]);

  // URL = shareable state
  useEffect(() => {
    const q = new URLSearchParams(encodeConfig(cfg));
    if (lab) q.set('lab', lab.id);
    replaceQuery(q);
  }, [cfg, lab]);

  // ---- imperative simulation + drawing (no React renders per access) ----
  const sim = useRef<CacheSim | null>(null);
  const pos = useRef(0);
  const rowEls = useRef<(HTMLDivElement | null)[]>([]);
  const cellEls = useRef<(HTMLDivElement | null)[][]>([]);
  const hitEl = useRef<HTMLDivElement>(null), statEl = useRef<HTMLDivElement>(null), logEl = useRef<HTMLDivElement>(null), capEl = useRef<HTMLSpanElement>(null), barEl = useRef<HTMLDivElement>(null);
  const lastRow = useRef(-1), lastCell = useRef<HTMLElement | null>(null);
  const log = useRef<string[]>([]);
  const raf = useRef(0);
  const levelRef = useRef(level); levelRef.current = level;

  const drawStats = useCallback(() => {
    const s = sim.current; if (!s) return;
    const n = s.stats.hits + s.stats.misses;
    if (hitEl.current) hitEl.current.textContent = n ? `${(s.hitRate * 100).toFixed(1)}%` : '—';
    if (statEl.current) statEl.current.innerHTML =
      `<div class="statrow"><span>Accesses</span><b>${n.toLocaleString('en-US')} / ${addrs.length.toLocaleString('en-US')}</b></div>` +
      `<div class="statrow"><span>✓ Hits</span><b>${s.stats.hits.toLocaleString('en-US')}</b></div>` +
      `<div class="statrow"><span>✕ Misses</span><b>${s.stats.misses.toLocaleString('en-US')}</b></div>`;
    if (barEl.current) {
      const m = s.stats.misses || 1;
      const [a, b, c] = barEl.current.children as unknown as HTMLElement[];
      a.style.width = `${(s.stats.compulsory / m) * 100}%`; b.style.width = `${(s.stats.capacity / m) * 100}%`; c.style.width = `${(s.stats.conflict / m) * 100}%`;
      const lab3 = barEl.current.nextElementSibling as HTMLElement | null;
      if (lab3) lab3.innerHTML = `<span><i class="sw3" style="background:var(--muted)"></i>compulsory <b>${s.stats.compulsory}</b></span><span><i class="sw3" style="background:color-mix(in srgb, var(--err) 50%, var(--surface-2))"></i>capacity <b>${s.stats.capacity}</b></span><span><i class="sw3" style="background:var(--err)"></i>conflict <b>${s.stats.conflict}</b></span>`;
    }
    if (logEl.current) logEl.current.innerHTML = log.current.join('');
  }, [addrs.length]);

  const resetSim = useCallback(() => {
    cancelAnimationFrame(raf.current);
    sim.current = valid ? new CacheSim(cfg) : null;
    pos.current = 0; lastRow.current = -1; lastCell.current = null; log.current = [];
    cellEls.current.forEach(r => r?.forEach(c => { if (c) { c.dataset.v = '0'; c.dataset.e = ''; c.textContent = ''; } }));
    rowEls.current.forEach(r => { if (r) r.dataset.on = '0'; });
    if (capEl.current) capEl.current.textContent = pick({ b: 'Press play to start reading.', i: 'Ready. Press play.' }, levelRef.current);
    setResult(null); setPhase('idle');
    drawStats();
  }, [cfg, valid, drawStats]);
  useEffect(() => { resetSim(); }, [resetSim]);

  const stepOne = useCallback((draw: boolean) => {
    const s = sim.current; if (!s || pos.current >= addrs.length) return false;
    const e = s.access(addrs[pos.current], pos.current);
    pos.current++;
    const lv = levelRef.current;
    const line = lv === 'beginner'
      ? `<div class="${e.hit ? 'h' : 'm'}">#${e.i + 1} → row ${e.set}: ${e.hit ? '✓ hit' : '✕ miss'}</div>`
      : `<div class="${e.hit ? 'h' : 'm'}">${hex(e.addr).padEnd(9, ' ')} set ${e.set} tag ${hex(e.tag)} ${e.hit ? '✓ HIT' : `✕ ${e.missType}`}${e.evicted != null ? ` · evict ${hex(e.evicted)}` : ''}</div>`;
    log.current.unshift(line); if (log.current.length > 10) log.current.pop();
    if (draw) {
      if (lastRow.current >= 0 && rowEls.current[lastRow.current]) rowEls.current[lastRow.current]!.dataset.on = '0';
      if (lastCell.current) lastCell.current.dataset.e = '';
      const row = rowEls.current[e.set], cell = cellEls.current[e.set]?.[e.way];
      if (row) row.dataset.on = '1';
      if (cell) { cell.dataset.v = '1'; cell.dataset.e = e.hit ? 'hit' : 'miss'; cell.textContent = lv === 'intermediate' ? hex(e.tag) : e.hit ? '✓' : '✕'; }
      lastRow.current = e.set; lastCell.current = cell ?? null;
      if (capEl.current) capEl.current.textContent = lv === 'beginner'
        ? `Read #${e.i + 1} goes to row ${e.set}. ${e.hit ? '✓ It’s already there: a hit.' : `✕ Not there: a miss${e.evicted != null ? ', and something older gets thrown out' : ''}.`}`
        : `${hex(e.addr)} → set ${e.set}, tag ${hex(e.tag)}: ${e.hit ? '✓ HIT' : `✕ MISS (${e.missType})`}${e.evicted != null ? `, evicted tag ${hex(e.evicted)} from way ${e.way}` : ''}.`;
    } else {
      const cell = cellEls.current[e.set]?.[e.way];
      if (cell) { cell.dataset.v = '1'; cell.textContent = lv === 'intermediate' ? hex(e.tag) : ''; }
    }
    return true;
  }, [addrs]);

  const finish = useCallback(() => {
    const s = sim.current!;
    setResult({ ...s.stats, hitRate: s.hitRate });
    setPhase('done');
  }, []);

  const run = useCallback(() => {
    if (!sim.current) return;
    const speed = SPEEDS[speedI].v;
    if (speed === Infinity) {
      while (stepOne(pos.current === addrs.length - 1)) { /* run to end */ }
      drawStats(); finish(); return;
    }
    setPhase('running');
    let acc = 0, last = performance.now();
    const loop = (now: number) => {
      acc += ((now - last) / 1000) * speed; last = now;
      let n = Math.floor(acc); acc -= n;
      while (n-- > 0) { if (!stepOne(n === 0)) break; }
      drawStats();
      if (pos.current >= addrs.length) { finish(); return; }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }, [speedI, stepOne, drawStats, finish, addrs.length]);
  const pause = () => { cancelAnimationFrame(raf.current); setPhase('paused'); };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  // deep link ?run=end (used by screenshots and shared "result" links)
  const wantRun = useRef(route.query.get('run') === 'end');
  useEffect(() => {
    if (!wantRun.current || !valid) return;
    const t = setTimeout(() => { wantRun.current = false; run(); }, 60);
    return () => clearTimeout(t);
  }, [run, valid]);

  const set = <K extends keyof CacheConfig>(k: K, v: CacheConfig[K]) => setCfg(c => ({ ...c, [k]: v }));
  const chooseLab = (id: string) => {
    const l = CACHE_LABS.find(x => x.id === id);
    const q = new URLSearchParams(encodeConfig(l?.start ?? DEFAULT_CONFIG)); if (l) q.set('lab', l.id);
    location.hash = '#/lab/cache?' + q.toString();
    setCfg(l?.start ?? DEFAULT_CONFIG); setHints(0);
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };

  const checks = lab?.checks.map(c => ({ ...c, ok: result ? c.test(cfg, result) : c.test(cfg, { hitRate: -1 }) && c.id !== 'hit' }));
  const passed = !!(lab && result && checks!.every(c => c.ok));
  const beginner = level === 'beginner';

  const knob = (label: LT, el: React.ReactNode, value?: string) => (
    <label className="knob"><span><T v={label} />{value && <output>{value}</output>}</span>{el}</label>
  );
  const patternKnobs = (
    <>
      {(cfg.pattern === 'seq' || cfg.pattern === 'random' || cfg.pattern === 'stride') && knob({ b: 'How many numbers', i: 'Elements' }, <input type="number" min={1} max={65536} value={cfg.count} onChange={e => set('count', Math.max(1, +e.target.value))} />)}
      {cfg.pattern === 'stride' && knob({ b: 'Gap between numbers (bytes)', i: 'Stride (bytes)' }, <input type="number" min={4} step={4} max={1 << 20} value={cfg.stride} onChange={e => set('stride', Math.max(4, +e.target.value))} />)}
      {(cfg.pattern === 'row' || cfg.pattern === 'col') && knob({ b: 'Grid size (N × N)', i: 'Matrix N' }, <input type="number" min={2} max={256} value={cfg.n} onChange={e => set('n', Math.max(2, +e.target.value))} />)}
      {(cfg.pattern === 'row' || cfg.pattern === 'col') && knob({ b: 'Padding per row (numbers)', i: 'Row padding (floats)' }, <input type="number" min={0} max={64} value={cfg.pad} onChange={e => set('pad', Math.max(0, +e.target.value))} />)}
      {knob({ b: 'Passes over the data', i: 'Repeat' }, <input type="number" min={1} max={100} value={cfg.repeat} onChange={e => set('repeat', Math.max(1, +e.target.value))} />)}
    </>
  );
  const advanced = (
    <>
      {knob({ b: 'Chunk size', i: 'Line size' }, <select value={cfg.line} onChange={e => set('line', +e.target.value)}>{LINES.map(x => <option key={x} value={x}>{x} B</option>)}</select>)}
      {knob({ b: 'What to throw out', i: 'Replacement policy' }, <select value={cfg.policy} onChange={e => set('policy', e.target.value as Policy)}><option value="lru">LRU (least recently used)</option><option value="fifo">FIFO (oldest in)</option><option value="random">Random</option></select>)}
      {patternKnobs}
    </>
  );

  return (
    <div className="page-wide">
      <span className="eyebrow">Dielab · the sandbox</span>
      <h1 style={{ marginTop: 8, fontSize: 'clamp(32px, 4.4vw, 48px)' }}><T v={{ b: 'The cache simulator', i: 'Cache simulator' }} /></h1>
      <p className="text2" style={{ marginTop: 10, maxWidth: '70ch' }}>
        <T v={{ b: 'Build a cache, feed it a way of reading memory, and watch each read hit or miss.', i: 'Set-associative cache with LRU/FIFO/random replacement and a 3C miss classifier. Every run is a real simulation of the address stream.' }} />
      </p>
      <div className="labtabs" style={{ marginTop: 20 }} role="group" aria-label="Mode">
        <button className="btn btn-sm" aria-pressed={!lab} style={!lab ? { borderColor: 'var(--text-2)' } : undefined} onClick={() => chooseLab('free')}>Free play</button>
        {CACHE_LABS.map(l => (
          <button key={l.id} className="btn btn-sm" aria-pressed={lab?.id === l.id} style={lab?.id === l.id ? { borderColor: 'var(--text-2)' } : undefined} onClick={() => chooseLab(l.id)}>
            {l.type === 'mission' ? 'Mission' : 'Challenge'}: <T v={l.title} />
          </button>
        ))}
      </div>

      <div className="lab">
        <section className="card knobs" aria-label="Settings">
          <span className="eyebrow">Build the cache</span>
          {knob({ b: 'Cache size', i: 'Capacity' }, <select value={cfg.size} onChange={e => set('size', +e.target.value)}>{SIZES.map(x => <option key={x} value={x}>{kb(x)}</option>)}</select>)}
          {knob({ b: 'Slots per row', i: 'Associativity (ways)' }, <select value={cfg.ways} onChange={e => set('ways', +e.target.value)}>{WAYS.map(x => <option key={x} value={x}>{x === 1 ? '1 (direct-mapped)' : `${x}-way`}</option>)}</select>)}
          {knob({ b: 'How the program reads', i: 'Access pattern' }, <select value={cfg.pattern} onChange={e => set('pattern', e.target.value as Pattern)}>{(Object.keys(PATTERNS) as Pattern[]).map(p => <option key={p} value={p}>{pick(PATTERNS[p], level)}</option>)}</select>)}
          {beginner ? (
            <details className="more"><summary>+ More settings</summary><div className="knobs" style={{ marginTop: 12 }}>{advanced}</div></details>
          ) : advanced}
          {valid ? (
            <p className="wnote mono" style={{ margin: 0 }}>{sets} sets × {cfg.ways} ways × {cfg.line} B = {kb(cfg.size)} · {addrs.length.toLocaleString('en-US')} accesses</p>
          ) : <p className="wwarn">✕ That doesn’t make a whole number of sets. Make the cache bigger or use fewer ways.</p>}
        </section>

        <section className="card viz" aria-label="Cache contents">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {phase === 'running'
              ? <button className="btn btn-sm" onClick={pause}><Pause size={14} /> Pause</button>
              : <button className="btn btn-sm btn-primary" onClick={run} disabled={!valid || phase === 'done'}><Play size={14} /> {phase === 'paused' ? 'Resume' : 'Run'}</button>}
            <button className="btn btn-sm" onClick={() => { if (stepOne(true)) { drawStats(); if (pos.current >= addrs.length) finish(); else setPhase('paused'); } }} disabled={!valid || phase === 'running' || phase === 'done'}><StepForward size={14} /> Step</button>
            <button className="btn btn-sm" onClick={resetSim}><RotateCcw size={14} /> Reset</button>
            <div className="seg" role="group" aria-label="Speed" style={{ marginLeft: 'auto' }}>
              {SPEEDS.map((s, i) => <button key={s.l} aria-pressed={i === speedI} onClick={() => setSpeedI(i)}>{s.l}</button>)}
            </div>
          </div>
          <p className="text2" style={{ fontSize: 13.5, minHeight: 44, margin: '0 0 12px' }} aria-live="polite"><span ref={capEl} /></p>
          <div className="eyebrow" style={{ marginBottom: 8 }}><T v={{ b: 'Each row is a set of slots; each box holds one chunk', i: `Sets × ways${sets > MAX_ROWS ? ` (first ${MAX_ROWS} of ${sets} sets shown)` : ''}` }} /></div>
          <div className="cachegrid">
            {Array.from({ length: shown }, (_, s) => (
              <div key={`${cfg.size}-${cfg.ways}-${cfg.line}-${s}`} className="crow" data-on="0" ref={el => { rowEls.current[s] = el; }}>
                <span className="sl">set {s}</span>
                <div className="cways" style={{ gridTemplateColumns: `repeat(${cfg.ways}, minmax(0, 1fr))` }}>
                  {Array.from({ length: cfg.ways }, (_, w) => (
                    <div key={w} className="cway" data-v="0" ref={el => { (cellEls.current[s] ??= [])[w] = el; }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-label="Results" style={{ display: 'grid', gap: 12 }}>
          <span className="eyebrow">Hit rate</span>
          <div className="bigstat" ref={hitEl}>—</div>
          <div ref={statEl} />
          {!beginner && (
            <div>
              <span className="eyebrow">Misses by cause (3C)</span>
              <div className="bar3c" ref={barEl} aria-hidden><i style={{ background: 'var(--muted)' }} /><i style={{ background: 'color-mix(in srgb, var(--err) 50%, var(--surface-2))' }} /><i style={{ background: 'var(--err)' }} /></div>
              <div className="wnote" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} />
            </div>
          )}
          <div>
            <span className="eyebrow">Recent accesses</span>
            <div className="log" ref={logEl} style={{ marginTop: 6 }} />
          </div>
          <button className="btn btn-sm" onClick={share}><Link2 size={14} /> {copied ? 'Link copied' : 'Copy shareable link'}</button>
        </section>
      </div>

      {lab && (
        <section className="card" style={{ padding: 24, marginTop: 16, maxWidth: 760 }} aria-label={lab.type}>
          <span className="eyebrow">{lab.type === 'mission' ? 'Mission' : 'Challenge'}</span>
          <h2 style={{ marginTop: 6 }}><T v={lab.title} /></h2>
          <p className="text2" style={{ marginTop: 8 }}><T v={lab.brief} /></p>
          <ul className="checklist">
            {checks!.map(c => (
              <li key={c.id} data-ok={c.ok ? '1' : '0'}>
                {c.ok ? <Check size={16} className="k-mem" aria-label="done" /> : <Circle size={14} className="muted" aria-label="not yet" />}
                <span><T v={c.label} />{c.id === 'hit' && result && <span className="mono muted"> · now {pct(result.hitRate)}</span>}{c.id === 'hit' && !result && <span className="muted"> · run it to check</span>}</span>
              </li>
            ))}
          </ul>
          {result && <p className="lvl" style={{ fontWeight: 500 }} key={String(passed)}>{passed ? <span className="k-mem">✓ {lab.type === 'mission' ? 'Mission complete.' : 'Challenge solved.'}</span> : <span className="k-err">✕ Not yet. Change something and run again.</span>}</p>}
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {lab.hints.slice(0, hints).map((h, i) => <p key={i} className="text2" style={{ fontSize: 14 }}><Lightbulb size={14} style={{ verticalAlign: -2 }} /> <T v={h} /></p>)}
            {hints < lab.hints.length && <div><button className="btn btn-sm btn-ghost" onClick={() => setHints(h => h + 1)}><Lightbulb size={14} /> {hints === 0 ? 'Show a hint' : 'Another hint'}</button></div>}
          </div>
        </section>
      )}
    </div>
  );
}
