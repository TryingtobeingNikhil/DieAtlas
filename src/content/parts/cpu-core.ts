import type { PartPage } from './types';

export const page: PartPage = {
  id: 'cpu.core',
  figure: 'core',

  what: 'A CPU core is one complete processor: it reads a program’s instructions and carries them out. A desktop chip typically has 6–24 cores, and each can run its own program at the same time.',

  does: {
    text: 'A core runs one loop over and over. It ((fetches|bpred,l1i,fetch)) the next instructions, ((decodes|decode)) them, ((executes|alu,fpsimd,lsu)) them, and ((records the results|rob,retire)). A modern core overlaps all of these steps and keeps hundreds of instructions in flight, so in a good cycle it finishes several at once.',
    cue: { mode: 'flow' },
  },

  why: [
    'Programs are long lists of small steps, and most depend on earlier ones. A simple core that ran one instruction at a time would finish at most one per [[cycle]]. It would also sit idle whenever it waited for memory: a load that misses every cache costs around 300–400 cycles.',
    'A modern core starts several instructions each cycle, and while one waits, it runs later instructions that don’t depend on it. That is how it reaches 1–3 instructions per cycle ([[IPC|ipc]]) on real programs, while the program still seems to run one step at a time.',
  ],

  how: [
    {
      title: 'Fetch, and guess the branches',
      text: 'The front end reads a block of instructions from the ((L1 instruction cache|l1i)) every cycle. Programs branch every few instructions, so instead of waiting to learn which way each branch goes, the ((branch predictor|bpred)) guesses from that branch’s history. It is right well over 90% of the time.',
      cue: { parts: ['bpred', 'l1i', 'fetch'], mode: 'predict' },
    },
    {
      title: 'Decode into micro-ops',
      text: '((Decode|decode)) turns each instruction into one or more simple internal steps called [[µops|micro-op]]. Most instructions become one µop. A complex x86 instruction such as `add [mem], rax` (load, add, store) becomes several.',
      cue: { parts: ['decode'], mode: 'flow' },
    },
    {
      title: 'Rename the registers',
      text: 'Programs reuse a few register names (16 integer [[registers|register]] in x86-64) for unrelated values. ((Rename|rename)) gives every new result its own physical register, so instructions that merely share a name stop waiting for each other. Only real dependencies remain.',
      cue: { parts: ['rename', 'prf'], mode: 'flow' },
    },
    {
      title: 'Run whatever is ready',
      text: 'Take `load r1 ← [a]`, `add r2 ← r1 + 4`, `mul r3 ← r4 × r5`, `add r6 ← r3 + 1`. The load misses the cache, so the first add must wait for r1. The mul and the second add don’t need r1, so the ((schedulers|sched)) send them to the ((execution units|alu,fpsimd)) first. This is [[out-of-order execution|out-of-order]].',
      cue: { parts: ['sched', 'alu', 'fpsimd', 'lsu'], mode: 'ooo' },
    },
    {
      title: 'Retire in program order',
      text: 'Every µop waits in the ((reorder buffer|rob)) in program order, and ((retires|retire)) (becomes official) only when everything before it has finished. If a branch guess was wrong, everything after it is thrown away and fetching restarts on the right path.',
      cue: { parts: ['rob', 'retire'], mode: 'retire' },
    },
  ],

  numbersScope: 'typical desktop and laptop CPU cores, 2020s',
  numbers: [
    { value: '4–10 instructions decoded per cycle', meaning: 'How wide the core is: the most it can start each cycle.' },
    { value: '~250–600 µops in flight', meaning: 'The reorder buffer size: how far ahead the core can work past a stalled load.' },
    { value: '~3–6 GHz clock', meaning: 'One cycle lasts about 0.17–0.33 ns.' },
    { value: '~10–20 cycles per wrong guess', meaning: 'What a mispredicted branch costs: the work after it is thrown away.' },
  ],

  check: [
    {
      q: 'In the example, why can `mul r3 ← r4 × r5` run before `add r2 ← r1 + 4`, which comes earlier in the program?',
      options: [
        'The core always runs multiplications first',
        'The mul doesn’t need the load’s result, so it is ready while the add waits',
        'The compiler swapped the two instructions',
        'Renaming made the add finish sooner',
      ],
      answer: 1,
      why: 'The add needs r1, which is stuck behind a cache miss. The mul only needs r4 and r5, which are ready, so the scheduler issues it right away. The reorder buffer still retires them in program order.',
    },
    {
      q: 'A core can start 4 instructions per cycle at 5 GHz. What is the most it could ever finish per second?',
      options: ['4 billion', '5 billion', '20 billion', '1.25 billion'],
      answer: 2,
      why: '4 × 5 × 10⁹ = 2 × 10¹⁰, or 20 billion. Real programs get far less, because of dependencies, cache misses and wrong branch guesses.',
    },
  ],
  realWorld: 'Compilers and programmers help the core by keeping independent work close together. Summing an array with four separate running totals instead of one lets four additions run at once instead of waiting on one long chain. On Linux, `perf stat` prints any program’s instructions per cycle.',

  example: { label: 'load r1 / add r2←r1 / mul r3 / add r6←r3: the mul and second add run while the first add waits', mustContain: 'mul r3 ← r4 × r5' },

  deeper: {
    mechanism: [
      {
        title: 'Renaming in detail',
        text: 'The architectural registers (16 integer registers in x86-64, 31 in Arm64) are only names. The core has a much larger physical register file, typically ~200–300 integer registers, and a rename table that maps each name to its newest physical register. Giving every result a fresh register removes write-after-read and write-after-write hazards. Only true read-after-write dependencies remain, and those are what the scheduler waits on.',
        cue: { parts: ['rename', 'prf'] },
      },
      {
        title: 'Speculation and recovery',
        text: 'The core runs instructions past branches it hasn’t resolved yet: [[speculative execution|speculation]]. When a branch resolves the wrong way, the core flushes all younger µops from the reorder buffer and schedulers, restores the rename table from a saved checkpoint and refetches from the correct address. The lost time, roughly the number of stages from fetch to execute, is the ~10–20-cycle misprediction penalty.',
        cue: { parts: ['bpred', 'rob'], mode: 'mispredict' },
      },
      {
        title: 'Loads that pass stores',
        text: 'Loads may run before older stores whose addresses aren’t known yet. The load/store unit records this and checks later. If an older store turns out to write the same address, the load and everything after it are replayed. Store data waits in a [[store buffer|store-buffer]] until the store retires, and a later load to the same address can take its value straight from there.',
        cue: { parts: ['lsu', 'l1d'] },
      },
      {
        title: 'Two threads, one core (SMT)',
        text: 'Even a busy core leaves some issue slots empty every cycle. [[Simultaneous multithreading|smt]] (Intel’s Hyper-Threading) runs two threads on one core: they share the execution units and caches, but each has its own registers and program counter. The gain is typically tens of percent of throughput, not 2×, and it varies a lot by workload.',
        cue: { mode: 'smt' },
      },
    ],
    formula: {
      tex: 'T = \\frac{N_{\\text{instr}}}{\\text{IPC} \\times f}',
      where: 'Run time T for N instructions at IPC instructions per cycle and clock frequency f (the "iron law" of performance, usually written T = N × CPI / f).',
    },
    worked: {
      q: 'A program executes 1 billion instructions. Core A reaches IPC 2 at 4 GHz; core B reaches IPC 1 at 5 GHz. Which is faster?',
      steps: [
        'Core A: T = 10⁹ ÷ (2 × 4 × 10⁹) = 0.125 s.',
        'Core B: T = 10⁹ ÷ (1 × 5 × 10⁹) = 0.2 s.',
        'Core A wins by 1.6× despite the lower clock, because it does twice as much per cycle.',
      ],
      answer: 'Core A: 0.125 s vs 0.2 s.',
    },
    choices: [
      { title: 'Wide or fast', text: 'Each extra decoder, execution port and register-file port costs area and power, and can limit the clock. Apple’s big cores decode 8 or more instructions per cycle and run at roughly 3–4.5 GHz. Desktop x86 cores are narrower and boost to around 5.5–6 GHz.' },
      { title: 'How big a window', text: 'A larger reorder buffer and more physical registers let the core work further past a stalled load. Each step costs area and energy, and the gains shrink because real programs run out of independent work. This is why windows grew gradually (~200 to ~600 entries over a decade) rather than jumping.' },
      { title: 'Deeper pipelines', text: 'Splitting the work into more, shorter stages allows a higher clock. Every stage between fetch and execute also adds to the cost of a wrong branch guess. A mid-2000s design with 31 stages (Intel’s Prescott) showed the limit, and today’s cores use roughly 15–20 stages.' },
    ],
  },

  connected: [
    { id: 'cpu.l1d', why: 'The core’s closest data store: most loads are answered here in 4–5 cycles.' },
    { id: 'cpu.bpred', why: 'Keeps the front end fed by guessing every branch.' },
    { id: 'cpu.rob', why: 'Keeps out-of-order work in program order.' },
  ],
  sources: [
    { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., ch. 3', year: 2017 },
    { title: 'Patterson & Hennessy, Computer Organization and Design, RISC-V ed., ch. 4', year: 2020 },
    { title: 'AMD, Software Optimization Guide for the AMD Zen 4 Microarchitecture (4-wide decode, 320-entry ROB)', year: 2023 },
    { title: 'Intel 64 and IA-32 Architectures Optimization Reference Manual (Golden Cove: 6-wide decode, 512-entry ROB)', year: 2023 },
  ],
};
