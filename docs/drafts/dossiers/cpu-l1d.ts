import type { Dossier } from './types';

// Generic, vendor-neutral L1 data cache. Numbers are typical ranges for desktop/laptop CPUs (2020s).
// Worked example check: 64 KB / (4 × 64 B) = 256 sets → offset 6, index 8, tag 32 − 14 = 18.
// 0x00012A74 = 76,404: offset = 76,404 mod 64 = 52; index = 1,193 mod 256 = 169; tag = 76,404 >> 14 = 4.
// Check: 4 × 16,384 + 169 × 64 + 52 = 65,536 + 10,816 + 52 = 76,404 ✓.

const DESK = 'desktop/laptop CPUs, 2020s';

export const dossier: Dossier = {
  id: 'cpu.l1d',
  title: 'L1 data cache',
  figure: 'cache',

  /* 1 */
  oneLine: {
    text: {
      b: 'The smallest, fastest cache for data, sitting right next to each core.',
      i: 'A private, set-associative SRAM cache per core: the first place every load and store looks.',
    },
    cue: { parts: ['core', 'array'], mode: 'idle' },
  },

  /* 2 */
  whatItDoes: {
    text: {
      b: 'It keeps copies of data the core used recently, in 64-byte chunks. When the core asks for a byte, the cache checks if it already has it. If so, the answer comes back in a few ticks.',
      i: 'It holds 64 B lines of recently touched memory. Each load is looked up by address; a hit returns data in ~4–5 cycles. Stores update the line in place and reach L2 later.',
    },
    cue: { parts: ['core', 'lsu', 'array', 'hit'], mode: 'compare-hit' },
  },

  /* 3 */
  whyItMatters: {
    text: {
      b: 'A hit here takes about 4–5 clock ticks. Going all the way to main memory takes {mem:300 or more ticks}. Most programs reuse nearby data, so L1 answers most loads.',
      i: 'L1 load-to-use is ~4–5 cycles; a DRAM access costs {mem:~300+ cycles} at 4–5 GHz. Thanks to [[locality]], L1 typically serves the large majority of loads. That gap is the memory wall.',
    },
    cue: { parts: ['hit', 'miss', 'l2'], mode: 'amat' },
  },

  /* 4 */
  howItWorks: [
    {
      title: 'Split the address',
      text: {
        b: 'The address is cut into three pieces. The low bits pick the byte inside a chunk. The middle bits pick a row. The high bits are a label to check.',
        i: 'Address = tag | index | offset. With 64 B lines the low 6 bits are the [[offset]]. The [[index]] bits follow; the rest is the [[tag]]. The TLB translates the tag bits in parallel.',
      },
      cue: { parts: ['addr', 'addr-tag', 'addr-index', 'addr-offset', 'tlb'], mode: 'split' },
    },
    {
      title: 'Pick the set',
      text: {
        b: 'The row number goes straight to one row of the cache. Only that row can hold this address, so nothing else needs searching.',
        i: 'The index selects exactly one set. All ways of that set are read at once: tags, valid/dirty bits and data.',
      },
      cue: { parts: ['addr-index', 'array', 'set'], mode: 'index' },
    },
    {
      title: 'Compare tags in parallel',
      text: {
        b: 'Each slot in the row has a stored label. All labels are checked against the address at the same time, not one by one.',
        i: 'One comparator per way checks its stored physical tag against the translated tag. Valid bit and tag must both match. Typical L1Ds have 8–12 ways.',
      },
      cue: { parts: ['tags', 'ways', 'compare'], mode: 'compare-hit' },
    },
    {
      title: 'Hit: return the data',
      text: {
        b: 'If a label matches, that slot has the data. The cache picks the right bytes and hands them to the core.',
        i: 'On a hit the matching way drives the data mux; the offset selects the bytes. The load unit forwards the value to dependent instructions.',
      },
      cue: { parts: ['hit', 'data', 'lsu'], mode: 'compare-hit' },
    },
    {
      title: 'Miss: ask L2',
      text: {
        b: 'If no label matches, the data isn’t here. The cache asks the bigger, slower L2 for the whole 64-byte chunk.',
        i: 'On a miss, a miss-status holding register (MSHR) tracks the request to L2. Later loads to other lines can keep going meanwhile.',
      },
      cue: { parts: ['miss', 'l2'], mode: 'compare-miss' },
    },
    {
      title: 'Fill and evict',
      text: {
        b: 'The new chunk goes into the slot used longest ago. If that old chunk was changed, it is first written back to L2.',
        i: 'The line fills the victim way chosen by (pseudo-)[[LRU]]. L1Ds are usually [[write-back]]: a dirty victim is written to L2 before reuse.',
      },
      cue: { parts: ['fill', 'lru', 'l2', 'ways'], mode: 'fill' },
    },
  ],

  /* 5 */
  analogy: {
    text: 'Like a spice rack within arm’s reach of the stove. You grab what you used recently without walking to the pantry. When the rack is full, the jar you haven’t touched longest goes back.',
    limits: 'Real caches move whole 64-byte chunks, and each item may only sit on its own shelf (set).',
  },

  /* 6 */
  keyNumbers: [
    { label: 'Capacity per core', value: '32–64 KB (Apple P-cores: 128 KB)', scope: DESK },
    { label: 'Associativity', value: '8–12 ways', scope: DESK },
    { label: 'Line size', value: '64 B (Apple silicon reports 128 B)', scope: DESK },
    { label: 'Load-to-use latency', value: '~4–5 cycles', scope: DESK },
    { label: 'Accesses per cycle', value: '~2–3 loads + 1–2 stores', scope: DESK },
    { label: 'Write policy', value: 'write-back, write-allocate (typical)', scope: DESK },
  ],

  /* 7 */
  math: {
    intro: {
      b: 'Three numbers describe the shape: size, slots per row and chunk size. From them you can work out how many rows exist and how the address is split.',
      i: 'Size, associativity and line size fix the number of sets and the tag/index/offset split. AMAT then combines hit time and miss cost.',
    },
    formulas: [
      { tex: '\\text{sets} = \\frac{\\text{size}}{\\text{ways} \\times \\text{line}}', note: '32 KB / (8 × 64 B) = 64 sets' },
      { tex: '\\text{offset bits} = \\log_2(\\text{line})', note: '64 B line → 6 bits' },
      { tex: '\\text{index bits} = \\log_2(\\text{sets})', note: '64 sets → 6 bits' },
      { tex: '\\text{tag bits} = A - \\text{index bits} - \\text{offset bits}', note: 'A = address width; 48 − 6 − 6 = 36' },
      { tex: '\\text{AMAT} = t_{L1} + m_{L1} \\times \\left( t_{L2} + m_{L2} \\times t_{\\text{mem}} \\right)', note: 'm = local miss rate of each level' },
      { tex: '\\text{size}_{L1} \\le \\text{page size} \\times \\text{ways}', note: 'VIPT limit: 4 KB × 12 = 48 KB' },
    ],
    widget: 'cache-sets',
    cue: { parts: ['addr', 'addr-tag', 'addr-index', 'addr-offset', 'set'], mode: 'split' },
  },

  /* 8 */
  tradeoffs: [
    {
      text: {
        b: 'Bigger is slower. A larger cache means longer wires and more to check, so every hit takes a bit longer.',
        i: 'Size vs latency: more capacity lowers the miss rate but lengthens wires and word lines. Designers trade a cycle of hit time for capacity carefully.',
      },
      cue: { parts: ['array'], mode: 'amat' },
    },
    {
      text: {
        b: 'More slots per row means fewer clashes. But every slot is checked on every access, which costs power and time.',
        i: 'Associativity vs power/latency: more ways cut conflict misses, but each lookup reads and compares every way in parallel.',
      },
      cue: { parts: ['ways', 'tags', 'compare'], mode: 'compare-hit' },
    },
    {
      text: {
        b: 'L1 starts looking before the address is fully translated. That only works if the row bits fit inside one memory page, which caps L1 size.',
        i: 'Most L1Ds are VIPT: index and offset must lie in the page offset. So size ≤ page × ways: 4 KB × 8 = 32 KB, × 12 = 48 KB. 16 KB pages allow more.',
      },
      cue: { parts: ['tlb', 'addr-index', 'addr-offset'], mode: 'split' },
    },
  ],

  /* 9 */
  misconceptions: [
    {
      myth: 'L1 cache answers in one clock cycle.',
      reality: 'Modern L1D load-to-use is about 4–5 cycles; out-of-order execution hides much of it.',
    },
    {
      myth: 'The cache stores individual variables.',
      reality: 'It stores whole 64-byte lines. Touching one byte brings in its 63 neighbours too.',
    },
    {
      myth: 'A bigger L1 is always better.',
      reality: 'Bigger L1s are slower and costlier per access. That’s why L2 and L3 exist instead.',
    },
  ],

  /* 10 */
  evolution: [
    { year: '1965', event: 'Maurice Wilkes describes “slave memories”, the idea behind caches.' },
    { year: '1968', event: 'IBM System/360 Model 85 ships the first commercial cache (“buffer storage”).' },
    { year: '1989', event: 'Intel 486 puts an 8 KB unified cache on the processor die.' },
    { year: '1993', event: 'Intel Pentium splits L1 into 8 KB instruction + 8 KB data caches.' },
    { year: '2019–2020', event: 'Intel Sunny Cove grows L1D to 48 KB; Apple M1 P-cores ship 128 KB.' },
  ],

  /* 11 */
  connections: {
    fedBy: ['cpu.lsu', 'cpu.tlb', 'cpu.l2'],
    feeds: ['cpu.lsu', 'cpu.prf', 'cpu.l2'],
    text: {
      b: 'The memory doorway (load/store unit) sends it requests. The address translator helps check labels. Misses go to L2, and changed chunks go back there too.',
      i: 'The LSU issues loads/stores; the TLB supplies the physical tag. Load data returns via the LSU to the register file. Misses and dirty evictions go to L2.',
    },
  },

  /* 12 */
  twin: {
    comp: 'gpu.smem',
    text: {
      b: 'A GPU solves “keep data close” with a scratchpad. On a CPU, hardware decides what stays in L1. On a GPU, the programmer copies data into [[shared memory|shared-memory]] by hand.',
      i: 'CPU L1D is hardware-managed: tags, LRU, invisible to code. GPU [[shared memory|shared-memory]] is software-managed: no tags, explicit tile loads, predictable latency. NVIDIA carves both from one SRAM.',
    },
  },

  /* 13 */
  vendorNames: {
    amd: 'L1 data cache (L1D)',
    intel: 'L1D / DCU (data cache unit)',
    apple: 'L1D (few details published)',
    arm: 'L1 data cache',
  },

  /* 15 */
  course: {
    definition:
      'The L1 data cache is the first level of the memory hierarchy for data: a small, fast SRAM holding blocks. In an n-way set-associative cache, the index field of the address selects one set. The block may be placed in any of that set’s n ways. A hit is detected by comparing the tag field with the tag of every valid way in the set.',
    definitionSource: 'Patterson & Hennessy, Computer Organization and Design',
    worked: {
      q: 'A 64 KB, 4-way set-associative cache has 64 B blocks and 32-bit byte addresses. Find the offset, index and tag of address 0x00012A74.',
      steps: [
        'Blocks = 64 KB / 64 B = 65,536 / 64 = 1,024 blocks.',
        'Sets = 1,024 / 4 ways = 256 sets.',
        'Offset bits = log₂(64) = 6; index bits = log₂(256) = 8; tag bits = 32 − 8 − 6 = 18.',
        '0x00012A74 = 76,404. Offset = 76,404 mod 64 = 52 (0x34).',
        'Block address = ⌊76,404 / 64⌋ = 1,193. Index = 1,193 mod 256 = 169 (0xA9).',
        'Tag = ⌊76,404 / 16,384⌋ = 4 (0x4). Check: 4 × 16,384 + 169 × 64 + 52 = 76,404.',
      ],
      answer: 'Offset 52 (0x34), index 169 (0xA9), tag 4 (0x4); field widths 18 / 8 / 6 bits.',
    },
    practice: [
      {
        q: 'A 32 KB, 8-way L1 data cache has 64 B lines and 48-bit addresses. How many tag, index and offset bits?',
        steps: [
          'Lines = 32,768 / 64 = 512.',
          'Sets = 512 / 8 = 64.',
          'Offset = log₂(64) = 6 bits; index = log₂(64) = 6 bits.',
          'Tag = 48 − 6 − 6 = 36 bits.',
        ],
        answer: 'Tag 36 bits, index 6 bits, offset 6 bits.',
      },
      {
        q: 'L1 hit time is 4 cycles with a 5% miss rate. L2 hit time is 14 cycles with a 20% local miss rate. DRAM costs 300 cycles. What is the AMAT?',
        steps: [
          'L1 miss penalty = L2 hit time + L2 miss rate × DRAM time.',
          '= 14 + 0.20 × 300 = 14 + 60 = 74 cycles.',
          'AMAT = 4 + 0.05 × 74 = 4 + 3.7.',
        ],
        answer: 'AMAT = 7.7 cycles.',
      },
      {
        q: 'A 2-way set-associative cache has 4 sets, 16 B blocks and LRU replacement, and starts empty. Classify each access: 0x000, 0x040, 0x080, 0x000, 0x084, 0x040.',
        steps: [
          'Offset = 4 bits, index = 2 bits (address bits 5–4), tag = address ÷ 64.',
          'Every address here is a multiple of 64 apart, so all map to set 0. Tags: 0, 1, 2, 0, 2, 1.',
          '0x000 tag 0: miss → set 0 = {0}. 0x040 tag 1: miss → {0, 1}, LRU = 0.',
          '0x080 tag 2: miss, evict 0 → {1, 2}, LRU = 1. 0x000 tag 0: miss, evict 1 → {2, 0}, LRU = 2.',
          '0x084 tag 2: hit (same block as 0x080), LRU = 0. 0x040 tag 1: miss, evict 0 → {2, 1}.',
        ],
        answer: 'Miss, miss, miss, miss, hit, miss: 1 hit in 6 (≈17%). The power-of-two stride causes conflict misses in one set.',
      },
    ],
    mistakes: [
      'Computing index bits as log₂(size / block) and forgetting to divide by the number of ways.',
      'Treating 32 KB as 32,000 bytes instead of 32 × 1,024 = 32,768.',
      'Mixing local and global miss rates in a multi-level AMAT, or adding the L1 hit time twice.',
      'Forgetting valid and dirty bits (and tags) when asked for total cache storage in bits.',
    ],
  },

  /* 16 */
  realWorld: {
    inChips: {
      b: 'Fast programs mostly work out of L1. When data doesn’t fit, the core waits for L2 or memory and slows down a lot. Two programs doing the same math can differ several times in speed.',
      i: 'Hot loops whose working set fits in 32–64 KB run near peak; spilling to L2/L3 adds 10–50+ cycles per miss. L1D miss counts are a first-line performance metric.',
    },
    engineer: {
      b: 'Engineers walk through memory in order and work on small blocks that fit in L1. They keep data used together side by side.',
      i: 'Tile loops so blocks fit in L1 and prefer struct-of-arrays for hot fields. Traverse sequentially (row-major in C). Pad power-of-two strides to avoid set conflicts.',
    },
    code: {
      lang: 'c',
      title: 'Row-major vs column-major traversal',
      src: `#define N 4096
static double a[N][N];          // C arrays are row-major

double sum_rows(void) {          // sequential: one 64 B line
  double s = 0;                  // serves 8 doubles
  for (int i = 0; i < N; i++)
    for (int j = 0; j < N; j++)
      s += a[i][j];
  return s;
}

double sum_cols(void) {          // stride of N * 8 = 32 KB:
  double s = 0;                  // a new line every access, and
  for (int j = 0; j < N; j++)    // all rows map to the same set
    for (int i = 0; i < N; i++)
      s += a[i][j];
  return s;
}`,
    },
    measure: [
      { tool: 'Linux perf', how: '`perf stat -e L1-dcache-loads,L1-dcache-load-misses ./app`. These are generic events; check `perf list` for how your CPU maps them.' },
      { tool: 'Intel VTune Profiler', how: 'Run the Memory Access analysis (`vtune -collect memory-access -- ./app`) and look at L1-bound stalls per function.' },
      { tool: 'AMD uProf', how: 'Use the “Investigate Data Access” CPU profile to see L1 data cache miss rates per function on AMD CPUs.' },
      { tool: 'Valgrind Cachegrind', how: '`valgrind --tool=cachegrind --cache-sim=yes ./app` simulates L1/LL misses per source line; view with `cg_annotate`.' },
    ],
  },

  /* 17 */
  learnMore: {
    lessons: ['m-cache', 'm-miss', 'm-write', 'm-prefetch', 'm-wall', 'm-vm'],
    sandbox: '#/lab/cache',
    sources: [
      { title: 'Patterson & Hennessy, Computer Organization and Design RISC-V Edition, 2nd ed., ch. 5', year: 2020 },
      { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., ch. 2 & App. B', year: 2017 },
      { title: 'Intel 64 and IA-32 Architectures Optimization Reference Manual', year: 2023 },
      { title: 'AMD Software Optimization Guide for the AMD Zen4 Microarchitecture', year: 2023 },
    ],
  },

  seeInRealChips: [
    { arch: 'zen4-7950x', text: 'Zen 4: 32 KB, 8-way L1D per core with ~4-cycle load-to-use.' },
    { arch: 'intel-alder-lake', text: 'Golden Cove P-cores: 48 KB, 12-way L1D at ~5 cycles; Gracemont E-cores: 32 KB.' },
    { arch: 'apple-m', text: 'Apple P-cores: 128 KB L1D, helped by 16 KB pages; Apple publishes few other details.' },
  ],

  extra: [
    {
      title: 'Hardware prefetchers',
      text: {
        b: 'Small helpers watch the pattern of your loads. If you walk through memory in steps, a [[prefetcher]] fetches the next chunks before you ask. Random jumps, like following pointers, can’t be predicted.',
        i: 'L1D usually has simple prefetchers: next-line and per-instruction (IP) stride detectors; Intel documents both. They hide L2 latency for streams. Pointer chasing defeats them, and over-eager prefetches pollute L1.',
      },
      cue: { parts: ['prefetch', 'l2', 'fill'], mode: 'prefetch' },
      after: 'howItWorks',
    },
  ],
};
