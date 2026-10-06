import type { Dossier } from './types';

export const dossier: Dossier = {
  id: 'hopper.tma',
  title: 'Tensor Memory Accelerator (TMA)',
  figure: 'tma',
  short: true,

  oneLine: {
    text: {
      b: 'A copy engine in each Hopper SM: one thread asks, and it moves a whole tile of data into the scratchpad by itself.',
      i: 'Per-SM hardware that performs asynchronous bulk copies of multi-dimensional tensor tiles between global and [[shared memory|shared-memory]].',
    },
    cue: { parts: ['tma', 'tile', 'smem'], mode: 'copy' },
  },

  whatItDoes: {
    text: {
      b: 'You describe the big table once. Then a single thread says “fetch this tile”. TMA works out every address and copies the tile while the other threads keep working.',
      i: 'A tensor map describes the global tensor (up to 5 dimensions). One thread issues a copy with tile coordinates. TMA generates addresses, moves the data and signals a barrier on completion.',
    },
    cue: { parts: ['threads', 'tma', 'global', 'smem'], mode: 'copy' },
  },

  whyItMatters: {
    text: {
      b: 'A 16 KB tile loaded the old way takes 1,024 separate load instructions. With TMA it takes one.',
      i: 'A 128 × 64 FP16 tile is 16 KB. With 16-byte vector loads that is 1,024 loads (8 per thread in a 128-thread [[thread block|block]]). TMA replaces them with 1 instruction.',
    },
    cue: { parts: ['threads', 'tma', 'tile'], mode: 'copy' },
  },

  howItWorks: [
    {
      title: 'Describe the tensor once',
      text: {
        b: 'Before the kernel runs, the host writes a small description of the table: where it starts, its size and the tile shape.',
        i: 'The host builds a `CUtensorMap` (e.g. with `cuTensorMapEncodeTiled`): base address, dimensions, strides, box (tile) size and swizzle mode.',
      },
      cue: { parts: ['global', 'tile'], mode: 'copy' },
    },
    {
      title: 'One thread issues the copy',
      text: {
        b: 'Inside the kernel, one thread says which tile it wants. The other threads don’t have to help.',
        i: 'A single thread issues a bulk tensor copy with the tile’s coordinates. No registers hold the data; it goes straight from global memory to shared memory.',
      },
      cue: { parts: ['threads', 'tma'], mode: 'copy' },
    },
    {
      title: 'TMA moves the tile',
      text: {
        b: 'TMA computes every address, skips past the edges safely, and writes the tile into the scratchpad in a bank-friendly order.',
        i: 'TMA generates addresses in hardware, reads via L2, fills out-of-bounds elements automatically and can swizzle the layout to avoid [[bank conflicts|bank-conflict]].',
      },
      cue: { parts: ['tma', 'l2', 'global', 'smem'], mode: 'copy' },
    },
    {
      title: 'A barrier says “done”',
      text: {
        b: 'Threads wait at a checkpoint that opens once all the bytes have arrived. Meanwhile they can compute on the previous tile.',
        i: 'Loads complete on an asynchronous transaction barrier (mbarrier) that expects a byte count. Multi-stage buffers let threads compute on tile N while TMA fetches N+1.',
      },
      cue: { parts: ['barrier', 'threads', 'smem'], mode: 'overlap' },
    },
  ],

  analogy: {
    text: 'Like a warehouse forklift: instead of every worker carrying boxes by hand, one person writes a pick ticket and the forklift brings the whole pallet.',
    limits: 'The forklift still drives on the same roads: TMA does not make memory itself any faster.',
  },

  keyNumbers: [
    { label: 'TMA units', value: '1 per SM', scope: 'NVIDIA Hopper (2022)' },
    { label: 'Tensor dimensions', value: '1 to 5', scope: 'NVIDIA Hopper (2022)' },
    { label: 'Threads needed to issue a copy', value: '1', scope: 'NVIDIA Hopper (2022)' },
    { label: 'Tensor map descriptor size', value: '128 bytes', scope: 'CUDA 12 (CUtensorMap)' },
  ],

  math: {
    intro: {
      b: 'You size tiles so several copies fit in the scratchpad at once: one being used, others on the way.',
      i: 'Tile bytes set the barrier’s expected transaction count. Stages × bytes per stage must fit in shared memory (up to 228 KB per SM on H100).',
    },
    formulas: [
      { tex: 'B_{\\text{tile}} = \\prod_{d} \\text{box}_d \\times \\text{bytes per element}', note: 'bytes moved by one TMA copy' },
      { tex: 'B_{\\text{smem}} = S \\times (B_{A} + B_{B}) \\le B_{\\text{smem,max}}', note: 'S pipeline stages of A and B tiles in a GEMM' },
      { tex: 'N_{\\text{loads, no TMA}} = B_{\\text{tile}} / 16', note: 'separate 16-byte loads the threads would otherwise issue' },
    ],
    cue: { parts: ['tile', 'smem', 'barrier'], mode: 'overlap' },
  },

  tradeoffs: [
    {
      text: {
        b: 'Code gets harder: you set up descriptions and checkpoints yourself. In return the threads are free to do maths.',
        i: 'TMA needs tensor maps, alignment rules, mbarriers and multi-stage pipelines. In return it frees registers and issue slots, enabling warp-specialised producer/consumer kernels.',
      },
      cue: { parts: ['threads', 'barrier'], mode: 'overlap' },
    },
    {
      text: {
        b: 'TMA is best for big, regular tiles. Scattered, one-off reads are still better done the normal way.',
        i: 'It pays off for regular, tiled access (GEMM, attention). Irregular gathers or tiny transfers may not amortise the descriptor and barrier overhead.',
      },
      cue: { parts: ['tile', 'global'] },
    },
  ],

  misconceptions: [
    {
      myth: 'TMA gives the GPU more memory bandwidth.',
      reality: 'Peak HBM bandwidth is unchanged. TMA frees threads from address maths and makes it easier to overlap copies with compute.',
    },
    {
      myth: 'TMA works automatically, like a cache prefetcher.',
      reality: 'It is explicit: the program builds a tensor map, issues each copy and waits on a barrier. Nothing happens unless the code asks.',
    },
  ],

  evolution: [
    { year: '2020', event: 'NVIDIA Ampere adds `cp.async`: per-thread asynchronous copies from global to shared memory, bypassing registers.' },
    { year: '2022', event: 'Hopper (H100) introduces TMA, thread block clusters, distributed shared memory and transaction-count barriers.' },
    { year: '2024', event: 'FlashAttention-3 builds on TMA for Hopper; Blackwell keeps TMA alongside its newer Tensor Core instructions.' },
  ],

  connections: {
    fedBy: ['gpu.ldsfu', 'gpu.l2', 'gpu.devmem'],
    feeds: ['gpu.smem', 'gpu.l2'],
    text: {
      b: 'A thread sends the request. TMA pulls the data from device memory through the shared store and drops it into the scratchpad. It can also copy results back out.',
      i: 'Threads issue TMA instructions; TMA reads global memory via L2 (from HBM on a miss) and writes shared memory. Stores run in reverse, shared → global. Within a cluster, TMA can also deliver tiles to other SMs’ shared memory.',
    },
  },

  twin: {
    comp: 'cpu.l2',
    text: {
      b: 'CPUs also fetch data early, but they guess. Hardware next to the L2 cache spots patterns and fetches ahead. TMA doesn’t guess: the program says exactly what to fetch.',
      i: 'CPU L2 [[prefetchers|prefetcher]] infer future addresses from streams and strides, transparently. TMA is the opposite: explicit, software-scheduled bulk copies into a scratchpad, with completion tracked by a barrier.',
    },
  },

  vendorNames: {
    nvidia: 'Tensor Memory Accelerator (TMA)',
  },

  course: {
    definition: 'The Tensor Memory Accelerator is a per-SM hardware unit in NVIDIA Hopper GPUs that performs asynchronous transfers of multi-dimensional tensor tiles between global memory and shared memory, generating addresses in hardware from a tensor descriptor.',
    definitionSource: 'Adapted from NVIDIA H100 Tensor Core GPU Architecture whitepaper (2022)',
    worked: {
      q: 'A GEMM kernel loads an A tile of 128 × 64 FP16 and a B tile of 64 × 128 FP16 per stage. How many bytes must the barrier expect per stage, and do 4 stages fit in 228 KB of shared memory?',
      steps: [
        'A tile = 128 × 64 × 2 B = 16,384 B.',
        'B tile = 64 × 128 × 2 B = 16,384 B.',
        'Per stage = 16,384 + 16,384 = 32,768 B (32 KB): the barrier’s expected transaction count.',
        '4 stages = 4 × 32 KB = 128 KB ≤ 228 KB.',
      ],
      answer: '32,768 bytes per stage; 4 stages (128 KB) fit, leaving room for other buffers.',
    },
    practice: [
      {
        q: 'Without TMA, a 128-thread block loads a 64 × 64 BF16 tile using 16-byte vector loads. How many loads in total, and per thread?',
        steps: [
          'Tile bytes = 64 × 64 × 2 B = 8,192 B.',
          'Loads = 8,192 / 16 = 512.',
          'Per thread = 512 / 128 = 4.',
        ],
        answer: '512 loads (4 per thread), versus 1 TMA instruction from one thread.',
      },
      {
        q: 'A kernel uses tiles of 128 × 64 FP16 (A) and 64 × 256 FP16 (B). How many pipeline stages fit in 200 KB of shared memory?',
        steps: [
          'A tile = 128 × 64 × 2 B = 16 KB.',
          'B tile = 64 × 256 × 2 B = 32 KB.',
          'Per stage = 16 + 32 = 48 KB.',
          'Stages = floor(200 / 48) = 4 (192 KB).',
        ],
        answer: '4 stages (192 KB).',
      },
    ],
    mistakes: [
      'Setting the barrier’s expected byte count wrong (e.g. counting elements, not bytes), so threads wait forever or proceed too early.',
      'Assuming TMA speeds up any load; it helps regular tiled transfers, not scattered or tiny accesses.',
    ],
  },

  realWorld: {
    inChips: {
      b: 'Every SM in an H100 has one. Newer Blackwell GPUs keep it.',
      i: 'Present in each SM of Hopper (H100/H200) and kept in Blackwell. Fast Hopper GEMM and attention kernels (CUTLASS, FlashAttention-3) rely on it.',
    },
    engineer: {
      b: 'Most engineers get TMA through libraries. Kernel writers set it up by hand to overlap copying and maths.',
      i: 'Most code reaches TMA via cuBLAS, CUTLASS/CuTe or compilers such as Triton. Hand-written kernels pair TMA producer warps with Tensor Core consumer warps.',
    },
    code: {
      lang: 'cuda',
      title: 'Load one 2-D tile with TMA (after the CUDA C++ Programming Guide, CUDA 12, sm_90)',
      src: `#include <cuda.h>          // CUtensorMap
#include <cuda/barrier>
using barrier = cuda::barrier<cuda::thread_scope_block>;
namespace cde = cuda::device::experimental;

constexpr int TILE_H = 64, TILE_W = 64;

__global__ void kernel(const __grid_constant__ CUtensorMap tensor_map, int x, int y) {
  __shared__ alignas(128) float tile[TILE_H][TILE_W];
  #pragma nv_diag_suppress static_var_with_dynamic_init
  __shared__ barrier bar;

  if (threadIdx.x == 0) {
    init(&bar, blockDim.x);                 // every thread will arrive
    cde::fence_proxy_async_shared_cta();    // make the barrier visible to TMA
  }
  __syncthreads();

  barrier::arrival_token token;
  if (threadIdx.x == 0) {
    // One thread: copy the tile at (x, y) and tell the barrier how many bytes to expect.
    cde::cp_async_bulk_tensor_2d_global_to_shared(&tile, &tensor_map, x, y, bar);
    token = cuda::device::barrier_arrive_tx(bar, 1, sizeof(tile));
  } else {
    token = bar.arrive();
  }
  bar.wait(std::move(token));               // tile is now in shared memory
  // ... compute on tile ...
}`,
    },
    measure: [
      { tool: 'NVIDIA Nsight Compute', how: 'Memory workload analysis shows global→shared traffic and stalls waiting on barriers.' },
      { tool: 'cuobjdump -sass', how: 'Check the compiled kernel for TMA instructions (e.g. UTMALDG) to confirm TMA is used.' },
    ],
  },

  learnMore: {
    lessons: ['g-tensor', 'g-l2'],
    sources: [
      { title: 'NVIDIA H100 Tensor Core GPU Architecture whitepaper', year: 2022 },
      { title: 'NVIDIA CUDA C++ Programming Guide (CUDA 12), “Asynchronous Data Copies using TMA”', year: 2023, url: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/' },
      { title: 'NVIDIA PTX ISA, cp.async.bulk.tensor', year: 2023, url: 'https://docs.nvidia.com/cuda/parallel-thread-execution/' },
      { title: 'Shah et al., FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision', year: 2024 },
    ],
  },

  seeInRealChips: [
    { arch: 'hopper-h100', text: 'Where TMA debuted: one per SM, used with thread block clusters and distributed shared memory.' },
    { arch: 'nvidia-blackwell', text: 'Keeps TMA to feed its Tensor Cores with large tiles.' },
  ],
};
