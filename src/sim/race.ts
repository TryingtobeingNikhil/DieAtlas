import type { Spec } from '../content/types';

// Ideal lower-bound model (roofline): a kernel can't finish faster than its bytes
// over peak bandwidth, nor faster than its FLOPs over peak compute.
// Real code typically reaches some fraction of this; the UI says so.

export type WorkloadId = 'sum' | 'matmul';

export interface Workload {
  id: WorkloadId;
  flops: number;
  bytes: number;      // bytes read/written from main memory, ideal
  hostBytes: number;  // bytes that must cross PCIe if the data starts on the CPU
}

export const WORKLOADS: Record<WorkloadId, Workload> = {
  // 100 M FP32 values: 400 MB read, one add per value.
  sum: { id: 'sum', flops: 100e6, bytes: 400e6, hostBytes: 400e6 },
  // 4096 × 4096 FP32 matmul: 2·n³ FLOPs; ideal traffic = A, B read + C written once.
  matmul: { id: 'matmul', flops: 2 * 4096 ** 3, bytes: 3 * 4096 * 4096 * 4, hostBytes: 3 * 4096 * 4096 * 4 },
};

export interface RaceResult {
  compute: number;  // s, flops / peak
  memory: number;   // s, bytes / bandwidth
  copy: number;     // s, PCIe transfer (GPU only, if enabled)
  total: number;
  bound: 'compute' | 'memory';
  peakUsed: number;
}

export function runRace(w: Workload, s: Spec, opts: { tensor?: boolean; includeCopy?: boolean } = {}): RaceResult {
  const peak = opts.tensor && s.tensor ? s.tensor.flops : s.fp32;
  const compute = w.flops / peak;
  const memory = w.bytes / s.bw;
  const copy = opts.includeCopy && s.link ? w.hostBytes / s.link.bw : 0;
  const kernel = Math.max(compute, memory);
  return { compute, memory, copy, total: kernel + copy, bound: compute >= memory ? 'compute' : 'memory', peakUsed: peak };
}
