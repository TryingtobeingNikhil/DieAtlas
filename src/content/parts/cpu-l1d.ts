import type { PartPage } from './types';

export const page: PartPage = {
  id: 'cpu.l1d',
  figure: 'cache',

  what: 'The L1 data [[cache]] is a tiny, very fast memory inside each CPU core. It keeps copies of the data the core used most recently, so the core rarely has to wait for main memory.',

  does: {
    text: 'Every time a program reads or writes a variable, the core’s ((load/store unit|lsu)), the part that handles memory reads and writes, sends the address to the L1 first. If the L1 holds a copy (a [[hit]]), the value is back in about 4–5 [[cycles|cycle]]. If not (a [[miss]]), the L1 asks the larger, slower ((L2 cache|l2)) and keeps a copy for next time.',
    cue: { mode: 'lookup' },
  },

  why: [
    'A CPU core can finish an addition in a fraction of a nanosecond, but fetching a value from main memory takes around 80–100 nanoseconds, hundreds of times longer. If the core went to memory for every value, it would spend almost all its time waiting.',
    'The L1 data cache is a tiny, very fast memory built right next to the core that keeps copies of the data the core used recently. Because programs tend to reuse the same data and touch neighbouring data soon after ([[locality]]), the L1 already holds what the core needs most of the time, and it answers in about 4–5 cycles instead of hundreds.',
  ],

  how: [
    {
      title: 'Split the address',
      text: 'The cache stores data in 64-byte blocks called [[cache lines|cache-line]]. Our example L1 holds 32 KB: 512 lines, arranged as 64 [[sets|set]] of 8 [[ways|way]]. The address `0x1A2C` splits into three fields. The low 6 bits are the **offset** (byte 44 of the line), the next 6 bits the **index** (set 40), and the rest the [[tag]] (1).',
      cue: { parts: ['addr', 'addr-tag', 'addr-index', 'addr-offset'], mode: 'split' },
    },
    {
      title: 'Go straight to one set',
      text: 'The index picks exactly one row: ((set 40|set)). The data can only be in one of that set’s 8 ways, so the cache never has to search all 512 lines.',
      cue: { parts: ['addr-index', 'set'], mode: 'index' },
    },
    {
      title: 'Compare the tags',
      text: 'Each way stores the tag of the line it holds. All 8 ((tags|tags)) in set 40 are compared with the address’s tag at once, by 8 ((comparators|compare)). A match is a hit: the offset picks out the requested bytes, and they go back to the core.',
      cue: { parts: ['tags', 'compare', 'hit'], mode: 'compare' },
    },
    {
      title: 'On a miss, fetch the whole line',
      text: 'With no match, the L1 asks the ((L2|l2)). The whole 64-byte line comes back, because the program will probably use the neighbouring bytes soon. To make room, the L1 evicts one of set 40’s ways, usually the least recently used ([[LRU|lru]]).',
      cue: { parts: ['miss', 'l2', 'fill', 'lru'], mode: 'miss' },
    },
  ],

  numbersScope: 'typical desktop and laptop CPU cores, 2020s',
  numbers: [
    { value: '32–64 KB per core', meaning: 'Small on purpose, so it can sit beside the core and answer in a few cycles. (Apple’s big cores use 128 KB.)' },
    { value: '~4–5 cycles per hit', meaning: 'About 1 ns at 4–5 GHz: roughly 100 times faster than main memory.' },
    { value: '64-byte lines', meaning: 'Every transfer moves a whole line, so neighbouring data arrives for free.' },
    { value: '8–12 ways', meaning: 'Room for that many lines per set, so two busy addresses rarely push each other out.' },
  ],

  check: [
    {
      q: 'A 32 KB, 8-way L1 data cache uses 64-byte lines. How many sets does it have?',
      options: ['8', '64', '512', '4,096'],
      answer: 1,
      why: '32 KB ÷ 64 B = 512 lines, and 512 lines ÷ 8 ways = 64 sets. That is why the index field is 6 bits wide (2⁶ = 64).',
    },
    {
      q: 'A program reads `a[0]`, then `a[1]` (4-byte integers, array starting at a line boundary). Why is the second read almost certainly a hit?',
      options: [
        'The cache predicted the program would read it',
        'The miss on a[0] brought in the whole 64-byte line, which also holds a[1]',
        'The compiler copied a[1] into a register',
        'The L1 keeps every array the program uses',
      ],
      answer: 1,
      why: 'Caches move whole lines. a[0] to a[15] share one 64-byte line, so one miss fetches all 16 values. This is spatial [[locality]] at work.',
    },
  ],
  realWorld: 'This is why looping over an array in order is fast while following a linked list around memory is slow: in-order access uses every byte of each line it fetches. On Linux, `perf stat -e L1-dcache-load-misses` counts L1 misses for any program.',

  example: { label: 'Address 0x1A2C split into tag 1, index 40, offset 44 (32 KB, 8-way, 64 B lines)', mustContain: '0x1A2C' },

  deeper: {
    mechanism: [
      {
        title: 'Looking up while translating',
        text: 'Programs use virtual addresses, and the [[TLB|tlb]] must translate them before the tag can be checked. To save time, the L1 reads the set using the index *while* the TLB works. That only works if the index and offset bits sit inside the 4 KB page offset, which never changes during translation. Here they take 12 bits, exactly 4 KB. So L1 size is tied to associativity: 4 KB × 8 ways = 32 KB, and 4 KB × 12 ways = 48 KB.',
        cue: { parts: ['addr-index', 'addr-offset'] },
      },
      {
        title: 'Writes',
        text: 'Most L1 data caches are [[write-back]]: a store changes only the L1 copy and marks the line *dirty*. The line goes to L2 only when it is evicted, so repeated writes to one variable cost no extra traffic. Stores first wait in a [[store buffer|store-buffer]], so even a store that misses doesn’t stall the core.',
      },
      {
        title: 'Several accesses per cycle, many misses in flight',
        text: 'A modern L1 serves 2–3 loads and 1–2 stores every cycle, using multiple ports or banks. A miss doesn’t block the cache either. Small trackers called miss status holding registers (MSHRs) remember each outstanding miss, so the core keeps working and can have many misses on their way at once.',
      },
    ],
    formula: {
      tex: '\\text{AMAT} = t_{\\text{hit}} + m \\times t_{\\text{miss}}',
      where: '[[AMAT|amat]] is the average memory access time; t_hit is the L1 hit time, m the L1 [[miss rate|miss-rate]], t_miss the extra time a miss costs (here, an L2 hit).',
    },
    worked: {
      q: 'An L1 hits in 4 cycles and misses 5% of the time; a miss is served by the L2 in 14 more cycles. What is the AMAT? What if the miss rate doubles?',
      steps: [
        'AMAT = 4 + 0.05 × 14 = 4 + 0.7 = 4.7 cycles.',
        'At a 10% miss rate: 4 + 0.10 × 14 = 5.4 cycles.',
        '5.4 ÷ 4.7 ≈ 1.15: every memory access got about 15% slower.',
      ],
      answer: '4.7 cycles; 5.4 cycles at twice the miss rate (~15% slower).',
    },
    choices: [
      { title: 'Size vs speed', text: 'A bigger L1 misses less, but its wires are longer and it needs more cycles per hit. Because every load pays the hit time, designers keep the L1 small and let the L2 and L3 grow. L1s have stayed at 32–64 KB for over a decade while L3s grew to tens of MB.' },
      { title: 'Ways vs energy', text: 'More ways mean fewer conflict misses, but every lookup compares more tags and reads more data, which costs energy on every access. With the translate-in-parallel trick above, more ways is also the main way to grow the cache.' },
      { title: 'Line size', text: '64 bytes balances two costs. Longer lines bring more useful neighbours on sequential code. They also waste bandwidth and space when a program only touches a few bytes per line.' },
    ],
  },

  connected: [
    { id: 'cpu.lsu', why: 'Every load and store reaches the L1 through the load/store unit.' },
    { id: 'cpu.l2', why: 'Where L1 misses go next: bigger and slower, still private to the core.' },
    { id: 'cpu.tlb', why: 'Translates the address in parallel with the L1 lookup.' },
  ],
  lesson: 'm-cache',
  sources: [
    { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., ch. 2 and App. B', year: 2017 },
    { title: 'Patterson & Hennessy, Computer Organization and Design, RISC-V ed., ch. 5', year: 2020 },
    { title: 'AMD, Software Optimization Guide for the AMD Zen 4 Microarchitecture (L1D 32 KB, 8-way)', year: 2023 },
    { title: 'Intel 64 and IA-32 Architectures Optimization Reference Manual (Golden Cove L1D 48 KB, 12-way)', year: 2023 },
  ],
};
