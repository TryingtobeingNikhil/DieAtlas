import type { Lesson } from '../types';

// Interactive race page: src/screens/BridgeRace.tsx, model in src/sim/race.ts.
export const whyGpus: Lesson = {
  id: 'b-why',
  world: 'bridge',
  components: ['bridge.why'],
  level: 'beginner',
  minutes: 5,
  status: 'ready',
  title: { b: 'Why GPUs exist', i: 'Latency vs throughput: the same job on both' },
  teaser: { b: 'A race on the same job. Who wins, and why?', i: 'Array sum and 4096² matmul on a Ryzen 9 7950X vs an H100.' },
  custom: {
    href: '#/bridge/why',
    takeaways: [
      { b: 'A CPU is built to finish one task fast. A GPU is built to finish a huge pile of tasks fast.', i: 'CPU: latency-optimised (big caches, prediction, out-of-order). GPU: throughput-optimised (many lanes, many warps).' },
      { b: 'For simple jobs over lots of data, speed is set by how fast memory can be read, not by the math.', i: 'The array sum is bandwidth-bound on both machines: time ≈ bytes ÷ bandwidth.' },
      { b: 'Moving the data to the GPU can cost more than the work itself.', i: 'Over PCIe 5.0 x16 (~63 GB/s each way), copying 400 MB takes ~6.3 ms, about 50× the H100’s compute time for the sum.' },
    ],
    quiz: [
      {
        q: { b: 'Adding up 100 million numbers: why is the H100 about 40× faster here, even though it barely does any math?', i: 'For the 400 MB sum, what sets the ~40× gap between the H100 and the 7950X?' },
        choices: [
          { b: 'It can read memory about 40× faster', i: 'Memory bandwidth: 3.35 TB/s vs 83.2 GB/s' },
          { b: 'Its cores tick faster', i: 'Higher clock frequency' },
          { b: 'It guesses "if"s better', i: 'Better branch prediction' },
        ],
        answer: 0,
        why: { b: 'Both machines spend almost all their time reading numbers from memory. The H100’s memory is about 40× faster.', i: '3.35 TB/s ÷ 83.2 GB/s ≈ 40. The GPU’s clock is actually lower (~1.98 GHz vs up to 5.7 GHz).' },
      },
    ],
  },
};
