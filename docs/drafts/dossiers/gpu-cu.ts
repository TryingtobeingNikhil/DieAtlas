import type { Dossier } from './types';

// Generic, vendor-neutral GPU compute unit (NVIDIA SM · AMD CU/WGP · Intel Xe-core · Apple GPU core).
// Numbers are typical ranges for datacenter and desktop GPUs of the 2020s, never one chip's spec.

const SCOPE = 'datacenter and desktop GPUs, 2020s';

export const dossier: Dossier = {
  id: 'gpu.cu',
  title: 'Compute unit',
  figure: 'cu',

  /* 1 */
  oneLine: {
    text: {
      b: 'A compute unit is one of the GPU’s many small processors: it keeps dozens of thread groups on hand and runs whichever one is ready.',
      i: 'A multithreaded SIMD processor: it holds many resident [[warps|warp]] and issues one warp-instruction per scheduler per cycle across 32-wide lanes.',
    },
    cue: { mode: 'idle' },
  },

  /* 2 */
  whatItDoes: {
    text: {
      b: 'It receives batches of threads called [[thread blocks|block]] and keeps all their groups of 32 (warps) ready at once. Every clock tick it picks a ready group and runs one instruction for all 32 threads together. Data comes in from the GPU’s shared cache; results go to its own fast memory or back out.',
      i: 'It receives [[thread blocks|block]] from the work distributor, keeps their warps resident, and each cycle issues warp-instructions to FP32/INT32/FP64 lanes, [[matrix units|matrix-unit]], SFUs or LD/ST. **In:** blocks, plus data from L2. **Out:** results to registers and shared memory; stores and misses to L2.',
    },
    cue: { parts: ['warps', 'sched', 'dispatch', 'fp32', 'ldst'], mode: 'issue' },
  },

  /* 3 */
  whyItMatters: {
    text: {
      b: 'Fetching data from the GPU’s main memory takes roughly **400–800 clock ticks**. A compute unit hides that wait by switching to other thread groups, so it needs **dozens** of them on hand. All of a GPU’s math happens in these units.',
      i: 'Device-memory [[latency]] is roughly **400–800 cycles**. With 4 schedulers each wanting an instruction every cycle, a unit needs **dozens of resident warps** to keep its lanes busy. Its register file and shared memory decide how many fit.',
    },
    cue: { parts: ['warps', 'sched'], mode: 'hide' },
  },

  /* 4 */
  howItWorks: [
    {
      title: 'Blocks arrive and their warps move in',
      text: {
        b: 'A dispatcher hands the unit a block of threads only if there is room. Each block is cut into warps of 32 threads. Every thread gets its own private registers, which stay put until the block finishes.',
        i: 'The work distributor places a block only if registers, shared memory, warp slots and block slots all fit. Blocks split into 32-thread warps whose registers stay allocated in the register file until the block retires.',
      },
      cue: { parts: ['warps', 'regs', 'smem'], mode: 'occupancy' },
    },
    {
      title: 'Each scheduler picks a ready warp',
      text: {
        b: 'The unit is split into (typically) four parts, each with its own scheduler. Every tick, each scheduler looks for a warp whose inputs are ready and sends its next instruction.',
        i: 'The unit is typically split into 4 partitions, each with a warp scheduler and dispatch. Every cycle each scheduler selects one eligible warp (operands ready, unit free) and issues its next instruction.',
      },
      cue: { parts: ['sched', 'dispatch', 'warps'], mode: 'issue' },
    },
    {
      title: 'One instruction drives 32 lanes',
      text: {
        b: 'The chosen instruction runs on 32 simple math units at once, one per thread. This is [[SIMT|simt]]: one instruction, many threads. Matrix work goes to special matrix units instead.',
        i: '[[SIMT|simt]] issue: one instruction executes across 32 lanes of FP32, INT32 or FP64 units (over one or more cycles, depending on lanes per partition). SFUs handle transcendentals; matrix units run warp-wide tile MMAs.',
      },
      cue: { parts: ['dispatch', 'fp32', 'int32', 'fp64', 'sfu', 'matrix'], mode: 'issue' },
    },
    {
      title: 'Memory goes through LD/ST, shared memory and L1',
      text: {
        b: 'Loads and stores go to memory units. Threads in a block can share data through a fast scratchpad called [[shared memory|shared-memory]], which sits beside a small cache.',
        i: 'LD/ST units turn a warp’s 32 addresses into as few cache-line requests as possible. [[Shared memory|shared-memory]] (32 banks) and L1 share one SRAM array; misses go to L2.',
      },
      cue: { parts: ['ldst', 'smem', 'l1'], mode: 'smem' },
    },
    {
      title: 'Stalled warps step aside at zero cost',
      text: {
        b: 'If a warp is waiting for memory, the scheduler simply picks another one next tick. Nothing has to be saved, because every warp’s registers are already in place.',
        i: 'A warp waiting on a load is simply ineligible; the scheduler issues from another warp next cycle. No context is saved or restored, because all resident warps’ state already lives in the register file.',
      },
      cue: { parts: ['warps', 'sched', 'regs'], mode: 'hide' },
    },
    {
      title: 'Divergence: some lanes sit out',
      text: {
        b: 'If threads in a warp take different sides of an if/else, the warp runs both sides one after the other. Lanes on the other side are switched off and wait.',
        i: 'On a data-dependent branch, the warp executes each taken path in turn with an active mask; masked lanes idle. [[Divergence|divergence]] can halve (or worse) the useful work per issue.',
      },
      cue: { parts: ['fp32', 'int32', 'dispatch'], mode: 'diverge' },
    },
  ],

  /* 5 */
  analogy: {
    text: 'A compute unit is like a kitchen with four head chefs and rows of cooks. Each order (a warp) has its own station with its ingredients already laid out (registers). When an order waits on a delivery from the warehouse, a chef just calls the next ready order. Nobody has to clean up in between.',
    limits: 'Real cooks in one row can’t make different dishes: all 32 do the same step at the same moment. And a “switch” happens every clock tick, while the warehouse delivery takes hundreds of ticks.',
  },

  /* 6 */
  keyNumbers: [
    { label: 'Compute units per GPU', value: 'tens to ~150 on NVIDIA; up to ~300 CUs on AMD MI300-class', scope: SCOPE },
    { label: 'FP32 lanes per unit', value: '~64–128', scope: SCOPE },
    { label: 'Warp schedulers per unit', value: 'typically 4 (an AMD RDNA CU has 2 SIMDs)', scope: SCOPE },
    { label: 'Max resident warps per unit', value: 'approx. 32–64 (vendor- and generation-dependent)', scope: SCOPE },
    { label: 'Register file per unit', value: '~128–512 KB', scope: SCOPE },
    { label: 'Shared memory + L1 per unit', value: '~64–256 KB', scope: SCOPE },
    { label: 'Threads per warp / wavefront', value: '32 (NVIDIA, Apple); 32 or 64 (AMD); 8–32 (Intel sub-groups)', scope: SCOPE },
  ],

  /* 7 */
  math: {
    intro: {
      b: '[[Occupancy|occupancy]] is how full the unit is with warps. Registers and shared memory are split among blocks, so whichever runs out first sets the limit. Peak math speed is just units × lanes × 2 × clock.',
      i: 'Resident warps are the minimum over every per-unit limit (warp slots, block slots, registers, shared memory), counted in whole blocks. Peak FP32 counts an FMA as 2 FLOPs.',
    },
    formulas: [
      { tex: '\\text{occupancy} = \\dfrac{W_{\\text{resident}}}{W_{\\max}}', note: 'W_max is the hardware limit of warps per unit (approx. 32–64).' },
      { tex: 'W_{\\text{reg}} = \\left\\lfloor \\dfrac{\\text{RF bytes}}{r \\times 4\\,\\text{B} \\times 32} \\right\\rfloor', note: 'r = registers per thread, 4 B each, 32 threads per warp. Hardware allocates in chunks, so real limits can be slightly lower.' },
      { tex: 'B_{\\text{smem}} = \\left\\lfloor \\dfrac{S_{\\text{unit}}}{S_{\\text{block}}} \\right\\rfloor, \\qquad W_{\\text{smem}} = B_{\\text{smem}} \\times \\dfrac{T_{\\text{block}}}{32}', note: 'Shared memory is allocated per block; a block is resident whole or not at all.' },
      { tex: 'W_{\\text{resident}} = \\min\\!\\left(W_{\\max},\\; W_{\\text{reg}},\\; W_{\\text{smem}},\\; B_{\\max} \\times \\tfrac{T_{\\text{block}}}{32}\\right)', note: 'Round each limit down to whole blocks before taking the minimum.' },
      { tex: '\\text{peak FP32} = N_{\\text{units}} \\times L \\times 2 \\times f', note: 'L = FP32 lanes per unit; 2 because one FMA = 2 FLOPs; f = clock.' },
    ],
    widget: 'occupancy',
    cue: { parts: ['warps', 'regs', 'smem'], mode: 'occupancy' },
  },

  /* 8 */
  tradeoffs: [
    {
      text: {
        b: '**Big register file vs big cache.** A GPU spends its on-chip memory on registers so every waiting thread keeps its notes. That leaves less room for cache, so each thread gets very little cache.',
        i: '**Register file vs cache.** A unit’s register file (~128–512 KB) often exceeds its L1. That buys zero-cost warp switching, but cache per thread is tiny, so reuse must be planned in shared memory.',
      },
      cue: { parts: ['regs', 'l1', 'smem'], mode: 'occupancy' },
    },
    {
      text: {
        b: '**Many simple lanes vs a few clever cores.** Lanes have no branch guessing or reordering, so thousands fit on a chip. One thread runs slowly; the crowd finishes a huge job fast.',
        i: '**Many simple lanes vs few fast cores.** Dropping out-of-order logic and branch prediction frees area for thousands of lanes. Single-thread latency is poor; throughput per mm² and per watt is high.',
      },
      cue: { parts: ['fp32', 'int32', 'sched'], mode: 'issue' },
    },
    {
      text: {
        b: '**Wide groups vs disagreement.** Running 32 threads per instruction saves control hardware. But if those threads disagree at an if/else, lanes sit idle.',
        i: '**SIMT width vs divergence cost.** Wider warps amortise fetch/decode/schedule over more lanes, but raise the chance of divergence and uncoalesced access. AMD’s move from wave64 to wave32 on RDNA reflects this trade.',
      },
      cue: { parts: ['fp32', 'dispatch'], mode: 'diverge' },
    },
  ],

  /* 9 */
  misconceptions: [
    {
      myth: 'A “CUDA core” is a core, so a GPU with 16,000 of them is like a 16,000-core CPU.',
      reality: 'A CUDA core (stream processor) is one FP32 lane. It has no own instruction fetch, decode or scheduler. The SM / CU is the closest thing to a CPU core.',
    },
    {
      myth: '100% occupancy is always best.',
      reality: 'Occupancy only needs to be high enough to hide latency. Kernels with lots of independent work per thread (e.g. tuned GEMMs) often run fastest at moderate occupancy, using more registers per thread.',
    },
    {
      myth: 'GPU threads are like CPU threads.',
      reality: 'A GPU thread is one lane of a warp. It is created by hardware almost for free and executes in step with its warp; the OS never schedules it.',
    },
  ],

  /* 10 */
  evolution: [
    { year: '2006', event: 'NVIDIA G80 (GeForce 8800) unifies shaders into streaming multiprocessors of 8 lanes; CUDA 1.0 follows in 2007.' },
    { year: '2010', event: 'NVIDIA Fermi: 32 lanes per SM, 2 warp schedulers, and 64 KB of on-chip memory configurable as L1 or shared memory.' },
    { year: '2012', event: 'AMD GCN ships (Radeon HD 7970): compute units of four 16-wide SIMDs running 64-thread wavefronts, with 64 KB LDS.' },
    { year: '2017', event: 'NVIDIA Volta (V100) adds tensor cores to every SM, independent thread scheduling, and a unified L1/shared memory.' },
    { year: '2019', event: 'AMD RDNA introduces native wave32 and the work-group processor (WGP) pairing two CUs.' },
  ],

  /* 11 */
  connections: {
    fedBy: ['gpu.cmdproc', 'gpu.l2', 'gpu.cluster'],
    feeds: ['gpu.l2'],
    text: {
      b: 'The handout desk sends it batches of threads. Data arrives from the shared L2 cache, which in turn reads the GPU’s main memory. Results and misses flow back to L2.',
      i: 'The command processor / work distributor assigns blocks; the cluster shares front-end resources. Loads miss from L1 to L2 (and on to device memory); stores and atomics go back out to L2.',
    },
  },

  /* 12 */
  twin: {
    comp: 'cpu.core',
    text: {
      b: 'A CPU core makes **one** thread fast: it guesses branches, reorders work and uses big caches to avoid waiting. A compute unit lets each thread wait and keeps busy by switching to another one.',
      i: 'A CPU core attacks [[latency]] with out-of-order execution, branch prediction and large caches. A compute unit tolerates it: dozens of resident warps and zero-cost switching trade single-thread speed for throughput.',
    },
  },

  /* 13 */
  vendorNames: {
    nvidia: 'SM (streaming multiprocessor)',
    amd: 'CU (compute unit) / WGP (work-group processor)',
    intel: 'Xe-core',
    apple: 'GPU core',
  },

  /* 15 */
  course: {
    definition: 'A compute unit (NVIDIA: streaming multiprocessor) is a multithreaded SIMD processor. It holds the state of many threads of SIMD instructions (warps) at once; each clock a scheduler selects a ready warp and issues its instruction across all SIMD lanes, using hardware multithreading to hide memory latency.',
    definitionSource: 'After Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., ch. 4 (“multithreaded SIMD processor”), and Kirk & Hwu, Programming Massively Parallel Processors (“streaming multiprocessor”).',
    worked: {
      q: 'A unit has 64K 32-bit registers (256 KB) and allows at most 64 resident warps. A kernel uses 64 registers per thread. How many warps fit, and what is the occupancy? (Ignore allocation granularity.)',
      steps: [
        'Registers per warp = 64 registers × 32 threads = 2,048.',
        'Warps by registers = 65,536 ÷ 2,048 = 32. (Same as 262,144 B ÷ (64 × 4 B × 32) = 262,144 ÷ 8,192 = 32.)',
        'The hardware limit is 64 warps, so registers are the limiter: 32 warps resident.',
        'Occupancy = 32 ÷ 64 = 0.5.',
      ],
      answer: '32 warps (1,024 threads), 50% occupancy, limited by registers.',
    },
    practice: [
      {
        q: 'A unit has 128 KB of shared memory for blocks, 64K registers, max 64 warps and max 32 blocks. A kernel uses 256 threads per block, 32 registers per thread and 24 KB of shared memory per block. What is the occupancy and what limits it?',
        steps: [
          'Warps per block = 256 ÷ 32 = 8.',
          'Shared memory: ⌊128 ÷ 24⌋ = 5 blocks (5 × 24 = 120 KB fits; 6 × 24 = 144 KB does not) → 5 × 8 = 40 warps.',
          'Registers: 32 × 256 = 8,192 per block; 65,536 ÷ 8,192 = 8 blocks → 64 warps.',
          'Warp slots: 64 ÷ 8 = 8 blocks. Block slots: 32 blocks.',
          'Minimum = 5 blocks = 40 warps. Occupancy = 40 ÷ 64 = 0.625.',
        ],
        answer: '62.5% occupancy (40 warps), limited by shared memory.',
      },
      {
        q: 'Same unit (max 64 warps, max 32 blocks, 64K registers). A kernel launches blocks of 32 threads, 16 registers per thread, no shared memory. What is the occupancy? How would you fix it?',
        steps: [
          'Warps per block = 32 ÷ 32 = 1.',
          'Registers: 16 × 32 = 512 per block; 65,536 ÷ 512 = 128 blocks → not limiting.',
          'Warp slots: 64 blocks. Block slots: 32 blocks → the minimum.',
          '32 blocks × 1 warp = 32 warps. Occupancy = 32 ÷ 64 = 0.5.',
          'With 64-thread blocks: 32 blocks × 2 warps = 64 warps → 100% (registers: 32 × 64 × 16 = 32,768 ≤ 65,536, so they still fit).',
        ],
        answer: '50%, limited by the block-slot limit. Use blocks of at least 64 threads (e.g. 128 or 256).',
      },
      {
        q: 'A GPU has 132 compute units, each with 128 FP32 lanes, at a boost clock of 1.98 GHz. What is its peak FP32 throughput?',
        steps: [
          'Lanes = 132 × 128 = 16,896.',
          'FLOPs per cycle = 16,896 × 2 (FMA) = 33,792.',
          'Peak = 33,792 × 1.98 × 10⁹ ≈ 6.69 × 10¹³ FLOP/s.',
        ],
        answer: '≈ 66.9 TFLOP/s FP32 (this matches NVIDIA’s published ~67 TFLOP/s for H100 SXM).',
      },
    ],
    mistakes: [
      'Counting threads instead of warps: divide threads by 32 before comparing with the warp limit.',
      'Checking only one limiter. Resident warps are the minimum of warp slots, block slots, registers and shared memory.',
      'Allowing fractional blocks: a block is resident whole or not at all, so round each limit down to whole blocks.',
      'Forgetting the factor 2 for FMA in peak FLOP/s (or applying it to non-FMA instructions).',
    ],
  },

  /* 16 */
  realWorld: {
    inChips: {
      b: 'An H100 has 132 of these units, an RTX 4090 has 128, and AMD’s MI300X has 304. Each NVIDIA unit has 128 math lanes; each AMD unit has 64.',
      i: 'H100 SXM: 132 SMs × 128 FP32 lanes, 256 KB registers and 256 KB L1/shared each. RTX 4090: 128 SMs, 128 KB L1/shared. MI300X: 304 CUs (wave64), 64 KB LDS each.',
    },
    engineer: {
      b: 'Engineers check that each unit has enough warps, keep each thread’s register use in check so nothing spills to slow memory, have neighbouring threads read neighbouring addresses, and avoid if/else splits inside a warp.',
      i: 'Tune block size and registers for enough occupancy; use `__launch_bounds__` or `-maxrregcount` to cap registers without spilling (`-Xptxas -v` reports spills). Keep loads coalesced and branches warp-uniform.',
    },
    code: {
      lang: 'cuda',
      title: 'Grid-stride loop sized to the hardware, with launch bounds',
      src: `// y = a*x + y. Neighbouring threads touch neighbouring addresses (coalesced).
__global__ void __launch_bounds__(256, 4)   // <=256 threads/block, aim for >=4 blocks/SM
saxpy(int n, float a, const float* __restrict__ x, float* __restrict__ y) {
  for (int i = blockIdx.x * blockDim.x + threadIdx.x; i < n;
       i += blockDim.x * gridDim.x)            // grid-stride: any n, fixed grid
    y[i] = a * x[i] + y[i];
}

// Host: launch exactly as many blocks as can be resident at once.
int sms, perSM;
cudaDeviceGetAttribute(&sms, cudaDevAttrMultiProcessorCount, 0);
cudaOccupancyMaxActiveBlocksPerMultiprocessor(&perSM, saxpy, 256, 0);
saxpy<<<sms * perSM, 256>>>(n, 2.0f, d_x, d_y);`,
    },
    measure: [
      { tool: 'NVIDIA Nsight Compute', how: 'The Launch Statistics and Occupancy sections show registers per thread, shared memory per block, theoretical vs achieved occupancy and which limit binds.' },
      { tool: 'nvcc -Xptxas -v', how: 'Prints registers, shared memory and spill bytes per kernel at compile time.' },
      { tool: 'NVIDIA Nsight Systems', how: 'Timeline of kernels and copies: confirms the GPU is busy before you tune inside a kernel.' },
      { tool: 'AMD rocprof / Omniperf (ROCm Compute Profiler)', how: 'Per-kernel counters on AMD GPUs, including wave occupancy, VGPR/LDS usage and CU utilisation.' },
    ],
  },

  /* 17 */
  learnMore: {
    lessons: ['g-simt', 'g-sm', 'g-warpsched', 'g-occupancy', 'g-diverge', 'g-tensor', 'g-bank'],
    sources: [
      { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., ch. 4', year: 2017 },
      { title: 'Hwu, Kirk & El Hajj, Programming Massively Parallel Processors, 4th ed.', year: 2022 },
      { title: 'Lindholm et al., “NVIDIA Tesla: A Unified Graphics and Computing Architecture”, IEEE Micro', year: 2008 },
      { title: 'NVIDIA CUDA C++ Programming Guide (hardware implementation; occupancy)', year: 2024, url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/' },
    ],
  },

  seeInRealChips: [
    { arch: 'hopper-h100', text: 'H100 SXM: 132 SMs, each with 4 partitions, 128 FP32 lanes, 4th-gen Tensor Cores, up to 64 resident warps.' },
    { arch: 'nvidia-ada-4090', text: 'RTX 4090: 128 SMs enabled (of 144 on AD102), each with 128 FP32 lanes and up to 48 resident warps.' },
    { arch: 'amd-cdna3-mi300x', text: 'MI300X: 304 CUs across eight compute dies, each CU with four SIMD units running 64-wide wavefronts.' },
  ],
};
