import type { MapComponent } from './types';
import { CPU_COMPONENTS } from './reference/cpu';
import { GPU_COMPONENTS } from './reference/gpu';

// The vendor-neutral reference chips. Everything here is generic: numbers are
// TYPICAL RANGES with a scope ("desktop CPUs, 2020s"), never one fake-precise value.
// Real architectures live separately in src/content/architectures/ (Architectures section).

const C = (c: MapComponent) => c;

export const COMPONENTS: MapComponent[] = [
  // ---------------- Foundations ----------------
  C({ id: 'found.transistor', world: 'foundations', kind: 'neutral', tech: 'Transistors & bits', friendly: 'Tiny switches', hover: 'A transistor is a switch that electricity can flip. One switch holds one bit.', analogy: 'Like a light switch: on or off.', key: { value: 'billions per chip', scope: '2020s processors' }, teaser: 'Everything starts with a switch that is on or off.' }),
  C({ id: 'found.gates', world: 'foundations', kind: 'neutral', tech: 'Gates → adder → ALU', friendly: 'Switches that do math', hover: 'Wire switches together and they can add.', analogy: 'Like a row of dominoes that computes a sum.', key: { value: '~20–30 transistors per full adder (CMOS)', scope: 'textbook CMOS' }, teaser: 'From AND/OR to a circuit that adds two numbers.' }),
  C({ id: 'found.clock', world: 'foundations', kind: 'cpu', tech: 'Clock', friendly: 'The heartbeat', hover: 'A steady tick that keeps every part of the chip in step.', analogy: 'Like a metronome for the whole chip.', key: { value: '~1–6 GHz', scope: 'CPUs and GPUs, 2020s' }, teaser: 'What "3 GHz" actually counts.' }),
  C({ id: 'found.numbers', world: 'foundations', kind: 'math', tech: 'Number formats', friendly: 'How numbers are stored', hover: 'Integers, FP32, FP16, BF16, FP8: the same bits, different trade-offs.', analogy: 'Like choosing how many digits to write on a receipt.', key: { value: 'FP32 = 32 bits · FP8 = 8 bits', scope: 'IEEE 754 / OCP FP8' }, teaser: 'Why AI uses 16-bit and 8-bit numbers.' }),

  ...CPU_COMPONENTS,
  ...GPU_COMPONENTS,

  // ---------------- Bridge stations ----------------
  C({ id: 'bridge.why', world: 'bridge', kind: 'neutral', tech: 'Latency vs throughput', friendly: 'Why GPUs exist', hover: 'Same job, two machines: a race.', teaser: { b: 'A race on the same job: who wins, and why?', i: 'Sum 100 M floats and a 4096² matmul on a CPU and a GPU.' } }),
  C({ id: 'bridge.side', world: 'bridge', kind: 'neutral', tech: 'Side by side', friendly: 'Same workload, both machines', hover: 'Three workloads, two machines.', teaser: 'Array sum, matmul and a branchy loop.' }),
  C({ id: 'bridge.branch', world: 'bridge', kind: 'neutral', tech: 'Prediction vs divergence', friendly: 'Handling "if"', hover: 'CPUs guess; GPUs split warps.', teaser: 'Branch prediction vs warp divergence.' }),
  C({ id: 'bridge.caches', world: 'bridge', kind: 'neutral', tech: 'Caches vs register files', friendly: 'Where the silicon goes', hover: 'Big caches vs huge register files.', teaser: 'Two ways to spend a transistor budget.' }),
  C({ id: 'bridge.pcie', world: 'bridge', kind: 'neutral', tech: 'Feeding the GPU', friendly: 'CPU → GPU over PCIe', hover: 'The copy before the compute.', teaser: 'Why the copy can cost more than the math.' }),
  C({ id: 'bridge.roofline', world: 'bridge', kind: 'math', tech: 'Roofline model', friendly: 'Compute or memory?', hover: 'One chart that says what limits a program.', teaser: 'attainable = min(peak, intensity × bandwidth)' }),
  C({ id: 'bridge.matmul', world: 'bridge', kind: 'neutral', tech: 'Matmul vs attention', friendly: 'Why some AI math is slow', hover: 'Compute-bound vs memory-bound.', teaser: 'Same GPU, very different speeds.' }),
  C({ id: 'bridge.precision', world: 'bridge', kind: 'math', tech: 'Mixed precision', friendly: 'Smaller numbers, faster AI', hover: 'FP32 → BF16 → FP8.', teaser: 'Fewer bits, more math per second.' }),
  C({ id: 'bridge.layer', world: 'bridge', kind: 'neutral', tech: 'One transformer layer', friendly: 'Where the time goes', hover: 'A time breakdown of one layer.', teaser: 'Matmuls, attention, and waiting.' }),
];

const BY_ID = new Map(COMPONENTS.map(c => [c.id, c]));
export const genericComponent = (id: string) => BY_ID.get(id);
export const GENERIC_IDS = {
  cpu: COMPONENTS.filter(c => c.world === 'cpu').map(c => c.id),
  gpu: COMPONENTS.filter(c => c.world === 'gpu').map(c => c.id),
};

/** Any component by id: a generic one, or an architecture's own part (e.g. 'hopper.tma'). */
import { ownPart } from './architectures';
export const component = (id: string): MapComponent | undefined => genericComponent(id) ?? ownPart(id);
