import type { Dossier } from './types';

/**
 * CPU core: one core of a generic, vendor-neutral, modern out-of-order superscalar CPU.
 * Numbers are typical ranges for desktop/laptop CPUs of the 2020s, never one chip's spec.
 */
export const dossier: Dossier = {
  id: 'cpu.core',
  title: 'CPU core',
  figure: 'core',

  /* 1 */
  oneLine: {
    text: {
      b: 'A CPU core is the part of the chip that reads your program’s instructions and carries them out, one after another as far as you can tell.',
      i: 'An out-of-order [[superscalar]] core fetches, decodes and renames several instructions per cycle, executes them as operands become ready, and retires them in program order.',
    },
    cue: { mode: 'flow' },
  },

  /* 2 */
  whatItDoes: {
    text: {
      b: 'In: a stream of instructions and data from the caches. Out: results written to registers and memory. Inside, an instruction is fetched, decoded (worked out), renamed, scheduled, executed and finally retired (made official). Many instructions are in different steps at the same time.',
      i: 'In: instruction bytes from L1I and operands from registers and L1D. Out: architectural register and memory state. Pipeline: fetch → decode into [[µops|micro-op]] → rename → schedule → execute → retire. Hundreds of µops can be in flight at once.',
    },
    cue: { parts: ['fetch', 'decode', 'rename', 'sched', 'alu', 'retire'], mode: 'flow' },
  },

  /* 3 */
  whyItMatters: {
    text: {
      b: 'Much everyday software still waits on one thread, so one core’s speed decides how snappy it feels. A trip to main memory takes about 300+ clock ticks. A big core keeps a list of a few hundred instructions, so it can keep doing other useful work while it waits.',
      i: 'Single-thread performance still bounds much real software (Amdahl’s law). A DRAM miss costs roughly 300+ cycles at 4–5 GHz. A ~200–600-entry ROB lets the core keep finding independent work for much of that time instead of stalling.',
    },
    cue: { parts: ['rob', 'lsu', 'l2'], mode: 'stall' },
  },

  /* 4 */
  howItWorks: [
    {
      title: 'Fetch and branch prediction',
      text: {
        b: 'The core grabs the next chunk of instructions from the instruction cache. Programs are full of “if”s, so a predictor guesses which way each one goes. Fetch follows the guess without waiting.',
        i: 'Each cycle the fetch unit reads an aligned block from L1I at the predicted PC. The branch predictor supplies direction and target (BTB, return-address stack). Exact predictor designs are mostly not published by vendors.',
      },
      cue: { parts: ['bpred', 'l1i', 'fetch'], mode: 'predict' },
    },
    {
      title: 'Decode and the µop cache',
      text: {
        b: 'The decoder works out what each instruction means and splits big ones into small internal steps. Recently decoded steps are kept in a small cache, so hot loops skip decoding.',
        i: 'Decoders translate 4–8 instructions per cycle into µops (x86 needs length decoding first). A decoded-µop cache supplies hot code at higher bandwidth and lower power than the legacy decoders.',
      },
      cue: { parts: ['decode', 'uopcache'], mode: 'wide' },
    },
    {
      title: 'Register renaming',
      text: {
        b: 'Programs reuse a few register names over and over. The core gives every new result its own hidden slot, so instructions that merely reuse a name don’t wait for each other.',
        i: '[[register renaming|rename]] maps architectural registers onto a larger physical register file via a rename table. This removes WAR and WAW (false) dependences; only true RAW dependences remain.',
      },
      cue: { parts: ['rename', 'prf'], mode: 'flow' },
    },
    {
      title: 'Reorder buffer and out-of-order issue',
      text: {
        b: 'Every instruction gets a numbered place in a long queue that remembers the original order. Waiting areas hold instructions until their inputs are ready. Then any ready one may go, even if an older one is still stuck.',
        i: 'Each µop gets a ROB entry (program order) and a scheduler / reservation-station slot. Schedulers wake µops when source operands are produced and pick the oldest ready ones each cycle: dataflow order, not program order.',
      },
      cue: { parts: ['rob', 'sched'], mode: 'ooo' },
    },
    {
      title: 'Execute',
      text: {
        b: 'Ready instructions run on several kinds of workers at once: integer math units, decimal-number and vector units, and load/store units that talk to the data cache.',
        i: 'Issue ports feed integer ALUs (typically 3–6), FP/[[SIMD]] pipes and load/store units backed by L1D. Results are bypassed (forwarded) straight to waiting µops and written to the PRF.',
      },
      cue: { parts: ['alu', 'fpsimd', 'lsu', 'l1d'], mode: 'flow' },
    },
    {
      title: 'Retire, or flush on a wrong guess',
      text: {
        b: 'Finished instructions are made official strictly in the original order. If a branch guess turns out wrong, everything after it is thrown away and fetch restarts on the right path.',
        i: 'The ROB head retires completed µops in order, updating architectural state. A mispredicted branch squashes all younger µops and redirects fetch; the refill costs roughly 10–20 cycles.',
      },
      cue: { parts: ['retire', 'rob', 'bpred', 'fetch'], mode: 'mispredict' },
    },
  ],

  /* 5 */
  analogy: {
    text: 'A busy restaurant kitchen. Orders arrive in sequence and each gets a ticket number. Cooks start any dish whose ingredients are ready, not just the oldest order. The pass hands dishes to guests strictly in ticket order. A host guesses the next orders so cooks never stand idle; a wrong guess means those dishes go in the bin.',
    limits: 'Real instructions often depend on each other’s results, unlike most dishes. The core does this billions of times per second with no judgment, only fixed rules. And thrown-away work must leave no trace: stores to memory are held back until they retire.',
  },

  /* 6 */
  keyNumbers: [
    { label: 'Clock frequency', value: '~3–6 GHz (boost; laptop base clocks lower)', scope: 'desktop/laptop CPUs, 2020s' },
    { label: 'Decode / rename width', value: '~4–8 instructions per cycle', scope: 'desktop/laptop CPUs, 2020s' },
    { label: 'Reorder buffer (ROB)', value: '~200–600+ entries', scope: 'desktop/laptop CPUs, 2020s (big cores)' },
    { label: 'Integer ALUs', value: '~3–6 per core', scope: 'desktop/laptop CPUs, 2020s' },
    { label: 'IPC', value: 'peak ~4–8; real code often approx. 1–3', scope: 'desktop/laptop CPUs, 2020s' },
    { label: 'Branch mispredict penalty', value: '~10–20 cycles', scope: 'desktop/laptop CPUs, 2020s' },
    { label: 'Cores per chip', value: '~4–24+', scope: 'desktop/laptop CPUs, 2020s' },
  ],

  /* 7 */
  math: {
    intro: {
      b: 'How long a program takes depends on three things: how many instructions it runs, how many clock ticks each takes on average, and how long one tick is.',
      i: 'The “iron law” of performance factors CPU time into instruction count, [[CPI]] and clock period. IPC is its inverse; Little’s law sizes the out-of-order window.',
    },
    formulas: [
      {
        tex: '\\text{CPU time} = \\text{IC} \\times \\text{CPI} \\times T_{\\text{clk}} = \\dfrac{\\text{IC} \\times \\text{CPI}}{f}',
        note: 'IC = instruction count; T_clk = 1/f (0.25 ns at 4 GHz).',
      },
      {
        tex: '\\text{IPC} = \\dfrac{1}{\\text{CPI}}',
        note: 'IPC 2.5 ⇔ CPI 0.4.',
      },
      {
        tex: '\\text{CPI} = \\sum_{i} \\text{CPI}_i \\cdot \\dfrac{\\text{IC}_i}{\\text{IC}}',
        note: 'Average CPI is weighted by each instruction class’s share of the instruction count.',
      },
      {
        tex: '\\text{instructions in flight} \\approx \\text{IPC} \\times \\text{latency (cycles)}',
        note: 'Little’s law: hiding a 300-cycle miss at IPC 2 needs ~600 instructions in the window.',
      },
      {
        tex: '\\text{Speedup} = \\dfrac{1}{(1 - p) + p / n}',
        note: 'Amdahl’s law: p = parallel fraction, n = cores (or threads). The serial part still runs on one core.',
      },
    ],
    widget: 'core-time',
    cue: { parts: ['fetch', 'decode', 'rename', 'retire'], mode: 'wide' },
  },

  /* 8 */
  tradeoffs: [
    {
      text: {
        b: 'A wider core can start more instructions per tick, but every extra lane needs more wires and checks. Cost and power grow faster than the speed gained.',
        i: 'Width scales poorly: rename and wakeup/select logic and bypass networks grow roughly quadratically with width. Real code rarely has enough ILP to fill 8 lanes, so returns diminish (Pollack’s rule: performance ~ √area).',
      },
      cue: { parts: ['decode', 'rename', 'sched'], mode: 'wide' },
    },
    {
      text: {
        b: 'Splitting the work into more, shorter steps allows a faster clock. But a wrong branch guess then throws away more half-done work.',
        i: 'Deeper pipelines raise frequency but lengthen the mispredict penalty and increase latch overhead and power. The Pentium 4 era showed the limit; today’s cores balance depth against prediction accuracy.',
      },
      cue: { parts: ['bpred', 'fetch', 'rob'], mode: 'mispredict' },
    },
    {
      text: {
        b: 'A huge waiting list helps hide slow memory, but it costs energy on every instruction. That’s why many chips mix big fast cores with small efficient ones.',
        i: 'A large ROB, scheduler and PRF burn energy per µop even when there is little to hide. Hybrid designs pair big P-cores with smaller E-cores that give more throughput per mm² and per watt on parallel or background work.',
      },
      cue: { parts: ['rob', 'sched', 'prf'], mode: 'stall' },
    },
  ],

  /* 9 */
  misconceptions: [
    {
      myth: 'Higher GHz means a faster CPU.',
      reality: 'CPU time = IC × CPI ÷ f. A 5 GHz core with CPI 1.5 is slower than a 4 GHz core with CPI 1.0 on the same program.',
    },
    {
      myth: 'A 6-wide core runs 6 instructions every cycle.',
      reality: 'Width is a peak. Dependences, cache misses and mispredictions keep real IPC often around 1–3.',
    },
    {
      myth: 'More cores always make programs faster.',
      reality: 'Only the parallel part speeds up (Amdahl’s law), and only if the software uses threads. Single-threaded code runs on one core.',
    },
  ],

  /* 10 */
  evolution: [
    { year: '1964', event: 'CDC 6600 uses a scoreboard to issue instructions to multiple functional units and let them complete out of order.' },
    { year: '1967', event: 'IBM System/360 Model 91 floating-point unit uses Tomasulo’s algorithm: reservation stations and register tags (an early form of renaming).' },
    { year: '1995', event: 'Intel Pentium Pro (P6) brings out-of-order execution with a reorder buffer to x86, translating instructions into µops.' },
    { year: '2002', event: 'Intel ships Hyper-Threading (2-way SMT) on Xeon and Pentium 4.' },
    { year: '~2005', event: 'Dennard scaling ends: clocks stop rising quickly and vendors turn to multicore and wider, smarter cores.' },
  ],

  /* 11 */
  connections: {
    fedBy: ['cpu.l1i', 'cpu.l2', 'cpu.tlb'],
    feeds: ['cpu.l1d', 'cpu.l3', 'cpu.interconnect'],
    text: {
      b: 'Instructions arrive from the instruction cache, refilled from L2. Data goes in and out through the data cache; misses travel on to L2, the shared L3 and beyond.',
      i: 'Fetch reads L1I (refilled from L2); the TLBs translate addresses. Loads and stores go through the LSU to L1D, with misses to private L2, then shared L3 over the on-chip interconnect.',
    },
  },

  /* 12 */
  twin: {
    comp: 'gpu.cu',
    text: {
      b: 'A CPU core is built to finish one task as quickly as possible, guessing ahead and reordering work. A GPU compute unit instead holds many groups of threads and simply switches to another group whenever one is waiting for memory.',
      i: 'The CPU core is latency-oriented: branch prediction, a large OoO window and big caches minimise the time of one thread. A GPU compute unit is throughput-oriented: it keeps dozens of warps resident and hides latency by issuing from another warp each cycle, with simple in-order pipelines.',
    },
  },

  /* 13 */
  vendorNames: {
    amd: 'Zen core (e.g. Zen 4, Zen 5); compact “c” variants (Zen 4c)',
    intel: 'P-core (e.g. Golden Cove, Raptor Cove) and E-core (e.g. Gracemont)',
    apple: 'Performance cores (P-cores) and efficiency cores (E-cores)',
    arm: 'Cortex-X (biggest), Cortex-A7xx (big), Cortex-A5xx (little)',
  },

  /* 15 */
  course: {
    definition: 'A processor (core) consists of a datapath and control. A dynamically scheduled superscalar core issues multiple instructions per clock cycle, executes each when its operands are available, and commits (retires) them in program order using a reorder buffer, with register renaming to remove name dependences.',
    definitionSource: 'Terminology after Hennessy & Patterson, Computer Architecture: A Quantitative Approach, ch. 3, and Patterson & Hennessy, Computer Organization and Design (“commit” = retire).',
    worked: {
      q: 'A program executes 2 × 10⁹ instructions with an average CPI of 1.5 on a 4 GHz core. What is the CPU time, and what is the IPC?',
      steps: [
        'Clock period: T = 1 / f = 1 / (4 × 10⁹ Hz) = 0.25 ns.',
        'Total cycles: IC × CPI = 2 × 10⁹ × 1.5 = 3 × 10⁹ cycles.',
        'CPU time: 3 × 10⁹ cycles × 0.25 × 10⁻⁹ s = 0.75 s.',
        'IPC = 1 / CPI = 1 / 1.5 ≈ 0.67.',
      ],
      answer: 'CPU time = 0.75 s; IPC ≈ 0.67.',
    },
    practice: [
      {
        q: 'Design A runs at 3 GHz with CPI 1.2. Design B runs at 4 GHz with CPI 1.8. Both run the same program of 10⁹ instructions. Which is faster, and by how much?',
        steps: [
          'Time A = IC × CPI / f = 10⁹ × 1.2 / (3 × 10⁹) = 0.40 s.',
          'Time B = 10⁹ × 1.8 / (4 × 10⁹) = 0.45 s.',
          'Speedup of A over B = 0.45 / 0.40 = 1.125.',
        ],
        answer: 'Design A is faster despite the lower clock: about 1.125× (12.5%).',
      },
      {
        q: 'A core has CPI 2.0 at 3 GHz. Option 1 lowers CPI to 1.6 at the same clock. Option 2 deepens the pipeline to reach 3.6 GHz, but CPI rises to 2.2 (bigger mispredict penalty). IC is unchanged. Which option gives the larger speedup?',
        steps: [
          'With IC fixed, time ∝ CPI / f.',
          'Baseline: 2.0 / 3 = 0.667 (ns per instruction).',
          'Option 1: 1.6 / 3 = 0.533 → speedup = 0.667 / 0.533 = 2.0 / 1.6 = 1.25.',
          'Option 2: 2.2 / 3.6 = 0.611 → speedup = (2.0 × 3.6) / (3 × 2.2) = 7.2 / 6.6 ≈ 1.09.',
        ],
        answer: 'Option 1 (lower CPI): 1.25× vs ≈ 1.09× for the higher clock.',
      },
      {
        q: 'A load at the head of the ROB misses to DRAM and takes 300 cycles. The core otherwise sustains IPC 2. (a) How many instructions must be in flight to hide the miss completely? (b) With a 320-entry ROB, roughly how long does the core stall?',
        steps: [
          'Little’s law: in flight ≈ IPC × latency = 2 × 300 = 600 instructions.',
          'The ROB fills after about 320 / 2 = 160 cycles of renaming new instructions.',
          'The load cannot retire until cycle 300, so the core stalls for about 300 − 160 = 140 cycles.',
        ],
        answer: '(a) ≈ 600 instructions; (b) the 320-entry ROB fills after ≈ 160 cycles, leaving ≈ 140 stall cycles.',
      },
    ],
    mistakes: [
      'Mixing up CPI and IPC: CPI 0.5 means IPC 2, not 0.5.',
      'Using GHz as a period: at 4 GHz, T = 0.25 ns, so divide by f (or multiply by T), never multiply by f.',
      'Averaging CPIs without weighting by each instruction class’s fraction of the instruction count.',
      'Assuming IC is fixed across ISAs or compilers: a different ISA or compiler changes IC, so compare total time, not CPI or clock alone.',
    ],
  },

  /* 16 */
  realWorld: {
    inChips: {
      b: 'Every modern laptop, desktop, phone and server CPU uses cores like this. They differ mainly in how wide they are, how many instructions they can juggle, and whether they mix big and small cores.',
      i: 'All mainstream application cores (x86 and Arm) are out-of-order superscalar designs. They differ in width, window size (ROB, schedulers, PRF), µop-cache size and predictor quality. Hybrid P-core/E-core chips are now common.',
    },
    engineer: {
      b: 'To help the core: avoid unpredictable “if”s in hot loops, avoid long chains where each step waits for the last, use vector instructions for bulk math, and measure before guessing.',
      i: 'Make hot branches predictable or branchless (cmov, masks); break long dependency chains (multiple accumulators); vectorise with [[SIMD]]; keep the working set cache-friendly. Profile top-down: is the core front-end bound, back-end bound or losing slots to bad speculation?',
    },
    code: {
      lang: 'c',
      title: 'Branchy vs branchless sum (compilers may already emit cmov or vectorise; check the asm)',
      src: `// Branchy: on random data the if is mispredicted ~50% of the time.
long sum_branchy(const int *a, size_t n) {
    long s = 0;
    for (size_t i = 0; i < n; i++)
        if (a[i] >= 128) s += a[i];
    return s;
}

// Branchless: the condition becomes data (a mask), not control flow.
long sum_branchless(const int *a, size_t n) {
    long s = 0;
    for (size_t i = 0; i < n; i++) {
        int m = -(a[i] >= 128);   // all ones if true, 0 if false
        s += a[i] & m;
    }
    return s;
}`,
    },
    measure: [
      {
        tool: 'perf stat (Linux)',
        how: '`perf stat -e cycles,instructions,branch-misses ./app` reports instructions ÷ cycles as “insn per cycle” (IPC). On recent Intel CPUs `perf stat --topdown` gives the top-level slot breakdown.',
      },
      {
        tool: 'Intel VTune Profiler',
        how: 'Microarchitecture Exploration applies Top-down Microarchitecture Analysis (TMA): pipeline slots split into Retiring, Bad Speculation, Front-End Bound and Back-End Bound, then drill down.',
      },
      {
        tool: 'AMD uProf',
        how: 'Samples hardware performance counters on AMD Zen cores (cycles, retired instructions, branch mispredicts, cache misses) to find low-IPC hot spots.',
      },
    ],
  },

  /* 17 */
  learnMore: {
    lessons: ['c-fde', 'c-pipe', 'c-hazards', 'c-bpred', 'c-ooo', 'c-smt', 's-power', 's-multicore'],
    sources: [
      { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed. (ch. 3: instruction-level parallelism)', year: 2017 },
      { title: 'Patterson & Hennessy, Computer Organization and Design: The Hardware/Software Interface, RISC-V edition (ch. 1 and 4)', year: 2017 },
      { title: 'R. M. Tomasulo, “An Efficient Algorithm for Exploiting Multiple Arithmetic Units”, IBM Journal of Research and Development', year: 1967 },
      { title: 'A. Yasin, “A Top-Down Method for Performance Analysis and Counters Architecture”, ISPASS', year: 2014 },
    ],
  },

  seeInRealChips: [
    { arch: 'zen4-7950x', text: '16 Zen 4 cores, each with 2-way SMT, a µop cache and a 320-entry ROB.' },
    { arch: 'intel-alder-lake', text: 'Hybrid: Golden Cove P-cores (6-wide decode, 512-entry ROB, SMT) beside smaller Gracemont E-cores without SMT.' },
    { arch: 'apple-m', text: 'Very wide P-cores (8-wide decode) without SMT, plus E-cores. Apple doesn’t publish ROB size; third-party measurements suggest 600+ entries.' },
  ],

  extra: [
    {
      title: 'Simultaneous multithreading (SMT)',
      after: 'howItWorks',
      text: {
        b: 'With [[SMT]], one core runs two programs (threads) at once. They share the workers, so when one thread is stuck waiting, the other can use the idle parts. It typically adds tens of percent of throughput, not double, and each thread may run a bit slower.',
        i: 'SMT keeps per-thread architectural state (PC, rename tables) and shares or partitions the ROB, schedulers, caches and execution units. It fills issue slots left idle by stalls; typical throughput gains are tens of percent and workload-dependent. Most x86 cores have 2-way SMT; Apple cores and Intel E-cores have none.',
      },
      cue: { parts: ['thread2', 'fetch', 'rob', 'sched', 'alu'], mode: 'smt' },
    },
    {
      title: 'Retirement',
      after: 'howItWorks',
      text: {
        b: 'Retirement is the moment an instruction becomes official. It happens strictly in program order, so if something goes wrong, the program sees a clean stopping point. Stores only reach memory after their instruction retires.',
        i: 'The ROB head retires up to N completed µops per cycle, freeing old physical registers and releasing stores to commit from the store buffer. In-order retirement gives precise exceptions and makes misspeculation invisible to architectural state (though not to microarchitectural side channels like caches).',
      },
      cue: { parts: ['rob', 'retire', 'prf'], mode: 'retire' },
    },
  ],
};
