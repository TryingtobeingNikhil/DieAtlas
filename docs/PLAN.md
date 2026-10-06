# Dielab — build plan (v0, for go-ahead)

Live design preview: `design/preview.html` (has theme and screen switches at the top).

---

## 0. Name — decided

**Die Atlas** is the site. **Dielab** is the sandbox inside it.

---

## 1. Palette — "Phosphor Lab" (dark, default) and its light derivative

The original preview's look: near-black with a green tint, coloured part outlines, and a glowing highlight on the active set row. Obsidian, Porcelain, champagne and Copper Trace are dropped. Phosphor Lab stays in `design/preview.html` as the reference.

Contrast, as the WCAG ratio against the page background / against a panel. AA needs 4.5.

| Meaning | Dark | Ratio | Light | Ratio |
|---|---|---|---|---|
| ● GPU / compute | `#5CF28E` | 13.4 / 12.4 | `#127A3C` | 5.0 / 5.4 |
| ◆ CPU / control | `#FFB547` | 11.0 / 10.2 | `#9A5300` | 5.3 / 5.8 |
| ▬ Memory / data | `#4CC9F0` | 10.1 / 9.3 | `#0A6C8F` | 5.4 / 5.9 |
| ∑ Math | `#B79CFF` | 8.5 / 7.9 | `#6443CF` | 5.9 / 6.5 |
| ✕ Stall / miss / error | `#FF5D5D` | 6.4 / 5.9 | `#C42B2B` | 5.2 / 5.6 |
| Main text | `#E3F2E8` | 16.7 / 15.5 | `#0E1A13` | 16.4 / 17.9 |
| Secondary text | `#B4CABC` | 11.2 / 10.3 | `#33473C` | 9.1 / 10.0 |
| Muted text | `#8BA597` | 7.3 / 6.8 | `#4D6156` | 6.1 / 6.7 |
| Primary button text on green | `#0A0F0C` | 13.4 | `#FFFFFF` | 5.4 |

Surfaces:
- **Dark:** bg `#0A0F0C`, panels `#111915`, hairlines `#22302A`.
- **Light:** bg `#F3F6F2`, panels `#FFFFFF`, hairlines `#D3DED6`.

Type: Space Grotesk for headings, Inter for prose, JetBrains Mono for numbers, addresses and registers.

Rules:
- Green appears only on GPU/compute things and the one primary button per screen. The logo is neutral.
- Every meaning has a shape as well as a colour: ● ◆ ▬ ∑ ✕. Hit and miss always carry ✓ / ✕ plus a word.
- Background: a 16 px dot grid plus a faint 128 px die-shot grid.
- Chip art: stylised top views with coloured part outlines. Cyan dots are moving data and amber dots are moving instructions. Green SM tiles pulse when active.

---

## 2. Home screen (see preview → Home)

- **Hook in 5 seconds:** a live counter: *"Since you opened this page, one CPU core at 3 GHz has ticked 3,369,600,000 times, and an H100 could have done 1.1 quadrillion BF16 operations at peak."* Both are real rates (3×10⁹ cycles/s; 989 TFLOP/s dense BF16, H100 SXM).
- **Three doors and the bridge:** CPU world (left, amber), GPU world (right, green), the bridge between them, and a slim Foundations entrance below ("optional, skip it if you know what a transistor does"). Each has a progress ring.
- The door art is alive. Amber ◆ instructions move through 8 cores. Cyan data rises from the L3. 96 SMs pulse out of sync. The bridge shows "1 fast lane vs many slow lanes" with a PCIe packet.
- A "Continue: <last lesson>" button and a "Sandbox" button.

## 3. World maps (see preview → World maps; wireframe level)

The canvas pans and zooms (scroll pans; Ctrl/⌘+scroll or pinch zooms; Fit button; no snap-back). Zones zoom in when you click them. Hovering a part shows a one-liner. Clicking opens a card beside the part with its lessons, a teaser and "Open in sandbox". Every part has a progress ring.

**CPU world:** 4 zones
- *Inside a core:* front end/fetch, branch predictor, decode, rename/ROB, schedulers, ALU, FPU, load/store, SIMD, register file
- *Memory hierarchy:* L1I, L1D, L2, L3, memory controller, DRAM, TLB/virtual memory
- *The whole chip:* many cores, interconnect, coherence, power & heat
- *Motherboard:* PCIe lanes, NVMe, NUMA, door to the GPU world

**GPU world:** 3 zones
- *GPU chip:* SM grid, L2, HBM stacks, block scheduler, copy engines/PCIe
- *Inside an SM:* 4 partitions (warp scheduler, 32 FP32 lanes, tensor core, 64 KB register file), shared memory/L1
- *Multi-GPU server:* 8 GPUs, NVSwitch/NVLink, host CPU, PCIe, NICs → other servers

**Bridge:** a row of "stations", each a side-by-side race or comparison (§4).

On phones, zones stack vertically and each zone becomes a vertical list diagram.

---

## 4. Lessons (45; each has 4–7 steps, a hook, takeaways and a 1–2 question quiz)

Grouped by map part, not by sequence.

**Foundations (4)**, the entrance:
1. Bits and transistors as switches
2. Gates → adder → ALU
3. The clock: what "3 GHz" means (0.33 ns per tick; light travels ~10 cm) · CPU time = instructions × CPI × clock period
4. Numbers: two's complement, IEEE 754, FP32/FP16/BF16/FP8 (live bit-layout explorer)

**CPU world · core (8)**
| Part | Lesson |
|---|---|
| Front end | Fetch–decode–execute |
| Decode | ISA: x86 vs ARM vs RISC‑V |
| Pipeline (whole core) | Pipelining · ideal vs real throughput |
| Pipeline | Hazards, stalls, forwarding |
| Branch predictor | Branch prediction |
| Rename/ROB + schedulers | Superscalar & out-of-order (rename, reservation stations, ROB) |
| SIMD unit | SIMD/vector: SSE, AVX, NEON |
| Front end + register file | SMT / hyper-threading |

**CPU world · memory (8)**
| Part | Lesson |
|---|---|
| DRAM | The memory wall |
| L1D | Caches: lines, sets, ways, tag/index/offset · AMAT ← *vertical slice lesson* |
| L1D/L2 | Misses (compulsory/capacity/conflict) & replacement |
| L1D | Write-back vs write-through |
| L2 | Prefetching |
| TLB | Virtual memory, page tables, the TLB |
| DRAM + memory controller | DRAM: rows, banks, refresh · bandwidth = width × rate × channels · Little's law |
| Interconnect / coherence | MESI & false sharing |

**CPU world · chip & system (5)**
Multicore & interconnects (Amdahl, speedup, efficiency) · NUMA · PCIe lanes & generations · NVMe storage · Power, heat, Dennard scaling

**GPU world (11)**
| Part | Lesson |
|---|---|
| SM grid | SIMT: threads, warps, blocks, grids ← *vertical slice lesson* |
| SM | The SM in detail · peak FLOP/s = SMs × lanes × 2 × clock |
| Warp scheduler | Warp scheduling & latency hiding |
| SM / register file | Occupancy (from registers + shared memory per block) |
| L1 / LD-ST | Memory coalescing |
| Shared memory | Shared memory & bank conflicts |
| Warp scheduler | Divergence |
| Tensor core | Tensor cores & MMA tiles |
| HBM | HBM: stacks, width, bandwidth |
| L2 | L2 and the GPU memory hierarchy |
| NVSwitch / NICs | NVLink, NVSwitch & multi-GPU |

**Bridge · CPU vs GPU (5)**
Why GPUs exist (latency vs throughput) ← *vertical slice comparison* · Same workload, side by side · Branch prediction vs warp divergence · Big caches vs huge register files · The CPU feeding the GPU over PCIe

**Bridge · AI hardware (4)**
The roofline model · Why matmul is compute-bound and attention often memory-bound · Mixed precision & quantisation · One transformer layer: the time breakdown

---

## 5. Simulators (sandbox)

| # | Simulator | What's real about it |
|---|---|---|
| 1 | **Pipeline** (5-stage) | Cycle-by-cycle over a short program; forwarding and branch-prediction toggles; bubbles and CPI shown |
| 2 | **Cache** ← *vertical slice* | Size, ways, line size, LRU/FIFO/random; sequential, strided, random, row- vs column-major matrix; hits, misses, set chosen, evictions, hit rate, 3C breakdown |
| 3 | **Branch predictor** | Always-taken, 1-bit, 2-bit, gshare-style global history; loop and random patterns |
| 4 | **Occupancy & warp scheduler** | Threads/block, registers, shared memory → blocks/SM, active warps; timeline showing latency hidden or exposed. Per-architecture limits (A100, H100, RTX 4090) |
| 5 | **Coalescing & bank conflicts** | 32 lanes, stride/offset → 32 B sectors / 128 B transactions; 32 banks × 4 B → conflict degree |
| 6 | **Roofline explorer** | Presets from §7; kernels: vector add, matmul N=256…8192, attention, reduction; drag intensity |
| 7 | **Build a machine (Lego)** | Drag cores, caches, channels, GPU, HBM, links. An *analytic* model (roofline + Little's law + a latency chain), labelled as a model rather than a cycle-accurate simulation. Time breakdown, bottleneck and live commentary |
| 8 | Number-format explorer | Bit-level FP32/FP16/BF16/FP8 (E4M3/E5M2): range, precision, rounding |
| 9 | Race runner (for the bridge) | Same workload on a CPU and a GPU preset, side by side |

**Missions (examples):** Make this matmul compute-bound · Hide the memory latency with enough warps · Stop the cache from thrashing · Feed the GPU fast enough over PCIe.
**Challenges (examples):** A 4 KB-stride loop on a 4-way cache thrashes (fix: change the stride or the associativity) · A kernel at 25% occupancy because of 128 registers/thread · A shared-memory transpose with 32-way bank conflicts (fix: pad by 1) · An LLM decode step that's bandwidth-bound on purpose (fix: quantise to 8-bit weights).
Each challenge ships with a script check that it fails as shipped and passes after the fix.

---

## 6. Tech & data shape

- Vite + React + TS, zustand (progress, mode, theme, sandbox), SVG diagrams, KaTeX, lucide. Static deploy to Vercel.
- `src/content/` holds the typed data: `components.ts` (map parts with ids), `lessons/*.ts` (steps, anchor component, animation keyframes, `deeper`, state tables, quiz), `missions.ts`, `challenges.ts`, `specs.ts` (every hardware number with source and confidence).
- Animations are declared as data: a timeline of `{ at, target, action }` driven by a small engine. Adding a lesson means adding a file, not code.
- Sim engines in `src/sim/` are pure TS, so the validation scripts run them headlessly.
- `scripts/validate.ts` checks:
  - every lesson references real component ids
  - every component has ≥1 lesson and every lesson is on a map
  - quiz answers are in range
  - every challenge fails as shipped and passes with its fix
  - every number in content comes from `specs.ts`
- Progress lives in localStorage. Sandbox state goes into the URL hash (compressed). Keys: ←/→ steps, space play/pause, R replay.

---

## 7. Numbers: please check the flagged ones

✅ = I'm confident (spec sheet or vendor doc) · ⚠️ = verify · ≈ = shown as an approximation in the UI

| Item | Value | Status |
|---|---|---|
| H100 SXM | 132 SMs · 50 MB L2 · 80 GB HBM3 · 3.35 TB/s · FP32 67 TFLOP/s · BF16 dense 989 TFLOP/s · FP8 dense 1,979 · NVLink 900 GB/s | ✅ (datasheet) |
| H100 SM | 4 partitions · 128 FP32 lanes · 4 tensor cores · 64 K × 32-bit registers (256 KB) · 256 KB L1/shared (≤228 KB shared) · 64 warps / 2,048 threads · 32 blocks | ✅ |
| H100 boost clock | ≈1.98 GHz, derived from 67 TFLOP/s ÷ (16,896 × 2) | ⚠️ derived, not quoted |
| A100 SXM | 108 SMs · 1.41 GHz · FP32 19.5 · FP16/BF16 tensor 312 dense · 40 MB L2 · 1,555 GB/s (40 GB) / 2,039 GB/s (80 GB) · 164 KB shared max | ✅ |
| RTX 4090 | 128 SMs · 16,384 lanes · 2.52 GHz boost · FP32 82.6 TFLOP/s · 24 GB GDDR6X · 384-bit · 21 Gbps → 1,008 GB/s · 72 MB L2 · 48 warps/SM · 100 KB shared max | ✅ |
| RTX 4090 tensor | Headline 165.2 TFLOP/s dense FP16 with FP32 accumulate; 330.3 (FP16 accumulate) is mentioned in the Go deeper note | ✅ decided |
| Apple M-series | "M1 Max (2021)": 10.4 TFLOP/s FP32 · 400 GB/s (Apple Newsroom). No third-party figures | ✅ decided |
| Desktop CPU (Ryzen 9 7950X) | 16 cores · 32 FP32 FLOP/cycle/core (2× 256-bit FMA) · DDR5-5200 × 2 ch = 83.2 GB/s. Peak ≈ 2.56 TFLOP/s *at an assumed 5.0 GHz all-core* | ⚠️ ≈ (the clock is an assumption) |
| Zen 4 caches | L1D 32 KB 8-way 64 B · L2 1 MB/core ≈14 cycles · L3 32 MB per 8-core chiplet ≈50 cycles | ✅ sizes · ≈ latencies |
| Golden Cove L1D | 48 KB, 12-way | ✅ |
| L1 latency / DRAM latency | ≈4–5 cycles / ≈80–100 ns | ≈ |
| PCIe per lane, per direction | Gen3 0.985 · Gen4 1.97 · Gen5 3.94 GB/s (x16 Gen4 ≈ 31.5, Gen5 ≈ 63) | ✅ |
| DDR5-5600 channel | 64 bit × 5,600 MT/s = 44.8 GB/s | ✅ (arithmetic) |
| HBM3 stack | 1,024 bit × 6.4 Gb/s = 819 GB/s | ✅ (JEDEC max) |
| GPU DRAM latency | ≈400–600 cycles | ≈ |
| Shared memory | 32 banks × 4 B; warp = 32 threads | ✅ |

I'll cross-check every ✅ against the spec-sheet PDFs again during the slice, and keep the source URLs in `specs.ts`.

---

## 8. Vertical slice (after your go-ahead)

1. App shell: theme (dark/light), Beginner/Intermediate, keyboard, persisted progress
2. Home: live counter, three doors + bridge with progress rings, Foundations strip
3. CPU world map (pan/zoom, cards, hover) + lesson **"Where does a byte live? Tag, index, offset"** (hook → 6 steps → quiz)
4. GPU world map + lesson **"SIMT: threads, warps, blocks, grids"**
5. Bridge: **"Why GPUs exist"** race (sum 100 M floats, CPU preset vs GPU preset, with the arithmetic shown)
6. **Cache simulator** with shareable URL + one mission + one challenge
7. `npm run validate` passing

Then I stop for your reaction before scaling out.

## 9. Questions for you

1. Name: keep Dielab, or switch to Die Atlas / something else?
2. Palette: Phosphor Lab as specified (my recommendation), or anything from Copper Trace?
3. The two ⚠️ spec choices in §7: 4090 tensor figure and which Apple chip.
4. Is 45 lessons OK? (The brief said ~40; I kept every topic you listed.)
