import { memo } from 'react';
import {
  type Rect, sub, cells, coreInside, genCpuDie, genGpuPackage,
  CPU_BOARD, CPU_PKG, DIMMS, VRMS, NVME, GPU_CARD, PCIE_SLOT, NUMA_GHOST, GEN_CPU_DIE, GPU_PKGS, smInside,
} from './geometry';
import { DieEdge, Rc, SmDetail, ServerFrame, type Lod } from './GpuArt';

// The two generic (vendor-neutral) reference chips, in the same engineering-drawing kit
// as the real floorplans: hairline structure, low-alpha fills, microstructure patterns.
// Counts are illustrative (8 cores; 4 clusters × 8 compute units), not any one product.

/** Patterns at CPU-core scale (a core is ~100 units wide). */
export function CpuDefs() {
  return (
    <defs>
      <pattern id="sc-cpu-c" width="7.8" height="2.4" patternUnits="userSpaceOnUse">
        <path d="M0 0H7.8M0 1.2H7.8M1.1 0v1.2M3.4 0v1.2M5.9 0v1.2M0.6 1.2v1.2M2.7 1.2v1.2M4.9 1.2v1.2M7 1.2v1.2" fill="none" stroke="var(--cpu)" strokeOpacity="0.4" strokeWidth="0.12" />
      </pattern>
      <pattern id="bc-mem-c" width="0.9" height="0.9" patternUnits="userSpaceOnUse">
        <path d="M0 0H0.9M0 0V0.9" fill="none" stroke="var(--mem)" strokeOpacity="0.45" strokeWidth="0.12" />
      </pattern>
    </defs>
  );
}

// ------------------------------------------------------------------ CPU
/** One core: front end, decode, out-of-order engine, execution units, L1D and L2. */
function CoreKit({ c }: { c: Rect }) {
  const k = coreInside(c);
  return (
    <g>
      <rect className="core-out" x={c.x} y={c.y} width={c.w} height={c.h} />
      <Rc r={k.frontend} c="blk-cpu" rx={0} />
      <Rc r={k.bpred} c="logic-cpu-c" rx={0} />
      <Rc r={k.l1i} c="arr-mem-c" rx={0} />
      <Rc r={k.decode} c="logic-cpu-c" rx={0} />
      <Rc r={k.ooo} c="blk-cpu" rx={0} />
      <Rc r={k.rob} c="logic-cpu-c" rx={0} />
      <Rc r={k.sched} c="logic-cpu-c" rx={0} />
      <Rc r={k.regs} c="arr-mem-c" rx={0} />
      <Rc r={k.exec} c="blk-gpu" rx={0} />
      {[k.alu, k.fpu, k.simd].map((u, i) => (
        <g key={i}>{cells(u, 2, 4, 0.25).map((l, j) => <Rc key={j} r={l} c="lane" rx={0} />)}</g>
      ))}
      <Rc r={k.lsu} c="unit-mem" rx={0} />
      <Rc r={k.tlb} c="arr-mem-c" rx={0} />
      {cells(k.l1d, 8, 1, 0.08).map((b, j) => <Rc key={j} r={b} c="arr-mem-c" rx={0} />)}
      {cells(k.l2, 8, 2, 0.06).map((b, j) => <Rc key={'l2' + j} r={b} c="arr-mem-c" rx={0} />)}
    </g>
  );
}

export const GenCpuDieArt = memo(function GenCpuDieArt({ d = GEN_CPU_DIE }: { d?: Rect }) {
  const g = genCpuDie(d);
  const r = g.ring;
  return (
    <g>
      <rect className="die" x={d.x} y={d.y} width={d.w} height={d.h} rx={1} />
      <DieEdge d={d} pitch={9} />
      {/* ring: two counter-rotating rails with a stop at every core and at the IMC and I/O */}
      <rect className="blk-mem" x={r.x} y={r.y} width={r.w} height={r.h} />
      <path className="rail" d={`M${r.x} ${r.y + 4}H${r.x + r.w}M${r.x} ${r.y + r.h - 4}H${r.x + r.w}`} />
      {g.stops.map((x, i) => <rect key={i} className="stop" x={x - 3} y={r.y + 2} width={6} height={r.h - 4} />)}
      {g.cores.map((c, i) => <CoreKit key={i} c={c} />)}
      {g.slices.map((s, i) => (
        <g key={i}>
          <Rc r={s} c="blk-mem" rx={0} />
          {cells(s, 6, 2, 0.1).map((b, j) => <Rc key={j} r={b} c="arr-mem" rx={0} />)}
        </g>
      ))}
      {g.snoop.map((s, i) => <Rc key={i} r={s} c="logic-mem" rx={0} />)}
      {/* vertical taps from each core and slice down/up to the ring */}
      <path className="wires" d={g.cores.map((c, i) => {
        const x = c.x + c.w / 2, top = i < 4;
        return top ? `M${x} ${c.y + c.h}V${r.y}` : `M${x} ${c.y}V${r.y + r.h}`;
      }).join('')} />
      <Rc r={g.imc} c="logic-mem" rx={0} />
      {cells({ x: g.imc.x + g.imc.w - 10, y: g.imc.y, w: 8, h: g.imc.h }, 1, 24, 0.4).map((p, j) => <Rc key={j} r={p} c="phy" rx={0} />)}
      <Rc r={g.io} c="logic-mem" rx={0} />
      {cells({ x: g.io.x + 2, y: g.io.y, w: 8, h: g.io.h }, 1, 24, 0.4).map((p, j) => <Rc key={j} r={p} c="phy" rx={0} />)}
      <Rc r={g.pmu} c="logic-cpu" rx={0} />
      <path className="wires" d={`M${g.io.x + g.io.w} ${r.y + r.h / 2}H${r.x}M${r.x + r.w} ${r.y + r.h / 2}H${g.imc.x}`} />
    </g>
  );
});

export const GenCpuBoardArt = memo(function GenCpuBoardArt() {
  const P = CPU_PKG;
  const caps: string[] = [];
  for (let x = P.x + 40; x < P.x + P.w - 40; x += 18) caps.push(`M${x} ${P.y + 40}h8v5h-8z`, `M${x} ${P.y + P.h - 45}h8v5h-8z`);
  return (
    <g className="chipart kit">
      <rect className="board" x={CPU_BOARD.x} y={CPU_BOARD.y} width={CPU_BOARD.w} height={CPU_BOARD.h} rx={4} />
      {/* traces: memory channels to the DIMMs, PCIe lanes to the slot, x4 lanes to the SSD */}
      <path className="wires" d={DIMMS.map((d, i) => Array.from({ length: 6 }, (_, k) => `M${P.x + P.w} ${560 + i * 22 + k * 3}H${d.x}`).join('')).join('')} />
      <path className="wires" d={Array.from({ length: 8 }, (_, k) => `M${940 + k * 8} ${P.y + P.h}V${PCIE_SLOT.y}`).join('')} />
      <path className="wires" d={Array.from({ length: 4 }, (_, k) => `M${NVME.x + NVME.w} ${NVME.y + 22 + k * 8}H${760 + k * 8}V${P.y}`).join('')} />
      {VRMS.map((v, i) => <g key={i}><rect className="substrate" x={v.x} y={v.y} width={v.w} height={v.h} rx={2} /><circle className="det-line" fill="none" cx={v.x + v.w / 2} cy={v.y + v.h / 2} r={16} /></g>)}
      {DIMMS.map((d, i) => (
        <g key={i}>
          <rect className="substrate" x={d.x} y={d.y} width={d.w} height={d.h} rx={2} />
          {Array.from({ length: 8 }, (_, k) => <Rc key={k} r={{ x: d.x + 6, y: d.y + 20 + k * 66, w: d.w - 12, h: 50 }} c="arr-mem" rx={1} />)}
        </g>
      ))}
      <rect className="substrate" x={NVME.x} y={NVME.y} width={NVME.w} height={NVME.h} rx={3} />
      <Rc r={{ x: NVME.x + 20, y: NVME.y + 14, w: 70, h: 42 }} c="logic-mem" rx={0} />
      {[0, 1].map(k => <Rc key={k} r={{ x: NVME.x + 120 + k * 120, y: NVME.y + 12, w: 100, h: 46 }} c="arr-mem" rx={1} />)}
      <rect className="blk-mem" x={PCIE_SLOT.x} y={PCIE_SLOT.y} width={PCIE_SLOT.w} height={PCIE_SLOT.h} rx={2} />
      <path className="wires" d={Array.from({ length: 80 }, (_, k) => `M${PCIE_SLOT.x + 12 + k * 16} ${PCIE_SLOT.y + 6}v${PCIE_SLOT.h - 12}`).join('')} />
      <rect className="ghost" x={GPU_CARD.x} y={GPU_CARD.y} width={GPU_CARD.w} height={GPU_CARD.h} rx={8} />
      <text className="die-note" x={GPU_CARD.x + 24} y={GPU_CARD.y + 40} style={{ fontSize: 22 }}>graphics card (PCIe x16)</text>
      <rect className="ghost" x={NUMA_GHOST.x} y={NUMA_GHOST.y} width={NUMA_GHOST.w} height={NUMA_GHOST.h} rx={4} />
      <text className="die-note" x={NUMA_GHOST.x + 24} y={NUMA_GHOST.y + 40} style={{ fontSize: 22 }}>2nd socket (servers only)</text>
      {/* package: substrate, decoupling caps, one monolithic die */}
      <rect className="substrate" x={P.x} y={P.y} width={P.w} height={P.h} rx={4} />
      <path className="caps" d={caps.join('')} />
      <GenCpuDieArt />
    </g>
  );
});

// ------------------------------------------------------------------ GPU
/** Generic compute unit at package scale (reused 32× through <use>). */
function CuLiteSymbol({ w, h }: { w: number; h: number }) {
  // inline styles: class rules don't reliably reach inside <use> shadow trees
  const k = smInside({ x: 0, y: 0, w, h });
  const S = {
    out: { fill: 'color-mix(in srgb, var(--gpu) 7%, var(--silicon))', stroke: 'color-mix(in srgb, var(--gpu) 60%, transparent)', strokeWidth: 0.5 },
    cpu: { fill: 'color-mix(in srgb, var(--cpu) 14%, transparent)' },
    mem: { fill: 'color-mix(in srgb, var(--mem) 14%, transparent)' },
  };
  const R = ({ r, st }: { r: Rect; st: React.CSSProperties }) => <rect x={r.x} y={r.y} width={r.w} height={r.h} style={st} />;
  return (
    <symbol id="cu-lite" viewBox={`0 0 ${w} ${h}`} overflow="visible">
      <rect x={0} y={0} width={w} height={h} style={S.out} />
      {k.inner.map((q, i) => (
        <g key={i}>
          <R r={{ x: q.sched.x, y: q.sched.y, w: q.sched.w + q.dispatch.w + 0.6, h: q.sched.h }} st={S.cpu} />
          <R r={q.regs} st={S.mem} />
          <rect fill="url(#lanes-pkg)" x={q.int32.x} y={q.int32.y} width={q.fp64.x + q.fp64.w - q.int32.x} height={q.fp32.h} />
          <rect fill="url(#mac-pkg)" x={q.tensor.x} y={q.tensor.y} width={q.tensor.w} height={q.tensor.h} />
        </g>
      ))}
      <R r={k.smem} st={S.mem} />
    </symbol>
  );
}

/** A generic GPU card area: package (substrate + die) with device-memory chips beside it. */
function MemChip({ r }: { r: Rect }) {
  return (
    <g>
      <rect className="hbm-body" x={r.x} y={r.y} width={r.w} height={r.h} rx={1} />
      <path className="bevel-hi" d={`M${r.x + 0.5} ${r.y + r.h - 0.5}V${r.y + 0.5}H${r.x + r.w - 0.5}`} />
      <path className="bevel-lo" d={`M${r.x + r.w - 0.5} ${r.y + 0.5}V${r.y + r.h - 0.5}H${r.x + 0.5}`} />
      {cells(sub(r, 0.06, 0.1, 0.88, 0.8), 4, 2, 0.12).map((b, i) => <Rc key={i} r={b} c="arr-mem" rx={0} />)}
    </g>
  );
}

export const GenGpuPackageLite = memo(function GenGpuPackageLite({ p }: { p: Rect }) {
  const g = genGpuPackage(p);
  return (
    <g>
      <rect className="board-area" x={p.x} y={p.y} width={p.w} height={p.h} rx={4} />
      {g.mem.map((m, i) => <rect key={i} className="hbm-body" x={m.x} y={m.y} width={m.w} height={m.h} rx={1} />)}
      <rect className="substrate" x={g.substrate.x} y={g.substrate.y} width={g.substrate.w} height={g.substrate.h} rx={3} />
      <rect className="die" x={g.die.x} y={g.die.y} width={g.die.w} height={g.die.h} rx={1} />
      {g.clusters.map((r, i) => <Rc key={i} r={r} c="t-gpu blk-gpu" rx={0} />)}
      <Rc r={g.l2} c="t-mem blk-mem" rx={0} />
    </g>
  );
});

export const GenGpuPackageFull = memo(function GenGpuPackageFull({ p, cuDetail }: { p: Rect; cuDetail: boolean }) {
  const g = genGpuPackage(p);
  // board traces: each memory chip to the controller on its side of the die
  let wires = '';
  g.mem.forEach(m => {
    const left = m.x < g.die.x, x0 = left ? m.x + m.w : m.x, x1 = left ? g.memctl[0].x : g.memctl[1].x + g.memctl[1].w;
    for (let k = 0; k < 7; k++) { const y = m.y + 30 + k * 9; wires += `M${x0} ${y}H${x1}`; }
  });
  const caps: string[] = [];
  for (let x = g.substrate.x + 30; x < g.substrate.x + g.substrate.w - 30; x += 16) caps.push(`M${x} ${g.substrate.y + 14}h8v5h-8z`, `M${x} ${g.substrate.y + g.substrate.h - 19}h8v5h-8z`);
  const cw = g.cus[0].w, ch = g.cus[0].h;
  return (
    <g>
      <rect className="board-area" x={p.x} y={p.y} width={p.w} height={p.h} rx={4} />
      <path className="wires" d={wires} />
      {g.mem.map((m, i) => <MemChip key={i} r={m} />)}
      <rect className="substrate" x={g.substrate.x} y={g.substrate.y} width={g.substrate.w} height={g.substrate.h} rx={3} />
      <path className="caps" d={caps.join('')} />
      <rect className="die" x={g.die.x} y={g.die.y} width={g.die.w} height={g.die.h} rx={1} />
      <DieEdge d={g.die} />
      {g.memctl.map((r, i) => (
        <g key={i}>
          <Rc r={r} c="logic-mem" rx={0} />
          {cells(r, 1, 30, 0.4).map((c, j) => <Rc key={j} r={c} c="phy" rx={0} />)}
        </g>
      ))}
      {[g.hostIf, g.links].map((r, i) => (
        <g key={i}>
          <Rc r={r} c="t-mem blk-mem" rx={0} />
          {cells(r, Math.round(r.w / 12), 1, 0.35).map((c, j) => <Rc key={j} r={c} c="phy" rx={0} />)}
        </g>
      ))}
      <Rc r={g.cmd} c="logic-cpu" rx={0} />
      {g.clusters.map((r, i) => <Rc key={i} r={r} c="blk-gpu" rx={0} />)}
      {g.gfx.map((r, i) => (
        <g key={i}>
          <Rc r={r} c="unit-gpu" rx={0} />
          {cells(r, 12, 1, 0.3).map((c, j) => <Rc key={j} r={c} c="t-gpu2" rx={0} />)}
        </g>
      ))}
      <CuLiteSymbol w={cw} h={ch} />
      {g.cus.map((s, i) => <use key={i} href="#cu-lite" x={s.x} y={s.y} width={s.w} height={s.h} />)}
      {cuDetail && <SmDetail s={g.cus[0]} tma={false} />}
      {g.l2h.map((r, i) => (
        <g key={i}>
          <Rc r={r} c="blk-mem" rx={0} />
          {cells(r, 8, 2, 0.06).map((b, j) => <Rc key={j} r={b} c="arr-mem" rx={0} />)}
        </g>
      ))}
    </g>
  );
});

export const GenGpuWorldArt = memo(function GenGpuWorldArt({ lod }: { lod: Lod }) {
  return (
    <ServerFrame>
      {GPU_PKGS.map((pk, i) => (lod !== 'server' && i === 0 ? <GenGpuPackageFull key={i} p={pk} cuDetail={lod === 'sm'} /> : <GenGpuPackageLite key={i} p={pk} />))}
    </ServerFrame>
  );
});
