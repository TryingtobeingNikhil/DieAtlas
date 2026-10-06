import { Fig, B, showK, cellRects, type Anim, type Track } from './Fig';
import type { Cue } from '../content/parts/types';

// Device memory, two ways: GDDR chips on the board around the GPU (left) and HBM stacks
// on a silicon interposer beside the GPU die (right, with a side view of one stack).

// ---- left: GDDR card, 12 chips × 32 bits = 384-bit bus
const G = { x: 130, y: 140, w: 140, h: 140 };            // GPU package
const GD = { x: 155, y: 165, w: 90, h: 90 };             // GPU die
const GCHIPS = [
  ...[0, 1, 2, 3].map(i => ({ x: 52 + i * 78, y: 40, w: 60, h: 44, side: 't' })),
  ...[0, 1, 2, 3].map(i => ({ x: 52 + i * 78, y: 336, w: 60, h: 44, side: 'b' })),
  ...[0, 1].map(i => ({ x: 24, y: 152 + i * 68, w: 60, h: 48, side: 'l' })),
  ...[0, 1].map(i => ({ x: 316, y: 152 + i * 68, w: 60, h: 48, side: 'r' })),
];
function traceD(c: { x: number; y: number; w: number; h: number; side: string }): string {
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  if (c.side === 't') return `M${cx} ${c.y + c.h}V${110}L${(cx + GD.x + GD.w / 2) / 2} ${130}V${G.y}`;
  if (c.side === 'b') return `M${cx} ${c.y}V${310}L${(cx + GD.x + GD.w / 2) / 2} ${290}V${G.y + G.h}`;
  if (c.side === 'l') return `M${c.x + c.w} ${cy}H${G.x}`;
  return `M${c.x} ${cy}H${G.x + G.w}`;
}

// ---- right: HBM package (top view) and one stack (side view)
const HP = { x: 430, y: 40, w: 350, h: 200 };            // package substrate
const HI = { x: 444, y: 56, w: 322, h: 168 };            // interposer
const HD = { x: 548, y: 70, w: 114, h: 140 };            // GPU die
const STACKS = [{ x: 456, y: 70 }, { x: 456, y: 146 }, { x: 676, y: 70 }, { x: 676, y: 146 }].map(s => ({ ...s, w: 78, h: 64 }));
const hbmWires = (s: { x: number; y: number; w: number; h: number }) => {
  const left = s.x < HD.x, x0 = left ? s.x + s.w : s.x, x1 = left ? HD.x : HD.x + HD.w;
  return Array.from({ length: 10 }, (_, k) => `M${x0} ${s.y + 8 + k * 5}H${x1}`).join('');
};
// side view
const SV = { x: 440, y: 280 };
const DIES = Array.from({ length: 8 }, (_, i) => ({ x: SV.x + 70, y: SV.y + 96 - i * 11, w: 150, h: 9 }));

const pulse = (a: string, t0: number, per: number, len = 260): Track => ({ a, o: [[0, 1]], d: Array.from({ length: Math.round(1 / per) + 1 }, (_, k) => [Math.min(1, t0 + k * per), -k * len] as [number, number]) });

const MODES: Record<string, Anim> = {
  transfer: { dur: 3, still: 0.5, tracks: [pulse('gtr', 0, 1, 600), pulse('htr', 0, 1, 600), { a: 'die', cls: ['lit', [[0, 1]]] }] },
  gddr: { dur: 3, still: 0.5, tracks: [pulse('gtr', 0, 1, 600), { a: 'gnote', o: [[0, 1]] }] },
  hbm: { dur: 3, still: 0.5, tracks: [pulse('htr', 0, 1, 600), { a: 'hnote', o: [[0, 1]] }] },
  side: {
    dur: 3.5, still: 0.6,
    tracks: [
      pulse('tsv', 0, 1, 400),
      ...DIES.map((_, i) => ({ a: `die${i}`, cls: ['lit', [[0.1 + i * 0.08, 0.3 + i * 0.08]]] as [string, [number, number][]] })),
      { a: 'snote', o: showK(0.05, 0.95) },
    ],
  },
};

export default function DevmemFigure({ cue, hover }: { cue: Cue; hover: string[] | null }) {
  return (
    <Fig name="devmem" cue={cue} hover={hover} modes={MODES} label="Device memory: on the left, a GPU with 12 GDDR chips around it on the board; on the right, a GPU die with 4 HBM stacks beside it on a silicon interposer, and a side view of one stack.">
      {/* ---------------- GDDR ---------------- */}
      <text className="fl" x={24} y={22}>GDDR · CHIPS ON THE BOARD</text>
      <rect x={14} y={30} width={372} height={360} className="board" />
      <g data-p="board-traces channels">
        {GCHIPS.map((c, i) => <path key={i} d={traceD(c)} className="trace" />)}
        {GCHIPS.map((c, i) => <path key={'p' + i} d={traceD(c)} className="trace-pulse" data-a="gtr" strokeDasharray="14 186" />)}
      </g>
      {GCHIPS.map((c, i) => (
        <g key={i} data-p="gddr-chips">
          <rect x={c.x} y={c.y} width={c.w} height={c.h} className="chip-mem" />
          <rect x={c.x + 5} y={c.y + 5} width={c.w - 10} height={c.h - 10} fill="url(#f-bc)" />
        </g>
      ))}
      <rect x={G.x} y={G.y} width={G.w} height={G.h} className="substrate" />
      <g data-p="gpu-die" data-a="die"><rect x={GD.x} y={GD.y} width={GD.w} height={GD.h} className="die-g" /><text className="fl" x={GD.x + GD.w / 2} y={GD.y + GD.h / 2 + 4} textAnchor="middle">GPU</text></g>
      <g data-p="phy">
        <rect x={GD.x} y={GD.y} width={GD.w} height={6} className="phy" /><rect x={GD.x} y={GD.y + GD.h - 6} width={GD.w} height={6} className="phy" />
        <rect x={GD.x} y={GD.y} width={6} height={GD.h} className="phy" /><rect x={GD.x + GD.w - 6} y={GD.y} width={6} height={GD.h} className="phy" />
      </g>
      <text className="fl-s" x={24} y={406}>12 chips × 32 bits = 384-bit bus · ~14–32 Gb/s per wire</text>
      <g data-a="gnote" style={{ opacity: 0 }}><text className="fl-s k-mem-t" x={24} y={424}>384 × 21 Gb/s ÷ 8 = 1,008 GB/s</text></g>

      {/* ---------------- HBM ---------------- */}
      <text className="fl" x={430} y={22}>HBM · STACKS IN THE PACKAGE</text>
      <rect x={HP.x} y={HP.y} width={HP.w} height={HP.h} className="substrate" />
      <rect data-p="interposer" x={HI.x} y={HI.y} width={HI.w} height={HI.h} className="interposer" />
      <text data-p="interposer" className="fl-s" x={HI.x + 4} y={HI.y + HI.h - 4}>silicon interposer</text>
      <g data-p="channels">
        {STACKS.map((s, i) => <path key={i} d={hbmWires(s)} className="trace" />)}
        {STACKS.map((s, i) => <path key={'p' + i} d={hbmWires(s)} className="trace-pulse" data-a="htr" strokeDasharray="6 94" />)}
      </g>
      <g data-p="gpu-die" data-a="die"><rect x={HD.x} y={HD.y} width={HD.w} height={HD.h} className="die-g" /><text className="fl" x={HD.x + HD.w / 2} y={HD.y + HD.h / 2 + 4} textAnchor="middle">GPU</text></g>
      <g data-p="phy">
        <rect x={HD.x} y={HD.y + 6} width={6} height={HD.h - 12} className="phy" /><rect x={HD.x + HD.w - 6} y={HD.y + 6} width={6} height={HD.h - 12} className="phy" />
      </g>
      {STACKS.map((s, i) => (
        <g key={i} data-p="stack">
          <rect x={s.x} y={s.y} width={s.w} height={s.h} className="chip-mem" />
          <rect x={s.x + 4} y={s.y + 4} width={s.w - 8} height={s.h - 8} fill="url(#f-bc)" />
          <text className="fl-s" x={s.x + s.w / 2} y={s.y + s.h / 2 + 3} textAnchor="middle">HBM</text>
        </g>
      ))}
      <text className="fl-s" x={430} y={256}>1,024 bits per stack · up to 6.4 Gb/s per wire (HBM3)</text>
      <g data-a="hnote" style={{ opacity: 0 }}><text className="fl-s k-mem-t" x={430} y={270}>one stack: 1,024 × 6.4 ÷ 8 ≈ 819 GB/s</text></g>

      {/* side view of one stack */}
      <text className="fl" x={SV.x} y={SV.y - 4}>SIDE VIEW · ONE STACK</text>
      <rect x={SV.x} y={SV.y + 120} width={340} height={8} className="interposer" data-p="interposer" />
      <B x={SV.x + 70} y={SV.y + 106} w={150} h={12} k="cpu" p="base-die" />
      <text className="fl-s k-cpu-t" x={SV.x + 64} y={SV.y + 116} textAnchor="end" data-p="base-die">base die</text>
      {DIES.map((d, i) => (
        <g key={i} data-p="dram-dies" data-a={`die${i}`} className="sdie">
          <rect x={d.x} y={d.y} width={d.w} height={d.h} className="chip-mem" />
          {cellRects(d.x + 3, d.y + 2, d.w - 6, d.h - 4, 8, 1, 3).map((b, j) => <rect key={j} x={b.x} y={b.y} width={b.w} height={b.h} className="bank" data-p="banks" />)}
        </g>
      ))}
      <text className="fl-s k-mem-t" x={SV.x + 228} y={SV.y + 30} data-p="dram-dies">8 DRAM dies</text>
      <text className="fl-s" x={SV.x + 228} y={SV.y + 43} data-p="banks">(banks inside)</text>
      <g data-p="tsv">
        {[0, 1, 2, 3, 4].map(k => <path key={k} d={`M${SV.x + 85 + k * 30} ${SV.y + 16}V${SV.y + 118}`} className="tsv" />)}
        {[0, 1, 2, 3, 4].map(k => <path key={'p' + k} d={`M${SV.x + 85 + k * 30} ${SV.y + 118}V${SV.y + 16}`} className="trace-pulse" data-a="tsv" strokeDasharray="10 90" />)}
      </g>
      <text className="fl-s" x={SV.x + 228} y={SV.y + 61} data-p="tsv">TSVs: wires through</text>
      <text className="fl-s" x={SV.x + 228} y={SV.y + 74} data-p="tsv">every die</text>
      <rect x={SV.x + 240} y={SV.y + 88} width={80} height={30} className="die-g" data-p="gpu-die" />
      <text className="fl-s" x={SV.x + 280} y={SV.y + 107} textAnchor="middle" data-p="gpu-die">GPU</text>
      <g data-a="snote" style={{ opacity: 0 }}><text className="fl-s k-mem-t" x={SV.x} y={SV.y + 146}>data rises and falls through the TSVs to the base die, then across the interposer</text></g>
    </Fig>
  );
}
