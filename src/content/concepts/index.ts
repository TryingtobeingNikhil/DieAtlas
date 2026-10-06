import type { Concept } from './types';

// Concept pages load lazily (see src/screens/ConceptPage.tsx); this list is the index.
export const CONCEPTS: Pick<Concept, 'id' | 'title' | 'teaser' | 'status'>[] = [
  { id: 'von-neumann-harvard', title: 'Von Neumann vs Harvard', teaser: 'One memory or two, and the modified Harvard of real CPUs (split L1I/L1D).', status: 'planned' },
  { id: 'risc-cisc', title: { b: 'RISC vs CISC', i: 'ISA styles: RISC vs CISC' }, teaser: { b: 'Simple instructions or rich ones? x86 vs Arm vs RISC‑V.', i: 'Load/store vs register-memory, fixed vs variable length, and µop decode.' }, status: 'ready' },
  { id: 'execution-styles', title: 'Execution styles', teaser: 'Single-cycle → pipelined → superscalar → out-of-order; VLIW; in-order vs out-of-order.', status: 'planned' },
  { id: 'flynn', title: 'Parallelism styles (Flynn)', teaser: 'SISD / SIMD / MISD / MIMD; SIMD vs SIMT vs vector (SVE, RISC‑V V).', status: 'planned' },
  { id: 'multicore-styles', title: 'Multicore styles', teaser: 'Homogeneous vs hybrid (big.LITTLE, P/E-cores), and SMT.', status: 'planned' },
  { id: 'memory-organisation', title: 'Memory organisation', teaser: 'UMA vs NUMA, unified vs discrete GPU memory, coherent or not.', status: 'planned' },
  { id: 'chip-construction', title: 'Chip construction', teaser: 'Monolithic vs chiplets, 2.5D interposers and 3D stacking.', status: 'planned' },
  { id: 'accelerators', title: 'Accelerators', teaser: 'GPU vs TPU (systolic array) vs NPU vs FPGA.', status: 'planned' },
];
