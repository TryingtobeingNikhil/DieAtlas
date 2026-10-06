import type { LT } from './types';

// One-line definitions for technical terms. In any text, write [[term]] or
// [[shown text|id]]; the reader sees a dotted underline and the definition on hover.
// Vendor mappings live here too, so "compute unit" explains SM / CU / Xe-core at once.

export interface Term { id: string; term: string; def: LT; aliases?: string[]; vendor?: string }

export const GLOSSARY: Term[] = [
  // ---- general
  { id: 'cycle', term: 'clock cycle', def: { b: 'One tick of the chip’s clock; at 3 GHz there are 3 billion per second.', i: 'One period of the core clock: 1 / f (0.33 ns at 3 GHz).' }, aliases: ['cycles'] },
  { id: 'latency', term: 'latency', def: { b: 'How long one thing takes from asking to getting an answer.', i: 'Time from issuing a request to receiving its result (ns or cycles).' } },
  { id: 'bandwidth', term: 'bandwidth', def: { b: 'How much data can move per second.', i: 'Sustained or peak data rate, e.g. GB/s; bus width × transfer rate.' } },
  { id: 'throughput', term: 'throughput', def: { b: 'How much work gets finished per second.', i: 'Completed operations per unit time (ops/s, FLOP/s, instructions per cycle).' } },
  { id: 'flops', term: 'FLOP/s', def: { b: 'Decimal-number calculations per second.', i: 'Floating-point operations per second; an FMA counts as 2.' } },
  { id: 'isa', term: 'ISA', def: { b: 'The list of instructions a processor understands.', i: 'Instruction set architecture: the hardware/software contract (x86-64, Arm, RISC‑V).' } },
  { id: 'risc', term: 'RISC', def: { b: 'A design style with simple, same-size instructions.', i: 'Reduced instruction set computer: load/store, fixed-length, simple instructions.' } },
  { id: 'cisc', term: 'CISC', def: { b: 'A design style with richer, variable-size instructions.', i: 'Complex instruction set computer: variable-length, memory operands in arithmetic instructions.' } },
  { id: 'sram', term: 'SRAM', def: { b: 'Fast memory made of transistors, used for caches.', i: 'Static RAM: ~6 transistors per bit, no refresh, used for caches and register files.' } },
  { id: 'dram', term: 'DRAM', def: { b: 'Dense, cheaper memory that must be refreshed, used for main memory.', i: 'Dynamic RAM: one transistor + capacitor per bit; needs periodic refresh.' } },
  { id: 'die', term: 'die', def: { b: 'One rectangle of silicon cut from a wafer: the actual chip.', i: 'A single piece of silicon carrying a circuit; packages may hold several.' } },
  { id: 'chiplet', term: 'chiplet', def: { b: 'A small chip that works together with others in one package.', i: 'A die designed to be combined with others on one package (e.g. CCD + IOD).' } },

  // ---- caches & memory
  { id: 'cache', term: 'cache', def: { b: 'A small, fast store that keeps copies of recently used data.', i: 'Hardware-managed SRAM holding copies of memory lines, indexed by address.' } },
  { id: 'cache-line', term: 'cache line', def: { b: 'The chunk a cache moves at once, usually 64 bytes.', i: 'Unit of transfer and tagging in a cache, typically 64 B on CPUs.' }, aliases: ['line', 'lines'] },
  { id: 'set', term: 'set', def: { b: 'One row of a cache; an address may only live in its own row.', i: 'Group of ways selected by the index bits of an address.' }, aliases: ['sets'] },
  { id: 'way', term: 'way', def: { b: 'One slot in a cache row.', i: 'One entry within a set; associativity = number of ways.' }, aliases: ['ways'] },
  { id: 'associativity', term: 'associativity', def: { b: 'How many slots each cache row has.', i: 'Number of ways per set (1 = direct-mapped, all = fully associative).' } },
  { id: 'tag', term: 'tag', def: { b: 'The label stored with each line to check it’s the right data.', i: 'High-order address bits stored per line and compared on lookup.' } },
  { id: 'index', term: 'index', def: { b: 'The part of the address that picks the cache row.', i: 'Address bits between the offset and the tag that select the set.' } },
  { id: 'offset', term: 'offset', def: { b: 'The part of the address that picks the byte inside a chunk.', i: 'Low-order log₂(line size) address bits selecting the byte within a line.' } },
  { id: 'hit', term: 'hit', def: { b: 'The data was already in the cache.', i: 'A lookup that finds a valid line with a matching tag.' } },
  { id: 'miss', term: 'miss', def: { b: 'The data wasn’t in the cache, so it has to be fetched.', i: 'A lookup with no matching valid tag; the line is fetched from the next level.' } },
  { id: 'miss-rate', term: 'miss rate', def: { b: 'How often the cache doesn’t have what you asked for.', i: 'Misses ÷ accesses at a given cache level (local or global).' } },
  { id: 'lru', term: 'LRU', def: { b: 'Throw out whatever was used longest ago.', i: 'Least-recently-used replacement; real caches usually approximate it (pseudo-LRU).' } },
  { id: 'amat', term: 'AMAT', def: { b: 'The average time one memory access takes.', i: 'Average memory access time = hit time + miss rate × miss penalty.' } },
  { id: 'write-back', term: 'write-back', def: { b: 'Changes stay in the cache until the line is thrown out.', i: 'Policy where dirty lines are written to the next level only on eviction.' } },
  { id: 'prefetcher', term: 'prefetcher', def: { b: 'Hardware that fetches data before you ask, by spotting patterns.', i: 'Logic that predicts future accesses (streams, strides) and issues early fills.' }, aliases: ['prefetchers', 'prefetching'] },
  { id: 'tlb', term: 'TLB', def: { b: 'A tiny cache of address translations.', i: 'Translation lookaside buffer: caches virtual→physical page mappings.' } },
  { id: 'page', term: 'page', def: { b: 'A block of memory (often 4 KB) that the OS maps as one unit.', i: 'Unit of virtual-memory mapping: 4 KB base, 2 MB / 1 GB huge pages.' } },
  { id: 'coherence', term: 'cache coherence', def: { b: 'Keeping every core’s copy of the same data in agreement.', i: 'Protocol (MESI/MOESI) ensuring a single, consistent value per address across caches.' } },
  { id: 'mesi', term: 'MESI', def: { b: 'The four states a cached line can be in: Modified, Exclusive, Shared, Invalid.', i: 'Invalidation-based coherence protocol; MOESI adds Owned.' } },
  { id: 'false-sharing', term: 'false sharing', def: { b: 'Two threads slow each other down by using different data on the same 64-byte line.', i: 'Coherence traffic caused by independent variables sharing a cache line.' } },
  { id: 'locality', term: 'locality', def: { b: 'Programs tend to reuse the same and nearby data.', i: 'Temporal (reuse soon) and spatial (use neighbours) locality, which caches exploit.' } },
  { id: 'memory-wall', term: 'memory wall', def: { b: 'Processors got much faster than memory, so waiting for data dominates.', i: 'The growing gap between core speed and DRAM latency/bandwidth.' } },

  // ---- CPU core
  { id: 'pipeline', term: 'pipeline', def: { b: 'An assembly line: each instruction moves through stages, many at once.', i: 'Overlapping fetch, decode, execute … so several instructions are in flight.' } },
  { id: 'superscalar', term: 'superscalar', def: { b: 'Starting more than one instruction per tick.', i: 'Issuing multiple instructions per cycle to multiple execution units.' } },
  { id: 'out-of-order', term: 'out-of-order execution', def: { b: 'Doing ready work first, then putting results back in order.', i: 'Dynamic scheduling: execute when operands are ready, retire in program order.' }, aliases: ['out-of-order', 'OoO'] },
  { id: 'micro-op', term: 'micro-op', def: { b: 'A small internal step that a big instruction is split into.', i: 'µop: internal RISC-like operation produced by the decoder.' }, aliases: ['µop', 'micro-ops', 'µops'] },
  { id: 'rob', term: 'reorder buffer', def: { b: 'The list that keeps out-of-order work in program order.', i: 'ROB: circular buffer of in-flight µops that retire in order.' } },
  { id: 'rename', term: 'register renaming', def: { b: 'Giving each result its own hidden slot so work doesn’t wait needlessly.', i: 'Mapping architectural to physical registers to remove WAR/WAW hazards.' } },
  { id: 'branch-prediction', term: 'branch prediction', def: { b: 'Guessing which way an “if” goes so the core never waits.', i: 'Predicting branch direction and target to keep fetch running speculatively.' } },
  { id: 'speculation', term: 'speculative execution', def: { b: 'Working ahead on a guess, and undoing it if the guess was wrong.', i: 'Executing past unresolved branches; results are squashed on misprediction.' } },
  { id: 'smt', term: 'SMT', def: { b: 'One core running two programs at once by sharing its parts.', i: 'Simultaneous multithreading: multiple hardware threads share one core’s resources.' } },
  { id: 'ipc', term: 'IPC', def: { b: 'How many instructions finish per tick.', i: 'Instructions per cycle (the inverse of CPI).' } },
  { id: 'cpi', term: 'CPI', def: { b: 'How many ticks each instruction takes on average.', i: 'Cycles per instruction; CPU time = instructions × CPI × clock period.' } },
  { id: 'simd', term: 'SIMD', def: { b: 'One instruction that does the same math on many numbers.', i: 'Single instruction, multiple data: vector registers and lanes (AVX, NEON, SVE).' } },

  // ---- GPU
  { id: 'simt', term: 'SIMT', def: { b: 'Many threads running the same instruction together.', i: 'Single instruction, multiple threads: per-thread state, warp-wide issue.' } },
  { id: 'thread', term: 'thread', def: { b: 'One copy of your program working on its own piece of data.', i: 'An independent stream of execution with its own registers.' }, aliases: ['threads'] },
  { id: 'warp', term: 'warp / wavefront', def: { b: 'A group of threads that always move together.', i: '32 threads issued together (NVIDIA warp); AMD wavefronts are 32 or 64.' }, aliases: ['warp', 'warps', 'wavefront'], vendor: 'NVIDIA: warp (32) · AMD: wavefront (32/64) · Intel: SIMD thread' },
  { id: 'block', term: 'thread block', def: { b: 'A team of threads that run on one worker unit and can share a scratchpad.', i: 'CUDA block / OpenCL workgroup: co-resident threads sharing shared memory.' }, aliases: ['workgroup'] },
  { id: 'compute-unit', term: 'compute unit', def: { b: 'One of the GPU’s worker units.', i: 'The GPU’s replicated core: schedulers, register file, ALUs, shared memory.' }, vendor: 'NVIDIA: SM · AMD: CU / WGP · Intel: Xe-core · Apple: GPU core' },
  { id: 'occupancy', term: 'occupancy', def: { b: 'How full a worker unit is with groups of threads.', i: 'Resident warps ÷ maximum warps per compute unit.' } },
  { id: 'shared-memory', term: 'shared memory', def: { b: 'A fast scratchpad shared by one team of threads.', i: 'Software-managed on-chip SRAM per compute unit, banked.' }, vendor: 'NVIDIA: shared memory · AMD: LDS · Intel: SLM · Apple: threadgroup memory' },
  { id: 'bank-conflict', term: 'bank conflict', def: { b: 'Two threads asking the same memory bank at once, so one must wait.', i: 'Multiple lanes hitting different addresses in one bank, serialising the access.' } },
  { id: 'coalescing', term: 'coalescing', def: { b: 'Merging the memory requests of a group of threads into a few big ones.', i: 'Combining a warp’s accesses into the fewest 32/64/128 B transactions.' } },
  { id: 'divergence', term: 'divergence', def: { b: 'Threads in one group disagree on an “if”, so they take turns.', i: 'Branch divergence: lanes on different paths are masked and run serially.' } },
  { id: 'matrix-unit', term: 'matrix unit', def: { b: 'Hardware that multiplies small grids of numbers in one go.', i: 'MMA unit for tile matrix multiply-accumulate.' }, vendor: 'NVIDIA: Tensor Core · AMD: Matrix Core · Intel: XMX · Apple/Intel CPU: AMX' },
  { id: 'fma', term: 'FMA', def: { b: 'Multiply two numbers and add a third in one step.', i: 'Fused multiply-add: a × b + c with one rounding; counts as 2 FLOP.' } },

  // ---- memory packaging
  { id: 'hbm', term: 'HBM', def: { b: 'Memory chips stacked on top of each other right beside the processor.', i: 'High Bandwidth Memory: stacked DRAM with a 1,024-bit interface per stack on an interposer.' } },
  { id: 'gddr', term: 'GDDR', def: { b: 'Fast graphics memory chips placed around the GPU on the board.', i: 'Graphics DDR: per-chip 32-bit interfaces at very high data rates.' } },
  { id: 'interposer', term: 'interposer', def: { b: 'A thin slab of silicon that wires chips together under them.', i: 'Passive silicon substrate with dense wiring connecting die and HBM (2.5D).' } },
  { id: 'tsv', term: 'TSV', def: { b: 'A tiny wire that goes straight down through a chip.', i: 'Through-silicon via: vertical connection through stacked dies.' } },
  { id: 'phy', term: 'PHY', def: { b: 'The circuitry at the chip’s edge that sends and receives signals.', i: 'Physical-layer I/O: drivers, receivers and clocking for a link.' } },
  { id: 'channel', term: 'memory channel', def: { b: 'One independent road between the processor and its memory.', i: 'An independent command/data interface (e.g. 64-bit DDR5 DIMM = 2 × 32-bit subchannels).' } },
  { id: 'pcie', term: 'PCIe', def: { b: 'The standard high-speed connection for cards and SSDs.', i: 'PCI Express: serial lanes; Gen5 ≈ 3.94 GB/s per lane per direction.' } },
  { id: 'arithmetic-intensity', term: 'arithmetic intensity', def: { b: 'How much math you do for each byte you read.', i: 'FLOPs ÷ bytes moved; decides compute- vs memory-bound on a roofline.' } },
  // ---- added for component pages
  { id: 'register', term: 'register', def: { b: 'A tiny storage slot inside the processor that holds one value being worked on.', i: 'Fastest storage, named directly by instructions (e.g. 16 integer registers in x86-64).' }, aliases: ['registers'] },
  { id: 'bank', term: 'bank', def: { b: 'One independent section of a memory that can work at the same time as the others.', i: 'Independently addressable sub-array; parallel banks overlap accesses.' }, aliases: ['banks'] },
  { id: 'store-buffer', term: 'store buffer', def: { b: 'A small queue where writes wait so the core can keep going.', i: 'Queue of retired-but-not-yet-committed stores; loads check it for forwarding.' } },
  { id: 'scoreboard', term: 'scoreboard', def: { b: 'A list that tracks which values are still being computed.', i: 'Per-register pending-write tracking; an instruction issues only when its operands are ready.' } },
  { id: 'kernel', term: 'kernel', def: { b: 'A function that runs on the GPU, once for every thread.', i: 'GPU program launched over a grid of thread blocks.' }, aliases: ['kernels'] },
  { id: 'ecc', term: 'ECC', def: { b: 'Extra bits that let memory find and fix flipped bits.', i: 'Error-correcting code, e.g. SEC-DED per 64 data bits.' } },
];

const BY_ID = new Map(GLOSSARY.map(t => [t.id, t]));
const BY_NAME = new Map<string, Term>();
for (const t of GLOSSARY) { BY_NAME.set(t.term.toLowerCase(), t); t.aliases?.forEach(a => BY_NAME.set(a.toLowerCase(), t)); }

/** Look up [[x]] by id, term or alias. */
export const term = (key: string) => BY_ID.get(key) ?? BY_NAME.get(key.toLowerCase());
