import type { PartPage } from './types';

export const page: PartPage = {
  id: 'gpu.cu',
  figure: 'cu',

  what: 'A compute unit is one of a GPU’s many small processors; a big GPU has over a hundred. Each one keeps thousands of [[threads|thread]] on the go, running them in groups of 32 that all do the same instruction together.',

  does: {
    text: 'The compute unit receives [[blocks|block]] of threads and keeps them all resident at once. Every cycle, each of its ((schedulers|sched)) picks one group of 32 threads, a [[warp]], that is ready to go, and issues one instruction for all 32 threads across a row of 32 ((lanes|fp32)).',
    cue: { mode: 'issue' },
  },

  why: [
    'A GPU is built for enormous amounts of arithmetic, but a load from its memory takes roughly 400–800 [[cycles|cycle]] to come back. A CPU core hides waits like this with big caches and out-of-order logic, which cost a lot of silicon per core.',
    'The compute unit instead keeps many warps resident, typically 32–64, and whenever one waits it issues from another, at no cost. The silicon saved goes into lanes: an NVIDIA H100, for example, has 16,896 FP32 lanes across its 132 compute units.',
  ],

  how: [
    {
      title: 'Blocks arrive and warps fill the slots',
      text: 'Our example [[kernel]] computes `y[i] = a * x[i] + y[i]` for a million values of `i`, in blocks of 256 threads (8 warps each). The compute unit accepts blocks until it runs out of ((warp slots|warps)), registers or shared memory.',
      cue: { parts: ['warps'], mode: 'occupancy' },
    },
    {
      title: 'Every thread gets its own registers',
      text: 'Every resident thread keeps its values in the ((register file|regs)), typically 64K 32-bit [[registers|register]] (256 KB). Our kernel uses 32 registers per thread, so a warp needs 32 × 32 = 1,024, and all 64 warp slots can fill. Because every warp’s registers stay in place, switching warps is free.',
      cue: { parts: ['regs', 'warps'], mode: 'occupancy' },
    },
    {
      title: 'Each scheduler picks a ready warp',
      text: 'The compute unit has 4 partitions, each with its own ((scheduler|sched)). Every cycle, each scheduler issues the next instruction of a warp whose inputs are ready, tracked by a [[scoreboard]]. One warp runs in order; the parallelism comes from having many warps.',
      cue: { parts: ['sched', 'dispatch', 'warps'], mode: 'issue' },
    },
    {
      title: 'One instruction, 32 lanes',
      text: 'The instruction runs on 32 ((lanes|fp32)), one per thread, each on its own data: lane 5 computes `a * x[5] + y[5]` while lane 6 computes `a * x[6] + y[6]`. This is [[SIMT|simt]]. Beside them sit ((integer lanes|int32)), a ((matrix unit|matrix)) for small matrix multiplies, and ((special-function units|sfu)) for sine, square root and the like.',
      cue: { parts: ['fp32', 'int32'], mode: 'issue' },
    },
    {
      title: 'Hide the wait',
      text: 'The load of `x[i]` leaves through the ((load/store units|ldst)) and takes hundreds of cycles. That warp is parked while the schedulers issue from the others, and it becomes ready again when its data arrives. Data a block reuses can be kept in ((shared memory|smem)), a scratchpad its threads share, which answers in ~20–40 cycles.',
      cue: { parts: ['ldst', 'smem', 'warps'], mode: 'hide' },
    },
  ],

  numbersScope: 'typical data-centre and gaming GPUs, 2020s',
  numbers: [
    { value: '32 threads per warp (64 on some AMD GPUs)', meaning: 'The group that shares one instruction.' },
    { value: '~32–64 warps resident per compute unit', meaning: 'Enough to keep issuing while most of them wait for memory.' },
    { value: '256 KB or more of registers per compute unit', meaning: 'Several times a CPU core’s L1 data cache.' },
    { value: 'tens to ~150 compute units per GPU (304 on AMD MI300X)', meaning: 'Hundreds of thousands of threads in flight on a big GPU.' },
  ],

  check: [
    {
      q: 'A kernel uses 64 registers per thread. The compute unit has 65,536 registers and 64 warp slots. How many warps fit?',
      options: ['64', '32', '16', '128'],
      answer: 1,
      why: 'One warp needs 64 × 32 = 2,048 registers, and 65,536 ÷ 2,048 = 32 warps. Only half the slots fill: an [[occupancy]] of 50%.',
    },
    {
      q: 'Why can a compute unit stay busy without the big caches and out-of-order logic of a CPU core?',
      options: [
        'Its memory is much faster than a CPU’s',
        'While one warp waits for memory, it issues from another ready warp',
        'It predicts every load in advance',
        'Its lanes run at a higher clock speed',
      ],
      answer: 1,
      why: 'GPU memory is actually slower per access. The compute unit hides the wait by switching between many resident warps, which costs nothing because each warp keeps its own registers.',
    },
  ],
  realWorld: 'CUDA programmers check this as occupancy: NVIDIA Nsight Compute reports achieved occupancy and which limit (registers, shared memory, block size) caps it. Asking the compiler to use fewer registers per thread, for example with `__launch_bounds__`, can let more warps fit.',

  example: { label: 'y[i] = a * x[i] + y[i] in 256-thread blocks, 32 registers per thread → 64 warps fit', mustContain: 'y[i] = a * x[i] + y[i]' },

  deeper: {
    mechanism: [
      {
        title: 'Inside a partition',
        text: 'Each of the 4 partitions has its own scheduler and dispatch, a quarter of the register file, its own lanes, a ((matrix unit|matrix)) for small matrix multiplies, and load/store and special-function units. Shared memory and the L1 cache form one pool of SRAM used by all four partitions. The split between shared memory and L1 is often set per kernel.',
        cue: { parts: ['sched', 'regs', 'fp32', 'matrix', 'ldst', 'sfu'] },
      },
      {
        title: 'Divergence',
        text: 'All 32 threads of a warp follow one instruction stream. If an `if` sends some threads one way and the rest the other, the compute unit runs both paths one after the other, switching off the lanes that didn’t take each path. A 50/50 split halves throughput for that stretch of code. This is [[divergence]], the GPU’s counterpart to a CPU’s branch mispredict.',
        cue: { parts: ['fp32'], mode: 'diverge' },
      },
      {
        title: 'Memory from a warp’s point of view',
        text: 'When the 32 threads of a warp load 32 neighbouring 4-byte values, the hardware merges them into a few large requests: this is [[coalescing]]. Scattered addresses need many separate requests and waste bandwidth. Shared memory is split into 32 [[banks|bank]]. If two threads hit different addresses in the same bank, their accesses are serialised: a [[bank conflict]].',
        cue: { parts: ['ldst', 'smem'], mode: 'smem' },
      },
    ],
    formula: {
      tex: 'W = \\min\\left(W_{\\max},\\; \\left\\lfloor \\frac{R}{32\\,r} \\right\\rfloor,\\; \\left\\lfloor \\frac{S}{s} \\right\\rfloor w_b \\right)',
      where: 'W resident warps: limited by the warp slots W_max, by the register file (R registers, r per thread), and by shared memory (S per compute unit, s per block, w_b warps per block). Occupancy = W ÷ W_max. The thread-block limit is ignored here, and registers are allocated in chunks.',
    },
    worked: {
      q: 'Our example compute unit has 65,536 registers, 64 warp slots and 96 KB of shared memory. A kernel runs 256-thread blocks (8 warps) using 40 registers per thread and 24 KB of shared memory per block. What is the occupancy?',
      steps: [
        'Registers: 65,536 ÷ (32 × 40) = 51.2, so 51 warps; in whole blocks that is 6 blocks = 48 warps.',
        'Shared memory: 96 KB ÷ 24 KB = 4 blocks = 32 warps.',
        'Slots: 64 ÷ 8 = 8 blocks = 64 warps.',
        'The smallest is 32 warps (shared memory is the limit): 32 ÷ 64 = 50%.',
      ],
      answer: '50% occupancy, limited by shared memory. Using 16 KB per block would allow 6 blocks (48 warps, 75%).',
    },
    choices: [
      { title: 'Registers per thread vs warps', text: 'The register file is a fixed size. A kernel that uses more registers per thread runs each thread faster (fewer spills to memory) but fits fewer warps, leaving less to switch to while waiting. Compilers and programmers trade one against the other.' },
      { title: 'Lockstep vs flexibility', text: 'Running 32 threads in lockstep means one scheduler and one instruction fetch serve 32 lanes, which is cheap. The price is efficiency on branchy code, where divergence leaves lanes idle. Newer GPUs track threads more independently, but still execute in warps.' },
      { title: 'Lanes vs matrix units', text: 'AI work is mostly matrix multiplication, so recent compute units give a growing share of area to matrix units. On an H100 SXM, dense FP16 matrix throughput is about 990 TFLOP/s, against about 67 TFLOP/s for ordinary FP32 lanes.' },
    ],
  },

  connected: [
    { id: 'gpu.warpsched', why: 'Picks which warp issues each cycle.' },
    { id: 'gpu.regfile', why: 'Holds every resident thread’s values: the main limit on how many warps fit.' },
    { id: 'gpu.smem', why: 'The block’s fast scratchpad inside the compute unit.' },
  ],
  lesson: 'g-simt',
  sources: [
    { title: 'NVIDIA, CUDA C++ Programming Guide (SIMT architecture, occupancy)', year: 2024, url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/' },
    { title: 'NVIDIA H100 Tensor Core GPU Architecture whitepaper (132 SMs, 128 FP32 lanes per SM on SXM5)', year: 2022 },
    { title: 'NVIDIA H100 datasheet (FP32 67 TFLOP/s; FP16 tensor 989 TFLOP/s dense, SXM)', year: 2023 },
    { title: 'AMD Instinct MI300X data sheet (304 compute units)', year: 2023 },
    { title: 'Hwu, Kirk & El Hajj, Programming Massively Parallel Processors, 4th ed.', year: 2022 },
  ],
};
