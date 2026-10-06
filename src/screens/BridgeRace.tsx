import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { lesson } from '../content/lessons';
import { spec, SPECS, fmtBw, fmtFlops, fmtTime } from '../content/specs';
import { WORKLOADS, runRace, type WorkloadId, type RaceResult } from '../sim/race';
import { T, Glyph, pick } from '../lib/text';
import { useLevel, useStore } from '../state/store';
import { useRoute } from '../lib/router';
import { Tex } from '../components/Tex';
import { Quiz } from '../components/Quiz';
import type { Spec, LT } from '../content/types';

const ANIM_MS = 4200;
/** "83.2 GB/s" → 83.2\,\text{GB/s} for KaTeX. */
const tx = (v: string) => {
  const m = v.match(/^([\d.,]+)\s(.+)$/);
  if (!m) return v;
  const u = m[2].startsWith('µ') ? `\\mu\\text{${m[2].slice(1)}}` : `\\text{${m[2]}}`;
  return `${m[1]}\\,${u}`;
};

function mathLines(w: WorkloadId, s: Spec, r: RaceResult) {
  const wl = WORKLOADS[w];
  const bytes = w === 'sum' ? '400\\,\\text{MB}' : '201\\,\\text{MB}';
  const flops = w === 'sum' ? '10^{8}\\ \\text{FLOP}' : '2 \\cdot 4096^3\\ \\text{FLOP}';
  const lines = [
    `t_{\\text{mem}} = \\frac{${bytes}}{${tx(fmtBw(s.bw))}} = ${tx(fmtTime(r.memory))}`,
    `t_{\\text{math}} = \\frac{${flops}}{${tx(fmtFlops(r.peakUsed))}} = ${tx(fmtTime(r.compute))}`,
  ];
  if (r.copy > 0 && s.link) lines.push(`t_{\\text{copy}} = \\frac{${(wl.hostBytes / 1e6).toFixed(0)}\\,\\text{MB}}{${tx(fmtBw(s.link.bw))}} = ${tx(fmtTime(r.copy))}`);
  return lines;
}

function verdict(w: WorkloadId, cpu: RaceResult, gpu: RaceResult, g: Spec, copy: boolean): LT {
  const ratio = cpu.total / gpu.total;
  const r = ratio >= 1 ? `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×` : `${(1 / ratio).toFixed(1)}×`;
  if (copy && gpu.copy > 0 && ratio < 1)
    return {
      b: `Surprise: the CPU wins, by about ${r}. Just copying the data over to the GPU takes longer than the CPU needs for the whole job. A GPU only pays off when the data already lives there, or when there’s lots of work per byte.`,
      i: `The CPU wins by ${r}: the PCIe copy alone (${fmtTime(gpu.copy)} over ${g.link!.name}) exceeds the CPU’s entire ${fmtTime(cpu.total)}. Low arithmetic intensity + host-resident data = keep it on the CPU.`,
    };
  if (w === 'sum')
    return {
      b: `The GPU finishes about ${r} sooner. Both machines spend almost all their time just reading numbers from memory, and the GPU’s memory is that much faster. The adding itself is nearly free.`,
      i: `Both are memory-bound: time ≈ bytes ÷ bandwidth. ${fmtBw(g.bw)} vs 83.2 GB/s gives the ${r}. The math is negligible: ${fmtTime(cpu.compute)} on the CPU at peak.${gpu.copy > 0 ? ` The copy (${fmtTime(gpu.copy)}) is included.` : ''}`,
    };
  return {
    b: `The GPU finishes about ${r} sooner. A matrix multiply does a lot of math for every number it reads, so the side with more math units wins, and the GPU has thousands.`,
    i: `Compute-bound: 2·4096³ = 137 GFLOP vs only 201 MB of ideal traffic (~680 FLOP/byte). ${fmtFlops(gpu.peakUsed)} vs ${fmtFlops(cpu.peakUsed)} sets the ${r}.${gpu.copy > 0 ? ` Copy included: ${fmtTime(gpu.copy)}.` : ''}`,
  };
}

export default function BridgeRace() {
  const l = lesson('b-why')!;
  const level = useLevel();
  const route = useRoute();
  const complete = useStore(s => s.complete), visit = useStore(s => s.visit);
  const [w, setW] = useState<WorkloadId>((route.query.get('w') as WorkloadId) === 'matmul' ? 'matmul' : 'sum');
  const [gid, setGid] = useState(route.query.get('gpu') ?? 'h100-sxm');
  const [copy, setCopy] = useState(route.query.get('copy') === '1');
  const [tensor, setTensor] = useState(false);
  const [guess, setGuess] = useState<'cpu' | 'gpu' | 'same' | null>(null);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>(route.query.get('run') === 'end' ? 'done' : 'idle');
  const fills = useRef<(HTMLElement | null)[]>([]);
  const times = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => { visit('b-why'); }, [visit]);

  const cpuS = spec('ryzen-7950x'), gpuS = spec(gid);
  const cpu = runRace(WORKLOADS[w], cpuS);
  const gpu = runRace(WORKLOADS[w], gpuS, { includeCopy: copy, tensor: tensor && level === 'intermediate' && w === 'matmul' });
  const max = Math.max(cpu.total, gpu.total);
  // lane segments: [copy, kernel]
  const lanes = useMemo(() => [
    { segs: [{ t: cpu.total, color: 'var(--cpu)' }], total: cpu.total },
    { segs: [{ t: gpu.copy, color: 'var(--mem)' }, { t: gpu.total - gpu.copy, color: 'var(--gpu)' }], total: gpu.total },
  ], [cpu.total, gpu.total, gpu.copy]);

  // animation: transforms + textContent via refs, one rAF loop, no React renders per frame
  useEffect(() => {
    const draw = (sim: number) => {
      lanes.forEach((ln, li) => {
        let acc = 0;
        ln.segs.forEach((sg, si) => {
          const el = fills.current[li * 2 + si];
          if (el) { const shown = Math.max(0, Math.min(sg.t, sim - acc)); el.style.left = `${(acc / max) * 100}%`; el.style.width = `${(sg.t / max) * 100}%`; el.style.transform = `scaleX(${sg.t ? shown / sg.t : 0})`; }
          acc += sg.t;
        });
        const te = times.current[li];
        if (te) te.textContent = fmtTime(Math.min(sim, ln.total));
      });
    };
    if (phase === 'done') { draw(max); return; }
    if (phase === 'idle') { draw(0); return; }
    let raf = 0; const t0 = performance.now();
    const loop = (now: number) => {
      const u = Math.min(1, (now - t0) / ANIM_MS);
      draw(u * max);
      if (u < 1) raf = requestAnimationFrame(loop); else setPhase('done');
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, lanes, max]);

  const reset = () => setPhase('idle');
  const winner = cpu.total < gpu.total * 0.9 ? 'cpu' : gpu.total < cpu.total * 0.9 ? 'gpu' : 'same';
  const v = verdict(w, cpu, gpu, gpuS, copy);

  const lane = (i: number, s: Spec, r: RaceResult, kind: 'cpu' | 'gpu') => (
    <div className="lane" key={i}>
      <div className="lane-head">
        <span className="lane-name"><Glyph kind={kind} />{s.name}</span>
        <span className="lane-time" ref={el => { times.current[i] = el; }}>0 µs</span>
      </div>
      <div className="track" aria-hidden>
        <i className="seg-fill" ref={el => { fills.current[i * 2] = el; }} style={{ background: i === 0 ? 'var(--cpu)' : 'var(--mem)' }} />
        {i === 1 && <i className="seg-fill" ref={el => { fills.current[3] = el; }} style={{ background: 'var(--gpu)' }} />}
      </div>
      <div className="lane-note">
        {phase === 'done' ? (
          <span className="lvl" key={level}>
            {level === 'beginner'
              ? (r.bound === 'memory' ? 'Mostly waiting for memory.' : 'Mostly doing math.') + (r.copy > 0 ? ` First, ${fmtTime(r.copy)} copying the data across.` : '')
              : `${r.bound === 'memory' ? 'Memory-bound' : 'Compute-bound'} · ${fmtBw(s.bw)} · ${fmtFlops(r.peakUsed)}${r.copy > 0 ? ` · copy ${fmtTime(r.copy)} (▬)` : ''}`}
          </span>
        ) : <span>{s.memName}{s.approx ? ' · peak FP32 approx.' : ''}</span>}
      </div>
      {phase === 'done' && (
        <details className="deeper" key={`m-${level}-${w}-${gid}-${copy}-${tensor}`} open={level === 'intermediate'} style={{ marginTop: 4 }}>
          <summary>∑ {level === 'beginner' ? 'Show the math' : 'The math'}</summary>
          {mathLines(w, s, r).map((m, k) => <div key={k}><Tex tex={m} /></div>)}
          {s.tensor?.note && r.peakUsed === s.tensor.flops && <p className="wnote">{s.name}: {s.tensor.flops / 1e12} TFLOP/s is {s.tensor.precision}. {s.tensor.note}</p>}
          <p className="wnote">Ideal lower bound: whichever of memory or math takes longer{r.copy > 0 ? ', plus the copy' : ''}. Real code reaches a fraction of this.</p>
        </details>
      )}
    </div>
  );

  return (
    <div className="page">
      <nav className="crumbs eyebrow"><a href="#/bridge">The bridge</a><span aria-hidden>›</span><span>CPU vs GPU</span></nav>
      <h1 style={{ marginTop: 10, fontSize: 'clamp(32px, 4.4vw, 48px)' }}><T v={l.title} /></h1>
      <p className="ticker" style={{ marginTop: 12 }}>
        <T v={{ b: 'Same job, two machines. First guess who wins, then run it.', i: 'Roofline lower bounds from spec-sheet peaks. Pick a workload and a GPU, predict, then run.' }} />
      </p>

      <section className="race card" style={{ marginTop: 24 }}>
        <div className="racectl">
          <div className="seg" role="group" aria-label="Workload">
            <button aria-pressed={w === 'sum'} onClick={() => { setW('sum'); reset(); }}><T v={{ b: 'Add up 100 M numbers', i: 'Sum 100 M FP32' }} /></button>
            <button aria-pressed={w === 'matmul'} onClick={() => { setW('matmul'); reset(); }}><T v={{ b: 'Multiply two big grids', i: 'Matmul 4096² FP32' }} /></button>
          </div>
          <label>GPU
            <select value={gid} onChange={e => { setGid(e.target.value); reset(); }}>
              {SPECS.filter(s => s.kind !== 'cpu').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={copy} onChange={e => { setCopy(e.target.checked); reset(); }} /> <T v={{ b: 'Data starts on the CPU side (copy it first)', i: 'Include host→device copy over PCIe' }} /></label>
          {level === 'intermediate' && w === 'matmul' && gpuS.tensor && (
            <label><input type="checkbox" checked={tensor} onChange={e => { setTensor(e.target.checked); reset(); }} /> Tensor cores ({gpuS.tensor.precision})</label>
          )}
        </div>

        {phase === 'idle' && (
          <div className="predict" role="group" aria-label="Prediction">
            <span className="text2" style={{ fontSize: 14 }}><T v={{ b: 'Your guess:', i: 'Predict:' }} /></span>
            {(['cpu', 'gpu', 'same'] as const).map(g => (
              <button key={g} className="btn btn-sm" aria-pressed={guess === g} style={guess === g ? { borderColor: 'var(--text-2)' } : undefined} onClick={() => setGuess(g)}>
                {g === 'cpu' ? '◆ CPU wins' : g === 'gpu' ? '● GPU wins' : 'About the same'}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={() => setPhase('running')}><Play size={14} /> Run the race</button>
          </div>
        )}

        {lane(0, cpuS, cpu, 'cpu')}
        {lane(1, gpuS, gpu, 'gpu')}

        {phase === 'done' && (
          <div className="narr lvl" key={`${level}-${w}-${gid}-${copy}-${tensor}`} aria-live="polite">
            {guess && <p className="eyebrow" style={{ marginBottom: 8 }}>{guess === winner ? '✓ Your guess was right' : `✕ You guessed ${guess === 'same' ? 'a tie' : guess.toUpperCase() + ' wins'}`}</p>}
            {pick(v, level)}
          </div>
        )}
        {phase !== 'idle' && <div><button className="btn btn-sm" onClick={reset}><RotateCcw size={14} /> Reset</button></div>}

        <div className="srcs">
          <span className="eyebrow">Sources</span>
          {[cpuS, gpuS].map(s => <span key={s.id}>{s.name} ({s.year}): {s.source}.{s.approx ? ` Approx: ${s.approx}` : ''}{s.tensor?.note && tensor ? ` ${s.tensor.note}` : ''}</span>)}
          <span>Bars use one time scale; slow motion. All figures dense (no sparsity).</span>
        </div>
      </section>

      <section className="wrapup" aria-label="Takeaways and quiz">
        <div className="card">
          <span className="eyebrow">Key takeaways</span>
          <ul className="takeaways">{l.custom!.takeaways.map((t, i) => <li key={i}><span className="k-math">∑</span><T v={t} /></li>)}</ul>
        </div>
        <div className="card">
          <span className="eyebrow">Quick check</span>
          <Quiz qs={l.custom!.quiz} onComplete={() => complete('b-why')} />
        </div>
      </section>
    </div>
  );
}
