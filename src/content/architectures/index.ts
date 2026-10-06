import type { Architecture } from './types';
import { ZEN4_7950X } from './zen4-7950x';
import { HOPPER_H100 } from './hopper-h100';
import { CPU_GENERIC, GPU_GENERIC } from '../chipmaps';

const T = (value: string, scope: string) => ({ value, scope });
const DESK = 'desktop CPUs, 2020s', GPU = 'datacenter and desktop GPUs, 2020s';

/** The generic reference chips, so Compare can show "a real chip vs the textbook chip". */
export const REF_CPU: Architecture = {
  id: 'ref-cpu', world: 'cpu', group: 'Reference chips', family: 'Reference', name: 'Reference CPU (generic)', short: 'Reference CPU', maker: '—', status: 'ready', tree: CPU_GENERIC, spec: 'generic-cpu',
  compare: {
    type: T('Desktop CPU (reference)', DESK), process: T('~3–7 nm class', DESK), packaging: T('One monolithic die', 'reference design'), compute: T('4–24+ cores', DESK),
    clock: T('~3–6 GHz', DESK), fp32: T('~1–4 TFLOP/s (approx.)', DESK), matrix: T('SIMD only (some add AMX / SME)', DESK), memory: T('DDR5, 2 channels', DESK),
    bandwidth: T('~60–100 GB/s', DESK), llc: T('~16–64 MB L3', DESK), power: T('~65–250 W', DESK), links: T('PCIe 4.0 / 5.0', DESK),
  },
};
export const REF_GPU: Architecture = {
  id: 'ref-gpu', world: 'gpu', group: 'Reference chips', family: 'Reference', name: 'Reference GPU (generic)', short: 'Reference GPU', maker: '—', status: 'ready', tree: GPU_GENERIC, spec: 'generic-gpu',
  compare: {
    type: T('GPU (reference)', GPU), process: T('~4–7 nm class', GPU), packaging: T('One die + GDDR or HBM', GPU), compute: T('tens to ~150 compute units', GPU),
    clock: T('~1.5–2.5 GHz', GPU), fp32: T('~20–80+ TFLOP/s', GPU), matrix: T('~100–2,000+ TFLOP/s dense BF16', GPU), memory: T('GDDR6/7 or HBM3/3e', GPU),
    bandwidth: T('~0.5–8 TB/s', GPU), llc: T('~4–100 MB L2', GPU), power: T('~150–1,000 W', GPU), links: T('PCIe; NVLink-class links on datacenter parts', GPU),
  },
};

const planned = (id: string, world: Architecture['world'], group: Architecture['group'], family: string, name: string, maker: string, year?: number): Architecture =>
  ({ id, world, group, family, name, short: name, maker, year, status: 'planned' });

export const ARCHITECTURES: Architecture[] = [
  // CPU families
  ZEN4_7950X,
  planned('zen5', 'cpu', 'CPU families', 'x86 · AMD', 'AMD Zen 5', 'AMD', 2024),
  planned('intel-alder-lake', 'cpu', 'CPU families', 'x86 · Intel', 'Intel P-core + E-core hybrid (Alder Lake)', 'Intel', 2021),
  planned('apple-m', 'cpu', 'CPU families', 'Arm · Apple', 'Apple M-series', 'Apple', 2020),
  planned('arm-neoverse', 'cpu', 'CPU families', 'Arm', 'Arm Neoverse', 'Arm'),
  planned('riscv-sifive', 'cpu', 'CPU families', 'RISC‑V', 'A SiFive RISC‑V core', 'SiFive'),
  // GPU families
  HOPPER_H100,
  planned('nvidia-ampere-a100', 'gpu', 'GPU families', 'NVIDIA', 'NVIDIA Ampere (A100)', 'NVIDIA', 2020),
  planned('nvidia-ada-4090', 'gpu', 'GPU families', 'NVIDIA', 'NVIDIA Ada (RTX 4090)', 'NVIDIA', 2022),
  planned('nvidia-blackwell', 'gpu', 'GPU families', 'NVIDIA', 'NVIDIA Blackwell', 'NVIDIA', 2024),
  planned('amd-rdna3', 'gpu', 'GPU families', 'AMD', 'AMD RDNA 3', 'AMD', 2022),
  planned('amd-cdna3-mi300x', 'gpu', 'GPU families', 'AMD', 'AMD CDNA 3 (MI300X)', 'AMD', 2023),
  planned('intel-xe', 'gpu', 'GPU families', 'Intel', 'Intel Xe', 'Intel'),
  planned('apple-gpu', 'gpu', 'GPU families', 'Apple', 'Apple GPU', 'Apple'),
  // Other accelerators
  planned('google-tpu', 'accel', 'Other accelerators', 'Google', 'Google TPU', 'Google'),
];

export const ALL_ARCHES: Architecture[] = [REF_CPU, REF_GPU, ...ARCHITECTURES];
export const arch = (id: string) => ALL_ARCHES.find(a => a.id === id);
/** Own parts across all architectures (e.g. hopper.tma). */
export const ownPart = (id: string) => ALL_ARCHES.flatMap(a => a.ownParts ?? []).find(p => p.id === id);
