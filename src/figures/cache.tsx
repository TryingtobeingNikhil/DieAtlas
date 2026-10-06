import { Fig, B, showK, pathK, step, type Anim } from './Fig';
import type { Cue } from '../content/parts/types';

// L1 data cache: a 32 KB, 8-way, 64 B-line cache (64 sets) looking up address 0x1A2C:
// tag 1 · index 40 · offset 44. Set 40 holds the line in way 5 (hit) or not at all (miss).

const AX = 230, AW = 460, WAYS = 8, WW = AW / WAYS;
const ROWS = ['0', '1', '2', '⋮', '39', '40', '41', '⋮', '63'];
const RY = 112, RH = 25;
const rowY = (i: number) => RY + i * RH;
const SET = rowY(5);                      // set 40
const TAGS40 = ['4', 'C', '7', '2', '9', '1', 'E', '3'];
const HITWAY = 5, LRUWAY = 3;
const CMP_Y = 362;
const cx = (w: number) => AX + w * WW + WW / 2;

const REQ = pathK([[0, 158, 272], [0.05, 184, 272], [0.11, 184, 52], [0.15, 226, 52]]);
const DATA = pathK([[0.74, AX, SET + 18], [0.86, 160, SET + 18]]);
const MODES: Record<string, Anim> = {
  lookup: {
    dur: 6.5, still: 0.8,
    tracks: [
      { a: 'req', o: showK(0.005, 0.15), ...REQ },
      { a: 'addr', cls: ['lit', [[0.15, 0.95]]] },
      { a: 'f-tag', x: [[0.18, 0], [0.24, -10]] },
      { a: 'f-off', x: [[0.18, 0], [0.24, 10]] },
      { a: 'f-lbl', o: [[0.2, 0], [0.26, 1]] },
      { a: 'f-idx', cls: ['lit', [[0.28, 0.5]]] },
      { a: 'scan', o: showK(0.3, 0.46), y: [[0.3, rowY(0)], [0.46, SET]] },
      { a: 'set', cls: ['lit', [[0.46, 0.95]]] },
      { a: 'tag40', cls: ['lit', [[0.52, 0.95]]] },
      { a: 'cmp', cls: ['lit', [[0.56, 0.95]]] },
      { a: 'cmp5', cls: ['match', [[0.62, 0.95]]] },
      { a: 'hit', o: showK(0.64, 0.95) },
      { a: 'data', o: showK(0.74, 0.86), ...DATA },
      { a: 'lsu', cls: ['lit', [[0.86, 0.95]]] },
    ],
  },
  split: {
    dur: 4, still: 0.6,
    tracks: [
      { a: 'addr', cls: ['lit', [[0, 1]]] },
      { a: 'f-tag', x: [[0.15, 0], [0.3, -10]] },
      { a: 'f-off', x: [[0.15, 0], [0.3, 10]] },
      { a: 'f-lbl', o: [[0.25, 0], [0.4, 1]] },
    ],
  },
  index: {
    dur: 3.5, still: 0.8,
    tracks: [
      { a: 'f-tag', x: [[0, -10]] }, { a: 'f-off', x: [[0, 10]] }, { a: 'f-lbl', o: [[0, 1]] },
      { a: 'f-idx', cls: ['lit', [[0, 1]]] },
      { a: 'scan', o: showK(0.1, 0.6), y: [[0.1, rowY(0)], [0.6, SET]] },
      { a: 'set', cls: ['lit', [[0.6, 1]]] },
    ],
  },
  compare: {
    dur: 3.5, still: 0.8,
    tracks: [
      { a: 'f-tag', x: [[0, -10]] }, { a: 'f-off', x: [[0, 10]] }, { a: 'f-lbl', o: [[0, 1]] },
      { a: 'set', cls: ['lit', [[0, 1]]] },
      { a: 'tag40', cls: ['lit', [[0.1, 1]]] },
      { a: 'tagbus', cls: ['lit', [[0.1, 1]]] },
      { a: 'cmp', cls: ['lit', [[0.25, 1]]] },
      { a: 'cmp5', cls: ['match', [[0.45, 1]]] },
      { a: 'hit', o: showK(0.5, 0.98) },
    ],
  },
  miss: {
    dur: 7, still: 0.7,
    tracks: [
      { a: 'f-tag', x: [[0, -10]] }, { a: 'f-off', x: [[0, 10]] }, { a: 'f-lbl', o: [[0, 1]] },
      { a: 'set', cls: ['lit', [[0, 1]]] },
      { a: 't5-hit', o: step([[0, 0]]) },
      { a: 't5-miss', o: step([[0, 1]]) },
      { a: 'tag40', cls: ['lit', [[0.05, 0.3]]] },
      { a: 'cmp', cls: ['nomatch', [[0.1, 0.32]]] },
      { a: 'miss', o: showK(0.12, 0.35) },
      { a: 'tok-l2', o: showK(0.2, 0.32), ...pathK([[0.2, 745, 392], [0.32, 745, 334]]) },
      { a: 'l2', cls: ['lit', [[0.32, 0.5]]] },
      { a: 'fillpath', o: [[0.36, 0], [0.4, 1], [0.97, 1], [0.99, 0]] },
      { a: 'fill', o: showK(0.42, 0.58), d: [[0.42, 300], [0.58, 0]] },
      { a: 'way3', cls: ['lit', [[0.56, 0.98]]] },
      { a: 't3-old', o: step([[0, 1], [0.58, 0]]) },
      { a: 't3-new', o: step([[0, 0], [0.58, 1]]) },
      { a: 'lru', o: [[0, 1], [0.5, 1], [0.56, 0]] },
      { a: 'hit', o: showK(0.66, 0.98) },
      { a: 'data', o: showK(0.72, 0.86), ...pathK([[0.72, AX, SET + 18], [0.86, 160, SET + 18]]) },
    ],
  },
};

export default function CacheFigure({ cue, hover }: { cue: Cue; hover: string[] | null }) {
  return (
    <Fig name="cache" cue={cue} hover={hover} modes={MODES} label="L1 data cache: the address 0x1A2C is split into tag, index and offset; the index selects set 40; 8 tags are compared; a hit returns the data to the core.">
      {/* core with its load/store unit */}
      <B x={20} y={150} w={150} h={160} k="cpu" p="core" label="CORE" />
      <B x={32} y={196} w={126} h={40} k="mem" p="tlb" label="TLB" sub="translation" />
      <B x={32} y={252} w={126} h={44} k="mem" p="lsu" a="lsu" label="LOAD / STORE" sub="load x  @ 0x1A2C" />

      {/* request path LSU → address */}
      <path className="fw" d="M158 272H184V52H226" markerEnd="url(#f-arr)" />
      {/* data path set 40 → LSU */}
      <path className="fw fw-mem" d={`M${AX} ${SET + 18}H162`} markerEnd="url(#f-arr)" data-p="hit data" />

      {/* the address, split into fields */}
      <g data-p="addr" data-a="addr" className="addr">
        <text className="fl" x={AX} y={24}>ADDRESS 0x1A2C</text>
        <g data-a="f-tag" data-p="addr-tag">
          <rect x={AX} y={32} width={180} height={34} className="af af-tag" />
          <text x={AX + 90} y={55} textAnchor="middle" className="bits">0001</text>
        </g>
        <g data-a="f-idx" data-p="addr-index">
          <rect x={AX + 180} y={32} width={140} height={34} className="af af-idx" />
          <text x={AX + 250} y={55} textAnchor="middle" className="bits">101000</text>
        </g>
        <g data-a="f-off" data-p="addr-offset">
          <rect x={AX + 320} y={32} width={140} height={34} className="af af-off" />
          <text x={AX + 390} y={55} textAnchor="middle" className="bits">101100</text>
        </g>
        <g data-a="f-lbl" style={{ opacity: 0 }}>
          <text x={AX + 80} y={82} textAnchor="middle" className="fl-s k-cpu-t">TAG = 1</text>
          <text x={AX + 250} y={82} textAnchor="middle" className="fl-s k-mem-t">INDEX = 40</text>
          <text x={AX + 400} y={82} textAnchor="middle" className="fl-s k-math-t">OFFSET = 44</text>
        </g>
      </g>
      {/* index → set */}
      <path className="fw" d={`M${AX + 250} 66V${RY - 4}`} markerEnd="url(#f-arr)" data-p="addr-index set" />

      {/* the array: 9 of 64 sets × 8 ways */}
      <g data-p="array">
        {Array.from({ length: WAYS }, (_, w) => (
          <g key={w} data-p="ways">
            <text x={cx(w)} y={RY - 4} textAnchor="middle" className="fl-s">{w === 0 ? 'way 0' : w}</text>
          </g>
        ))}
        {ROWS.map((r, i) => (
          <g key={i}>
            <text x={AX - 4} y={rowY(i) + 16} textAnchor="end" className="fl-s">{r}</text>
            {r !== '⋮' && Array.from({ length: WAYS }, (_, w) => {
              const x = AX + w * WW + 1, y = rowY(i) + 2, s40 = i === 5;
              return (
                <g key={w} data-p={s40 ? (w === LRUWAY ? 'set data lru' : 'set data') : 'data'} data-a={s40 && w === LRUWAY ? 'way3' : undefined} className="cell">
                  <rect x={x} y={y} width={WW - 2} height={RH - 4} className="cell-r" />
                  <rect x={x + 18} y={y + 2} width={WW - 22} height={RH - 8} fill="url(#f-bc)" />
                  <rect x={x} y={y} width={16} height={RH - 4} className="cell-tag" data-p={s40 ? 'tags set' : 'tags'} data-a={s40 ? 'tag40' : undefined} />
                  {s40 && w !== HITWAY && w !== LRUWAY && <text x={x + 8} y={y + 14.5} textAnchor="middle" className="tagv">{TAGS40[w]}</text>}
                  {s40 && w === HITWAY && <><text data-a="t5-hit" x={x + 8} y={y + 14.5} textAnchor="middle" className="tagv">1</text><text data-a="t5-miss" x={x + 8} y={y + 14.5} textAnchor="middle" className="tagv" style={{ opacity: 0 }}>B</text></>}
                  {s40 && w === LRUWAY && <><text data-a="t3-old" x={x + 8} y={y + 14.5} textAnchor="middle" className="tagv">2</text><text data-a="t3-new" x={x + 8} y={y + 14.5} textAnchor="middle" className="tagv" style={{ opacity: 0 }}>1</text></>}
                </g>
              );
            })}
          </g>
        ))}
        <rect x={AX} y={RY} width={AW} height={ROWS.length * RH} className="arr-out" />
        <text x={AX + AW} y={RY + ROWS.length * RH + 12} textAnchor="end" className="fl-s">64 sets × 8 ways × 64 B = 32 KB</text>
      </g>
      {/* set 40 outline */}
      <rect data-p="set" data-a="set" x={AX - 2} y={SET} width={AW + 4} height={RH} className="setrow" />
      <g data-p="lru" data-a="lru"><text x={cx(LRUWAY)} y={SET - 3} textAnchor="middle" className="fl-s k-err-t">LRU</text></g>
      {/* scan line used by the index animation */}
      <rect data-a="scan" x={AX - 2} y={0} width={AW + 4} height={RH} className="scan" style={{ opacity: 0 }} />

      {/* comparators: each way's tag in set 40 vs the address tag */}
      <g data-p="compare">
        <path className="fw fw-dash" data-a="tagbus" d={Array.from({ length: WAYS }, (_, w) => `M${AX + w * WW + 9} ${SET + RH}V${CMP_Y - 10}`).join('')} />
        <path className="fw" d={`M${AX} 62H${AX - 24}V${CMP_Y + 26}H${cx(WAYS - 1)}`} data-p="addr-tag compare" />
        {Array.from({ length: WAYS }, (_, w) => (
          <g key={w} data-a={w === HITWAY ? 'cmp cmp5' : 'cmp'} className="cmp">
            <path className="fw" d={`M${cx(w)} ${CMP_Y + 26}V${CMP_Y + 10}`} />
            <circle cx={cx(w)} cy={CMP_Y} r={9} className="cmp-c" />
            <text x={cx(w)} y={CMP_Y + 4} textAnchor="middle" className="cmp-t">=</text>
          </g>
        ))}
        <text x={AX} y={CMP_Y + 42} className="fl-s">address tag → all 8 comparators at once</text>
      </g>
      <g data-p="hit" data-a="hit" style={{ opacity: 0 }}>
        <rect x={704} y={CMP_Y - 14} width={80} height={28} className="badge badge-mem" />
        <text x={744} y={CMP_Y + 5} textAnchor="middle" className="badge-t">HIT · 4 cyc</text>
      </g>
      <g data-p="miss" data-a="miss" style={{ opacity: 0 }}>
        <rect x={704} y={CMP_Y + 18} width={80} height={28} className="badge badge-err" />
        <text x={744} y={CMP_Y + 37} textAnchor="middle" className="badge-t">MISS</text>
      </g>

      {/* L2 and the fill path */}
      <B x={704} y={112} w={80} h={220} k="mem" p="l2" a="l2" label="L2" sub="~14 cycles" fill="url(#f-bc)" />
      <path data-p="fill l2" data-a="fillpath" className="fw fw-mem" d={`M704 ${SET + 12}H${AX + (LRUWAY + 1) * WW}`} markerEnd="url(#f-arr)" style={{ opacity: 0 }} />
      <path data-a="fill" data-p="fill" className="fw-pulse" d={`M704 ${SET + 12}H${AX + (LRUWAY + 1) * WW}`} strokeDasharray="300 300" style={{ opacity: 0 }} />
      <text x={712} y={SET + 30} className="fl-s" data-p="fill" data-a="fillpath" style={{ opacity: 0 }}>64 B line</text>

      {/* moving tokens */}
      <g data-a="req" style={{ opacity: 0 }}><rect x={-26} y={-9} width={52} height={18} className="tok tok-cpu" /><text x={0} y={4} textAnchor="middle" className="tok-t">0x1A2C</text></g>
      <g data-a="data" style={{ opacity: 0 }}><rect x={-20} y={-9} width={40} height={18} className="tok tok-mem" /><text x={0} y={4} textAnchor="middle" className="tok-t">x</text></g>
      <g data-a="tok-l2" style={{ opacity: 0 }}><rect x={-26} y={-9} width={52} height={18} className="tok tok-mem" /><text x={0} y={4} textAnchor="middle" className="tok-t">line?</text></g>
    </Fig>
  );
}
