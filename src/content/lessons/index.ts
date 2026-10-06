import type { Lesson, Level, World } from '../types';
import { cacheTagIndexOffset } from './cache-tag-index-offset';
import { simtWarps } from './simt-warps';
import { whyGpus } from './why-gpus';

const P = (id: string, world: World, components: string[], level: Level, title: string, teaser: string, minutes = 5): Lesson =>
  ({ id, world, components, level, title, teaser, minutes, status: 'planned' });

export const LESSONS: Lesson[] = [
  // Foundations
  P('f-bits', 'foundations', ['found.transistor'], 'beginner', 'Bits and transistors as switches', 'Everything is on or off.'),
  P('f-gates', 'foundations', ['found.gates', 'cpu.alu'], 'beginner', 'Gates → adder → ALU', 'Wire switches together and they add.'),
  P('f-clock', 'foundations', ['found.clock'], 'beginner', 'The clock: what "3 GHz" means', '0.33 ns per tick.'),
  P('f-numbers', 'foundations', ['found.numbers', 'cpu.fpsimd'], 'intermediate', 'Binary, two’s complement and floating point', 'FP32, FP16, BF16, FP8 bit by bit.'),

  // CPU · core
  P('c-fde', 'cpu', ['cpu.frontend', 'cpu.l1i'], 'beginner', 'Fetch, decode, execute', 'The loop every core runs.'),
  P('c-isa', 'cpu', ['cpu.decode'], 'intermediate', 'ISA: x86 vs ARM vs RISC‑V', 'Same idea, different contract.'),
  P('c-pipe', 'cpu', ['cpu.decode', 'cpu.sched'], 'beginner', 'Pipelining', 'An assembly line for instructions.'),
  P('c-hazards', 'cpu', ['cpu.sched', 'cpu.alu'], 'intermediate', 'Hazards, stalls and forwarding', 'When the line has to wait.'),
  P('c-bpred', 'cpu', ['cpu.bpred'], 'beginner', 'Branch prediction', 'Guess, then check.'),
  P('c-ooo', 'cpu', ['cpu.rob', 'cpu.rename', 'cpu.sched', 'cpu.prf'], 'intermediate', 'Superscalar and out-of-order execution', 'Rename, reservation stations, reorder buffer.'),
  P('c-simd', 'cpu', ['cpu.fpsimd'], 'intermediate', 'SIMD: SSE, AVX, NEON', 'One instruction, many numbers.'),
  P('c-smt', 'cpu', ['cpu.core', 'cpu.frontend'], 'intermediate', 'Multithreading (SMT)', 'Two threads, one core.'),

  // CPU · memory
  P('m-wall', 'cpu', ['cpu.dram'], 'beginner', 'Why memory is slow: the memory wall', 'Cores got fast; memory didn’t.'),
  cacheTagIndexOffset,
  P('m-miss', 'cpu', ['cpu.l1d', 'cpu.l2', 'cpu.l3'], 'intermediate', 'Misses: compulsory, capacity, conflict', 'Why data goes missing, and LRU.'),
  P('m-write', 'cpu', ['cpu.l1d'], 'intermediate', 'Write-back vs write-through', 'When does memory hear about a write?'),
  P('m-prefetch', 'cpu', ['cpu.l2'], 'intermediate', 'Prefetching', 'Fetching before you ask.'),
  P('m-vm', 'cpu', ['cpu.tlb', 'cpu.lsu'], 'intermediate', 'Virtual memory, page tables and the TLB', 'Every program thinks it owns the machine.'),
  P('m-dram', 'cpu', ['cpu.dram', 'cpu.memctl'], 'intermediate', 'DRAM: rows, banks, refresh', 'Bandwidth vs latency, and Little’s law.'),
  P('m-mesi', 'cpu', ['cpu.coherence', 'cpu.l3', 'cpu.interconnect'], 'intermediate', 'Cache coherence (MESI) and false sharing', 'Keeping 16 cores honest.'),

  // CPU · chip & system
  P('s-multicore', 'cpu', ['cpu.core', 'cpu.interconnect'], 'beginner', 'Multicore and interconnects', 'Amdahl’s law, speedup and efficiency.'),
  P('s-numa', 'cpu', ['cpu.numa'], 'intermediate', 'NUMA', 'Near memory and far memory.'),
  P('s-pcie', 'cpu', ['cpu.pcie'], 'beginner', 'PCIe lanes and generations', 'Lanes × generation = bandwidth.'),
  P('s-nvme', 'cpu', ['cpu.nvme'], 'beginner', 'Storage: NVMe', 'Why queues matter.'),
  P('s-power', 'cpu', ['cpu.power'], 'beginner', 'Power, heat and the end of Dennard scaling', 'Why clocks stopped rising.'),

  // GPU world
  simtWarps,
  P('g-sm', 'gpu', ['gpu.cu', 'gpu.valu', 'gpu.regfile', 'gpu.cluster', 'gpu.ldsfu'], 'intermediate', 'The SM in detail', 'Peak FLOP/s = SMs × lanes × 2 × clock.'),
  P('g-warpsched', 'gpu', ['gpu.warpsched'], 'beginner', 'Warp scheduling and latency hiding', 'Never wait: switch.'),
  P('g-occupancy', 'gpu', ['gpu.regfile', 'gpu.smem'], 'intermediate', 'Occupancy', 'Registers and shared memory decide how many warps fit.'),
  P('g-coalesce', 'gpu', ['gpu.smem', 'gpu.l2'], 'intermediate', 'Memory coalescing', '32 threads, how many transactions?'),
  P('g-bank', 'gpu', ['gpu.smem'], 'intermediate', 'Shared memory and bank conflicts', '32 banks, and why padding by 1 helps.'),
  P('g-diverge', 'gpu', ['gpu.warpsched'], 'beginner', 'Divergence', 'When threads in a warp disagree.'),
  P('g-tensor', 'gpu', ['gpu.matrix'], 'intermediate', 'Tensor cores and MMA tiles', 'Multiplying tiles, not numbers.'),
  P('g-hbm', 'gpu', ['gpu.devmem'], 'beginner', 'HBM: memory in a stack', 'A 1024-bit-wide road.'),
  P('g-l2', 'gpu', ['gpu.l2', 'gpu.host_if', 'gpu.memctl'], 'intermediate', 'L2 and the GPU memory hierarchy', 'Registers → shared → L2 → HBM.'),
  P('g-nvlink', 'gpu', ['gpu.links', 'gpu.node', 'gpu.nics'], 'intermediate', 'NVLink, NVSwitch and multi-GPU', '900 GB/s between GPUs.'),

  // Bridge · CPU vs GPU
  whyGpus,
  P('b-side', 'bridge', ['bridge.side', 'gpu.gfx'], 'beginner', 'The same workload on both, side by side', 'Three races.'),
  P('b-branch', 'bridge', ['bridge.branch', 'gpu.warpsched', 'cpu.bpred'], 'intermediate', 'Branch prediction vs warp divergence', 'Guessing vs splitting.'),
  P('b-caches', 'bridge', ['bridge.caches', 'gpu.regfile'], 'intermediate', 'Big caches vs huge register files', 'Where the transistors go.'),
  P('b-pcie', 'bridge', ['bridge.pcie', 'gpu.host', 'gpu.host_if'], 'beginner', 'The CPU feeding the GPU over PCIe', 'The copy before the compute.'),

  // Bridge · AI hardware
  P('a-roofline', 'bridge', ['bridge.roofline'], 'intermediate', 'The roofline model', 'attainable = min(peak, I × BW).'),
  P('a-matmul-attn', 'bridge', ['bridge.matmul'], 'intermediate', 'Why matmul is compute-bound and attention often memory-bound', 'Arithmetic intensity in practice.'),
  P('a-precision', 'bridge', ['bridge.precision'], 'beginner', 'Mixed precision and quantisation', 'Fewer bits, more math.'),
  P('a-layer', 'bridge', ['bridge.layer'], 'intermediate', 'One transformer layer, timed', 'Where the microseconds go.'),
];

export const lesson = (id: string) => LESSONS.find(l => l.id === id);
export const lessonsFor = (componentId: string) => LESSONS.filter(l => l.components.includes(componentId));
export const lessonsInWorld = (w: World) => LESSONS.filter(l => l.world === w);
export const lessonHref = (l: Lesson) => (l.id === 'b-why' ? '#/bridge/why' : `#/lesson/${l.id}`);
