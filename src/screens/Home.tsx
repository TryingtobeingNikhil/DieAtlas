import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, FlaskConical, BookOpen } from 'lucide-react';
import { T } from '../lib/text';
import { useLevel, useStore } from '../state/store';
import { worldProgress } from '../lib/progress';
import { lesson, lessonHref } from '../content/lessons';
import { CPU_WORLD, type Flow } from '../content/chipmaps';
import { CPU_PKG, GPU_PKGS, IOD_PCIE } from '../art/geometry';
import { ArtDefs, CpuPackageArt, Mover } from '../art/ChipArt';
import { GpuDefs, PackageFull } from '../art/GpuArt';
import type { Level } from '../content/types';

/** Live counter: writes text straight to the DOM, never re-renders React. */
function Ticker() {
  const level = useLevel();
  const a = useRef<HTMLSpanElement>(null), b = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0, last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 50) return;
      last = now;
      const s = (now - t0) / 1000;
      if (a.current) a.current.textContent = Math.floor(s * 3e9).toLocaleString('en-US');
      const g = s * 989.4e12;
      if (b.current) b.current.textContent = g >= 1e15 ? `${(g / 1e15).toFixed(2)} quadrillion` : `${(g / 1e12).toFixed(0)} trillion`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <p className="ticker" key={level} aria-live="off">
      {level === 'beginner' ? (
        <span className="lvl">Since you opened this page, a CPU core has ticked <span ref={a} className="num k-cpu">0</span> times, and one AI chip could have done <span ref={b} className="num k-gpu">0</span> multiply-adds. Click a chip to see how.</span>
      ) : (
        <span className="lvl">Since you opened this page, one core at 3 GHz has ticked <span ref={a} className="num k-cpu">0</span> times, and an H100 SXM could have done <span ref={b} className="num k-gpu">0</span> BF16 FLOPs (989.4 TFLOP/s dense peak).</span>
      )}
    </p>
  );
}

function MiniRing({ x, y, v, color }: { x: number; y: number; v: number; color: string }) {
  const r = 9, c = 2 * Math.PI * r;
  return (
    <g aria-hidden>
      <circle className="ring-track" cx={x} cy={y} r={r} strokeWidth={2.5} />
      <circle className="ring-val" cx={x} cy={y} r={r} strokeWidth={2.5} stroke={color} strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${x} ${y})`} />
    </g>
  );
}

const scaled = (fs: Flow[] | undefined, m: number) => (fs ?? []).map(f => ({ ...f, r: f.r * m }));

// Two compositions: side by side (wide) and stacked (phones).
const LAYOUT = {
  wide: { vb: [1400, 640], cpu: { x: 70, y: 70, s: 0.8 }, gpu: { x: 800, y: 110, s: 0.56 }, cpuLbl: [70, 590], gpuLbl: [800, 560] },
  narrow: { vb: [420, 1060], cpu: { x: 50, y: 70, s: 0.53 }, gpu: { x: 20, y: 600, s: 0.38 }, cpuLbl: [24, 44], gpuLbl: [24, 900] },
} as const;

const HomeArt = memo(function HomeArt({ level, cpuP, gpuP, brP, narrow }: { level: Level; cpuP: number; gpuP: number; brP: number; narrow: boolean }) {
  const L = narrow ? LAYOUT.narrow : LAYOUT.wide;
  const p0 = GPU_PKGS[0];
  const ct = `translate(${L.cpu.x - CPU_PKG.x * L.cpu.s} ${L.cpu.y - CPU_PKG.y * L.cpu.s}) scale(${L.cpu.s})`;
  const gt = `translate(${L.gpu.x - p0.x * L.gpu.s} ${L.gpu.y - p0.y * L.gpu.s}) scale(${L.gpu.s})`;
  // the PCIe "bridge": from the CPU's PCIe controller to the GPU package edge
  const ax = L.cpu.x + (IOD_PCIE.x + IOD_PCIE.w - CPU_PKG.x) * L.cpu.s, ay = L.cpu.y + (IOD_PCIE.y + IOD_PCIE.h / 2 - CPU_PKG.y) * L.cpu.s;
  const bx = narrow ? L.gpu.x + 500 * L.gpu.s : L.gpu.x, by = narrow ? L.gpu.y : L.gpu.y + 350 * L.gpu.s;
  const lanes = [-10, -5, 0, 5, 10];
  const trace = (o: number) => (narrow
    ? `M${ax} ${ay + o} H${ax + 60 + o} V${(ay + by) / 2 + o} H${bx + o} V${by}`
    : `M${ax} ${ay + o} H${(ax + bx) / 2 + o} V${by + o} H${bx}`);
  const mid = narrow ? { x: 290, y: (ay + by) / 2 + 40 } : { x: (ax + bx) / 2, y: Math.min(ay, by) - 46 };
  const go = (h: string) => () => { location.hash = h; };
  const key = (h: string) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = h; } };
  const cpuW = CPU_PKG.w * L.cpu.s, gpuW = p0.w * L.gpu.s, gpuH = p0.h * L.gpu.s;
  return (
    <svg viewBox={`0 0 ${L.vb[0]} ${L.vb[1]}`} role="img" aria-label="A CPU package and a GPU package joined by a PCIe link">
      <ArtDefs />
      <GpuDefs />
      <g className="hchip" role="link" tabIndex={0} aria-label="The bridge: CPU vs GPU" onClick={go('#/bridge')} onKeyDown={key('#/bridge')} style={{ ['--kc' as string]: 'var(--mem)' }}>
        {lanes.map(o => <path key={o} className="a-trace" d={trace(o)} style={{ strokeWidth: 1.5 }} />)}
        {lanes.map((o, i) => <Mover key={'m' + o} f={{ kind: 'mem', r: 3.2, dur: 2.2, delay: i * 0.37, d: trace(o) }} />)}
        <rect className="hl" x={mid.x - 96} y={mid.y - 30} width={192} height={50} rx={10} />
        <text className="hlabel" x={mid.x - 10} y={mid.y - 6} textAnchor="middle" style={{ fontSize: 16 }}>The bridge</text>
        <text className="hsub" x={mid.x - 10} y={mid.y + 13} textAnchor="middle" style={{ fontSize: 12.5 }}>{level === 'beginner' ? 'race them →' : 'PCIe 5.0 x16 ≈ 63 GB/s'}</text>
        <MiniRing x={mid.x + 76} y={mid.y - 5} v={brP} color="var(--text-2)" />
      </g>

      <g className="hchip" role="link" tabIndex={0} aria-label="Enter the CPU world" onClick={go('#/cpu')} onKeyDown={key('#/cpu')} style={{ ['--kc' as string]: 'var(--cpu)' }}>
        <rect className="hl" x={L.cpu.x - 10} y={L.cpu.y - 10} width={cpuW + 20} height={cpuW + 20} rx={16} />
        <g transform={ct} className="chipart">
          <CpuPackageArt />
          {scaled(CPU_WORLD.root.children![0].flows, 1.4).map((f, i) => <Mover key={i} f={f} />)}
        </g>
        <text className="hlabel" x={L.cpuLbl[0]} y={L.cpuLbl[1]}><tspan fill="var(--cpu)">◆ </tspan>CPU world</text>
        <MiniRing x={L.cpuLbl[0] + 170} y={L.cpuLbl[1] - 8} v={cpuP} color="var(--cpu)" />
        <text className={level === 'beginner' ? 'hsub' : 'hsubm'} x={L.cpuLbl[0] + (narrow ? 0 : 196)} y={L.cpuLbl[1] + (narrow ? 24 : -2)}>
          {level === 'beginner' ? 'A few big, clever cores' : '7950X · 16 cores · 2 × 32 MB L3'}
        </text>
      </g>

      <g className="hchip" role="link" tabIndex={0} aria-label="Enter the GPU world" onClick={go('#/gpu')} onKeyDown={key('#/gpu')} style={{ ['--kc' as string]: 'var(--gpu)' }}>
        <rect className="hl" x={L.gpu.x - 10} y={L.gpu.y - 10} width={gpuW + 20} height={gpuH + 20} rx={16} />
        <g transform={gt} className="chipart gpu-art">
          <PackageFull p={p0} smDetail={false} />
        </g>
        <text className="hlabel" x={L.gpuLbl[0]} y={L.gpuLbl[1]}><tspan fill="var(--gpu)">● </tspan>GPU world</text>
        <MiniRing x={L.gpuLbl[0] + 172} y={L.gpuLbl[1] - 8} v={gpuP} color="var(--gpu)" />
        <text className={level === 'beginner' ? 'hsub' : 'hsubm'} x={L.gpuLbl[0] + (narrow ? 0 : 198)} y={L.gpuLbl[1] + (narrow ? 24 : -2)}>
          {level === 'beginner' ? 'Thousands of small workers' : 'H100 SXM5 · 132 SMs · 3.35 TB/s'}
        </text>
      </g>
    </svg>
  );
});

export function Home() {
  const level = useLevel();
  const done = useStore(s => s.completed);
  const last = useStore(s => s.lastLesson);
  const cpu = worldProgress('cpu', done), gpu = worldProgress('gpu', done), br = worldProgress('bridge', done);
  const lastL = last ? lesson(last) : undefined;
  const box = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 640));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <div className="eyebrow">An explorable atlas of CPUs and GPUs</div>
        <h1><T v={{ b: 'What actually happens inside a chip?', i: 'From one transistor to a rack of GPUs.' }} /></h1>
        <Ticker />
      </section>

      <div className="homeart" ref={box}>
        <HomeArt level={level} narrow={narrow} cpuP={cpu.done / cpu.total} gpuP={gpu.done / gpu.total} brP={br.done / br.total} />
      </div>

      <div className="home-links">
        <a href="#/foundations"><BookOpen size={15} /> {level === 'beginner' ? 'Never looked inside a computer? Start here' : 'Foundations (optional)'} <ArrowRight size={14} /></a>
        {lastL && <a href={lessonHref(lastL)}>Continue: <T v={lastL.title} /> <ArrowRight size={14} /></a>}
        <a href="#/lab/cache"><FlaskConical size={15} /> Dielab sandbox</a>
      </div>
    </div>
  );
}
