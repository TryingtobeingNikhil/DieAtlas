import type { PartPage } from './types';

export const page: PartPage = {
  id: 'gpu.devmem',
  figure: 'devmem',

  what: 'Device memory is the GPU’s own main memory: [[DRAM|dram]] placed right next to the GPU, holding everything a program works on, such as an AI model’s weights, textures or large arrays. It comes in two kinds: [[GDDR|gddr]] chips on the circuit board, or [[HBM|hbm]] stacks inside the GPU package.',

  does: {
    text: 'It feeds the compute units. Any value that isn’t already in registers, shared memory or a cache comes from here. It travels through the ((memory controllers|phy)) over many independent ((channels|channels)) at once, so thousands of requests can be in progress together.',
    cue: { mode: 'transfer' },
  },

  why: [
    'A big GPU can do hundreds of trillions of operations per second, and every operation needs data. A desktop CPU’s DDR5 memory delivers roughly 60–100 GB/s, and a GPU fed through that would spend nearly all its time waiting.',
    'Device memory is built for [[bandwidth]] instead. A high-end gaming card reaches about 1 TB/s with GDDR6X, and an NVIDIA H100 reaches 3.35 TB/s with HBM3. Even so, many programs still wait on memory. That is why bandwidth is usually the first number to check when comparing GPUs.',
  ],

  how: [
    {
      title: 'Bandwidth = width × speed',
      text: 'Memory moves bits over many wires in parallel. Bandwidth is the number of data wires (the bus width) times the rate on each wire. A 384-bit bus at 21 Gb/s per wire moves 384 × 21 ÷ 8 = 1,008 GB/s, as an RTX 4090 does.',
      cue: { parts: ['channels', 'phy'], mode: 'transfer' },
    },
    {
      title: 'GDDR: narrow and very fast',
      text: '((GDDR chips|gddr-chips)) sit on the circuit board around the GPU. Each has a 32-bit interface driven very fast, roughly 14–32 Gb/s per wire, so a 384-bit card needs 12 chips, each wired to a ((controller|phy)) on the GPU’s edge.',
      cue: { parts: ['gddr-chips', 'board-traces'], mode: 'gddr' },
    },
    {
      title: 'HBM: very wide and slower',
      text: 'HBM stacks 8 or 12 DRAM dies and places each ((stack|stack)) beside the GPU on a silicon [[interposer]]. Each stack has 1,024 data wires: far too many for a circuit board, easy on silicon. Each wire is slower (up to 6.4 Gb/s for HBM3), yet one stack delivers up to 1,024 × 6.4 ÷ 8 ≈ 819 GB/s.',
      cue: { parts: ['stack', 'interposer', 'gpu-die'], mode: 'hbm' },
    },
    {
      title: 'Inside a stack',
      text: 'The dies are joined by thousands of vertical wires through the silicon, called [[TSVs|tsv]]. The ((base die|base-die)) talks to the GPU. The ((DRAM dies|dram-dies)) above hold the data in [[banks|bank]] of tiny capacitors that must be refreshed every few tens of milliseconds.',
      cue: { parts: ['base-die', 'dram-dies', 'tsv'], mode: 'side' },
    },
    {
      title: 'Wide, but not quick',
      text: 'Neither design makes one access fast: a round trip from a compute unit and back typically takes ~400–800 cycles, a few hundred nanoseconds. The GPU hides the wait by keeping many [[warps|warp]] (groups of threads) in flight, so some always have data ready.',
      cue: { parts: ['gpu-die', 'channels'], mode: 'transfer' },
    },
  ],

  numbersScope: 'typical GPUs, 2020s',
  numbers: [
    { value: '8–32 GB (gaming, GDDR) · 80–192 GB (data centre, HBM)', meaning: 'How large a model or dataset fits on one GPU.' },
    { value: '~0.3–1.8 TB/s (GDDR) · ~2–8 TB/s (HBM)', meaning: 'Roughly 4–100 times a desktop CPU’s memory bandwidth.' },
    { value: '32 bits per GDDR chip · 1,024 bits per HBM stack', meaning: 'GDDR wins on speed per wire; HBM wins on width.' },
    { value: '~400–800 cycles per round trip', meaning: 'Slow per access. The GPU hides it with many warps instead of big caches.' },
  ],

  check: [
    {
      q: 'A GPU has a 256-bit GDDR6 bus running at 18 Gb/s per wire. What is its peak bandwidth?',
      options: ['72 GB/s', '288 GB/s', '576 GB/s', '4,608 GB/s'],
      answer: 2,
      why: '256 × 18 = 4,608 Gb/s, and ÷ 8 bits per byte = 576 GB/s.',
    },
    {
      q: 'Why does HBM sit on a silicon interposer instead of on the circuit board like GDDR?',
      options: [
        'Interposers are cheaper than circuit boards',
        'A board can’t carry 1,024 data wires per stack at that density; silicon can',
        'HBM needs a higher voltage than a board can supply',
        'The interposer cools the memory',
      ],
      answer: 1,
      why: 'Silicon wiring is far finer than circuit-board traces, so thousands of short wires fit between the GPU and each stack. The interposer is actually the expensive part of HBM.',
    },
  ],
  realWorld: 'Generating each token of a language model reads every weight once, so speed is capped by bandwidth ÷ model size. A 7-billion-parameter model in FP16 is 14 GB, so a 3.35 TB/s H100 manages at most ~240 tokens per second for one user.',

  example: { label: '384-bit × 21 Gb/s ÷ 8 = 1,008 GB/s; one HBM3 stack 1,024 × 6.4 ÷ 8 ≈ 819 GB/s', mustContain: '384 × 21 ÷ 8 = 1,008 GB/s' },

  deeper: {
    mechanism: [
      {
        title: 'Channels and banks',
        text: 'Each GDDR chip or HBM stack is split into independent [[channels|channel]]. HBM3 has 16 per stack, each further split into 2 pseudo-channels. Each channel in turn has many [[banks|bank]]. The memory controller spreads consecutive addresses across channels and banks so that many requests proceed at once. A program that hammers one channel gets only a fraction of the total bandwidth.',
        cue: { parts: ['channels', 'banks'] },
      },
      {
        title: 'Rows, refresh and turnarounds',
        text: 'Reading DRAM means opening a row of a bank (slow) and then reading columns from it (fast). Requests to an already-open row are cheap; jumping between rows of the same bank is not. Switching the bus between reads and writes and refreshing rows also take time. So even a well-behaved program typically reaches roughly 70–90% of the peak bandwidth.',
        cue: { parts: ['banks'], mode: 'side' },
      },
      {
        title: 'Why access patterns matter',
        text: 'Device memory delivers data in bursts of tens of bytes, never single values. When the 32 threads of a warp read 32 neighbouring 4-byte values, the hardware merges them into a few large requests ([[coalescing]]). If each thread reads a scattered address, each needs its own burst, and useful bandwidth can drop several-fold.',
      },
    ],
    formula: {
      tex: 'BW = \\frac{\\text{bus width (bits)} \\times \\text{data rate per wire (Gb/s)}}{8}',
      where: 'Peak bandwidth in GB/s. Measured bandwidth is lower: refresh, row switches and read/write turnarounds take a share.',
    },
    worked: {
      q: 'An H100 SXM has 5 active HBM3 stacks and a peak of 3.35 TB/s. What data rate does each wire run at?',
      steps: [
        'Bus width: 5 stacks × 1,024 bits = 5,120 bits.',
        'Rate per wire = BW × 8 ÷ width = 3,350 GB/s × 8 ÷ 5,120 ≈ 5.2 Gb/s.',
        'That is below HBM3’s 6.4 Gb/s maximum: the speed is chosen for power, heat and yield, not only the standard’s limit.',
      ],
      answer: '≈ 5.2 Gb/s per wire.',
    },
    choices: [
      { title: 'GDDR or HBM', text: 'GDDR uses ordinary circuit boards and is cheaper per GB, which suits gaming cards. HBM gives the most bandwidth and uses less energy per bit thanks to its short wires. It needs an interposer and advanced packaging, and has been in short supply during the AI boom, so it is used mainly on data-centre GPUs.' },
      { title: 'Beachfront', text: 'Every memory interface needs a [[PHY|phy]] along the edge of the GPU die, and the die only has so much edge. More stacks or chips mean more capacity and bandwidth, but each one takes edge length that could carry other links (such as GPU-to-GPU links).' },
      { title: 'Capacity vs speed', text: 'Taller stacks (12 dies instead of 8) add capacity without using more edge, but they are harder to build and cool. Higher data rates raise bandwidth but cost power on every bit moved, and moving data already costs far more energy than doing math on it.' },
    ],
  },

  connected: [
    { id: 'gpu.memctl', why: 'Turns the compute units’ requests into DRAM commands, one controller per channel group.' },
    { id: 'gpu.l2', why: 'The last cache in front of device memory: every miss there comes here.' },
    { id: 'gpu.cu', why: 'The consumers of all this bandwidth, hiding its latency with many warps.' },
  ],
  sources: [
    { title: 'NVIDIA H100 Tensor Core GPU datasheet (80 GB HBM3, 3.35 TB/s, SXM5)', year: 2023 },
    { title: 'NVIDIA Ada Lovelace (AD102) architecture whitepaper (RTX 4090: 384-bit GDDR6X at 21 Gb/s, 1,008 GB/s)', year: 2022 },
    { title: 'JEDEC JESD238, High Bandwidth Memory (HBM3) standard (1,024-bit, 16 channels, up to 6.4 Gb/s)', year: 2022 },
    { title: 'AMD Instinct MI300X data sheet (192 GB HBM3, 5.3 TB/s)', year: 2023 },
    { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., ch. 2 (DRAM organisation)', year: 2017 },
  ],
};
