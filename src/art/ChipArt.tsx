import { memo } from 'react';
import {
  type Rect, sub, gpuPackage, smInside, SM_OFF, GPU_PKGS, NVSWITCHES, NICS, HOST_TRAY, GPU_BOARD,
  CPU_BOARD, CPU_PKG, CCDS, ccdCores, ccdL3, coreInside, IOD, IOD_MEMCTL, IOD_PCIE, FABRIC_LINKS, DIMMS, VRMS, NVME, GPU_CARD, PCIE_SLOT, NUMA_GHOST,
} from './geometry';
import type { Flow } from '../content/chipmaps';

// Stylised top-view chip drawings. Static: memoised and never re-rendered
// during interaction. Colour = meaning (green compute, amber control, cyan memory).

const R = ({ r, c, rx = 0 }: { r: Rect; c: string; rx?: number }) => <rect className={c} x={r.x} y={r.y} width={r.w} height={r.h} rx={rx} />;

/** SRAM look: fine parallel lines inside r. */
function Sram({ r, step, vertical = false }: { r: Rect; step: number; vertical?: boolean }) {
  let d = '';
  if (vertical) for (let x = r.x + step; x < r.x + r.w - step / 2; x += step) d += `M${x.toFixed(2)} ${r.y}V${r.y + r.h}`;
  else for (let y = r.y + step; y < r.y + r.h - step / 2; y += step) d += `M${r.x} ${y.toFixed(2)}H${r.x + r.w}`;
  return <path className="a-fine" d={d} />;
}

export function ArtDefs() {
  return (
    <defs>
      <linearGradient id="a-sub-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--die-b)" />
        <stop offset="1" stopColor="var(--die-a)" />
      </linearGradient>
    </defs>
  );
}

/** Moving dot with a soft trail (SMIL; no JS per frame). Negative begin = already running. */
export function Mover({ f }: { f: Flow }) {
  return (
    <g className="flowdot">
      {[0.12, 0.06, 0].map((lag, i) => (
        <circle key={i} r={f.r * [0.6, 0.8, 1][i]} fill={`var(--${f.kind})`} opacity={[0.15, 0.35, 1][i]}>
          <animateMotion dur={`${f.dur}s`} begin={`${-2 * f.dur + (f.delay ?? 0) - lag}s`} repeatCount="indefinite" path={f.d} />
        </circle>
      ))}
    </g>
  );
}

// ------------------------------------------------------------------ GPU
function SmDetail({ s }: { s: Rect }) {
  const si = smInside(s);
  return (
    <g>
      {si.parts.map((p, i) => <R key={i} r={p} c="a-fine" />)}
      {si.inner.map((q, i) => (
        <g key={i}>
          <R r={q.sched} c="a-cpu" />
          <R r={q.regs} c="a-mem" />
          <Sram r={q.regs} step={q.regs.w / 16} vertical />
          <R r={q.lanes} c="a-gpu" />
          {Array.from({ length: 32 }, (_, k) => {
            const c = sub(q.lanes, 0.04 + (k % 8) * 0.12, 0.08 + Math.floor(k / 8) * 0.23, 0.09, 0.17);
            return <rect key={k} className="a-gpu" x={c.x} y={c.y} width={c.w} height={c.h} />;
          })}
          <R r={q.tensor} c="a-gpu" />
          <R r={sub(q.tensor, 0.15, 0.15, 0.7, 0.7)} c="a-gpu" />
        </g>
      ))}
      <R r={si.smem} c="a-mem" />
      <Sram r={si.smem} step={si.smem.w / 40} vertical />
    </g>
  );
}

export const GpuPackageArt = memo(function GpuPackageArt({ p, detail = false }: { p: Rect; detail?: boolean }) {
  const g = gpuPackage(p);
  return (
    <g>
      <rect className="a-sub" x={p.x} y={p.y} width={p.w} height={p.h} rx={18} />
      {g.hbm.map((h, i) => (
        <g key={i}>
          <R r={h} c="a-mem-solid" rx={4} />
          <Sram r={sub(h, 0.08, 0.08, 0.84, 0.84)} step={h.h / 9} />
        </g>
      ))}
      <rect className="a-die" x={g.die.x} y={g.die.y} width={g.die.w} height={g.die.h} rx={4} />
      {g.gpcs.map((r, i) => <rect key={i} className="a-fine" x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 4} rx={2} />)}
      {g.sms.map((s, i) => (
        <rect key={i} className={SM_OFF.has(i) ? 'a-gpu-off' : 'a-gpu'} x={s.x} y={s.y} width={s.w} height={s.h} rx={1.5} />
      ))}
      {detail && g.sms.map((s, i) => i > 0 && !SM_OFF.has(i) && <path key={'x' + i} className="a-fine" d={`M${s.x + s.w / 2} ${s.y + 2}V${s.y + s.h * 0.78}M${s.x + 1} ${s.y + s.h * 0.4}H${s.x + s.w - 1}M${s.x + 1} ${s.y + s.h * 0.8}H${s.x + s.w - 1}`} />)}
      {detail && <SmDetail s={g.sms[0]} />}
      {detail && [3, 20, 41, 57, 75, 96, 110, 131].map((i, k) => {
        const s = g.sms[i];
        return <rect key={'p' + i} className="a-pulse" x={s.x} y={s.y} width={s.w} height={s.h} rx={1.5} style={{ animationDelay: `${(k * 0.43) % 3.4}s` }} />;
      })}
      {g.l2.map((r, i) => <g key={i}><R r={r} c="a-mem" /><Sram r={r} step={6} vertical /></g>)}
      <R r={g.blockSched} c="a-cpu" />
      {g.io.map((r, i) => <R key={i} r={r} c="a-mem" />)}
    </g>
  );
});

export const GpuServerArt = memo(function GpuServerArt() {
  return (
    <g className="chipart">
      <rect className="a-board" x={GPU_BOARD.x} y={GPU_BOARD.y} width={GPU_BOARD.w} height={GPU_BOARD.h} rx={40} />
      {/* NVLink traces: every GPU to every NVSwitch */}
      {GPU_PKGS.map((pk, i) => NVSWITCHES.map((sw, j) => {
        const top = i < 4, x1 = pk.x + 300 + j * 130, y1 = top ? pk.y + pk.h : pk.y, x2 = sw.x + 80 + (i % 4) * 110, y2 = top ? sw.y : sw.y + sw.h;
        return <path key={`${i}-${j}`} className="a-trace" d={`M${x1} ${y1}V${(y1 + y2) / 2}H${x2}V${y2}`} />;
      }))}
      {NICS.map((n, i) => <path key={'n' + i} className="a-trace" d={`M${GPU_PKGS[i % 4].x + 1000} ${GPU_PKGS[i].y + 350}H${n.x}`} />)}
      {GPU_PKGS.map((pk, i) => <GpuPackageArt key={i} p={pk} detail={i === 0} />)}
      {NVSWITCHES.map((s, i) => (
        <g key={i}>
          <rect className="a-sub" x={s.x} y={s.y} width={s.w} height={s.h} rx={14} />
          <R r={sub(s, 0.25, 0.22, 0.5, 0.56)} c="a-mem" rx={4} />
          <Sram r={sub(s, 0.3, 0.3, 0.4, 0.4)} step={10} />
        </g>
      ))}
      {NICS.map((n, i) => (
        <g key={i}>
          <R r={n} c="a-mem-solid" rx={8} />
          <R r={sub(n, 0.3, 0.25, 0.4, 0.5)} c="a-neutral" rx={3} />
        </g>
      ))}
      <rect className="a-ghost" x={HOST_TRAY.x} y={HOST_TRAY.y} width={HOST_TRAY.w} height={HOST_TRAY.h} rx={16} />
      {[0, 1].map(i => <R key={i} r={{ x: HOST_TRAY.x + 1500 + i * 1100, y: HOST_TRAY.y + 30, w: 500, h: 140 }} c="a-cpu" rx={8} />)}
    </g>
  );
});

// ------------------------------------------------------------------ CPU
function CoreArt({ c, detail }: { c: Rect; detail: boolean }) {
  const k = coreInside(c);
  const cls = (x: string) => (detail ? x : 'a-fine');
  return (
    <g>
      <R r={c} c="a-cpu" rx={1.5} />
      <R r={k.frontend} c={cls('a-cpu')} />
      {detail && <><R r={k.bpred} c="a-cpu" /><R r={k.l1i} c="a-mem" /><Sram r={k.l1i} step={k.l1i.w / 8} vertical /></>}
      <R r={k.decode} c={cls('a-cpu')} />
      <R r={k.ooo} c={cls('a-cpu')} />
      {detail && <><R r={k.rob} c="a-cpu" /><R r={k.sched} c="a-cpu" /><R r={k.regs} c="a-mem" /></>}
      <R r={k.exec} c={cls('a-gpu')} />
      {detail && <><R r={k.alu} c="a-gpu" /><R r={k.fpu} c="a-gpu" /><R r={k.simd} c="a-gpu" /><R r={k.lsu} c="a-mem" /><R r={k.tlb} c="a-mem" /></>}
      <R r={k.l1d} c={detail ? 'a-mem' : 'a-fine'} />
      <R r={k.l2} c="a-mem" />
      <Sram r={k.l2} step={k.l2.w / (detail ? 24 : 10)} vertical />
    </g>
  );
}

export const CpuPackageArt = memo(function CpuPackageArt() {
  return (
    <g>
      <rect className="a-sub" x={CPU_PKG.x} y={CPU_PKG.y} width={CPU_PKG.w} height={CPU_PKG.h} rx={14} />
      {CCDS.map((ccd, ci) => (
        <g key={ci}>
          <rect className="a-die" x={ccd.x} y={ccd.y} width={ccd.w} height={ccd.h} rx={3} />
          {ccdCores(ccd).map((c, i) => <CoreArt key={i} c={c} detail={ci === 0 && i === 0} />)}
          <R r={ccdL3(ccd)} c="a-mem" />
          <Sram r={ccdL3(ccd)} step={4} vertical />
        </g>
      ))}
      <rect className="a-die" x={IOD.x} y={IOD.y} width={IOD.w} height={IOD.h} rx={3} />
      <R r={IOD_MEMCTL} c="a-mem" />
      <Sram r={IOD_MEMCTL} step={8} />
      <R r={IOD_PCIE} c="a-mem" />
      <Sram r={IOD_PCIE} step={8} />
      <R r={{ x: IOD.x + 14, y: IOD.y + 116, w: IOD.w - 28, h: 88 }} c="a-neutral" />
      {FABRIC_LINKS.map((l, i) => <g key={i}>{[0, 4, 8].map(d => <path key={d} className="a-trace" d={`M${l.x} ${l.y + 2 + d}H${l.x + l.w}`} />)}</g>)}
    </g>
  );
});

export const CpuBoardArt = memo(function CpuBoardArt() {
  return (
    <g className="chipart">
      <rect className="a-board" x={CPU_BOARD.x} y={CPU_BOARD.y} width={CPU_BOARD.w} height={CPU_BOARD.h} rx={30} />
      {/* DDR5 traces socket → DIMMs, PCIe traces → slot, M.2 traces */}
      {DIMMS.map((d, i) => Array.from({ length: 5 }, (_, k) => <path key={`${i}-${k}`} className="a-trace" d={`M${CPU_PKG.x + CPU_PKG.w} ${560 + i * 18 + k * 3}H${d.x}`} />))}
      {Array.from({ length: 6 }, (_, k) => <path key={'p' + k} className="a-trace" d={`M${900 + k * 8} ${CPU_PKG.y + CPU_PKG.h}V${PCIE_SLOT.y}`} />)}
      {Array.from({ length: 3 }, (_, k) => <path key={'m' + k} className="a-trace" d={`M${NVME.x + NVME.w} ${NVME.y + 25 + k * 8}H${760 + k * 8}V${CPU_PKG.y}`} />)}
      <rect className="a-fine" x={CPU_PKG.x - 30} y={CPU_PKG.y - 30} width={CPU_PKG.w + 60} height={CPU_PKG.h + 60} rx={20} />
      {VRMS.map((v, i) => <g key={i}><R r={v} c="a-cpu" rx={6} /><circle className="a-fine" cx={v.x + v.w / 2} cy={v.y + v.h / 2} r={14} /></g>)}
      {DIMMS.map((d, i) => (
        <g key={i}>
          <R r={d} c="a-mem-solid" rx={4} />
          {Array.from({ length: 8 }, (_, k) => <R key={k} r={{ x: d.x + 6, y: d.y + 20 + k * 66, w: d.w - 12, h: 50 }} c="a-neutral" rx={2} />)}
        </g>
      ))}
      <R r={NVME} c="a-mem-solid" rx={6} />
      {[0, 1, 2].map(k => <R key={k} r={{ x: NVME.x + 30 + k * 110, y: NVME.y + 12, w: 90, h: 46 }} c="a-neutral" rx={3} />)}
      <R r={PCIE_SLOT} c="a-mem" rx={4} />
      <rect className="a-ghost" x={GPU_CARD.x} y={GPU_CARD.y} width={GPU_CARD.w} height={GPU_CARD.h} rx={16} />
      {[0, 1, 2].map(k => <circle key={k} className="a-gpu" cx={GPU_CARD.x + 260 + k * 400} cy={GPU_CARD.y + 110} r={80} />)}
      <rect className="a-ghost" x={NUMA_GHOST.x} y={NUMA_GHOST.y} width={NUMA_GHOST.w} height={NUMA_GHOST.h} rx={14} />
      <CpuPackageArt />
    </g>
  );
});
