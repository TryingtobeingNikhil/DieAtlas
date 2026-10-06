import { memo } from 'react';
import {
  type Rect, sub, cells, gpuPackage, smInside, SM_OFF, HBM_OFF, GPU_PKGS, NVSWITCHES, NICS, HOST_TRAY, GPU_BOARD,
} from './geometry';

// H100 drawings in the "engineering drawing" style: hairline structure (1 px),
// 0.5 px internal detail, 0–2 px corners on silicon, very low-alpha fills, and
// microstructure (bitcells, standard-cell rows, lane arrays, MAC grids) instead of tiles.
// Level of detail keeps it fast: 'server' (8 simple packages), 'pkg' (one package in
// full detail), 'sm' (adds one SM with every lane and bank drawn).

export type Lod = 'server' | 'pkg' | 'sm';

// ---------------------------------------------------------------- patterns
/** Std-cell rows: horizontal rails with irregular cell boundaries. pitch = row height. */
function StdCell({ id, color, pitch, sw = 0.09, op = 0.32 }: { id: string; color: string; pitch: number; sw?: number; op?: number }) {
  const W = pitch * 13, rows = [[1.1, 2.8, 3.6, 5.6, 7.2, 9.4, 10.8, 12.2], [0.6, 2.2, 4.4, 5.3, 6.7, 8.9, 11.6], [1.7, 3.3, 3.9, 6.1, 7.8, 8.6, 11.1, 12.7], [0.8, 2.8, 5, 6.9, 10, 10.6, 12.4]];
  let d = '';
  rows.forEach((xs, r) => {
    d += `M0 ${r * pitch}H${W}`;
    xs.forEach(x => { d += `M${x * pitch} ${r * pitch}v${pitch}`; });
  });
  return (
    <pattern id={id} width={W} height={pitch * 4} patternUnits="userSpaceOnUse">
      <path d={d} fill="none" stroke={color} strokeOpacity={op} strokeWidth={pitch * sw} />
    </pattern>
  );
}
/** SRAM bitcells: a fine square grid. */
function Bitcells({ id, color, pitch, op = 0.3, sw = 0.12 }: { id: string; color: string; pitch: number; op?: number; sw?: number }) {
  return (
    <pattern id={id} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
      <path d={`M0 0H${pitch}M0 0V${pitch}`} fill="none" stroke={color} strokeOpacity={op} strokeWidth={pitch * sw} />
    </pattern>
  );
}
/** Tensor-core MAC array: denser than bitcells, with a diagonal accent so it reads differently from FP32 lanes. */
function MacGrid({ id, pitch }: { id: string; pitch: number }) {
  return (
    <pattern id={id} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
      <rect x={pitch * 0.12} y={pitch * 0.12} width={pitch * 0.76} height={pitch * 0.76} fill="var(--gpu)" fillOpacity={0.28} />
      <path d={`M${pitch * 0.12} ${pitch * 0.88}L${pitch * 0.88} ${pitch * 0.12}`} stroke="var(--gpu)" strokeOpacity={0.5} strokeWidth={pitch * 0.06} />
    </pattern>
  );
}

export function GpuDefs() {
  return (
    <defs>
      {/* package scale (1 unit ≈ 1 px) */}
      <Bitcells id="bc-mem" color="var(--mem)" pitch={2} op={0.4} sw={0.18} />
      <pattern id="lanes-pkg" width="1.1" height="1.6" patternUnits="userSpaceOnUse">
        <rect x="0.15" y="0.15" width="0.75" height="1.3" fill="var(--gpu)" fillOpacity="0.32" />
      </pattern>
      <Bitcells id="bc-mem-s" color="var(--mem)" pitch={1} op={0.6} sw={0.3} />
      <StdCell id="sc-cpu-s" color="var(--cpu)" pitch={0.7} sw={0.3} op={0.55} />
      <MacGrid id="mac-pkg" pitch={0.9} />
      <StdCell id="sc-cpu" color="var(--cpu)" pitch={1.8} sw={0.16} op={0.45} />
      <StdCell id="sc-mem" color="var(--mem)" pitch={1.6} sw={0.16} op={0.45} />
      {/* SM scale (1 unit ≈ 20 px) */}
      <Bitcells id="bc-mem-f" color="var(--mem)" pitch={0.11} op={0.35} />
      <StdCell id="sc-cpu-f" color="var(--cpu)" pitch={0.1} />
      <MacGrid id="mac-f" pitch={0.13} />
      <linearGradient id="hbm-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--mem)" stopOpacity="0.16" />
        <stop offset="1" stopColor="var(--mem)" stopOpacity="0.06" />
      </linearGradient>
    </defs>
  );
}

const Rc = ({ r, c, rx = 0.5, style }: { r: Rect; c: string; rx?: number; style?: React.CSSProperties }) => (
  <rect className={c} x={r.x} y={r.y} width={r.w} height={r.h} rx={rx} style={style} />
);

// ---------------------------------------------------------------- pieces
/** HBM stack, top view: two-tone bevel (light top-left edge, dark bottom-right), no drop shadow. */
function Hbm({ r, off }: { r: Rect; off: boolean }) {
  const b = 3;
  return (
    <g className={off ? 'k-off' : undefined}>
      <rect className="hbm-body" x={r.x} y={r.y} width={r.w} height={r.h} rx={1} />
      <path className="bevel-hi" d={`M${r.x + 0.5} ${r.y + r.h - 0.5}V${r.y + 0.5}H${r.x + r.w - 0.5}`} />
      <path className="bevel-lo" d={`M${r.x + r.w - 0.5} ${r.y + 0.5}V${r.y + r.h - 0.5}H${r.x + 0.5}`} />
      <rect x={r.x + b} y={r.y + b} width={r.w - 2 * b} height={r.h - 2 * b} fill="url(#hbm-top)" className="hair-mem" />
      {/* the top DRAM die: a few banks */}
      {[0, 1, 2, 3].map(i => <rect key={i} className="det-mem" x={r.x + b + 6 + (i % 2) * ((r.w - 2 * b - 18) / 2 + 6)} y={r.y + b + 8 + Math.floor(i / 2) * ((r.h - 2 * b - 22) / 2 + 6)} width={(r.w - 2 * b - 18) / 2} height={(r.h - 2 * b - 22) / 2} fill="url(#bc-mem)" />)}
      {off && <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 4} textAnchor="middle" className="die-note">not enabled</text>}
    </g>
  );
}

/** Seal ring + bond-pad ring around a die. */
function DieEdge({ d, pitch = 7 }: { d: Rect; pitch?: number }) {
  const pads: Rect[] = [];
  const s = 2.2, inset = 4.5;
  for (let x = d.x + 12; x < d.x + d.w - 12; x += pitch) { pads.push({ x, y: d.y + inset, w: s, h: s }); pads.push({ x, y: d.y + d.h - inset - s, w: s, h: s }); }
  for (let y = d.y + 12; y < d.y + d.h - 12; y += pitch) { pads.push({ x: d.x + inset, y, w: s, h: s }); pads.push({ x: d.x + d.w - inset - s, y, w: s, h: s }); }
  const pd = pads.map(p => `M${p.x} ${p.y}h${p.w}v${p.h}h${-p.w}z`).join('');
  return (
    <g>
      <rect className="seal" x={d.x + 1} y={d.y + 1} width={d.w - 2} height={d.h - 2} />
      <rect className="seal" x={d.x + 2.6} y={d.y + 2.6} width={d.w - 5.2} height={d.h - 5.2} />
      <path className="pads" d={pd} />
    </g>
  );
}

/** One SM at package scale: outline, 4 partitions and their main blocks (cheap, reused 144×). */
function SmLiteSymbol({ w, h }: { w: number; h: number }) {
  const k = smInside({ x: 0, y: 0, w, h });
  return (
    <symbol id="sm-lite" viewBox={`0 0 ${w} ${h}`} overflow="visible">
      <rect className="sm-out" x={0} y={0} width={w} height={h} />
      <rect fill="url(#bc-mem-s)" className="t-edge-mem" x={k.l1i.x} y={k.l1i.y} width={k.l1i.w} height={k.l1i.h} />
      {k.inner.map((q, i) => (
        <g key={i}>
          <rect className="det-line" x={k.parts[i].x} y={k.parts[i].y} width={k.parts[i].w} height={k.parts[i].h} fill="none" />
          <rect fill="url(#sc-cpu-s)" className="t-edge-cpu" x={q.sched.x} y={q.sched.y} width={q.sched.w + q.dispatch.w + 0.3} height={q.sched.h} />
          <rect fill="url(#bc-mem-s)" className="t-edge-mem" x={q.regs.x} y={q.regs.y} width={q.regs.w} height={q.regs.h} />
          <rect fill="url(#lanes-pkg)" x={q.int32.x} y={q.int32.y} width={q.fp64.x + q.fp64.w - q.int32.x} height={q.fp32.h} />
          <rect fill="url(#mac-pkg)" x={q.tensor.x} y={q.tensor.y} width={q.tensor.w} height={q.tensor.h} />
        </g>
      ))}
      <rect fill="url(#bc-mem-s)" className="t-edge-mem" x={k.smem.x} y={k.smem.y} width={k.smem.w} height={k.smem.h} />
    </symbol>
  );
}

/** One SM in full detail (only drawn when you're inside it). */
export function SmDetail({ s }: { s: Rect }) {
  const k = smInside(s);
  return (
    <g className="sm-detail">
      <rect className="sm-out-hi" x={s.x} y={s.y} width={s.w} height={s.h} />
      <Rc r={k.l1i} c="arr-mem-f" rx={0} />
      {k.inner.map((q, i) => (
        <g key={i}>
          <rect className="det-line" x={k.parts[i].x} y={k.parts[i].y} width={k.parts[i].w} height={k.parts[i].h} fill="none" />
          <Rc r={q.l0} c="arr-mem-f" rx={0} />
          <Rc r={q.sched} c="logic-cpu-f" rx={0} />
          <Rc r={q.dispatch} c="logic-cpu-f" rx={0} />
          {/* register file: 4 banks of bitcells (bank split drawn schematically) */}
          {cells(q.regs, 4, 1, 0.05).map((b, j) => <Rc key={j} r={b} c="arr-mem-f" rx={0} />)}
          {cells(q.int32, 4, 4).map((c, j) => <Rc key={'i' + j} r={c} c="lane" rx={0} />)}
          {cells(q.fp32, 8, 4).map((c, j) => <Rc key={'f' + j} r={c} c="lane" rx={0} />)}
          {cells(q.fp64, 4, 4).map((c, j) => <Rc key={'d' + j} r={c} c="lane lane64" rx={0} />)}
          <Rc r={q.tensor} c="mac" rx={0} />
          {cells(q.ldst, 8, 1, 0.22).map((c, j) => <Rc key={'l' + j} r={c} c="unit-mem" rx={0} />)}
          {cells(q.sfu, 4, 1, 0.22).map((c, j) => <Rc key={'s' + j} r={c} c="unit-gpu" rx={0} />)}
        </g>
      ))}
      {/* L1 / shared memory: 32 banks of 4 bytes */}
      {cells(k.smem, 32, 1, 0.08).map((b, j) => <Rc key={j} r={b} c="arr-mem-f" rx={0} />)}
      {k.tex.map((t, j) => <Rc key={'t' + j} r={t} c="unit-gpu" rx={0} />)}
      <Rc r={k.tma} c="logic-cpu-f" rx={0} />
    </g>
  );
}

/** A package in simple form (server view, or the 7 packages around GPU 0). */
const PackageLite = memo(function PackageLite({ p }: { p: Rect }) {
  const g = gpuPackage(p);
  return (
    <g>
      <rect className="substrate" x={p.x} y={p.y} width={p.w} height={p.h} rx={4} />
      <rect className="interposer" x={g.interposer.x} y={g.interposer.y} width={g.interposer.w} height={g.interposer.h} rx={1} />
      {g.hbm.map((h, i) => <Hbm key={i} r={h} off={i === HBM_OFF} />)}
      <rect className="die" x={g.die.x} y={g.die.y} width={g.die.w} height={g.die.h} rx={1} />
      {g.gpcs.map((r, i) => <Rc key={i} r={r} c="t-gpu blk-gpu" />)}
      {g.l2.map((r, i) => <Rc key={i} r={r} c="t-mem blk-mem" />)}
    </g>
  );
});

/** GPU 0 in full detail. */
export const PackageFull = memo(function PackageFull({ p, smDetail }: { p: Rect; smDetail: boolean }) {
  const g = gpuPackage(p);
  const caps: Rect[] = [];
  for (let x = p.x + 250; x < p.x + 760; x += 16) { caps.push({ x, y: p.y + 30, w: 8, h: 5 }); caps.push({ x, y: p.y + p.h - 35, w: 8, h: 5 }); }
  for (let y = p.y + 110; y < p.y + 600; y += 16) { caps.push({ x: p.x + 14, y, w: 5, h: 8 }); caps.push({ x: p.x + p.w - 19, y, w: 5, h: 8 }); }
  // interposer wiring: HBM PHY ↔ die memory controller, orthogonal bundles
  let wires = '';
  g.hbm.forEach((h, i) => {
    if (i === HBM_OFF) return;
    const left = h.x < g.die.x, x0 = left ? h.x + h.w : h.x, x1 = left ? g.die.x + 8 : g.die.x + g.die.w - 8;
    for (let k = 0; k < 9; k++) { const y = h.y + 40 + k * 8; wires += `M${x0} ${y}H${x1}`; }
  });
  const sw = g.sms[0].w, sh = g.sms[0].h;
  return (
    <g>
      <rect className="substrate" x={p.x} y={p.y} width={p.w} height={p.h} rx={4} />
      <path className="caps" d={caps.map(c => `M${c.x} ${c.y}h${c.w}v${c.h}h${-c.w}z`).join('')} />
      <rect className="interposer" x={g.interposer.x} y={g.interposer.y} width={g.interposer.w} height={g.interposer.h} rx={1} />
      <path className="wires" d={wires} />
      {g.hbm.map((h, i) => <Hbm key={i} r={h} off={i === HBM_OFF} />)}
      <rect className="die" x={g.die.x} y={g.die.y} width={g.die.w} height={g.die.h} rx={1} />
      <DieEdge d={g.die} />
      {g.memctl.map((r, i) => <Rc key={i} r={r} c="logic-mem" rx={0} />)}
      {g.io.map((r, i) => (
        <g key={i}>
          <Rc r={r} c="t-mem blk-mem" rx={0} />
          {cells(r, 36, 1, 0.35).map((c, j) => <Rc key={j} r={c} c="phy" rx={0} />)}
        </g>
      ))}
      {g.gpcs.map((r, i) => <Rc key={i} r={r} c="blk-gpu" rx={0} />)}
      {g.tpcs.map((r, i) => <Rc key={i} r={{ x: r.x - 0.6, y: r.y - 0.6, w: r.w + 1.2, h: r.h + 1.2 }} c="det-line" rx={0} />)}
      <SmLiteSymbol w={sw} h={sh} />
      {g.sms.map((s, i) => (
        <use key={i} href="#sm-lite" x={s.x} y={s.y} width={s.w} height={s.h} className={SM_OFF.has(i) ? 'sm-off' : 'sm-on'} />
      ))}
      {smDetail && <SmDetail s={g.sms[0]} />}
      {g.l2.map((r, i) => (
        <g key={i}>
          <Rc r={r} c="blk-mem" rx={0} />
          {cells(r, 8, 2, 0.06).map((b, j) => <Rc key={j} r={b} c="arr-mem" rx={0} />)}
        </g>
      ))}
      <Rc r={g.blockSched} c="logic-cpu" rx={0} />
    </g>
  );
});

// ---------------------------------------------------------------- views
export const GpuWorldArt = memo(function GpuWorldArt({ lod }: { lod: Lod }) {
  return (
    <g className="chipart gpu-art">
      <rect className="board" x={GPU_BOARD.x} y={GPU_BOARD.y} width={GPU_BOARD.w} height={GPU_BOARD.h} rx={4} />
      {/* NVLink traces: every GPU to every NVSwitch, orthogonal */}
      <path className="wires" d={GPU_PKGS.flatMap((pk, i) => NVSWITCHES.map((sw, j) => {
        const top = i < 4, x1 = pk.x + 300 + j * 130, y1 = top ? pk.y + pk.h : pk.y, x2 = sw.x + 80 + (i % 4) * 110, y2 = top ? sw.y : sw.y + sw.h, ym = (y1 + y2) / 2;
        const c = 30 * Math.sign(x2 - x1), cy = top ? 30 : -30;
        return Math.abs(x2 - x1) < 61 ? `M${x1} ${y1}V${ym}H${x2}V${y2}` : `M${x1} ${y1}V${ym - cy}L${x1 + c} ${ym}H${x2 - c}L${x2} ${ym + cy}V${y2}`;
      })).join('')} />
      {GPU_PKGS.map((pk, i) => (lod !== 'server' && i === 0 ? <PackageFull key={i} p={pk} smDetail={lod === 'sm'} /> : <PackageLite key={i} p={pk} />))}
      {NVSWITCHES.map((s, i) => (
        <g key={i}>
          <rect className="substrate" x={s.x} y={s.y} width={s.w} height={s.h} rx={4} />
          <rect className="die" x={s.x + s.w * 0.25} y={s.y + s.h * 0.22} width={s.w * 0.5} height={s.h * 0.56} rx={1} />
          <rect x={s.x + s.w * 0.3} y={s.y + s.h * 0.3} width={s.w * 0.4} height={s.h * 0.4} fill="url(#sc-mem)" className="hair-mem" />
        </g>
      ))}
      {NICS.map((n, i) => (
        <g key={i}>
          <rect className="substrate" x={n.x} y={n.y} width={n.w} height={n.h} rx={2} />
          <Rc r={sub(n, 0.3, 0.25, 0.4, 0.5)} c="logic-mem" rx={0} />
        </g>
      ))}
      <rect className="ghost" x={HOST_TRAY.x} y={HOST_TRAY.y} width={HOST_TRAY.w} height={HOST_TRAY.h} rx={4} />
      {[0, 1].map(i => <Rc key={i} r={{ x: HOST_TRAY.x + 1500 + i * 1100, y: HOST_TRAY.y + 30, w: 500, h: 140 }} c="logic-cpu" rx={1} />)}
    </g>
  );
});

/** Side view of one HBM stack, used in the hover tip. */
export function HbmSideView({ beginner }: { beginner: boolean }) {
  const layers = 8;
  return (
    <svg width="220" height="96" viewBox="0 0 220 96" role="img" aria-label="HBM3 stack side view: a base logic die with 8 DRAM dies stacked on top">
      <rect x="10" y="80" width="200" height="8" fill="var(--hairline-2)" />
      <rect x="40" y="72" width="140" height="8" fill="color-mix(in srgb, var(--cpu) 25%, transparent)" stroke="var(--cpu)" strokeWidth="0.75" />
      {Array.from({ length: layers }, (_, i) => (
        <rect key={i} x="40" y={63 - i * 7} width="140" height="6" fill="color-mix(in srgb, var(--mem) 20%, transparent)" stroke="var(--mem)" strokeWidth="0.75" />
      ))}
      {[60, 85, 110, 135, 160].map(x => <path key={x} d={`M${x} 14V78`} stroke="var(--text-2)" strokeWidth="0.6" strokeDasharray="1.5 1.5" />)}
      <text x="188" y="40" fill="var(--mem)" fontSize="10" fontFamily="var(--mono)">{beginner ? '8 memory' : '8 × DRAM'}</text>
      <text x="188" y="52" fill="var(--mem)" fontSize="10" fontFamily="var(--mono)">{beginner ? 'chips' : 'dies'}</text>
      <text x="188" y="79" fill="var(--cpu)" fontSize="10" fontFamily="var(--mono)">base</text>
      <text x="10" y="10" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono)">{beginner ? 'wires go straight down through the chips' : 'TSVs ↓ · 1,024-bit interface'}</text>
    </svg>
  );
}
