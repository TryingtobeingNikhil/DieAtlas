import { useEffect, useState, type ComponentType } from 'react';
import { Tex } from '../components/Tex';
import { useLevel } from '../state/store';

// Live formulas. Sliders change the inputs; the formula, the result and (where it
// makes sense) the diagram update together.

export interface SceneApi { setText: (id: string, role: string, text: string) => void }
export type Widget = ComponentType<{ api: SceneApi | null }>;

function Slider({ label, value, min, max, step = 1, onChange, out }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; out: string }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} aria-label={label} />
      <output>{out}</output>
    </label>
  );
}

const ADDR = 0x7ffe3a48;
const SIZES = [16, 32, 48, 64], WAYS = [1, 2, 4, 8, 12, 16], LINES = [32, 64, 128];

function CacheSets({ api }: { api: SceneApi | null }) {
  const level = useLevel();
  const [si, setSi] = useState(1), [wi, setWi] = useState(3), [li, setLi] = useState(1);
  const kb = SIZES[si], ways = WAYS[wi], line = LINES[li];
  const sets = (kb * 1024) / (ways * line);
  const pow2 = Number.isInteger(sets) && (sets & (sets - 1)) === 0;
  const ob = Math.log2(line), ib = pow2 ? Math.log2(sets) : 0, tb = 32 - ob - ib;
  const idx = pow2 ? (ADDR >>> ob) & (sets - 1) : 0, off = ADDR & (line - 1), tag = ADDR >>> (ob + ib);
  const tagHex = '0x' + tag.toString(16).toUpperCase();

  useEffect(() => {
    if (!api) return;
    api.setText('l1', 'sub', level === 'beginner' ? `${kb} KB · ${ways} slots per row · ${pow2 ? sets : '—'} rows` : `${kb} KB · ${ways}-way · ${pow2 ? sets : sets.toFixed(1)} sets · ${line} B lines`);
    if (!pow2) return;
    api.setText('segIdx', 'text', level === 'beginner' ? `Row (index): ${idx}` : `index  = (addr>>${ob})&${sets - 1} = ${idx}`);
    api.setText('segOff', 'text', level === 'beginner' ? `Byte in chunk (offset): ${off}` : `offset = addr&${line - 1} = ${off}`);
    api.setText('segTag', 'text', level === 'beginner' ? `Label (tag): ${tagHex}` : `tag    = addr>>${ob + ib} = ${tagHex}`);
    for (let r = 0; r < 7; r++) {
      const s = idx - 3 + r;
      api.setText(`l1g:r${r}`, 'label', s >= 0 && s < sets ? `set ${s}` : '');
    }
  }, [api, kb, ways, line, sets, pow2, idx, off, tagHex, ob, level]);

  return (
    <div className="wgt">
      <Slider label="Size" value={si} min={0} max={3} onChange={setSi} out={`${kb} KB`} />
      <Slider label={level === 'beginner' ? 'Slots/row' : 'Ways'} value={wi} min={0} max={5} onChange={setWi} out={String(ways)} />
      <Slider label={level === 'beginner' ? 'Chunk' : 'Line'} value={li} min={0} max={2} onChange={setLi} out={`${line} B`} />
      <Tex tex={`\\text{sets} = \\frac{\\text{size}}{\\text{ways}\\times\\text{line}} = \\frac{${(kb * 1024).toLocaleString('en-US').replace(/,/g, '{,}')}}{${ways}\\times${line}} = \\mathbf{${pow2 ? sets : sets.toFixed(2)}}`} />
      {pow2 ? (
        <Tex tex={`\\underbrace{${tb}}_{\\text{tag}} + \\underbrace{${ib}}_{\\text{index}=\\log_2 ${sets}} + \\underbrace{${ob}}_{\\text{offset}=\\log_2 ${line}} = 32\\text{ bits}`} />
      ) : (
        <p className="wwarn">✕ {sets.toFixed(2)} isn’t a power of two, so the index can’t be a clean group of bits. Real designs avoid this. Intel’s Golden Cove uses 48 KB with 12 ways: 48 KB ÷ (12 × 64 B) = 64 sets.</p>
      )}
      <p className="wnote">Default: AMD Zen 4 L1D (32 KB, 8-way, 64 B lines). Address 0x7FFE3A48 → index {pow2 ? idx : '—'}, offset {off}.</p>
    </div>
  );
}

function Amat() {
  const [h1, setH1] = useState(4), [m1, setM1] = useState(5), [h2, setH2] = useState(14), [m2, setM2] = useState(0), [mem, setMem] = useState(400);
  const pen1 = h2 + (m2 / 100) * mem;
  const amat = h1 + (m1 / 100) * pen1;
  return (
    <div className="wgt">
      <Slider label="L1 hit" value={h1} min={1} max={8} onChange={setH1} out={`${h1} cyc`} />
      <Slider label="L1 miss" value={m1} min={0} max={30} onChange={setM1} out={`${m1}%`} />
      <Slider label="L2 hit" value={h2} min={8} max={30} onChange={setH2} out={`${h2} cyc`} />
      <Slider label="L2 miss" value={m2} min={0} max={80} onChange={setM2} out={`${m2}%`} />
      <Slider label="DRAM" value={mem} min={100} max={600} step={20} onChange={setMem} out={`${mem} cyc`} />
      <Tex tex={`\\text{AMAT} = ${h1} + ${(m1 / 100).toFixed(2)} \\times (${h2} + ${(m2 / 100).toFixed(2)} \\times ${mem}) = \\mathbf{${amat.toFixed(2)}}\\ \\text{cycles}`} />
      <p className="wnote">Inputs are approximate, Zen 4-like defaults (L1 ~4 cycles, L2 ~14, DRAM ~400 at 5 GHz). Raise the L2 miss rate to see how much DRAM hurts.</p>
    </div>
  );
}

const TPB = [64, 128, 256, 512, 1024];
function SimtLaunch() {
  const level = useLevel();
  const [nExp, setNExp] = useState(20), [ti, setTi] = useState(2);
  const N = 2 ** nExp, T = TPB[ti];
  const blocks = Math.ceil(N / T), wpb = Math.ceil(T / 32);
  const resident = Math.min(32, Math.floor(2048 / T));
  const waves = Math.ceil(blocks / (132 * resident));
  return (
    <div className="wgt">
      <Slider label={level === 'beginner' ? 'Numbers' : 'N'} value={nExp} min={10} max={24} onChange={setNExp} out={N.toLocaleString('en-US')} />
      <Slider label={level === 'beginner' ? 'Team size' : 'Threads/blk'} value={ti} min={0} max={4} onChange={setTi} out={String(T)} />
      <Tex tex={`\\text{blocks} = \\left\\lceil \\frac{${N}}{${T}} \\right\\rceil = \\mathbf{${blocks.toLocaleString('en-US').replace(/,/g, '{,}')}}, \\quad \\text{warps/block} = \\frac{${T}}{32} = \\mathbf{${wpb}}`} />
      <Tex tex={`\\text{waves} = \\left\\lceil \\frac{${blocks}}{132 \\times ${resident}} \\right\\rceil = \\mathbf{${waves}}`} />
      <p className="wnote">H100 SXM: 132 SMs, at most 2,048 threads and 32 blocks per SM ({resident} blocks of {T} fit). Ignores register and shared-memory limits; those come in the Occupancy lesson.</p>
    </div>
  );
}

const PRESETS = [
  { name: 'H100 SXM', sms: 132, lanes: 128, ghz: 1.98, sheet: 67, note: 'clock derived (approx.)' },
  { name: 'A100 SXM', sms: 108, lanes: 64, ghz: 1.41, sheet: 19.5, note: 'boost 1,410 MHz' },
  { name: 'RTX 4090', sms: 128, lanes: 128, ghz: 2.52, sheet: 82.6, note: 'boost 2,520 MHz' },
];
function PeakFlops() {
  const [p, setP] = useState(0);
  const [sms, setSms] = useState(132), [lanes, setLanes] = useState(128), [ghz, setGhz] = useState(1.98);
  const tf = (sms * lanes * 2 * ghz) / 1000;
  const pr = PRESETS[p];
  const matches = sms === pr.sms && lanes === pr.lanes && Math.abs(ghz - pr.ghz) < 1e-9;
  return (
    <div className="wgt">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map((x, i) => (
          <button key={x.name} className="btn btn-sm" aria-pressed={i === p} style={i === p ? { borderColor: 'var(--math)' } : undefined}
            onClick={() => { setP(i); setSms(x.sms); setLanes(x.lanes); setGhz(x.ghz); }}>{x.name}</button>
        ))}
      </div>
      <Slider label="SMs" value={sms} min={1} max={144} onChange={setSms} out={String(sms)} />
      <Slider label="Lanes/SM" value={lanes} min={32} max={128} step={32} onChange={setLanes} out={String(lanes)} />
      <Slider label="Clock" value={ghz} min={1} max={2.6} step={0.01} onChange={setGhz} out={`${ghz.toFixed(2)} GHz`} />
      <Tex tex={`${sms} \\times ${lanes} \\times 2 \\times ${ghz.toFixed(2)}\\,\\text{GHz} = \\mathbf{${tf.toFixed(1)}}\\ \\text{TFLOP/s}`} />
      <p className="wnote">{matches ? `✓ Matches the ${pr.name} spec sheet: ${pr.sheet} TFLOP/s FP32 (${pr.note}).` : `Spec sheet for ${pr.name}: ${pr.sheet} TFLOP/s FP32.`}</p>
    </div>
  );
}

export const WIDGETS: Record<string, Widget> = {
  'cache-sets': CacheSets,
  amat: Amat,
  'simt-launch': SimtLaunch,
  'peak-flops': PeakFlops,
};
