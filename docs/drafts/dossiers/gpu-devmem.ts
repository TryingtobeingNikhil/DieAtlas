import type { Dossier } from './types';

const SCOPE = 'datacenter and desktop GPUs, 2020s';

export const dossier: Dossier = {
  id: 'gpu.devmem',
  title: 'Device memory (HBM and GDDR)',
  figure: 'devmem',

  /* 1 */
  oneLine: {
    text: {
      b: 'The GPU’s own gigabytes of memory: either [[HBM|hbm]] stacks right beside the chip, or [[GDDR|gddr]] chips around it on the board.',
      i: 'Off-die [[DRAM|dram]] attached to the GPU: [[HBM|hbm]] stacks on a silicon [[interposer|interposer]], or [[GDDR|gddr]] chips on the PCB.',
    },
    cue: { parts: ['gpu-die', 'stack', 'gddr-chips'], mode: 'top' },
  },

  /* 2 */
  whatItDoes: {
    text: {
      b: 'It holds everything a GPU program works on: model weights, images, textures, results. Every byte the cores need, and that isn’t already in a cache, comes from here.',
      i: 'It stores all global-memory data (weights, activations, buffers). Requests that miss in L1 and L2 go through the memory controllers to these DRAM devices.',
    },
    cue: { parts: ['gpu-die', 'phy', 'channels'], mode: 'transfer' },
  },

  /* 3 */
  whyItMatters: {
    text: {
      b: 'Many AI tasks read every weight once per generated word, so time ≈ bytes ÷ [[bandwidth|bandwidth]]. A datacenter GPU reads about 1–8 TB per second; a desktop CPU’s memory manages about 50–100 GB per second.',
      i: 'Small-batch LLM decoding reads all weights once per token: t ≈ bytes ÷ [[bandwidth|bandwidth]]. Datacenter GPUs deliver ~1–8 TB/s versus ~50–100 GB/s for a desktop CPU’s dual-channel DDR5, a 10–100× gap.',
    },
    cue: { parts: ['channels', 'stack'], mode: 'transfer' },
  },

  /* 4 */
  howItWorks: [
    {
      title: 'Stack the DRAM dies',
      text: {
        b: 'An HBM stack is several thin memory chips piled on top of each other, usually 8–12. At the bottom sits a base die that talks to the GPU.',
        i: 'Each stack is 4–16 [[DRAM|dram]] core dies (8–12 typical for HBM3/3e) on a base (logic) die that holds the interface, test logic and PHY.',
      },
      cue: { parts: ['stack', 'base-die', 'dram-dies'], mode: 'side' },
    },
    {
      title: 'Wire them vertically with TSVs',
      text: {
        b: 'Thousands of tiny vertical wires called [[TSVs|tsv]] go straight down through the chips. They carry data between every layer and the base die.',
        i: '[[Through-silicon vias|tsv]] and micro-bumps connect each DRAM die to the base die. Thousands of short vertical links replace long board traces.',
      },
      cue: { parts: ['tsv', 'dram-dies', 'base-die'], mode: 'side' },
    },
    {
      title: 'A 1,024-bit interface, split into channels',
      text: {
        b: 'Each stack has 1,024 data wires, about 16 times wider than one CPU memory stick. They are split into independent lanes called [[channels|channel]], each with its own banks.',
        i: 'Each stack exposes a 1,024-bit data bus. HBM3 splits it into 16 independent 64-bit [[channels|channel]], each with two 32-bit pseudo-channels and their own banks.',
      },
      cue: { parts: ['channels', 'banks', 'stack'], mode: 'transfer' },
    },
    {
      title: 'Short wires on a silicon interposer',
      text: {
        b: 'So many wires can’t go through a normal circuit board. The GPU and stacks sit side by side on an [[interposer|interposer]], a silicon slab with very fine wiring.',
        i: 'Stacks sit millimetres from the GPU on a silicon [[interposer|interposer]] (2.5D packaging). Its dense, short traces connect each stack to a [[PHY|phy]] on the GPU die.',
      },
      cue: { parts: ['interposer', 'phy', 'gpu-die', 'stack'], mode: 'top' },
    },
    {
      title: 'Bandwidth = width × speed × stacks',
      text: {
        b: 'Total speed is wires per stack, times bits each wire sends per second, times stacks. Wide and moderately fast beats narrow and very fast.',
        i: 'Peak BW = 1,024 bits × pin rate ÷ 8 × stacks. HBM3 at 6.4 Gb/s per pin gives 819.2 GB/s per stack; 4–8 stacks give several TB/s.',
      },
      cue: { parts: ['stack', 'channels', 'gpu-die'], mode: 'transfer' },
    },
    {
      title: 'The alternative: GDDR on the board',
      text: {
        b: 'Gaming GPUs use [[GDDR|gddr]] instead: separate chips around the GPU on the board. Each chip has only 32 wires, but each wire runs very fast.',
        i: '[[GDDR|gddr]] uses discrete 32-bit chips on the PCB at ~14–32 Gb/s per pin. A 256- or 384-bit bus (8 or 12 chips) reaches ~0.5–1 TB/s.',
      },
      cue: { parts: ['gddr-chips', 'board-traces', 'gpu-die'], mode: 'gddr' },
    },
  ],

  /* 5 */
  analogy: {
    text: 'HBM is a warehouse stacked many floors high right next to the factory, with a thousand loading doors onto a short private road. GDDR is a ring of small warehouses across the street, each with one narrow gate but very fast trucks.',
    limits: 'Data moves in bursts over channels, not one parcel per door. And the wait for the first parcel (latency) is set mostly by how DRAM works inside, so HBM is not much quicker to respond than GDDR.',
  },

  /* 6 */
  keyNumbers: [
    { label: 'HBM bandwidth per GPU', value: '~1–8 TB/s', scope: 'datacenter GPUs with HBM2e–HBM3e, 2020s' },
    { label: 'HBM stacks per GPU', value: '4–8 (some sites may be disabled)', scope: 'datacenter GPUs, 2020s' },
    { label: 'HBM interface width', value: '1,024 bits per stack', scope: 'HBM1 through HBM3e' },
    { label: 'Dies per stack', value: 'approx. 8–12 DRAM dies + 1 base die', scope: 'HBM3 / HBM3e' },
    { label: 'Capacity per stack', value: 'approx. 16–36 GB', scope: 'HBM3 / HBM3e generation' },
    { label: 'GDDR bandwidth per GPU', value: '~0.3–1.8 TB/s', scope: 'GDDR6 / GDDR6X / GDDR7 graphics cards, 2020s' },
    { label: 'GDDR interface width', value: '32 bits per chip; 128–512-bit total bus', scope: SCOPE },
    { label: 'Load latency from device memory', value: 'approx. 400–800 cycles (several hundred ns)', scope: SCOPE },
  ],

  /* 7 */
  math: {
    intro: {
      b: 'Peak bandwidth is just wires × bits per wire per second, turned into bytes. Little’s law then says how much data must be “on the road” to keep it busy.',
      i: 'Peak bandwidth = bus width × per-pin data rate ÷ 8 (× stacks or chips). Little’s law gives the bytes in flight needed to sustain it.',
    },
    formulas: [
      { tex: '\\text{BW} = \\frac{w_{\\text{bits}} \\times r_{\\text{Gb/s per pin}}}{8} \\times N_{\\text{stacks}}', note: 'Divide by 8 to turn bits into bytes.' },
      { tex: '\\text{HBM3: } \\frac{1024 \\times 6.4\\ \\text{Gb/s}}{8} = 819.2\\ \\text{GB/s per stack}', note: '6.4 Gb/s is the JEDEC HBM3 maximum pin rate; products often run lower.' },
      { tex: '\\text{GDDR6X: } \\frac{384 \\times 21\\ \\text{Gb/s}}{8} = 1008\\ \\text{GB/s}', note: 'A 384-bit bus is 12 chips × 32 bits.' },
      { tex: '\\text{bytes in flight} = \\text{BW} \\times \\text{latency} = 3\\ \\text{TB/s} \\times 500\\ \\text{ns} = 1.5\\ \\text{MB}', note: 'Little’s law: why GPUs need thousands of outstanding loads.' },
      { tex: 't_{\\text{token}} \\approx \\frac{\\text{bytes of weights}}{\\text{BW}}', note: 'Lower bound for memory-bound decoding.' },
    ],
    widget: 'mem-bw',
    cue: { parts: ['stack', 'channels'], mode: 'transfer' },
  },

  /* 8 */
  tradeoffs: [
    {
      text: {
        b: 'HBM: very many short wires give huge bandwidth and use less energy per bit. But it is expensive, capacity is limited, and it needs advanced packaging.',
        i: 'HBM: 1,024-bit buses over millimetre-long interposer traces give the highest bandwidth and better energy per bit. Costs: price, stack supply, capacity per GPU, and 2.5D packaging such as TSMC CoWoS.',
      },
      cue: { parts: ['stack', 'interposer', 'tsv'], mode: 'top' },
    },
    {
      text: {
        b: 'GDDR: cheap, ordinary chips soldered on the board. Each wire must run very fast over long board traces, which costs more power per bit.',
        i: 'GDDR: commodity parts on a normal PCB, no interposer. Bandwidth comes from very high pin rates (PAM4 in GDDR6X, PAM3 in GDDR7), costing more energy per bit and careful signal integrity.',
      },
      cue: { parts: ['gddr-chips', 'board-traces'], mode: 'gddr' },
    },
    {
      text: {
        b: 'Neither gives both lots of space and lots of speed cheaply. A CPU can hold far more gigabytes, but feeds them much more slowly.',
        i: 'Capacity vs bandwidth: HBM GPUs top out around a few hundred GB, while CPU DDR scales to terabytes at far lower bandwidth. Models that don’t fit spill across GPUs or to host memory.',
      },
      cue: { parts: ['stack', 'gddr-chips'], mode: 'compare' },
    },
  ],

  /* 9 */
  misconceptions: [
    {
      myth: 'HBM is faster because each pin is faster.',
      reality: 'HBM pins are slower than GDDR pins (about 3–10 vs 14–32 Gb/s across recent generations). HBM wins by being far wider: 1,024 bits per stack versus 32 per GDDR chip.',
    },
    {
      myth: 'More VRAM means a faster GPU.',
      reality: 'Capacity decides what fits; bandwidth decides how fast it is read. A card with more but slower memory can be slower on memory-bound work.',
    },
    {
      myth: 'HBM has much lower latency than GDDR.',
      reality: 'Both are DRAM with similar row and column timings. Load latency is several hundred cycles either way; HBM’s advantage is bandwidth, not latency.',
    },
  ],

  /* 10 */
  evolution: [
    { year: '2008', event: 'GDDR5 arrives on graphics cards (AMD Radeon HD 4870), the standard GPU memory for most of the next decade.' },
    { year: '2013', event: 'JEDEC publishes the first HBM standard (JESD235): stacked DRAM with a 1,024-bit interface.' },
    { year: '2015', event: 'AMD’s Fiji GPU (Radeon R9 Fury X) is the first GPU with HBM: 4 stacks, 4,096-bit bus.' },
    { year: '2016', event: 'NVIDIA Tesla P100 brings HBM2 to datacenter GPUs.' },
    { year: '2020–2022', event: 'GDDR6X with PAM4 signalling ships on RTX 3080/3090 (2020); JEDEC publishes HBM3 (JESD238) in 2022.' },
  ],

  /* 11 */
  connections: {
    fedBy: ['gpu.memctl'],
    feeds: ['gpu.memctl', 'gpu.l2'],
    text: {
      b: 'The memory controllers send it requests and receive the data. That data fills the L2 cache, which feeds the GPU’s compute units.',
      i: 'Memory controllers schedule commands to each channel and return data to the L2 slices. Every L2 miss and dirty eviction ends up here.',
    },
  },

  /* 12 */
  twin: {
    comp: 'cpu.dram',
    text: {
      b: 'A CPU’s memory sticks are built for lots of space and quick single answers. A GPU’s memory is built to move huge amounts of data at once.',
      i: 'CPU DDR favours capacity and low latency: socketed DIMMs, ~2 channels (128 bits) on desktops. GPU device memory is bandwidth-optimised: 128–8,192 bits wide, soldered or co-packaged, fixed capacity.',
    },
  },

  /* 13 */
  vendorNames: {
    nvidia: 'HBM3 / HBM3e on datacenter GPUs (H100, H200, B200); GDDR6X / GDDR7 on GeForce',
    amd: 'HBM3 / HBM3e on Instinct (MI300 series); GDDR6 on Radeon',
    intel: 'HBM2e on Data Center GPU Max; GDDR6 on Arc',
    apple: 'Unified memory: LPDDR5 / LPDDR5X shared by CPU and GPU',
  },

  /* 15 */
  course: {
    definition: 'GPU device memory is the DRAM main memory attached to a GPU. DRAM stores each bit as charge on a capacitor, is organised into banks of rows and columns, and must be refreshed. Bandwidth is set by interface width and transfer rate; latency by row activation and column access.',
    definitionSource: 'DRAM terms after Patterson & Hennessy, Computer Organization and Design (ch. 5) and Hennessy & Patterson, Computer Architecture: A Quantitative Approach (ch. 2).',
    worked: {
      q: 'A GPU has 5 active HBM3 stacks running at the JEDEC maximum of 6.4 Gb/s per pin. What is its peak bandwidth?',
      steps: [
        'Width per stack = 1,024 bits.',
        'Per stack: 1,024 × 6.4 Gb/s = 6,553.6 Gb/s.',
        'Bits to bytes: 6,553.6 ÷ 8 = 819.2 GB/s per stack.',
        'Five stacks: 5 × 819.2 = 4,096 GB/s ≈ 4.1 TB/s.',
        'Reality check: H100 SXM quotes ~3.35 TB/s with 5 stacks, so its pins run near 5.2 Gb/s, below the maximum.',
      ],
      answer: '≈ 4.1 TB/s peak (4,096 GB/s).',
    },
    practice: [
      {
        q: 'A graphics card has eight 32-bit GDDR6 chips at 20 Gb/s per pin. What is the peak bandwidth?',
        steps: [
          'Bus width = 8 × 32 = 256 bits.',
          '256 × 20 Gb/s = 5,120 Gb/s.',
          '5,120 ÷ 8 = 640 GB/s.',
        ],
        answer: '640 GB/s.',
      },
      {
        q: 'An LLM has 14 GB of weights (7B parameters in FP16). At batch size 1, each token reads all weights once. With 2 TB/s of sustained bandwidth, what is the minimum time per token and the maximum tokens per second?',
        steps: [
          't = bytes ÷ bandwidth = 14 GB ÷ 2,000 GB/s.',
          't = 0.007 s = 7 ms per token.',
          'Tokens/s ≤ 1 ÷ 0.007 ≈ 143.',
        ],
        answer: '≥ 7 ms per token, so at most ≈ 143 tokens/s (ignoring KV-cache reads and compute).',
      },
      {
        q: 'Device memory delivers 2 TB/s with 600 ns average load latency. How many bytes must be in flight, and how many 128-byte requests is that?',
        steps: [
          'Little’s law: bytes in flight = bandwidth × latency.',
          '2 × 10¹² B/s × 600 × 10⁻⁹ s = 1.2 × 10⁶ B = 1.2 MB.',
          'Requests = 1,200,000 ÷ 128 = 9,375.',
        ],
        answer: '1.2 MB in flight ≈ 9,375 outstanding 128-byte requests.',
      },
    ],
    mistakes: [
      'Forgetting to divide by 8: pin rates are in gigabits per second, bandwidth in gigabytes per second.',
      'Doubling for “double data rate” again: a rate in Gb/s per pin or MT/s already counts both clock edges.',
      'Treating peak as per direction: the DRAM bus is shared by reads and writes, so peak is the total of both.',
      'Using peak instead of sustained bandwidth: real kernels typically reach well under peak, often ~70–90% at best.',
    ],
  },

  /* 16 */
  realWorld: {
    inChips: {
      b: 'Big AI GPUs use 5–8 HBM stacks beside the chip. Gaming cards use 8–16 GDDR chips around it. Apple chips share one pool of LPDDR memory between CPU and GPU.',
      i: 'H100 SXM: 5 active HBM3 stacks, 80 GB, ~3.35 TB/s. MI300X: 8 HBM3 stacks, 192 GB, ~5.3 TB/s. RTX 4090: 384-bit GDDR6X, 24 GB, ~1 TB/s.',
    },
    engineer: {
      b: 'Keep data on the GPU, read neighbouring addresses together, and reuse what you’ve loaded. Smaller number formats and bigger batches mean fewer bytes per calculation.',
      i: 'Keep data resident on device; make warp accesses coalesced; reuse tiles via shared memory and L2; quantise (FP8/INT4) to cut bytes; batch to raise arithmetic intensity until you are compute-bound.',
    },
    code: {
      lang: 'cuda',
      title: 'Measure effective device-memory bandwidth',
      src: `#include <cstdio>
#include <cuda_runtime.h>
int main() {
  size_t n = 1ull << 30;                        // 1 GiB per buffer
  void *a, *b; cudaMalloc(&a, n); cudaMalloc(&b, n);
  cudaEvent_t t0, t1; cudaEventCreate(&t0); cudaEventCreate(&t1);
  cudaMemcpy(b, a, n, cudaMemcpyDeviceToDevice);  // warm-up
  cudaEventRecord(t0);
  for (int i = 0; i < 10; ++i) cudaMemcpy(b, a, n, cudaMemcpyDeviceToDevice);
  cudaEventRecord(t1); cudaEventSynchronize(t1);
  float ms; cudaEventElapsedTime(&ms, t0, t1);
  // each copy reads n bytes and writes n bytes
  printf("%.0f GB/s\\n", 2.0 * n * 10 / (ms / 1e3) / 1e9);
  cudaFree(a); cudaFree(b);
}`,
    },
    measure: [
      { tool: 'NVIDIA Nsight Compute', how: 'Memory Workload Analysis and GPU Speed of Light sections: DRAM throughput as % of peak and bytes read/written per kernel.' },
      { tool: 'nvidia-smi', how: 'Shows memory used/total; its “memory utilization” is the share of time memory was busy, not achieved bandwidth.' },
      { tool: 'AMD rocprof (ROCm)', how: 'Collect counters such as FETCH_SIZE and WRITE_SIZE per kernel, then divide by kernel time.' },
    ],
  },

  /* 17 */
  learnMore: {
    lessons: ['g-hbm', 'g-l2', 'g-coalesce', 'a-roofline', 'm-dram', 'b-why'],
    sources: [
      { title: 'JEDEC JESD235, High Bandwidth Memory (HBM) DRAM', year: 2013 },
      { title: 'JEDEC JESD238, High Bandwidth Memory DRAM (HBM3)', year: 2022 },
      { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., ch. 2', year: 2017 },
      { title: 'NVIDIA H100 Tensor Core GPU Architecture (whitepaper)', year: 2022 },
    ],
  },

  seeInRealChips: [
    { arch: 'hopper-h100', text: 'H100 SXM: 5 active HBM3 stacks on a CoWoS interposer, 80 GB at ~3.35 TB/s.' },
    { arch: 'amd-cdna3-mi300x', text: 'MI300X: 8 HBM3 stacks around the chiplets, 192 GB at ~5.3 TB/s.' },
    { arch: 'nvidia-ada-4090', text: 'RTX 4090: twelve 32-bit GDDR6X chips on a 384-bit bus, 24 GB at ~1 TB/s.' },
  ],
};
