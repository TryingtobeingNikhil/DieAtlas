# Dossier figures: parts and animation modes

Each dossier has one large figure. Sections point at it with `cue: { parts: [...], mode: '...' }`.
`parts` are highlighted (bright, others dimmed); `mode` picks the looping animation.
Use only the ids below; `npm run validate` checks them.

## `cache` (L1 data cache · cpu.l1d)
parts: `core`, `lsu`, `tlb`, `addr`, `addr-tag`, `addr-index`, `addr-offset`, `array`, `set`, `ways`, `tags`, `data`, `compare`, `hit`, `miss`, `l2`, `fill`, `lru`, `prefetch`
modes: `idle`, `split` (address bits split into tag/index/offset), `index` (set row selected by a scan line), `compare-hit` (tags compared, one way flashes HIT), `compare-miss` (no match, MISS), `fill` (request to L2, line streams back and fills the LRU way), `prefetch` (next lines stream in ahead of use), `amat` (hits fast, occasional slow miss; timing bars)

## `core` (CPU core · cpu.core)
parts: `bpred`, `l1i`, `fetch`, `decode`, `uopcache`, `rename`, `rob`, `sched`, `prf`, `alu`, `fpsimd`, `lsu`, `l1d`, `l2`, `retire`, `thread2`
modes: `idle`, `flow` (instructions stream through the pipeline), `predict` (predictor steers fetch), `mispredict` (wrong path squashed, refetch), `ooo` (later independent ops issue before a stalled one), `retire` (results leave the ROB in order), `stall` (a load misses, ROB fills up), `smt` (two threads in two colours share the core), `wide` (N instructions per cycle through decode/rename)

## `cu` (GPU compute unit · gpu.cu)
parts: `warps`, `sched`, `dispatch`, `regs`, `int32`, `fp32`, `fp64`, `matrix`, `ldst`, `sfu`, `smem`, `l1`
modes: `idle`, `issue` (each scheduler issues one warp-instruction per cycle; lanes fire in a 32-wide wave), `hide` (warps stall on memory, others issue), `occupancy` (warp slots fill until registers or shared memory run out), `diverge` (half the lanes masked), `matrix` (tile MMA sweep), `smem` (32-bank access)

## `devmem` (device memory · gpu.devmem)
parts: `gpu-die`, `interposer`, `stack`, `base-die`, `dram-dies`, `tsv`, `phy`, `channels`, `gddr-chips`, `board-traces`, `banks`
modes: `top` (top view: die, HBM stacks, interposer wiring), `side` (side view: base die + DRAM dies + TSVs), `transfer` (data streaming over many channels), `gddr` (GDDR chips around a GPU on a board), `compare` (HBM vs GDDR side by side: width vs speed), `refresh` (banks refreshing)

## `gfx` (graphics fixed-function · gpu.gfx)
parts: `geometry`, `raster`, `shader`, `texture`, `rop`, `rt`
modes: `pipeline` (triangle → pixels → texture → blend), `rt` (a ray tests boxes, then a triangle)

## `tma` (Hopper TMA · hopper.tma)
parts: `global`, `l2`, `tma`, `smem`, `threads`, `tile`, `barrier`
modes: `copy` (one instruction moves a whole tile into shared memory), `overlap` (threads compute on tile N while TMA fetches tile N+1)
