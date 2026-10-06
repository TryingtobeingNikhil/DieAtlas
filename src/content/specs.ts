import type { Spec } from './types';

// Every hardware number on the site comes from here. Dense figures only.
// "approx" says exactly what is approximate.

export const SPECS: Spec[] = [
  {
    id: 'ryzen-7950x', name: 'AMD Ryzen 9 7950X', year: 2022, kind: 'cpu',
    source: 'AMD product page (16 cores, DDR5-5200); FP32 peak derived from Zen 4 core width',
    fp32: 16 * 32 * 5.0e9, bw: 83.2e9, memName: 'DDR5-5200 × 2 channels',
    approx: 'Peak FP32 assumes all 16 cores at 5.0 GHz, 32 FP32 FLOP per cycle per core (2 × 256-bit FMA). Real all-core clocks vary.',
  },
  {
    id: 'm1-max', name: 'Apple M1 Max (2021)', year: 2021, kind: 'soc',
    source: 'Apple Newsroom, October 2021 (GPU 10.4 TFLOP/s, 400 GB/s)',
    fp32: 10.4e12, bw: 400e9, memName: 'LPDDR5 unified memory',
  },
  {
    id: 'rtx-4090', name: 'NVIDIA GeForce RTX 4090', year: 2022, kind: 'gpu',
    source: 'NVIDIA Ada Lovelace architecture whitepaper',
    fp32: 82.6e12,
    tensor: { flops: 165.2e12, precision: 'FP16, FP32 accumulate', note: '330.3 TFLOP/s with FP16 accumulate. Accumulating in FP16 is faster but loses precision when you add up many products, so training uses FP32 accumulate.' },
    bw: 1008e9, memName: 'GDDR6X 24 GB · 384-bit · 21 Gb/s',
    link: { name: 'PCIe 4.0 x16', bw: 31.5e9 },
  },
  {
    id: 'a100-sxm', name: 'NVIDIA A100 SXM4 80 GB', year: 2020, kind: 'gpu',
    source: 'NVIDIA A100 datasheet',
    fp32: 19.5e12, tensor: { flops: 312e12, precision: 'BF16/FP16' },
    bw: 2039e9, memName: 'HBM2e 80 GB',
    link: { name: 'PCIe 4.0 x16', bw: 31.5e9 },
  },
  {
    id: 'h100-sxm', name: 'NVIDIA H100 SXM5 80 GB', year: 2022, kind: 'gpu',
    source: 'NVIDIA H100 datasheet (dense figures; the datasheet headline numbers include sparsity)',
    fp32: 67e12, tensor: { flops: 989.4e12, precision: 'BF16/FP16' },
    bw: 3.35e12, memName: 'HBM3 80 GB (5 stacks)',
    link: { name: 'PCIe 5.0 x16', bw: 63e9 },
  },
];

export const spec = (id: string): Spec => {
  const s = SPECS.find(x => x.id === id);
  if (!s) throw new Error('unknown spec ' + id);
  return s;
};

/** Small facts used in text. Each one has a source in the comment. */
export const FACTS = {
  // AMD Zen 4 (Ryzen 7000) core
  zen4L1d: '32 KB · 8-way · 64 B lines',
  zen4L2: '1 MB per core',
  zen4L2LatencyCycles: 14, // AMD Zen 4 disclosure; shown as approx
  zen4L3: '32 MB per 8-core chiplet',
  // H100 SXM5 (NVIDIA H100 datasheet + Hopper whitepaper)
  h100Sms: 132,
  h100SmsOnDie: 144,
  h100L2MB: 50,
  h100HbmTBs: 3.35,
  h100Fp32Lanes: 16896, // 132 SMs × 128
  h100MaxWarpsPerSm: 64,
  h100MaxThreadsPerSm: 2048,
  h100RegFileKBPerSm: 256,
  h100SmemL1KBPerSm: 256,
  warpSize: 32,
  // PCIe, per lane, per direction, after encoding (PCI-SIG)
  pcieGBsPerLane: { 3: 0.985, 4: 1.969, 5: 3.938 } as Record<number, number>,
} as const;

export const fmtFlops = (f: number) =>
  f >= 1e15 ? `${+(f / 1e15).toPrecision(3)} PFLOP/s` : f >= 1e12 ? `${+(f / 1e12).toPrecision(4)} TFLOP/s` : `${+(f / 1e9).toPrecision(3)} GFLOP/s`;
export const fmtBw = (b: number) => (b >= 1e12 ? `${+(b / 1e12).toFixed(2)} TB/s` : `${+(b / 1e9).toFixed(1)} GB/s`);
export const fmtTime = (s: number) =>
  s >= 1 ? `${s.toFixed(2)} s` : s >= 1e-3 ? `${+(s * 1e3).toPrecision(3)} ms` : `${+(s * 1e6).toPrecision(3)} µs`;
