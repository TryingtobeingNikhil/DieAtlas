import type { Lesson } from '../types';

// Reference GPU: NVIDIA H100 SXM5. 132 SMs, 4 warp schedulers and 128 FP32 lanes per SM,
// max 64 resident warps (2,048 threads) per SM, 256 KB register file per SM.
// Example launch: vecAdd<<<4096, 256>>> over 1,048,576 elements.

const warpRows = Array.from({ length: 8 }, (_, i) => `warp ${i}`);

export const simtWarps: Lesson = {
  id: 'g-simt',
  world: 'gpu',
  components: ['gpu.cu', 'gpu.cmdproc', 'gpu.warpsched'],
  level: 'beginner',
  minutes: 6,
  status: 'ready',
  title: { b: 'A million copies of one program', i: 'SIMT: threads, warps, blocks, grids' },
  teaser: { b: 'How a GPU splits one job across thousands of workers.', i: 'Grid → blocks → warps → lanes, on 132 SMs.' },
  body: {
    scene: {
      viewBox: [760, 470],
      viewBoxN: [380, 820],
      nodes: [
        { type: 'label', id: 'kLbl', x: 20, y: 30, text: { b: 'Your program: add two lists of 1,048,576 numbers', i: 'vecAdd<<<4096, 256>>>(a, b, c)' }, mono: true, size: 12, kind: 'gpu', n: { x: 16, y: 22 } },
        { type: 'grid', id: 'blocks', x: 20, y: 52, rows: 4, cols: 4, cw: 40, ch: 30, gap: 8, kind: 'gpu', n: { x: 16, y: 40 }, cwN: 34, chN: 26, gapN: 6 },
        { type: 'label', id: 'blocksL', x: 20, y: 216, text: { b: 'Teams of threads (blocks): 4,096, 16 shown', i: 'grid: 4,096 blocks × 256 threads (16 shown)' }, size: 11, n: { x: 16, y: 182 } },

        { type: 'arrow', id: 'a1', x: 206, y: 124, x2: 234, y2: 124, n: { x: 172, y: 100 }, n2: { x2: 198, y2: 88 } },
        { type: 'box', id: 'bsched', x: 236, y: 92, w: 132, h: 64, kind: 'cpu', title: { b: 'Handout desk', i: 'Block scheduler' }, sub: { b: 'gives out blocks', i: 'assigns blocks → SMs' }, n: { x: 200, y: 48, w: 164, h: 60 } },
        { type: 'arrow', id: 'a2', x: 368, y: 124, x2: 394, y2: 124, n: { x: 282, y: 110 }, n2: { x2: 282, y2: 202 } },

        { type: 'box', id: 'sm0', x: 396, y: 36, w: 190, h: 44, kind: 'gpu', title: 'SM 0', n: { x: 16, y: 206, w: 170, h: 40 } },
        { type: 'box', id: 'sm1', x: 396, y: 88, w: 190, h: 44, kind: 'gpu', title: 'SM 1', n: { x: 194, y: 206, w: 170, h: 40 } },
        { type: 'box', id: 'sm2', x: 396, y: 140, w: 190, h: 44, kind: 'gpu', title: 'SM 2', n: { x: 16, y: 254, w: 170, h: 40 } },
        { type: 'box', id: 'sm3', x: 396, y: 192, w: 190, h: 44, kind: 'gpu', title: { b: '… SM 131', i: '… SM 131 (132 total)' }, n: { x: 194, y: 254, w: 170, h: 40 } },

        { type: 'box', id: 'smIn', x: 20, y: 262, w: 720, h: 198, kind: 'gpu', title: { b: 'Inside SM 0: block 0’s 256 threads', i: 'SM 0 · block 0 → 8 warps × 32 threads' }, n: { x: 16, y: 310, w: 348, h: 490 } },
        { type: 'box', id: 'wsched', x: 36, y: 300, w: 128, h: 60, kind: 'cpu', title: { b: 'Turn-taker', i: 'Warp scheduler' }, sub: { b: 'picks who runs', i: '1 warp-instr / cycle' }, n: { x: 28, y: 350, w: 150, h: 56 } },
        { type: 'badge', id: 'stallB', x: 36, y: 376, w: 128, text: { b: '✕ warp 0 waits', i: '✕ warp 0: memory stall' }, kind: 'err', initial: 'hidden', n: { x: 190, y: 366 } },
        {
          type: 'grid', id: 'warps', x: 176, y: 300, rows: 8, cols: 32, cw: 13, ch: 11, gap: 3, kind: 'gpu', labelW: 46, rowLabels: warpRows,
          n: { x: 28, y: 430 }, cwN: 8, chN: 14, gapN: 2, labelWN: 0,
        },
        { type: 'label', id: 'lanesL', x: 176, y: 432, text: { b: 'Each square is one thread: one copy of your program, on one number.', i: '32 threads per warp; one instruction drives all 32 lanes.' }, size: 11, n: { x: 28, y: 580 } },

        { type: 'token', id: 'b0', x: 12, y: 57, w: 56, label: 'block 0', kind: 'gpu', initial: 'hidden', n: { x: 5, y: 43 } },
        { type: 'token', id: 'b1', x: 60, y: 57, w: 56, label: 'block 1', kind: 'gpu', initial: 'hidden', n: { x: 45, y: 43 } },
        { type: 'token', id: 'b2', x: 108, y: 57, w: 56, label: 'block 2', kind: 'gpu', initial: 'hidden', n: { x: 85, y: 43 } },
      ],
    },
    hook: {
      slot: ['warps', 'lanesL'],
      prompt: { b: 'What fills the empty space inside the SM?', i: 'What fills the empty slot inside the SM?' },
      options: [
        { label: 'Branch predictor', sub: { b: 'A table of guesses', i: 'Speculates on branches' }, feedback: { b: '✕ Not this one. GPUs barely guess branches: they run so many threads that they don’t need to.', i: '✕ SMs have no big branch predictor. They hide latency by switching warps, not by speculating.' } },
        { label: 'Warps of 32 threads', sub: { b: 'Groups that move together', i: 'The unit of issue' }, correct: true, feedback: { b: '✓ Warps: groups of 32 threads that always take the same step together.', i: '✓ Warps: 32 threads issued together. A 256-thread block = 8 warps.' } },
        { label: 'L3 cache', sub: { b: 'A big shared store', i: 'Last-level cache' }, feedback: { b: '✕ Not this one. L3 is a big CPU cache. GPUs spend that space on more threads instead.', i: '✕ GPUs have no L3; the 50 MB L2 is the last level. SM area goes to registers, lanes and shared memory.' } },
      ],
    },
    steps: [
      {
        id: 'grid',
        title: { b: 'One program, a million copies', i: 'Kernels and grids' },
        anchor: 'blocks',
        say: {
          beginner: 'On a CPU you’d loop over the numbers one after another. On a GPU you write the work for **one** number. The GPU then runs a copy for every number: over a million. Each copy is a **thread**.',
          intermediate: 'A kernel launches over a **grid**: `vecAdd<<<4096, 256>>>` creates 4,096 blocks × 256 threads = **1,048,576 threads**, one per element. Each thread finds its element with `i = blockIdx.x * blockDim.x + threadIdx.x`.',
        },
        deeper: { text: { b: 'Number of teams = numbers ÷ team size, rounded up. Drag the sliders.', i: 'blocks = ⌈N / threads per block⌉; warps per block = ⌈T / 32⌉.' }, widget: 'simt-launch' },
        timeline: [
          { at: 0, caption: { b: 'One small program, copied once per number.', i: 'Launch: grid of 4,096 blocks × 256 threads.' }, do: [{ t: 'kLbl', s: 'focus' }] },
          { at: 700, caption: { b: 'The copies are grouped into teams called blocks.', i: '1,048,576 threads in 4,096 blocks.' }, do: [{ t: 'blocks.*', s: 'active', stagger: 50 }] },
        ],
      },
      {
        id: 'blocks',
        title: { b: 'Teams go to worker units', i: 'Blocks are scheduled onto SMs' },
        anchor: 'bsched',
        say: {
          beginner: 'Threads come in teams of 256, called **blocks**. A handout desk gives each block to a free worker unit, an **SM**. An H100 has **132 SMs**, so many blocks run at once. A block never splits across two SMs.',
          intermediate: 'The block scheduler assigns **whole blocks** to SMs as resources free up. A block stays on one SM for its whole life. So its threads can share that SM’s shared memory and `__syncthreads()`. H100 SXM: 132 SMs, up to 32 resident blocks each.',
        },
        timeline: [
          { at: 0, caption: { b: 'The handout desk gives blocks to free SMs.', i: 'Block scheduler dispatches blocks to SMs.' }, do: [{ t: 'blocks.*', s: 'idle' }, { t: 'bsched', s: 'active' }, { t: 'b0', s: 'shown' }, { t: 'b1', s: 'shown' }, { t: 'b2', s: 'shown' }] },
          { at: 400, do: [{ t: 'b0', move: [508, -9], moveN: [107, 173] }, { t: 'blocks.0.0', s: 'dim' }] },
          { at: 800, do: [{ t: 'b1', move: [460, 43], moveN: [245, 173] }, { t: 'blocks.0.1', s: 'dim' }] },
          { at: 1200, do: [{ t: 'b2', move: [412, 95], moveN: [27, 221] }, { t: 'blocks.0.2', s: 'dim' }] },
          { at: 1700, caption: { b: 'Each SM now has a block to work on. 132 SMs means 132 at once, at least.', i: 'Blocks 0–2 → SMs 0–2 (132 SMs on H100 SXM).' }, do: [{ t: 'sm0', s: 'active' }, { t: 'sm1', s: 'active' }, { t: 'sm2', s: 'active' }] },
        ],
      },
      {
        id: 'warps',
        title: { b: 'Groups of 32: warps', i: 'Warps: 32 threads in lockstep' },
        anchor: 'warps',
        say: {
          beginner: 'Inside an SM, a block’s 256 threads split into groups of 32 called **warps**. A warp is the GPU’s real unit of work. Its 32 threads always take the same step together.',
          intermediate: '256 threads ÷ 32 = **8 warps**. The SM fetches, issues and schedules **warps**, never individual threads: one instruction is issued for all 32 lanes. That’s SIMT: single instruction, multiple threads.',
        },
        timeline: [
          { at: 0, caption: { b: 'Block 0 arrives in SM 0…', i: 'Block 0 resident on SM 0.' }, do: [{ t: 'sm1', s: 'idle' }, { t: 'sm2', s: 'idle' }, { t: 'b0', s: 'hidden' }, { t: 'b1', s: 'hidden' }, { t: 'b2', s: 'hidden' }, { t: 'smIn', s: 'active' }] },
          { at: 600, caption: { b: '256 threads = 8 groups of 32 (warps).', i: '256 / 32 = 8 warps per block.' }, do: [{ t: 'warps:r*', s: 'active', stagger: 140 }] },
        ],
      },
      {
        id: 'issue',
        title: { b: 'One step, 32 threads at once', i: 'One instruction, 32 lanes' },
        anchor: 'wsched',
        say: {
          beginner: 'Each tick, a **turn-taker** (the warp scheduler) picks one warp and gives it one instruction, like “add”. All 32 threads in that warp do that add together, each on its own number.',
          intermediate: 'Each of an SM’s **4 warp schedulers** issues one warp-instruction per cycle to 32 FP32 lanes. 132 SMs × 128 lanes = **16,896 lanes**. At ~1.98 GHz and 2 FLOP per FMA, that’s ≈ **67 TFLOP/s FP32** (approx.).',
        },
        deeper: { text: { b: 'Total math per second = workers × lanes × 2 × ticks per second. Drag the sliders.', i: 'Peak FP32 = SMs × lanes/SM × 2 (FMA) × clock. The ~1.98 GHz clock is derived from the datasheet’s 67 TFLOP/s, so it’s approximate.' }, widget: 'peak-flops' },
        timeline: [
          { at: 0, caption: { b: 'The turn-taker picks warp 0.', i: 'Scheduler selects warp 0 (ready).' }, do: [{ t: 'warps:r*', s: 'idle' }, { t: 'wsched', s: 'active' }, { t: 'warps:r0', s: 'focus' }] },
          { at: 800, caption: { b: '“Add!” All 32 threads of warp 0 add at the same moment.', i: 'Issue FADD: 32 lanes execute in lockstep.' }, do: [{ t: 'warps.0.*', s: 'active', stagger: 12 }] },
        ],
      },
      {
        id: 'hide',
        title: { b: 'Waiting? Switch!', i: 'Latency hiding by switching warps' },
        anchor: 'wsched',
        say: {
          beginner: 'Warp 0 now needs a number from memory, which takes **hundreds of ticks**. Instead of waiting, the turn-taker simply switches to another warp that’s ready. Switching is free, because every thread keeps its own values in the SM’s huge notepad (the register file).',
          intermediate: 'Warp 0 issues a load to HBM (~400–600 cycles, approx.) and stalls. Next cycle the scheduler issues from warp 1: a **zero-cost switch**. Every warp’s registers stay on-chip (256 KB per SM). Enough ready warps hide the wait: that’s occupancy.',
        },
        timeline: [
          { at: 0, caption: { b: 'Warp 0 needs data from memory, so it has to wait.', i: 'warp 0: LD.global → stalled (~400–600 cycles, approx.).' }, do: [{ t: 'warps.0.*', s: 'miss' }, { t: 'stallB', s: 'shown' }, { t: 'warps:r0', s: 'idle' }] },
          { at: 1200, caption: { b: 'Warp 0 waits; warp 1 runs instead.', i: 'Next cycle: issue from warp 1 (0-cycle switch).' }, do: [{ t: 'warps.1.*', s: 'active', stagger: 10 }] },
          { at: 2200, caption: { b: 'Then warp 2. The math lanes never sit idle.', i: 'Then warp 2, 3… the lanes stay busy.' }, do: [{ t: 'warps.2.*', s: 'active', stagger: 10 }, { t: 'warps.3.*', s: 'active', stagger: 10 }] },
        ],
      },
      {
        id: 'together',
        title: { b: 'The whole picture', i: 'Grid → block → warp → lane' },
        anchor: 'smIn',
        say: {
          beginner: 'So: one program, a million threads, blocks of 256, warps of 32, on 132 SMs. While some warps wait, others work. That’s how a GPU stays busy.',
          intermediate: 'Grid → blocks (scheduled to SMs) → warps (scheduled every cycle) → threads (lanes). Up to **64 resident warps (2,048 threads) per SM** on H100. Throughput comes from many warps in flight, not from any single warp being fast.',
        },
        deeper: { text: { b: 'An SM can keep up to 64 warps ready at once.', i: 'Max resident warps per SM = 2,048 threads ÷ 32.' }, formula: '\\frac{2048\\ \\text{threads}}{32\\ \\text{threads/warp}} = 64\\ \\text{warps per SM}' },
        timeline: [
          { at: 0, caption: { b: 'Warp 0’s data arrives; it’s ready again.', i: 'warp 0 load returns → ready.' }, do: [{ t: 'stallB', s: 'hidden' }, { t: 'warps.0.*', s: 'active' }] },
          { at: 900, caption: { b: 'All 8 warps take turns, so the SM stays busy.', i: '8 warps interleave on 4 schedulers.' }, do: [{ t: 'warps.*', s: 'active', stagger: 2 }, { t: 'sm0', s: 'active' }, { t: 'sm1', s: 'active' }, { t: 'sm2', s: 'active' }, { t: 'sm3', s: 'active' }] },
        ],
      },
    ],
    takeaways: [
      { b: 'You write the work for one thread; the GPU runs a huge number of them.', i: 'A launch is a grid of blocks of threads; each thread derives its element from its indices.' },
      { b: 'Blocks go to SMs, and a block stays on one SM.', i: 'Blocks are the unit of scheduling onto SMs and the scope of shared memory and __syncthreads().' },
      { b: '32 threads move together as a warp.', i: 'The warp (32 threads) is the unit of issue: one instruction, 32 lanes.' },
      { b: 'When a warp waits, another one runs. That’s how GPUs hide slow memory.', i: 'Latency hiding needs many resident warps; switching costs 0 cycles because registers stay on-chip.' },
    ],
    quiz: [
      {
        q: { b: 'A block has 256 threads. How many warps is that?', i: 'blockDim.x = 256. Warps per block?' },
        choices: ['8', '32', '256'],
        answer: 0,
        why: { b: 'A warp is 32 threads, so 256 ÷ 32 = 8.', i: '⌈256 / 32⌉ = 8 warps.' },
      },
      {
        q: { b: 'Warp 0 is waiting for memory. What does the SM do?', i: 'A warp stalls on a global load. What does its scheduler do next cycle?' },
        choices: [
          { b: 'Runs another warp that’s ready', i: 'Issues from another ready warp' },
          { b: 'Waits until warp 0 gets its data', i: 'Stalls until the load returns' },
          { b: 'Moves warp 0 to another SM', i: 'Migrates the warp to a less busy SM' },
        ],
        answer: 0,
        why: { b: 'Switching is free, so the SM keeps busy with other warps.', i: 'Warps never migrate. All resident warps keep their registers on-chip, so the scheduler can pick any ready one at zero cost.' },
      },
    ],
  },
};
