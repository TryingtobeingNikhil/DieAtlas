import { Fig, B, showK, pathK, cellRects, type Anim, type Track } from './Fig';
import type { Cue } from '../content/parts/types';

// A CPU core as a pipeline: front end → decode → rename → schedulers → execution units,
// with the reorder buffer underneath keeping program order. Not to scale.

const ROW = [96, 126, 156, 186];
const X = { fetch: 96, dec: 242, ren: 354, sch: 470, ex: 599 };
const EX = { alu: [599, 82] as const, fp: [599, 135] as const, lsu: [599, 188] as const };
const ROBX = (j: number) => 219 + j * 38, ROBY = 343;
const RET: [number, number] = [728, 343];

/** A token that is visible during [t0, t1] and moves through points [t, x, y]. */
const tok = (a: string, pts: [number, number, number][], t1?: number): Track => ({ a, o: showK(pts[0][0], t1 ?? pts[pts.length - 1][0]), ...pathK(pts) });

function flowTracks(names: string[]): Track[] {
  const unit = [EX.lsu, EX.alu, EX.fp, EX.alu];
  return names.map((a, i) => tok(a, [
    [0.02, X.fetch, 150 + i * 12],
    [0.12, X.fetch, 150 + i * 12], [0.18, X.dec, ROW[i]],
    [0.28, X.dec, ROW[i]], [0.34, X.ren, ROW[i]],
    [0.42, X.ren, ROW[i]], [0.48, X.sch, ROW[i]],
    [0.54 + i * 0.03, X.sch, ROW[i]], [0.6 + i * 0.03, unit[i][0] + (i === 3 ? 26 : i === 1 ? -26 : 0), unit[i][1]],
    [0.7, unit[i][0] + (i === 3 ? 26 : i === 1 ? -26 : 0), unit[i][1]], [0.76, ROBX(i), ROBY],
    [0.84 + i * 0.025, ROBX(i), ROBY], [0.9 + i * 0.025, RET[0], RET[1]],
  ], 0.92 + i * 0.025));
}

const MODES: Record<string, Anim> = {
  flow: {
    dur: 7, still: 0.5,
    tracks: [
      ...flowTracks(['f1', 'f2', 'f3', 'f4']),
      { a: 'stage-dec', cls: ['lit', [[0.18, 0.3]]] },
      { a: 'stage-ren', cls: ['lit', [[0.34, 0.44]]] },
      { a: 'stage-sch', cls: ['lit', [[0.48, 0.62]]] },
      { a: 'rob', cls: ['lit', [[0.76, 0.98]]] },
    ],
  },
  smt: {
    dur: 7, still: 0.5,
    tracks: [
      ...flowTracks(['s1', 's2', 's3', 's4']),
      { a: 'smt-note', o: [[0, 1]] },
    ],
  },
  predict: {
    dur: 4.5, still: 0.5,
    tracks: [
      { a: 'bpred', cls: ['lit', [[0.05, 0.35], [0.55, 0.85]]] },
      { a: 'guess', o: [[0.05, 0], [0.1, 1], [0.35, 1], [0.4, 0], [0.55, 0], [0.6, 1], [0.85, 1], [0.9, 0]] },
      tok('p1', [[0.1, 136, 90], [0.22, X.fetch, 150]], 0.45),
      tok('p2', [[0.16, 136, 90], [0.28, X.fetch, 168]], 0.45),
      tok('p3', [[0.6, 136, 90], [0.72, X.fetch, 150]], 0.95),
      tok('p4', [[0.66, 136, 90], [0.78, X.fetch, 168]], 0.95),
      { a: 'l1i', cls: ['lit', [[0.08, 0.3], [0.58, 0.8]]] },
    ],
  },
  ooo: {
    dur: 9, still: 0.6,
    tracks: [
      tok('o1', [[0.02, X.sch, ROW[0]], [0.1, X.sch, ROW[0]], [0.16, ...EX.lsu], [0.7, ...EX.lsu], [0.76, ROBX(0), ROBY], [0.88, ROBX(0), ROBY], [0.93, ...RET]], 0.94),
      tok('o2', [[0.02, X.sch, ROW[1]], [0.74, X.sch, ROW[1]], [0.79, EX.alu[0] - 26, EX.alu[1]], [0.82, EX.alu[0] - 26, EX.alu[1]], [0.86, ROBX(1), ROBY], [0.9, ROBX(1), ROBY], [0.95, ...RET]], 0.96),
      tok('o3', [[0.02, X.sch, ROW[2]], [0.22, X.sch, ROW[2]], [0.28, EX.alu[0] + 26, EX.alu[1]], [0.36, EX.alu[0] + 26, EX.alu[1]], [0.42, ROBX(2), ROBY], [0.92, ROBX(2), ROBY], [0.97, ...RET]], 0.98),
      tok('o4', [[0.02, X.sch, ROW[3]], [0.4, X.sch, ROW[3]], [0.46, EX.alu[0] + 26, EX.alu[1]], [0.52, EX.alu[0] + 26, EX.alu[1]], [0.58, ROBX(3), ROBY], [0.94, ROBX(3), ROBY], [0.99, ...RET]], 0.995),
      { a: 'lsu', cls: ['stall', [[0.16, 0.7]]] },
      { a: 'missnote', o: showK(0.18, 0.68) },
      { a: 'o2', cls: ['wait', [[0.16, 0.74]]] },
      { a: 'alu', cls: ['lit', [[0.28, 0.36], [0.46, 0.52], [0.79, 0.82]]] },
      { a: 'rob0', cls: ['done', [[0.76, 0.93]]] },
      { a: 'rob1', cls: ['done', [[0.86, 0.95]]] },
      { a: 'rob2', cls: ['done', [[0.42, 0.97]]] },
      { a: 'rob3', cls: ['done', [[0.58, 0.99]]] },
      { a: 'robnote', o: showK(0.6, 0.86) },
    ],
  },
  retire: {
    dur: 6, still: 0.45,
    tracks: [
      ...[0.12, 0.42, 0.06, 0.62, 0.2, 0.78].map((t, j) => ({ a: `rob${j}`, cls: ['done', [[t, 0.99]]] as [string, [number, number][]] })),
      // retirement in order: slot j may leave only after slots 0..j-1 have
      ...[0.15, 0.45, 0.48, 0.65, 0.68, 0.81].map((t, j) => tok(`r${j}`, [[t, ROBX(j), ROBY], [t + 0.05, ...RET]])),
      ...[0.15, 0.45, 0.48, 0.65, 0.68, 0.81].map((t, j) => ({ a: `rob${j}`, o: [[t, 1], [t + 0.03, 0.25], [0.97, 0.25], [0.99, 1]] as [number, number][] })),
      { a: 'retire', cls: ['lit', [[0.18, 0.22], [0.48, 0.55], [0.68, 0.74], [0.84, 0.88]]] },
    ],
  },
  mispredict: {
    dur: 6, still: 0.55,
    tracks: [
      { a: 'bpred', cls: ['lit', [[0.02, 0.15]]] },
      tok('w1', [[0.05, X.fetch, 150], [0.15, X.dec, ROW[0]], [0.3, X.ren, ROW[0]], [0.45, X.sch, ROW[0]]], 0.56),
      tok('w2', [[0.1, X.fetch, 162], [0.2, X.dec, ROW[1]], [0.35, X.ren, ROW[1]], [0.5, X.ren, ROW[1]]], 0.56),
      tok('w3', [[0.15, X.fetch, 174], [0.25, X.dec, ROW[2]], [0.5, X.dec, ROW[2]]], 0.56),
      { a: 'alu', cls: ['stall', [[0.45, 0.6]]] },
      { a: 'wrong', o: showK(0.46, 0.66) },
      { a: 'squash', o: showK(0.52, 0.6) },
      tok('c1', [[0.66, X.fetch, 150], [0.76, X.dec, ROW[0]], [0.86, X.ren, ROW[0]]], 0.97),
      tok('c2', [[0.7, X.fetch, 162], [0.8, X.dec, ROW[1]], [0.9, X.ren, ROW[1]]], 0.97),
      { a: 'refetch', o: showK(0.64, 0.95) },
    ],
  },
};

const Tok = ({ a, t, k = 'cpu', w = 46 }: { a: string; t: string; k?: string; w?: number }) => (
  <g data-a={a} style={{ opacity: 0 }}><rect x={-w / 2} y={-9} width={w} height={18} className={`tok tok-${k}`} /><text x={0} y={4} textAnchor="middle" className="tok-t">{t}</text></g>
);

export default function CoreFigure({ cue, hover }: { cue: Cue; hover: string[] | null }) {
  return (
    <Fig name="core" cue={cue} hover={hover} modes={MODES} label="A CPU core as a pipeline: branch predictor and instruction cache feed fetch, then decode, rename, schedulers and execution units; the reorder buffer below retires results in program order.">
      {/* front end */}
      <B x={20} y={60} w={72} h={56} k="cpu" p="bpred" a="bpred" label="PREDICT" fill="url(#f-sc)" />
      <B x={100} y={60} w={72} h={56} k="mem" p="l1i" a="l1i" label="L1I" fill="url(#f-bc)" />
      <B x={20} y={126} w={152} h={84} k="cpu" p="fetch" label="FETCH" sub="instruction queue" />
      <text className="fl-s" x={20} y={48}>FRONT END</text>
      <g data-a="guess" style={{ opacity: 0 }}><text className="fl-s k-cpu-t" x={20} y={232}>guess: branch taken →</text></g>

      <B x={196} y={60} w={92} h={150} k="cpu" p="decode" a="stage-dec" label="DECODE">
        {ROW.map(y => <rect key={y} x={206} y={y - 10} width={72} height={20} className="slot" />)}
      </B>
      <B x={308} y={60} w={92} h={150} k="cpu" p="rename" a="stage-ren" label="RENAME" fill="url(#f-sc)" />
      <B x={420} y={60} w={100} h={150} k="cpu" p="sched" a="stage-sch" label="SCHEDULERS">
        {ROW.map(y => <rect key={y} x={430} y={y - 10} width={80} height={20} className="slot" />)}
      </B>
      <B x={420} y={222} w={100} h={52} k="mem" p="prf" label="REGISTERS" sub="~200–300" fill="url(#f-bc)" />

      <B x={544} y={60} w={110} h={44} k="gpu" p="alu" a="alu" label="INTEGER ALUs" />
      <B x={544} y={113} w={110} h={44} k="gpu" p="fpsimd" label="FP / SIMD" />
      <B x={544} y={166} w={110} h={44} k="mem" p="lsu" a="lsu" label="LOAD / STORE" />
      <B x={544} y={222} w={110} h={52} k="mem" p="l1d" label="L1D" sub="~4–5 cycles" fill="url(#f-bc)" />
      <B x={676} y={166} w={104} h={108} k="mem" p="l2" label="L2" sub="~12–16 cycles" fill="url(#f-bc)" />
      <g data-a="missnote" style={{ opacity: 0 }}><text className="fl-s k-err-t" x={662} y={152}>miss → ~300 cycles</text></g>

      {/* wiring */}
      <g className="fw-g">
        <path className="fw" d="M56 116V126M136 116V126" markerEnd="url(#f-arr)" />
        <path className="fw" d="M172 168H194" markerEnd="url(#f-arr)" />
        <path className="fw" d="M288 135H306" markerEnd="url(#f-arr)" />
        <path className="fw" d="M400 135H418" markerEnd="url(#f-arr)" />
        <path className="fw" d="M520 82H542M520 135H542M520 188H542" markerEnd="url(#f-arr)" />
        <path className="fw" d="M470 210V220" markerEnd="url(#f-arr)" />
        <path className="fw fw-mem" d="M599 210V220" markerEnd="url(#f-arr)" />
        <path className="fw fw-mem" d="M654 248H674" markerEnd="url(#f-arr)" />
        <path className="fw fw-dash" d="M354 210V318" markerEnd="url(#f-arr)" />
        <text className="fl-s" x={360} y={300}>allocate in order</text>
        <path className="fw fw-dash" d="M599 274V318" markerEnd="url(#f-arr)" />
        <text className="fl-s" x={605} y={300}>mark done</text>
        <path className="fw" d="M654 343H674" markerEnd="url(#f-arr)" />
      </g>

      {/* reorder buffer + retire */}
      <B x={196} y={320} w={458} h={46} k="cpu" p="rob" a="rob" label="REORDER BUFFER" ly={386} sub="program order →">
        {cellRects(200, 330, 450, 26, 12, 1, 4).map((c, j) => <rect key={j} x={c.x} y={c.y} width={c.w} height={c.h} className="slot robslot" data-a={`rob${j}`} />)}
      </B>
      <B x={676} y={320} w={104} h={46} k="cpu" p="retire" a="retire" label="RETIRE" ly={386} sub="in order" />
      <g data-a="robnote" style={{ opacity: 0 }}><text className="fl-s k-cpu-t" x={196} y={420}>mul and add r6 are done, but wait: they retire only after the load and add r2</text></g>

      {/* tokens */}
      <Tok a="f1" t="load" k="mem" /><Tok a="f2" t="add" /><Tok a="f3" t="fmul" k="gpu" /><Tok a="f4" t="add" />
      <Tok a="s1" t="T0 load" k="cpu" w={58} /><Tok a="s2" t="T1 add" k="math" w={58} /><Tok a="s3" t="T0 fmul" k="cpu" w={58} /><Tok a="s4" t="T1 add" k="math" w={58} />
      <g data-a="smt-note" data-p="thread2" style={{ opacity: 0 }}><text className="fl-s" x={196} y={420}><tspan className="k-cpu-t">■ thread 0</tspan>  <tspan className="k-math-t">■ thread 1</tspan>  share one core’s units</text></g>
      <Tok a="p1" t="br" /><Tok a="p2" t="ld" k="mem" /><Tok a="p3" t="add" /><Tok a="p4" t="cmp" />
      <Tok a="o1" t="ld r1" k="mem" w={52} /><Tok a="o2" t="add r2" w={52} /><Tok a="o3" t="mul r3" w={52} /><Tok a="o4" t="add r6" w={52} />
      {[0, 1, 2, 3, 4, 5].map(j => <Tok key={j} a={`r${j}`} t={`µop ${j + 1}`} w={44} />)}
      <Tok a="w1" t="wrong" k="err" /><Tok a="w2" t="wrong" k="err" /><Tok a="w3" t="wrong" k="err" />
      <Tok a="c1" t="right" /><Tok a="c2" t="right" />
      <g data-a="wrong" style={{ opacity: 0 }}><text className="fl-s k-err-t" x={544} y={50}>✕ branch resolved: guess was wrong</text></g>
      <g data-a="squash" style={{ opacity: 0 }}><rect x={196} y={60} width={324} height={150} className="squash" /></g>
      <g data-a="refetch" style={{ opacity: 0 }}><text className="fl-s k-cpu-t" x={20} y={232}>refetch from the right address</text></g>
    </Fig>
  );
}
