import type { Concept } from './types';

export const concept: Concept = {
  id: 'risc-cisc',
  title: { b: 'RISC vs CISC', i: 'ISA styles: RISC vs CISC' },
  teaser: {
    b: 'Two ways to design the instruction "vocabulary" a CPU understands: few simple words, or many powerful ones.',
    i: 'Load/store vs register-memory, fixed vs variable-length encoding, and why modern x86 cores run on micro-ops anyway.',
  },
  status: 'ready',
  diagram: 'risc-cisc',
  intro: {
    b: 'Every CPU understands a fixed list of commands, its [[instruction set|isa]] (the contract between software and hardware). [[RISC|risc]] designs keep that list small and regular, so each command does one simple thing. [[CISC|cisc]] designs offer richer commands, where one instruction can read memory, compute and write back. Today x86 is the big CISC family, while Arm and RISC‑V are RISC. Inside, fast chips of both kinds work in a surprisingly similar way.',
    i: 'An [[ISA|isa]] fixes the instruction encoding, registers and addressing modes that software may rely on. [[RISC|risc]] ISAs (Arm AArch64, RISC‑V) use load/store semantics and fixed-length encodings. [[CISC|cisc]] ISAs (x86-64) allow memory operands in ALU instructions and variable-length encodings. Modern x86 cores crack instructions into [[micro-ops|micro-op]], so the remaining differences are mostly decode cost and the ISA contract.',
  },
  sections: [
    {
      title: 'Same task, two encodings',
      mode: 'encode',
      text: {
        b: 'Take the job "add a register to a number stored in memory." x86 can do it with one short instruction, `add [rbx], eax`, just 2 bytes. A RISC chip needs three instructions: load the number, add, store it back. Each RISC instruction is exactly 4 bytes, so that is 12 bytes.',
        i: 'Consider `mem[rbx] += eax`. x86 encodes it as one instruction, `add [rbx], eax`, in 2 bytes (`01 03`). RISC‑V needs `lw`, `add`, `sw`: three fixed 32-bit instructions, 12 bytes total. CISC wins on bytes here; RISC wins on regularity.',
      },
    },
    {
      title: 'Load/store vs register-memory',
      mode: 'loadstore',
      text: {
        b: 'In a load/store design, only special load and store instructions may touch memory. Math works on registers only (registers are tiny, very fast storage slots inside the CPU). CISC lets an add read and write memory directly. Fewer instructions, but each one does more work.',
        i: 'Load/store ISAs restrict memory access to explicit loads and stores; ALU ops read and write registers only. Register-memory ISAs like x86 allow an ALU operand, or even the destination, in memory. Load/store raises instruction count but keeps each instruction simple to [[pipeline]]. It also needs more architectural registers to hold values.',
      },
    },
    {
      title: 'Finding where instructions start',
      mode: 'decode',
      text: {
        b: 'If every instruction is 4 bytes long, the CPU knows they start at bytes 0, 4, 8, 12. It can decode (work out the meaning of) several at once. x86 instructions are 1 to 15 bytes long. To find where the next one begins, you must first measure the one before it.',
        i: 'Fixed-length encodings make instruction boundaries trivial, so N decoders can work in parallel on aligned slots. x86 lengths vary from 1 to 15 bytes, so each boundary depends on decoding prefixes, opcode and ModRM of the previous instruction. That serial dependence makes wide [[superscalar]] decode costly in logic and power. x86 cores use predecode marks and decoded-µop caches to work around it.',
      },
    },
    {
      title: 'Inside x86: micro-ops',
      mode: 'microops',
      text: {
        b: 'Modern x86 chips do not run complex instructions directly. The front end splits each one into small, RISC-like steps called [[micro-ops|micro-op]]. So `add [rbx], eax` becomes roughly: load, add, store. Since the mid-1990s, the core behind the decoder looks a lot like a RISC core.',
        i: 'Since the P6 generation (Pentium Pro, 1995), x86 decoders translate instructions into [[micro-ops|micro-op]] for an out-of-order back end. A memory-destination add becomes roughly a load µop, an ALU µop and a store. Cores also fuse common pairs, such as compare plus branch, into one µop. The "war" therefore moved to decode cost, not execution style.',
      },
    },
    {
      title: 'Code density',
      mode: 'encode',
      text: {
        b: 'Code density means how many bytes a program takes. Smaller code fits better in the instruction cache, which saves time and energy. x86 code is often compact because short instructions take only 1 to 3 bytes. RISC‑V adds an optional "C" extension with 2-byte versions of common instructions.',
        i: 'Denser code means fewer instruction-cache misses and less fetch bandwidth. Variable-length x86 gives short encodings to common operations, but prefixes can make it bulky. RISC‑V\'s "C" extension adds 16-bit forms of frequent instructions; the spec reports roughly 25–30% smaller code. AArch64 chose fixed 32-bit encodings only, trading density for simple decode.',
      },
    },
  ],
  table: {
    caption: 'Three ISA families today (64-bit variants unless noted)',
    columns: ['', 'x86-64', 'Arm (AArch64)', 'RISC‑V'],
    rows: [
      ['Style', 'CISC', 'RISC', 'RISC'],
      ['Instruction length', 'Variable, 1–15 bytes', 'Fixed 32-bit', '32-bit base; optional 16-bit compressed ("C" extension)'],
      ['Memory operands in arithmetic', 'Yes (register-memory)', 'No (load/store only)', 'No (load/store only)'],
      ['General-purpose registers', '16', '31 (X0–X30)', '32 (x0–x31, x0 hard-wired to zero)'],
      ['Condition flags', 'Yes (FLAGS register)', 'Yes (NZCV)', 'No (compare-and-branch instructions)'],
      ['Licensing / openness', 'Proprietary (Intel, AMD)', 'Licensed by Arm Ltd', 'Open standard (RISC‑V International)'],
      ['Where used', 'PCs, laptops, servers', 'Phones, tablets, Apple Macs, cloud servers, embedded', 'Microcontrollers, embedded, accelerators; growing elsewhere'],
      ['Year introduced', '1978 (8086); x86-64 later', '1985 (ARM1); AArch64 announced 2011', '2010 (UC Berkeley)'],
    ],
  },
  options: [
    {
      name: 'RISC',
      pros: [
        'Fixed-length encoding makes wide, parallel decode simple and cheap',
        'Simple, regular instructions pipeline easily',
        'Many registers let compilers keep values out of memory',
      ],
      cons: [
        'More instructions for the same task (higher instruction count)',
        'Fixed 32-bit encodings give lower code density without a compressed extension',
        'Complex operations must be built from several instructions',
      ],
    },
    {
      name: 'CISC',
      pros: [
        'Fewer instructions per task (lower instruction count)',
        'Variable-length encoding can give dense code',
        'x86 has huge backward compatibility and a vast software base',
      ],
      cons: [
        'Variable-length decode is serial and costs area and power',
        'Complex instructions must be cracked into micro-ops in hardware',
        'Decades of legacy instructions and modes must still be supported',
      ],
    },
  ],
  examples: [
    { arch: 'zen4-7950x', text: 'An x86-64 (CISC) core that decodes instructions into micro-ops and keeps recently decoded ones in an op cache, skipping the costly variable-length decoders on hot loops.' },
    { arch: 'intel-alder-lake', text: 'x86-64 with two core types: Golden Cove P-cores use a 6-wide decoder, while Gracemont E-cores use two 3-wide decode clusters to tame variable-length decode.' },
    { arch: 'apple-m', text: 'Arm AArch64 (RISC): fixed 32-bit instructions make it easier to build a very wide decoder feeding a large out-of-order core.' },
    { arch: 'riscv-sifive', text: 'RISC‑V cores built on the open ISA; many support the compressed "C" extension to mix 16-bit and 32-bit instructions for better code density.' },
  ],
  practice: [
    {
      q: 'Task: `mem[A] = mem[A] + r`, where A is held in a register. On x86 this is one instruction, `add [rbx], eax`, encoded in 2 bytes. On RISC‑V (base ISA, no compression) it takes `lw`, `add`, `sw`. (a) Give the instruction count and code size for each. (b) What is the RISC‑V size if all three can use 16-bit "C" encodings?',
      steps: [
        'x86: 1 instruction × 2 bytes = 2 bytes.',
        'RISC‑V base: 3 instructions × 4 bytes = 12 bytes.',
        'Ratio: 12 / 2 = 6, so the RISC version is 6× larger for this snippet and needs 3× as many instructions.',
        'With "C": `c.lw`, `c.add`, `c.sw` are 2 bytes each, so 3 × 2 = 6 bytes (this needs the load/store registers chosen from x8–x15).',
      ],
      answer: '(a) x86: 1 instruction, 2 bytes; RISC‑V: 3 instructions, 12 bytes. (b) 6 bytes, still 3 instructions.',
    },
    {
      q: 'A program compiled for a CISC machine executes 1.0 × 10⁹ instructions at CPI 2.0. The RISC version executes 1.5 × 10⁹ instructions at CPI 1.2. Both run at 2 GHz. (a) Which is faster, and by how much? (b) What CPI would the RISC machine need to merely tie?',
      steps: [
        'CPU time = IC × CPI × T, with T = 1 / 2 GHz = 0.5 ns.',
        'CISC: 1.0 × 10⁹ × 2.0 = 2.0 × 10⁹ cycles; × 0.5 ns = 1.0 s.',
        'RISC: 1.5 × 10⁹ × 1.2 = 1.8 × 10⁹ cycles; × 0.5 ns = 0.9 s.',
        'Speedup = 1.0 / 0.9 ≈ 1.11, so RISC is about 11% faster.',
        'To tie, RISC needs 2.0 × 10⁹ cycles: CPI = 2.0 × 10⁹ / 1.5 × 10⁹ ≈ 1.33.',
      ],
      answer: '(a) RISC: 0.9 s vs 1.0 s, about 1.11× faster. (b) CPI ≈ 1.33. A 50% higher instruction count is fine if CPI drops enough.',
    },
    {
      q: 'A decoder receives a 16-byte fetch block. (a) With fixed 4-byte instructions, where do instructions start and how many are there? (b) The same block holds x86 instructions of lengths 3, 5, 2, 4 and 2 bytes. Where does each start? (c) Why does (b) limit decode width?',
      steps: [
        'Fixed length: starts at bytes 0, 4, 8, 12, so 16 / 4 = 4 instructions, known without looking at any bits.',
        'Variable length: starts are 0, 0+3 = 3, 3+5 = 8, 8+2 = 10, 10+4 = 14; the last ends at 14+2 = 16.',
        'So the block holds 5 instructions, but the start of each depends on the lengths of all earlier ones.',
        'Finding instruction 5 requires length-decoding instructions 1–4 first: a serial chain that grows with decode width.',
        'Real x86 cores cut this cost with predecoded length marks in the instruction cache and caches of already-decoded micro-ops.',
      ],
      answer: '(a) 0, 4, 8, 12: 4 instructions. (b) 0, 3, 8, 10, 14: 5 instructions. (c) Each boundary depends on the previous lengths, so wide parallel decode needs extra, power-hungry logic.',
    },
  ],
  sources: [
    { title: 'Patterson & Ditzel, "The Case for the Reduced Instruction Set Computer", ACM SIGARCH Computer Architecture News', year: 1980 },
    { title: 'Patterson & Hennessy, Computer Organization and Design: The Hardware/Software Interface, RISC‑V Edition', year: 2017 },
    { title: 'Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed.', year: 2017 },
    { title: 'The RISC‑V Instruction Set Manual, Volume I: Unprivileged ISA (ratified 20191213)', year: 2019 },
  ],
};
