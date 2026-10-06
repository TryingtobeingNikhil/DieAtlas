import type { Kind, LT } from './types';
import {
  type Rect, pad, union, center,
  GPU_BOARD, GPU_PKGS, NVSWITCHES, NICS, HOST_TRAY, GPU0, SM0, SM0_IN,
  CPU_BOARD, CPU_PKG, CPU_PKG_VIEW, CORES, CORE0, CORE0_IN, L3S, IOD, IOD_MEMCTL, IOD_PCIE, FABRIC_LINKS, DIMMS, VRMS, NVME, GPU_CARD, NUMA_GHOST, CCDS,
} from '../art/geometry';

// Semantic zoom: each region reveals its children when you zoom into it.
// Rule (checked by validate): no level shows more than 6 clickable regions.

export interface Flow { kind: 'cpu' | 'mem' | 'gpu'; d: string; dur: number; delay?: number; r: number }
export interface ChipRegion {
  id: string;
  label: LT;
  kind: Kind;
  /** Map component (card, lessons). Groups without a component show their children instead. */
  comp?: string;
  desc?: LT;
  /** Name and text used once you are inside this region (e.g. "16 cores" → "Inside one core"). */
  inside?: { label: LT; desc: LT };
  rects: Rect[];
  /** Camera target when this region is the focus (default: bounding box of rects). */
  focus?: Rect;
  /** Which rect carries the label (default 0). */
  labelOn?: number;
  children?: ChipRegion[];
  /** Data/instruction movement shown while this region is the focus. */
  flows?: Flow[];
}
export interface ChipWorld { world: 'cpu' | 'gpu'; title: string; reference: LT; root: ChipRegion; initial: string }

const P = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

// ------------------------------------------------------------------ GPU
const p0 = GPU_PKGS[0], g = GPU0, si = SM0_IN;
const hbmC = center(g.hbm[0]), l2C = center(g.l2[0]), smC = center(g.smTop);
const gpuPkgFlows: Flow[] = [
  { kind: 'mem', r: 4, dur: 2.6, d: P([[hbmC.x, hbmC.y], [g.die.x + 10, hbmC.y], [g.die.x + 10, l2C.y], [l2C.x, l2C.y], [l2C.x, g.smTop.y + g.smTop.h - 30]]) },
  { kind: 'mem', r: 4, dur: 3.0, delay: 1.1, d: P([[center(g.hbm[5]).x, center(g.hbm[5]).y], [g.die.x + g.die.w - 10, center(g.hbm[5]).y], [g.die.x + g.die.w - 10, center(g.l2[1]).y], [center(g.l2[1]).x, center(g.l2[1]).y], [center(g.l2[1]).x, g.smBot.y + 40]]) },
  { kind: 'mem', r: 4, dur: 2.8, delay: 0.5, d: P([[center(g.hbm[2]).x, center(g.hbm[2]).y], [g.die.x + 10, center(g.hbm[2]).y], [g.die.x + 10, l2C.y + 12], [smC.x - 60, l2C.y + 12], [smC.x - 60, g.smBot.y + 60]]) },
  { kind: 'mem', r: 4, dur: 3.4, delay: 1.7, d: P([[p0.x + 500, p0.y - 20], [p0.x + 500, g.io[0].y + 6], [p0.x + 380, g.io[0].y + 6]]) },
];
const gpuServerFlows: Flow[] = GPU_PKGS.flatMap((pk, i) => {
  const sw = NVSWITCHES[i % 4], top = i < 4;
  const a: [number, number] = [pk.x + pk.w / 2, top ? pk.y + pk.h : pk.y];
  const b: [number, number] = [sw.x + sw.w / 2, top ? sw.y : sw.y + sw.h];
  return [
    { kind: 'mem' as const, r: 13, dur: 1.8, delay: i * 0.21, d: P([a, [a[0], (a[1] + b[1]) / 2], [b[0], (a[1] + b[1]) / 2], b]) },
    { kind: 'mem' as const, r: 13, dur: 2.1, delay: 0.9 + i * 0.17, d: P([b, [b[0] + 60, (a[1] + b[1]) / 2], [a[0] + 60, (a[1] + b[1]) / 2], [a[0] + 60, a[1]]]) },
  ];
});
const sp = si.inner[0], sp1 = si.inner[1];
const smFlows: Flow[] = [
  { kind: 'mem', r: 0.32, dur: 2.2, d: P([[center(si.smem).x - 8, center(si.smem).y], [center(sp.regs).x, si.smem.y], [center(sp.regs).x, center(sp.regs).y], [center(sp.lanes).x, center(sp.lanes).y]]) },
  { kind: 'cpu', r: 0.3, dur: 1.6, delay: 0.4, d: P([[sp.sched.x + 1, center(sp.sched).y], [center(sp.sched).x, center(sp.sched).y], [center(sp.lanes).x - 1, sp.lanes.y + 1]]) },
  { kind: 'cpu', r: 0.3, dur: 1.6, delay: 1.1, d: P([[sp1.sched.x + 1, center(sp1.sched).y], [center(sp1.sched).x, center(sp1.sched).y], [center(sp1.tensor).x, sp1.tensor.y + 1]]) },
  { kind: 'mem', r: 0.32, dur: 2.4, delay: 1.3, d: P([[center(si.smem).x + 8, center(si.smem).y], [center(sp1.regs).x, si.smem.y], [center(sp1.regs).x, center(sp1.regs).y]]) },
];

export const GPU_WORLD: ChipWorld = {
  world: 'gpu',
  title: 'GPU world',
  reference: { b: 'An H100 GPU, top view. Click a part to look inside.', i: 'NVIDIA H100 SXM5 (2022) in a DGX H100 server. Stylised top view.' },
  initial: 'pkg',
  root: {
    id: 'server', label: { b: 'AI server', i: 'DGX H100 server' }, kind: 'neutral', rects: [GPU_BOARD], focus: GPU_BOARD,
    desc: { b: 'Eight GPUs on one board, wired so they can share work.', i: '8 × H100 SXM5 on one baseboard, all-to-all over NVLink via 4 NVSwitch chips.' },
    flows: gpuServerFlows,
    children: [
      {
        id: 'pkg', label: { b: 'GPU 0', i: 'GPU 0 · H100' }, kind: 'gpu', rects: [p0], focus: pad(p0, 30), flows: gpuPkgFlows,
        desc: { b: 'One GPU: a big chip covered in worker units, with stacked memory beside it.', i: 'H100 SXM5: 132 of 144 SMs enabled, 50 MB L2, 5 active HBM3 stacks (6 sites), PCIe 5.0 + NVLink 4.' },
        children: [
          {
            id: 'sms', comp: 'gpu.sms', label: { b: 'Worker units (SMs)', i: 'SMs' }, kind: 'gpu', rects: [g.smTop, g.smBot], focus: pad(SM0, 1.2), flows: smFlows,
            inside: { label: { b: 'Inside one worker unit', i: 'SM 0 (1 of 132)' }, desc: { b: 'Four identical quarters, each with a turn-taker, a notepad and 32 math lanes.', i: '4 partitions × (warp scheduler, 64 KB registers, 32 FP32 lanes, 1 tensor core) + 256 KB L1/shared.' } },
            children: [
              { id: 'warpsched', comp: 'gpu.warpsched', label: { b: 'Turn-takers', i: 'Warp schedulers' }, kind: 'cpu', rects: si.inner.map(p => p.sched) },
              { id: 'regfile', comp: 'gpu.regfile', label: { b: 'Notepad', i: 'Register file' }, kind: 'mem', rects: si.inner.map(p => p.regs) },
              { id: 'fp32', comp: 'gpu.fp32', label: { b: 'Math lanes', i: 'FP32 lanes' }, kind: 'gpu', rects: si.inner.map(p => p.lanes) },
              { id: 'tensor', comp: 'gpu.tensor', label: { b: 'Matrix engines', i: 'Tensor cores' }, kind: 'gpu', rects: si.inner.map(p => p.tensor) },
              { id: 'smem', comp: 'gpu.smem', label: { b: 'Team scratchpad', i: 'Shared mem / L1' }, kind: 'mem', rects: [si.smem] },
            ],
          },
          { id: 'l2', comp: 'gpu.l2', label: { b: 'Shared store (L2)', i: 'L2 cache' }, kind: 'mem', rects: g.l2 },
          { id: 'hbm', comp: 'gpu.hbm', label: { b: 'Stacked memory', i: 'HBM3' }, kind: 'mem', rects: g.hbm },
          { id: 'io', comp: 'gpu.copy', label: { b: 'Link out', i: 'PCIe + NVLink I/O' }, kind: 'mem', rects: g.io },
          { id: 'blocksched', comp: 'gpu.blocksched', label: { b: 'Handout desk', i: 'Block scheduler' }, kind: 'cpu', rects: [g.blockSched] },
        ],
      },
      { id: 'others', comp: 'gpu.gpus', label: { b: '7 more GPUs', i: 'GPUs 1–7' }, kind: 'gpu', rects: GPU_PKGS.slice(1), labelOn: 0 },
      { id: 'nvswitch', comp: 'gpu.nvswitch', label: { b: 'GPU-to-GPU switches', i: 'NVSwitch ×4' }, kind: 'mem', rects: NVSWITCHES },
      { id: 'nics', comp: 'gpu.nics', label: { b: 'Network', i: 'NICs ×8' }, kind: 'mem', rects: NICS },
      { id: 'host', comp: 'gpu.host', label: { b: 'Host CPUs', i: 'CPU tray' }, kind: 'cpu', rects: [HOST_TRAY] },
    ],
  },
};

// ------------------------------------------------------------------ CPU
const ci = CORE0_IN, ccd0 = CCDS[0];
const cpuBoardFlows: Flow[] = [
  { kind: 'mem', r: 7, dur: 2.4, d: P([[DIMMS[0].x + 17, 760], [IOD.x + IOD.w + 30, 760], [IOD.x + IOD.w + 30, center(IOD_MEMCTL).y], [IOD.x + IOD.w - 20, center(IOD_MEMCTL).y]]) },
  { kind: 'mem', r: 7, dur: 2.8, delay: 1, d: P([[center(IOD_PCIE).x, IOD_PCIE.y + IOD_PCIE.h], [center(IOD_PCIE).x, CPU_PKG.y + CPU_PKG.h + 40], [950, CPU_PKG.y + CPU_PKG.h + 40], [950, GPU_CARD.y + 60]]) },
  { kind: 'mem', r: 7, dur: 3.2, delay: 0.4, d: P([[NVME.x + NVME.w, NVME.y + 35], [760, NVME.y + 35], [760, CPU_PKG.y - 10], [IOD.x + 40, CPU_PKG.y - 10], [IOD.x + 40, IOD.y + 20]]) },
];
const cpuPkgFlows: Flow[] = [
  { kind: 'mem', r: 4, dur: 2.2, d: P([[DIMMS[0].x + 17, 640], [IOD.x + IOD.w + 20, 640], [IOD.x + IOD.w - 30, center(IOD_MEMCTL).y]]) },
  { kind: 'mem', r: 4, dur: 2.8, delay: 0.8, d: P([[center(IOD_MEMCTL).x, center(IOD_MEMCTL).y], [center(IOD_MEMCTL).x, center(FABRIC_LINKS[0]).y], [ccd0.x + ccd0.w - 20, center(FABRIC_LINKS[0]).y], [center(L3S[0]).x, center(L3S[0]).y], [center(CORE0).x, center(L3S[0]).y], [center(CORE0).x, CORE0.y + CORE0.h - 6]]) },
  { kind: 'cpu', r: 3.2, dur: 1.8, delay: 0.2, d: P([[CORE0.x + 8, CORE0.y + 12], [CORE0.x + 56, CORE0.y + 12], [CORE0.x + 56, CORE0.y + 30]]) },
  { kind: 'mem', r: 4, dur: 3.1, delay: 1.6, d: P([[center(IOD_MEMCTL).x + 30, center(IOD_MEMCTL).y], [center(IOD_MEMCTL).x + 30, center(FABRIC_LINKS[1]).y], [CCDS[1].x + CCDS[1].w - 20, center(FABRIC_LINKS[1]).y], [center(L3S[1]).x + 40, center(L3S[1]).y], [center(L3S[1]).x + 40, CCDS[1].y + 110]]) },
];
const coreFlows: Flow[] = [
  { kind: 'cpu', r: 0.55, dur: 2.6, d: P([[center(ci.l1i).x, center(ci.l1i).y], [center(ci.decode).x, center(ci.l1i).y], [center(ci.decode).x, center(ci.ooo).y], [center(ci.sched).x, center(ci.ooo).y], [center(ci.sched).x, ci.exec.y + 2], [center(ci.alu).x, ci.exec.y + 2], [center(ci.alu).x, center(ci.alu).y]]) },
  { kind: 'cpu', r: 0.55, dur: 2.9, delay: 1.2, d: P([[center(ci.bpred).x, center(ci.bpred).y], [center(ci.l1i).x, center(ci.bpred).y], [center(ci.decode).x - 4, center(ci.decode).y], [center(ci.decode).x - 4, center(ci.rob).y], [center(ci.rob).x, center(ci.rob).y]]) },
  { kind: 'mem', r: 0.6, dur: 2.4, delay: 0.5, d: P([[center(ci.l2).x - 10, center(ci.l2).y], [center(ci.l2).x - 10, center(ci.l1d).y], [center(ci.lsu).x, center(ci.l1d).y], [center(ci.lsu).x, center(ci.lsu).y]]) },
];

export const CPU_WORLD: ChipWorld = {
  world: 'cpu',
  title: 'CPU world',
  reference: { b: 'A desktop CPU, top view. Click a part to look inside.', i: 'AMD Ryzen 9 7950X (Zen 4, 2022) on an AM5 board. Stylised top view.' },
  initial: 'pkg',
  root: {
    id: 'board', label: { b: 'Motherboard', i: 'AM5 motherboard' }, kind: 'neutral', rects: [CPU_BOARD], focus: CPU_BOARD, flows: cpuBoardFlows,
    desc: { b: 'The board connects the CPU to memory, storage and the graphics card.', i: 'Socket, DDR5 channels, PCIe 5.0 slots and M.2 storage.' },
    children: [
      {
        id: 'pkg', label: { b: 'CPU package', i: 'Ryzen 9 7950X' }, kind: 'cpu', rects: [CPU_PKG], focus: CPU_PKG_VIEW, flows: cpuPkgFlows,
        desc: { b: 'Two chips full of cores, plus one chip that talks to the outside world.', i: '2 × 8-core CCDs (5 nm) + an I/O die (6 nm) on one package.' },
        children: [
          {
            id: 'cores', comp: 'cpu.cores', label: { b: 'Cores', i: '16 cores' }, kind: 'cpu', rects: CORES, focus: pad(CORE0, 2.5), flows: coreFlows,
            inside: { label: { b: 'Inside one core', i: 'Core 0 (1 of 16)' }, desc: { b: 'Every core has the same parts: it fetches instructions, works out of order, and keeps data close.', i: 'Zen 4 core: front end, 4-wide decode, out-of-order engine, execution units, 32 KB L1D, 1 MB L2.' } },
            children: [
              {
                id: 'frontend', comp: 'cpu.frontend', label: { b: 'Front end', i: 'Front end' }, kind: 'cpu', rects: [ci.frontend],
                children: [
                  { id: 'bpred', comp: 'cpu.bpred', label: { b: 'Guesser', i: 'Branch predictor' }, kind: 'cpu', rects: [ci.bpred] },
                  { id: 'l1i', comp: 'cpu.l1i', label: { b: 'Instruction shelf', i: 'L1I' }, kind: 'mem', rects: [ci.l1i] },
                ],
              },
              { id: 'decode', comp: 'cpu.decode', label: { b: 'Translator', i: 'Decode' }, kind: 'cpu', rects: [ci.decode] },
              {
                id: 'ooo', label: { b: 'Out-of-order engine', i: 'Out-of-order engine' }, kind: 'cpu', rects: [ci.ooo],
                desc: { b: 'Lets the core work ahead and out of order, then tidies up.', i: 'Register rename, reorder buffer, schedulers and the physical register file.' },
                children: [
                  { id: 'rob', comp: 'cpu.rob', label: { b: 'Bookkeeping', i: 'ROB' }, kind: 'cpu', rects: [ci.rob] },
                  { id: 'sched', comp: 'cpu.sched', label: { b: 'Dispatcher', i: 'Schedulers' }, kind: 'cpu', rects: [ci.sched] },
                  { id: 'regs', comp: 'cpu.regs', label: { b: 'Notepad', i: 'Registers' }, kind: 'mem', rects: [ci.regs] },
                ],
              },
              {
                id: 'exec', label: { b: 'Execution units', i: 'Execution units' }, kind: 'gpu', rects: [ci.exec],
                desc: { b: 'Where the actual math and memory reads happen.', i: 'Integer ALUs, FP/SIMD pipes, load/store units and the data TLB.' },
                children: [
                  { id: 'alu', comp: 'cpu.alu', label: { b: 'Integer', i: 'ALU' }, kind: 'gpu', rects: [ci.alu] },
                  { id: 'fpu', comp: 'cpu.fpu', label: { b: 'Decimal', i: 'FP' }, kind: 'gpu', rects: [ci.fpu] },
                  { id: 'simd', comp: 'cpu.simd', label: { b: 'Batch', i: 'SIMD' }, kind: 'gpu', rects: [ci.simd] },
                  { id: 'lsu', comp: 'cpu.lsu', label: { b: 'Memory door', i: 'Load/store' }, kind: 'mem', rects: [ci.lsu] },
                  { id: 'tlb', comp: 'cpu.tlb', label: { b: 'Translator', i: 'TLB' }, kind: 'mem', rects: [ci.tlb] },
                ],
              },
              { id: 'l1d', comp: 'cpu.l1d', label: { b: 'Closest shelf (L1)', i: 'L1 data cache' }, kind: 'mem', rects: [ci.l1d] },
              { id: 'l2', comp: 'cpu.l2', label: { b: 'Cupboard (L2)', i: 'L2 cache' }, kind: 'mem', rects: [ci.l2] },
            ],
          },
          { id: 'l3', comp: 'cpu.l3', label: { b: 'Shared pantry (L3)', i: 'L3 cache' }, kind: 'mem', rects: L3S },
          {
            id: 'iod', comp: 'cpu.fabric', label: { b: 'I/O chip', i: 'I/O die' }, kind: 'mem', rects: [IOD],
            children: [
              { id: 'memctl', comp: 'cpu.memctl', label: { b: 'RAM traffic control', i: 'Memory controller' }, kind: 'mem', rects: [IOD_MEMCTL] },
              { id: 'pcie', comp: 'cpu.pcie', label: { b: 'Expansion lanes', i: 'PCIe controller' }, kind: 'mem', rects: [IOD_PCIE] },
            ],
          },
          { id: 'links', comp: 'cpu.coherence', label: { b: 'Chip links', i: 'Fabric links' }, kind: 'mem', rects: FABRIC_LINKS, labelOn: 1 },
          { id: 'dram', comp: 'cpu.dram', label: { b: 'RAM sticks', i: 'DDR5' }, kind: 'mem', rects: DIMMS },
        ],
      },
      { id: 'gpulink', comp: 'cpu.gpulink', label: { b: 'Graphics card', i: 'PCIe x16 → GPU' }, kind: 'mem', rects: [GPU_CARD] },
      { id: 'nvme', comp: 'cpu.nvme', label: { b: 'SSD', i: 'NVMe SSD' }, kind: 'mem', rects: [NVME] },
      { id: 'vrm', comp: 'cpu.power', label: { b: 'Power', i: 'VRMs' }, kind: 'cpu', rects: VRMS, labelOn: 0 },
      { id: 'numa', comp: 'cpu.numa', label: { b: 'Second CPU (servers)', i: 'NUMA: 2nd socket' }, kind: 'mem', rects: [NUMA_GHOST] },
    ],
  },
};

export const CHIP_WORLDS = { cpu: CPU_WORLD, gpu: GPU_WORLD } as const;

// ---------------- helpers ----------------
export function walk(r: ChipRegion, f: (r: ChipRegion, parent: ChipRegion | null, depth: number) => void, parent: ChipRegion | null = null, depth = 0) {
  f(r, parent, depth);
  r.children?.forEach(c => walk(c, f, r, depth + 1));
}
export function index(w: ChipWorld) {
  const byId = new Map<string, ChipRegion>(), parentOf = new Map<string, ChipRegion | null>();
  walk(w.root, (r, p) => { byId.set(r.id, r); parentOf.set(r.id, p); });
  return { byId, parentOf };
}
export const regionFocus = (r: ChipRegion) => r.focus ?? union(r.rects);
/** The first region drawn for a component (used to deep-link from lessons). */
export function regionForComp(w: ChipWorld, comp: string): ChipRegion | undefined {
  let hit: ChipRegion | undefined;
  walk(w.root, r => { if (!hit && r.comp === comp) hit = r; });
  return hit;
}

/** Components drawn inside a region (itself included). */
export function compsIn(r: ChipRegion): string[] {
  const out: string[] = [];
  walk(r, x => { if (x.comp && !out.includes(x.comp)) out.push(x.comp); });
  return out;
}
