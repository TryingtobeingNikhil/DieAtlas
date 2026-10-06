import type { Kind, LT } from './types';
import {
  type Rect, pad, union, center,
  GPU_BOARD, GPU_PKGS, NVSWITCHES, NICS, HOST_TRAY, GPU0, SM0, SM0_IN, HBM_OFF,
  CPU_BOARD, CPU_PKG, CPU_PKG_VIEW, CORES, CORE0, CORE0_IN, L3S, IOD, IOD_MEMCTL, IOD_PCIE, FABRIC_LINKS, DIMMS, VRMS, NVME, GPU_CARD, NUMA_GHOST, CCDS,
  GEN_CPU, GEN_CORE0, GEN_CORE0_IN, GEN_GPU0, GEN_CU0, GEN_CU0_IN,
} from '../art/geometry';

// Clickable floorplans with semantic zoom. The CPU and GPU worlds use the generic
// reference trees only; real architectures (Zen 4, Hopper …) have their own trees,
// used on their pages in the Architectures section.
// Rules (validate): ≤ 6 clickable regions per level; every generic component is drawn
// in its world's generic tree; architecture parts map to a generic id or their own dossier.

export interface Flow { kind: 'cpu' | 'mem' | 'gpu'; d: string; dur: number; delay?: number; r: number }
export interface ChipRegion {
  id: string;
  label: LT;
  kind: Kind;
  /** Component id (generic, or an architecture's own part). */
  comp?: string;
  desc?: LT;
  /** Short name for the breadcrumb path, e.g. "GPU 0", "SM 0". */
  crumb?: LT;
  /** Name and text used once you are inside this region. */
  inside?: { label: LT; desc: LT };
  rects: Rect[];
  /** Camera target when this region is the focus (default: bounding box of rects). */
  focus?: Rect;
  /** Which rect carries the callout (default 0). */
  labelOn?: number;
  children?: ChipRegion[];
  /** Legacy dot flows (Zen 4 floorplan and server view until they get signal scenarios). */
  flows?: Flow[];
}
export type Art = 'generic' | 'zen4' | 'hopper';
export interface ChipWorld { world: 'cpu' | 'gpu'; art: Art; title: string; reference: LT; root: ChipRegion; initial: string }

const P = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

// ------------------------------------------------------------------ shared pieces
const gpuServerFlows: Flow[] = GPU_PKGS.flatMap((pk, i) => {
  const sw = NVSWITCHES[i % 4], top = i < 4;
  const a: [number, number] = [pk.x + pk.w / 2, top ? pk.y + pk.h : pk.y];
  const b: [number, number] = [sw.x + sw.w / 2, top ? sw.y : sw.y + sw.h];
  return [
    { kind: 'mem' as const, r: 13, dur: 1.8, delay: i * 0.21, d: P([a, [a[0], (a[1] + b[1]) / 2], [b[0], (a[1] + b[1]) / 2], b]) },
    { kind: 'mem' as const, r: 13, dur: 2.1, delay: 0.9 + i * 0.17, d: P([b, [b[0] + 60, (a[1] + b[1]) / 2], [a[0] + 60, (a[1] + b[1]) / 2], [a[0] + 60, a[1]]]) },
  ];
});

type CuIn = typeof SM0_IN;
/** Inside one compute unit: the same 6 regions in every GPU floorplan. */
function cuChildren(si: CuIn, smemChildren?: ChipRegion[]): ChipRegion[] {
  return [
    { id: 'warpsched', comp: 'gpu.warpsched', label: { b: 'Turn-takers', i: 'Warp scheduler + dispatch' }, kind: 'cpu', rects: si.inner.flatMap(p => [p.sched, p.dispatch]) },
    { id: 'regfile', comp: 'gpu.regfile', label: { b: 'Notepad', i: 'Register file' }, kind: 'mem', rects: si.inner.map(p => p.regs), labelOn: 1 },
    { id: 'valu', comp: 'gpu.valu', label: { b: 'Math lanes', i: 'INT32 · FP32 · FP64' }, kind: 'gpu', rects: si.inner.flatMap(p => [p.fp32, p.int32, p.fp64]) },
    { id: 'matrix', comp: 'gpu.matrix', label: { b: 'Matrix engines', i: 'Matrix units' }, kind: 'gpu', rects: si.inner.map(p => p.tensor), labelOn: 1 },
    { id: 'smem', comp: 'gpu.smem', label: { b: 'Team scratchpad', i: 'Shared memory / L1' }, kind: 'mem', rects: [si.smem], ...(smemChildren ? { children: smemChildren, focus: pad(union([si.smem, ...smemChildren.flatMap(c => c.rects)]), 0.6) } : {}) },
    { id: 'ldsfu', comp: 'gpu.ldsfu', label: { b: 'Memory doors', i: 'LD/ST + SFU' }, kind: 'mem', rects: si.inner.flatMap(p => [p.ldst, p.sfu]), labelOn: 3 },
  ];
}
const serverChildren = (pkg: ChipRegion, switchLabel: LT): ChipRegion[] => [
  pkg,
  { id: 'others', comp: 'gpu.node', label: { b: '7 more GPUs', i: 'GPUs 1–7' }, kind: 'gpu', rects: GPU_PKGS.slice(1), labelOn: 0 },
  { id: 'switches', comp: 'gpu.links', label: switchLabel, kind: 'mem', rects: NVSWITCHES },
  { id: 'nics', comp: 'gpu.nics', label: { b: 'Network', i: 'NICs' }, kind: 'mem', rects: NICS },
  { id: 'host', comp: 'gpu.host', label: { b: 'Host CPUs', i: 'Host CPUs' }, kind: 'cpu', rects: [HOST_TRAY] },
];

// ================================================================== GPU · generic reference
const gg = GEN_GPU0, gp = GPU_PKGS[0];
export const GPU_GENERIC: ChipWorld = {
  world: 'gpu', art: 'generic', title: 'GPU world', initial: 'pkg',
  reference: { b: 'A textbook GPU, top view. Click a part to look inside.', i: 'Reference GPU (vendor-neutral). Numbers are typical ranges for 2020s GPUs.' },
  root: {
    id: 'server', comp: 'gpu.node', crumb: { b: 'AI server', i: 'Multi-GPU node' }, label: { b: 'AI server', i: 'Multi-GPU node' }, kind: 'neutral', rects: [GPU_BOARD], focus: GPU_BOARD, flows: gpuServerFlows,
    children: serverChildren({
      id: 'pkg', crumb: 'GPU 0', label: { b: 'GPU 0', i: 'GPU 0' }, kind: 'gpu', rects: [gp], focus: pad(gp, 20),
      desc: { b: 'One GPU: a big chip of worker units, with its own memory chips beside it.', i: 'Reference GPU: 4 clusters × 8 compute units, shared L2, edge memory controllers, device memory (GDDR or HBM).' },
      children: [
        {
          id: 'clusters', comp: 'gpu.cluster', crumb: { b: 'Team 0', i: 'Cluster 0' }, label: { b: 'Worker teams', i: 'Compute clusters' }, kind: 'gpu', rects: gg.clusters, focus: pad(gg.clusters[0], 4),
          inside: { label: { b: 'Inside one team', i: 'Cluster 0 (1 of 4)' }, desc: { b: 'Eight worker units sharing some drawing hardware.', i: '8 compute units plus shared graphics fixed-function hardware.' } },
          children: [
            {
              id: 'cu', comp: 'gpu.cu', crumb: { b: 'Worker unit 0', i: 'CU 0' }, label: { b: 'Worker units', i: 'Compute units' }, kind: 'gpu', rects: gg.cus.slice(0, 8), focus: pad(GEN_CU0, 1.2),
              inside: { label: { b: 'Inside one worker unit', i: 'Compute unit 0' }, desc: { b: 'Four identical quarters, each with a turn-taker, a notepad and rows of math lanes.', i: '4 partitions, each with a scheduler, register file, vector ALUs, a matrix unit, LD/ST and SFUs; shared memory/L1 below.' } },
              children: cuChildren(GEN_CU0_IN),
            },
            { id: 'gfx', comp: 'gpu.gfx', label: { b: 'Drawing hardware', i: 'Graphics fixed-function' }, kind: 'gpu', rects: [gg.gfx[0]] },
          ],
        },
        { id: 'l2', comp: 'gpu.l2', label: { b: 'Shared store', i: 'L2 cache' }, kind: 'mem', rects: [gg.l2] },
        { id: 'devmem', comp: 'gpu.devmem', label: { b: 'The GPU’s memory', i: 'Device memory (GDDR or HBM)' }, kind: 'mem', rects: gg.mem },
        { id: 'memctl', comp: 'gpu.memctl', label: { b: 'Memory doorways', i: 'Memory controllers' }, kind: 'mem', rects: gg.memctl },
        { id: 'cmdproc', comp: 'gpu.cmdproc', label: { b: 'Handout desk', i: 'Command processor' }, kind: 'cpu', rects: [gg.cmd] },
        {
          id: 'io', label: { b: 'Links out', i: 'Host + GPU links' }, kind: 'mem', rects: [gg.hostIf, gg.links],
          desc: { b: 'Where data comes in from the CPU and goes out to other GPUs.', i: 'Host PCIe interface with copy engines, and GPU-to-GPU link PHYs.' },
          children: [
            { id: 'host_if', comp: 'gpu.host_if', label: { b: 'Loading dock', i: 'Host interface' }, kind: 'mem', rects: [gg.hostIf] },
            { id: 'links', comp: 'gpu.links', label: { b: 'GPU-to-GPU links', i: 'Link PHYs' }, kind: 'mem', rects: [gg.links] },
          ],
        },
      ],
    }, { b: 'GPU-to-GPU switches', i: 'Link switches' }),
  },
};

// ================================================================== GPU · NVIDIA Hopper (H100) floorplan
const g = GPU0, si = SM0_IN, p0 = GPU_PKGS[0];
export const GPU_HOPPER: ChipWorld = {
  world: 'gpu', art: 'hopper', title: 'NVIDIA H100', initial: 'pkg',
  reference: { b: 'An H100 GPU, top view. Click a part to look inside.', i: 'NVIDIA H100 SXM5 (2022) in a DGX H100. Stylised top view; counts from NVIDIA’s published block diagrams.' },
  root: {
    id: 'server', comp: 'gpu.node', crumb: { b: 'AI server', i: 'DGX H100' }, label: { b: 'AI server', i: 'DGX H100 server' }, kind: 'neutral', rects: [GPU_BOARD], focus: GPU_BOARD, flows: gpuServerFlows,
    children: serverChildren({
      id: 'pkg', crumb: 'GPU 0', label: { b: 'GPU 0', i: 'GPU 0 · H100' }, kind: 'gpu', rects: [p0], focus: pad(p0, 20),
      desc: { b: 'One GPU: a big chip covered in worker units, with stacked memory beside it.', i: 'GH100 die on a silicon interposer with 6 HBM sites, 5 active.' },
      children: [
        {
          id: 'clusters', comp: 'gpu.cluster', crumb: 'GPC 0', label: { b: 'Worker teams', i: 'GPCs' }, kind: 'gpu', rects: g.gpcs, focus: pad(g.gpcs[0], 4),
          inside: { label: { b: 'Inside one team', i: 'GPC 0 (9 TPCs × 2 SMs)' }, desc: { b: 'Eighteen worker units in pairs.', i: '9 TPCs of 2 SMs each; 132 of 144 SMs are enabled across the die.' } },
          children: [
            {
              id: 'cu', comp: 'gpu.cu', crumb: { b: 'Worker unit 0', i: 'SM 0' }, label: { b: 'Worker units', i: 'SMs' }, kind: 'gpu', rects: g.sms.slice(0, 18), focus: pad(SM0, 0.8),
              inside: { label: { b: 'Inside one worker unit', i: 'SM 0 (1 of 132)' }, desc: { b: 'Four identical quarters. Each has a turn-taker, a notepad and rows of math lanes.', i: '4 partitions: warp scheduler, dispatch, 64 KB registers, 16 INT32 + 32 FP32 + 16 FP64 lanes, 1 tensor core, 8 LD/ST, 4 SFUs.' } },
              children: cuChildren(si, [{ id: 'tma', comp: 'hopper.tma', label: { b: 'Tile mover', i: 'TMA' }, kind: 'mem', rects: [si.tma] }]),
            },
          ],
        },
        { id: 'l2', comp: 'gpu.l2', label: { b: 'Shared store', i: 'L2 cache' }, kind: 'mem', rects: g.l2, labelOn: 1 },
        { id: 'devmem', comp: 'gpu.devmem', label: { b: 'Stacked memory', i: 'HBM3 stacks' }, kind: 'mem', rects: g.hbm.filter((_, i) => i !== HBM_OFF) },
        { id: 'memctl', comp: 'gpu.memctl', label: { b: 'Memory doorways', i: 'Memory controllers + PHY' }, kind: 'mem', rects: g.memctl },
        { id: 'cmdproc', comp: 'gpu.cmdproc', label: { b: 'Handout desk', i: 'GigaThread engine' }, kind: 'cpu', rects: [g.blockSched] },
        {
          id: 'io', label: { b: 'Links out', i: 'PCIe + NVLink PHY' }, kind: 'mem', rects: g.io,
          desc: { b: 'Where data comes in from the CPU and goes out to other GPUs.', i: 'PCIe 5.0 host interface and 18 NVLink 4 links along the die edges.' },
          children: [
            { id: 'host_if', comp: 'gpu.host_if', label: { b: 'Loading dock', i: 'PCIe + copy engines' }, kind: 'mem', rects: [g.io[0]] },
            { id: 'links', comp: 'gpu.links', label: { b: 'GPU-to-GPU links', i: 'NVLink PHYs' }, kind: 'mem', rects: [g.io[1]] },
          ],
        },
      ],
    }, { b: 'GPU-to-GPU switches', i: 'NVSwitch ×4' }),
  },
};

// ================================================================== CPU · generic reference
const gc = GEN_CPU, gci = GEN_CORE0_IN;
function coreChildren(ci: typeof CORE0_IN): ChipRegion[] {
  return [
    {
      id: 'frontend', comp: 'cpu.frontend', label: { b: 'Front end', i: 'Front end (fetch)' }, kind: 'cpu', rects: [ci.frontend],
      children: [
        { id: 'bpred', comp: 'cpu.bpred', label: { b: 'Guesser', i: 'Branch predictor' }, kind: 'cpu', rects: [ci.bpred] },
        { id: 'l1i', comp: 'cpu.l1i', label: { b: 'Instruction shelf', i: 'L1I' }, kind: 'mem', rects: [ci.l1i] },
      ],
    },
    { id: 'decode', comp: 'cpu.decode', label: { b: 'Translator', i: 'Decode' }, kind: 'cpu', rects: [ci.decode] },
    {
      id: 'ooo', label: { b: 'Out-of-order engine', i: 'Out-of-order engine' }, kind: 'cpu', rects: [ci.ooo],
      desc: { b: 'Lets the core work ahead and out of order, then tidies up.', i: 'Rename, reorder buffer, schedulers and the physical register file.' },
      children: [
        { id: 'rename', comp: 'cpu.rename', label: { b: 'Name tagger', i: 'Rename' }, kind: 'cpu', rects: [{ ...ci.rob, w: ci.rob.w / 2 - 0.2 }] },
        { id: 'rob', comp: 'cpu.rob', label: { b: 'Bookkeeping', i: 'ROB' }, kind: 'cpu', rects: [{ ...ci.rob, x: ci.rob.x + ci.rob.w / 2 + 0.2, w: ci.rob.w / 2 - 0.2 }] },
        { id: 'sched', comp: 'cpu.sched', label: { b: 'Dispatcher', i: 'Schedulers' }, kind: 'cpu', rects: [ci.sched] },
        { id: 'prf', comp: 'cpu.prf', label: { b: 'Notepad', i: 'Register file' }, kind: 'mem', rects: [ci.regs] },
      ],
    },
    {
      id: 'exec', label: { b: 'Execution units', i: 'Execution units' }, kind: 'gpu', rects: [ci.exec],
      desc: { b: 'Where the actual math and memory reads happen.', i: 'Integer ALUs, FP/SIMD pipes, load/store units and the data TLB.' },
      children: [
        { id: 'alu', comp: 'cpu.alu', label: { b: 'Integer', i: 'ALU' }, kind: 'gpu', rects: [ci.alu] },
        { id: 'fpsimd', comp: 'cpu.fpsimd', label: { b: 'Batch math', i: 'FP / SIMD' }, kind: 'gpu', rects: [{ ...ci.fpu, w: ci.simd.x + ci.simd.w - ci.fpu.x }] },
        { id: 'lsu', comp: 'cpu.lsu', label: { b: 'Memory door', i: 'Load/store' }, kind: 'mem', rects: [ci.lsu] },
        { id: 'tlb', comp: 'cpu.tlb', label: { b: 'Address translator', i: 'TLB' }, kind: 'mem', rects: [ci.tlb] },
      ],
    },
    { id: 'l1d', comp: 'cpu.l1d', label: { b: 'Closest shelf (L1)', i: 'L1 data cache' }, kind: 'mem', rects: [ci.l1d] },
    { id: 'l2', comp: 'cpu.l2', label: { b: 'Cupboard (L2)', i: 'L2 cache' }, kind: 'mem', rects: [ci.l2] },
  ];
}
const boardChildren = (pkg: ChipRegion): ChipRegion[] => [
  pkg,
  { id: 'dram', comp: 'cpu.dram', label: { b: 'RAM sticks', i: 'DDR5 DIMMs' }, kind: 'mem', rects: DIMMS },
  { id: 'gpucard', comp: 'cpu.pcie', label: { b: 'Graphics card (PCIe)', i: 'PCIe x16 slot → GPU' }, kind: 'mem', rects: [GPU_CARD] },
  { id: 'nvme', comp: 'cpu.nvme', label: { b: 'SSD', i: 'NVMe SSD' }, kind: 'mem', rects: [NVME] },
  { id: 'vrm', comp: 'cpu.power', label: { b: 'Power', i: 'VRMs' }, kind: 'cpu', rects: VRMS, labelOn: 0 },
  { id: 'numa', comp: 'cpu.numa', label: { b: 'Second CPU (servers)', i: 'NUMA: 2nd socket' }, kind: 'mem', rects: [NUMA_GHOST] },
];

export const CPU_GENERIC: ChipWorld = {
  world: 'cpu', art: 'generic', title: 'CPU world', initial: 'pkg',
  reference: { b: 'A textbook CPU, top view. Click a part to look inside.', i: 'Reference CPU (vendor-neutral). Numbers are typical ranges for 2020s desktop CPUs.' },
  root: {
    id: 'board', crumb: { b: 'Motherboard', i: 'Motherboard' }, label: { b: 'Motherboard', i: 'Motherboard' }, kind: 'neutral', rects: [CPU_BOARD], focus: CPU_BOARD,
    desc: { b: 'The board connects the CPU to memory, storage and the graphics card.', i: 'Socket, DDR5 channels, PCIe slots and M.2 storage.' },
    children: boardChildren({
      id: 'pkg', crumb: 'CPU die', label: { b: 'CPU chip', i: 'CPU die' }, kind: 'cpu', rects: [CPU_PKG], focus: CPU_PKG_VIEW,
      desc: { b: 'One chip with 8 cores around a ring road, sharing one big cache.', i: 'Monolithic die: 8 cores, ring interconnect, 8 L3 slices with snoop filters, on-die memory controller and PCIe.' },
      children: [
        {
          id: 'cores', comp: 'cpu.core', crumb: 'Core 0', label: { b: 'Cores', i: '8 cores' }, kind: 'cpu', rects: gc.cores, focus: pad(GEN_CORE0, 3),
          inside: { label: { b: 'Inside one core', i: 'Core 0 (1 of 8)' }, desc: { b: 'Every core has the same parts: it fetches instructions, works out of order, and keeps data close.', i: 'Front end, decode, out-of-order engine (rename, ROB, schedulers, register file), execution units, private L1D and L2.' } },
          children: coreChildren(gci),
        },
        { id: 'l3', comp: 'cpu.l3', label: { b: 'Shared pantry (L3)', i: 'L3 slices' }, kind: 'mem', rects: gc.slices, labelOn: 4 },
        { id: 'ring', comp: 'cpu.interconnect', label: { b: 'Ring road', i: 'Ring interconnect' }, kind: 'mem', rects: [gc.ring] },
        { id: 'coherence', comp: 'cpu.coherence', label: { b: 'Who-has-what list', i: 'Snoop filter / directory' }, kind: 'mem', rects: gc.snoop, labelOn: 3 },
        { id: 'memctl', comp: 'cpu.memctl', label: { b: 'RAM traffic control', i: 'Memory controller' }, kind: 'mem', rects: [gc.imc] },
        { id: 'pcie', comp: 'cpu.pcie', label: { b: 'Expansion lanes', i: 'PCIe root complex' }, kind: 'mem', rects: [gc.io] },
      ],
    }),
  },
};

// ================================================================== CPU · AMD Zen 4 (7950X) floorplan
const ci = CORE0_IN, ccd0 = CCDS[0];
const cpuBoardFlows: Flow[] = [
  { kind: 'mem', r: 7, dur: 2.4, d: P([[DIMMS[0].x + 17, 760], [IOD.x + IOD.w + 30, 760], [IOD.x + IOD.w + 30, center(IOD_MEMCTL).y], [IOD.x + IOD.w - 20, center(IOD_MEMCTL).y]]) },
  { kind: 'mem', r: 7, dur: 2.8, delay: 1, d: P([[center(IOD_PCIE).x, IOD_PCIE.y + IOD_PCIE.h], [center(IOD_PCIE).x, CPU_PKG.y + CPU_PKG.h + 40], [950, CPU_PKG.y + CPU_PKG.h + 40], [950, GPU_CARD.y + 60]]) },
];
const cpuPkgFlows: Flow[] = [
  { kind: 'mem', r: 4, dur: 2.2, d: P([[DIMMS[0].x + 17, 640], [IOD.x + IOD.w + 20, 640], [IOD.x + IOD.w - 30, center(IOD_MEMCTL).y]]) },
  { kind: 'mem', r: 4, dur: 2.8, delay: 0.8, d: P([[center(IOD_MEMCTL).x, center(IOD_MEMCTL).y], [center(IOD_MEMCTL).x, center(FABRIC_LINKS[0]).y], [ccd0.x + ccd0.w - 20, center(FABRIC_LINKS[0]).y], [center(L3S[0]).x, center(L3S[0]).y], [center(CORE0).x, center(L3S[0]).y], [center(CORE0).x, CORE0.y + CORE0.h - 6]]) },
  { kind: 'cpu', r: 3.2, dur: 1.8, delay: 0.2, d: P([[CORE0.x + 8, CORE0.y + 12], [CORE0.x + 56, CORE0.y + 12], [CORE0.x + 56, CORE0.y + 30]]) },
];
const coreFlows: Flow[] = [
  { kind: 'cpu', r: 0.55, dur: 2.6, d: P([[center(ci.l1i).x, center(ci.l1i).y], [center(ci.decode).x, center(ci.l1i).y], [center(ci.decode).x, center(ci.ooo).y], [center(ci.sched).x, center(ci.ooo).y], [center(ci.sched).x, ci.exec.y + 2], [center(ci.alu).x, ci.exec.y + 2], [center(ci.alu).x, center(ci.alu).y]]) },
  { kind: 'mem', r: 0.6, dur: 2.4, delay: 0.5, d: P([[center(ci.l2).x - 10, center(ci.l2).y], [center(ci.l2).x - 10, center(ci.l1d).y], [center(ci.lsu).x, center(ci.l1d).y], [center(ci.lsu).x, center(ci.lsu).y]]) },
];
export const IOD_COH: Rect = { x: IOD.x + 14, y: IOD.y + 116, w: IOD.w - 28, h: 88 };

export const CPU_ZEN4: ChipWorld = {
  world: 'cpu', art: 'zen4', title: 'AMD Ryzen 9 7950X', initial: 'pkg',
  reference: { b: 'A Ryzen 9 7950X, top view. Click a part to look inside.', i: 'AMD Ryzen 9 7950X (Zen 4, 2022) on an AM5 board. Stylised top view.' },
  root: {
    id: 'board', crumb: { b: 'Motherboard', i: 'AM5 motherboard' }, label: { b: 'Motherboard', i: 'AM5 motherboard' }, kind: 'neutral', rects: [CPU_BOARD], focus: CPU_BOARD, flows: cpuBoardFlows,
    desc: { b: 'The board connects the CPU to memory, storage and the graphics card.', i: 'Socket, DDR5 channels, PCIe 5.0 slots and M.2 storage.' },
    children: boardChildren({
      id: 'pkg', crumb: '7950X', label: { b: 'CPU package', i: 'Ryzen 9 7950X' }, kind: 'cpu', rects: [CPU_PKG], focus: CPU_PKG_VIEW, flows: cpuPkgFlows,
      desc: { b: 'Two chips full of cores, plus one chip that talks to the outside world.', i: '2 × 8-core CCDs (5 nm) + an I/O die (6 nm) on one package.' },
      children: [
        {
          id: 'cores', comp: 'cpu.core', crumb: 'Core 0', label: { b: 'Cores', i: '16 cores' }, kind: 'cpu', rects: CORES, focus: pad(CORE0, 2.5), flows: coreFlows,
          inside: { label: { b: 'Inside one core', i: 'Zen 4 core 0 (1 of 16)' }, desc: { b: 'Every core has the same parts: it fetches instructions, works out of order, and keeps data close.', i: 'Zen 4 core: front end, 4-wide decode + Op Cache, 320-entry ROB, execution units, 32 KB L1D, 1 MB L2.' } },
          children: coreChildren(ci),
        },
        { id: 'l3', comp: 'cpu.l3', label: { b: 'Shared pantry (L3)', i: 'L3 cache' }, kind: 'mem', rects: L3S },
        { id: 'ring', comp: 'cpu.interconnect', label: { b: 'Chip links', i: 'Infinity Fabric links' }, kind: 'mem', rects: FABRIC_LINKS, labelOn: 1 },
        {
          id: 'iod', label: { b: 'I/O chip', i: 'I/O die' }, kind: 'mem', rects: [IOD],
          desc: { b: 'The chip that talks to memory and expansion cards.', i: 'I/O die (6 nm): memory controllers, PCIe root complex, fabric switch.' },
          children: [
            { id: 'memctl', comp: 'cpu.memctl', label: { b: 'RAM traffic control', i: 'Memory controller' }, kind: 'mem', rects: [IOD_MEMCTL] },
            { id: 'coherence', comp: 'cpu.coherence', label: { b: 'Who-has-what list', i: 'Coherence directory (schematic)' }, kind: 'mem', rects: [IOD_COH] },
            { id: 'pcie', comp: 'cpu.pcie', label: { b: 'Expansion lanes', i: 'PCIe controller' }, kind: 'mem', rects: [IOD_PCIE] },
          ],
        },
      ],
    }),
  },
};

/** The CPU and GPU worlds are generic only. */
export const CHIP_WORLDS = { cpu: CPU_GENERIC, gpu: GPU_GENERIC } as const;

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
export { SM0 };
