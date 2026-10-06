import { Fig, B, showK, pathK, cellRects, type Anim, type Track } from './Fig';
import type { Cue } from '../content/parts/types';

// A generic GPU compute unit: 64 warp slots, 4 partitions (scheduler, dispatch, a quarter of
// the register file, INT and FP32 lanes, a matrix unit, LD/ST and SFUs), shared memory / L1.
// Counts are illustrative of 2020s designs, not any one product.

const PX = (i: number) => 20 + i * 192, PW = 180;
const SLOTS = cellRects(20, 22, 760, 34, 32, 2, 2);          // 64 warp slots
const lanes = (i: number) => cellRects(PX(i) + 52, 208, 80, 60, 8, 4, 2);
const banks = cellRects(26, 366, 748, 22, 32, 1, 2);

/** Issue: per partition, scheduler flash → token to dispatch → lanes fire column by column. */
function issueTracks(period = 0.5): Track[] {
  const out: Track[] = [];
  for (let p = 0; p < 4; p++) {
    const off = p * 0.03;
    const wins = [0, period].map(s => s + off);
    out.push({ a: `sch${p}`, cls: ['lit', wins.map(s => [s, s + 0.12] as [number, number])] });
    for (let c = 0; c < 8; c++) out.push({ a: `col${p}-${c}`, cls: ['fire', wins.map(s => [s + 0.18 + c * 0.012, s + 0.36 + c * 0.012] as [number, number])] });
    out.push({ a: `itok${p}`, o: [[off, 0], [off + 0.02, 1], [off + 0.16, 1], [off + 0.18, 0], [off + period, 0], [off + period + 0.02, 1], [off + period + 0.16, 1], [off + period + 0.18, 0]],
      y: [[off, 87], [off + 0.12, 113], [off + period, 87], [off + period + 0.12, 113]] });
  }
  return out;
}

const MODES: Record<string, Anim> = {
  issue: { dur: 2.6, still: 0.25, tracks: issueTracks() },
  occupancy: {
    dur: 6, still: 0.85,
    tracks: [
      // 8 blocks of 8 warps arrive; each fills 8 slots and 1/8 of every partition's registers
      ...Array.from({ length: 8 }, (_, b) => ({ a: `blk${b}`, cls: ['full', [[0.08 + b * 0.08, 0.97]]] as [string, [number, number][]] })),
      ...[0, 1, 2, 3].map(p => ({ a: `regfill${p}`, sx: [[0.04, 0], ...Array.from({ length: 8 }, (_, b) => [0.08 + b * 0.08 + 0.03, (b + 1) / 8] as [number, number]), [0.97, 1], [0.99, 0]] as [number, number][] })),
      { a: 'occnote', o: showK(0.76, 0.96) },
      { a: 'blocktok', o: [[0, 0], [0.04, 1], [0.7, 1], [0.74, 0]], x: Array.from({ length: 9 }, (_, b) => [0.04 + b * 0.08, 0] as [number, number]) },
    ],
  },
  hide: {
    dur: 8, still: 0.45,
    tracks: [
      // three warps take turns issuing loads; each waits ~half the loop, others keep issuing
      ...[0, 1, 2].map(k => ({ a: `wait${k}`, cls: ['wait', [[0.05 + k * 0.12, 0.6 + k * 0.12]]] as [string, [number, number][]] })),
      ...[0, 1, 2].map(k => ({ a: `ld${k}`, o: showK(0.05 + k * 0.12, 0.14 + k * 0.12), ...pathK([[0.05 + k * 0.12, PX(k) + 60, 287], [0.14 + k * 0.12, 790, 287]]) })),
      ...[0, 1, 2].map(k => ({ a: `back${k}`, o: showK(0.52 + k * 0.12, 0.6 + k * 0.12), ...pathK([[0.52 + k * 0.12, 790, 165], [0.6 + k * 0.12, PX(k) + 90, 165]]) })),
      ...issueTracks(0.25).map(t => ({ ...t, cls: t.cls ? [t.cls[0], [...t.cls[1], ...t.cls[1].map(([a, b]) => [a + 0.5, b + 0.5] as [number, number])]] as [string, [number, number][]] : undefined, o: undefined, y: undefined })),
      { a: 'pick', cls: ['pick', [[0.1, 0.16], [0.22, 0.28], [0.34, 0.4], [0.46, 0.52], [0.58, 0.64], [0.7, 0.76], [0.82, 0.88]]] },
      { a: 'memnote', o: [[0, 1]] },
    ],
  },
  diverge: {
    dur: 4, still: 0.3,
    tracks: [
      ...[0, 1, 2, 3].flatMap(p => Array.from({ length: 8 }, (_, c) => ({ a: `col${p}-${c}`, cls: ['fire', c < 4 ? [[0.1, 0.45]] : [[0.55, 0.9]]] as [string, [number, number][]] }))),
      ...[0, 1, 2, 3].flatMap(p => Array.from({ length: 8 }, (_, c) => ({ a: `col${p}-${c}`, o: (c < 4 ? [[0.45, 1], [0.5, 0.25], [0.95, 0.25], [0.99, 1]] : [[0.05, 1], [0.1, 0.25], [0.5, 0.25], [0.55, 1]]) as [number, number][] }))),
      { a: 'divnote', o: [[0, 1]] },
      { a: 'divA', o: showK(0.1, 0.45) }, { a: 'divB', o: showK(0.55, 0.9) },
    ],
  },
  smem: {
    dur: 3, still: 0.6,
    tracks: [
      ...[0, 1, 2, 3].map(p => ({ a: `smtok${p}`, o: showK(0.05, 0.3), ...pathK([[0.05, PX(p) + 60, 287], [0.3, PX(p) + 60, 352]]) })),
      ...banks.map((_, i) => ({ a: `bank${i}`, cls: ['fire', [[0.32 + i * 0.008, 0.5 + i * 0.008]]] as [string, [number, number][]] })),
      { a: 'banknote', o: showK(0.4, 0.95) },
    ],
  },
};

export default function CuFigure({ cue, hover }: { cue: Cue; hover: string[] | null }) {
  return (
    <Fig name="cu" cue={cue} hover={hover} modes={MODES} label="A GPU compute unit: 64 warp slots at the top; four partitions, each with a scheduler, dispatch, registers, 32 lanes, a matrix unit, load/store and special-function units; shared memory and L1 across the bottom.">
      {/* warp slots: 64, grouped as 8 blocks of 8 warps */}
      <g data-p="warps">
        <text className="fl" x={20} y={14}>WARP SLOTS · 64</text>
        {SLOTS.map((s, i) => {
          const blk = Math.floor(i / 8);
          const a = [`blk${blk}`, i === 3 ? 'wait0 pick' : i === 13 ? 'wait1' : i === 22 ? 'wait2' : i === 40 || i === 9 || i === 51 ? 'pick' : ''].join(' ');
          return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} className="wslot" data-a={a} />;
        })}
      </g>
      <g data-a="occnote" style={{ opacity: 0 }}><text className="fl-s k-mem-t" x={780} y={14} textAnchor="end">32 registers/thread → 64 warps × 1,024 = 65,536: registers full</text></g>
      <g data-a="memnote" style={{ opacity: 0 }}><text className="fl-s" x={780} y={14} textAnchor="end"><tspan className="k-err-t">■ waiting on memory</tspan>  <tspan className="k-cpu-t">■ picked this cycle</tspan></text></g>
      <g data-a="divnote" style={{ opacity: 0 }}><text className="fl-s" x={780} y={14} textAnchor="end">if (i % 2 == 0) … else …  →  each path runs with half the lanes</text></g>
      <g data-a="divA" style={{ opacity: 0 }}><text className="fl-s k-gpu-t" x={20} y={420}>“if” path: lanes 0–15 active, 16–31 masked</text></g>
      <g data-a="divB" style={{ opacity: 0 }}><text className="fl-s k-gpu-t" x={20} y={420}>“else” path: lanes 16–31 active, 0–15 masked</text></g>

      {[0, 1, 2, 3].map(p => {
        const x = PX(p);
        return (
          <g key={p}>
            <rect x={x} y={68} width={PW} height={238} className="part-out" />
            <text className="fl-s" x={x + 4} y={64}>partition {p}</text>
            <B x={x + 6} y={74} w={PW - 12} h={26} k="cpu" p="sched" a={`sch${p}`} label="SCHEDULER" ly={91} />
            <B x={x + 6} y={104} w={PW - 12} h={18} k="cpu" p="dispatch" label="DISPATCH" ly={117} />
            <B x={x + 6} y={128} w={PW - 12} h={70} k="mem" p="regs" label="REGISTERS" sub="16K × 32-bit" fill="url(#f-bc)">
              <rect x={x + 6} y={180} width={PW - 12} height={18} className="regfill" data-a={`regfill${p}`} style={{ transform: 'scaleX(0)' }} />
            </B>
            <B x={x + 6} y={208} w={42} h={60} k="gpu" p="int32" />
            <text className="fl-s" x={x + 27} y={281} textAnchor="middle" data-p="int32">INT</text>
            {cellRects(x + 9, 211, 36, 54, 2, 4, 2).map((c, i) => <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} className="lane lane-i" />)}
            <g data-p="fp32">
              {Array.from({ length: 8 }, (_, c) => (
                <g key={c} data-a={`col${p}-${c}`} className="col">
                  {lanes(p).filter(l => l.c === c).map((l, i) => <rect key={i} x={l.x} y={l.y} width={l.w} height={l.h} className="lane" />)}
                </g>
              ))}
              <text className="fl-s" x={x + 92} y={281} textAnchor="middle">FP32 ×32</text>
            </g>
            <B x={x + 136} y={208} w={38} h={60} k="gpu" p="matrix" fill="url(#f-mac)" />
            <text className="fl-s" x={x + 155} y={281} textAnchor="middle" data-p="matrix">MATRIX</text>
            <B x={x + 6} y={287} w={110} h={14} k="mem" p="ldst" />
            <text className="fl-s" x={x + 10} y={298} data-p="ldst">LD / ST</text>
            <B x={x + 120} y={287} w={54} h={14} k="gpu" p="sfu" />
            <text className="fl-s" x={x + 124} y={298} data-p="sfu">SFU</text>
            {/* issue token: scheduler → dispatch */}
            <g data-a={`itok${p}`} style={{ opacity: 0 }}>
              <rect x={x + PW / 2 - 24} y={-8} width={48} height={16} className="tok tok-cpu" />
              <text x={x + PW / 2} y={4} textAnchor="middle" className="tok-t">w{(p * 5 + 3) % 16} FMA</text>
            </g>
          </g>
        );
      })}

      <B x={20} y={320} w={760} h={74} k="mem" p="smem l1" label="SHARED MEMORY / L1" sub="one pool for all 4 partitions · 32 banks · ~20–40 cycles">
        {banks.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} className="bank" data-a={`bank${i}`} />)}
      </B>
      <g data-a="banknote" style={{ opacity: 0 }}><text className="fl-s k-mem-t" x={780} y={412} textAnchor="end">32 threads → 32 different banks: one access, no conflict</text></g>

      {/* moving tokens */}
      <g data-a="blocktok" style={{ opacity: 0 }}><text className="fl-s k-gpu-t" x={20} y={420}>blocks of 256 threads (8 warps) arrive one by one</text></g>
      {[0, 1, 2].map(k => (
        <g key={k}>
          <g data-a={`ld${k}`} style={{ opacity: 0 }}><rect x={-22} y={-8} width={44} height={16} className="tok tok-mem" /><text x={0} y={4} textAnchor="middle" className="tok-t">load</text></g>
          <g data-a={`back${k}`} style={{ opacity: 0 }}><rect x={-22} y={-8} width={44} height={16} className="tok tok-mem" /><text x={0} y={4} textAnchor="middle" className="tok-t">data</text></g>
        </g>
      ))}
      {[0, 1, 2, 3].map(p => (
        <g key={p} data-a={`smtok${p}`} style={{ opacity: 0 }}><rect x={-18} y={-8} width={36} height={16} className="tok tok-mem" /><text x={0} y={4} textAnchor="middle" className="tok-t">lds</text></g>
      ))}
    </Fig>
  );
}
