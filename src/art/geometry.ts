// Floor-plan geometry for the chip drawings, in world units. Pure TS: the art,
// the clickable map regions and the validation script all share these numbers.
// Proportions are stylised top views, not to-scale die photos.

export interface Rect { x: number; y: number; w: number; h: number }

/** A sub-rectangle of r, in fractions of r. */
export const sub = (r: Rect, u: number, v: number, w: number, h: number): Rect => ({ x: r.x + u * r.w, y: r.y + v * r.h, w: w * r.w, h: h * r.h });
export const pad = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });
export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const union = (rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y));
  const x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

// =====================================================================
// GPU world: a DGX H100-style board with 8 H100 SXM5 packages.
// =====================================================================
export const GPU_BOARD: Rect = { x: 0, y: 0, w: 5500, h: 3000 };
export const PKG_W = 1000, PKG_H = 700;
export const GPU_PKGS: Rect[] = Array.from({ length: 8 }, (_, i) => ({ x: 200 + (i % 4) * 1250, y: i < 4 ? 200 : 1900, w: PKG_W, h: PKG_H }));
export const NVSWITCHES: Rect[] = Array.from({ length: 4 }, (_, i) => ({ x: 450 + i * 1250, y: 1190, w: 500, h: 420 }));
export const NICS: Rect[] = Array.from({ length: 8 }, (_, i) => ({ x: 5080, y: 200 + i * 300, w: 280, h: 220 }));
export const HOST_TRAY: Rect = { x: 200, y: 2720, w: 4750, h: 200 };

/** Everything inside one H100 package, relative to the package rect p. */
export function gpuPackage(p: Rect) {
  const die: Rect = { x: p.x + 230, y: p.y + 90, w: 540, h: 520 };
  const hbm: Rect[] = [100, 270, 440].flatMap(dy => [
    { x: p.x + 60, y: p.y + dy, w: 140, h: 150 },
    { x: p.x + 800, y: p.y + dy, w: 140, h: 150 },
  ]);
  const smTop: Rect = { x: die.x + 20, y: die.y + 20, w: 500, h: 200 };
  const smBot: Rect = { x: die.x + 20, y: die.y + 300, w: 500, h: 200 };
  const l2: Rect[] = [{ x: die.x + 20, y: die.y + 230, w: 220, h: 60 }, { x: die.x + 300, y: die.y + 230, w: 220, h: 60 }];
  const blockSched: Rect = { x: die.x + 246, y: die.y + 232, w: 48, h: 56 };
  const io: Rect[] = [{ x: die.x + 20, y: die.y + 3, w: 500, h: 12 }, { x: die.x + 20, y: die.y + 505, w: 500, h: 12 }];
  // 8 GPCs × 18 SMs = 144 SM sites; 132 are enabled on H100 SXM5.
  const gpcs: Rect[] = Array.from({ length: 8 }, (_, g) => {
    const b = g < 4 ? smTop : smBot;
    return { x: b.x + (g % 4) * (500 + 6.67) / 4, y: b.y, w: 120, h: 200 };
  });
  const sms: Rect[] = gpcs.flatMap(g => Array.from({ length: 18 }, (_, k) => ({ x: g.x + (k % 3) * 41.5, y: g.y + Math.floor(k / 3) * 34, w: 37, h: 30 })));
  return { die, hbm, smTop, smBot, l2, blockSched, io, gpcs, sms };
}
/** 12 fused-off SM sites per package. Which ones varies chip to chip: illustrative. */
export const SM_OFF = new Set([5, 22, 31, 47, 58, 66, 79, 90, 101, 113, 122, 139]);

/** Inside one SM tile: 4 partitions + shared memory / L1. */
export function smInside(s: Rect) {
  const parts = [0, 1, 2, 3].map(p => sub(s, 0.03 + (p % 2) * 0.485, 0.03 + Math.floor(p / 2) * 0.385, 0.455, 0.36));
  const inP = (p: Rect) => ({
    sched: sub(p, 0.04, 0.05, 0.92, 0.17),
    regs: sub(p, 0.04, 0.27, 0.92, 0.2),
    lanes: sub(p, 0.04, 0.53, 0.6, 0.42),
    tensor: sub(p, 0.68, 0.53, 0.28, 0.42),
  });
  return { parts, inner: parts.map(inP), smem: sub(s, 0.03, 0.8, 0.94, 0.17) };
}

export const GPU0 = gpuPackage(GPU_PKGS[0]);
export const SM0 = GPU0.sms[0];
export const SM0_IN = smInside(SM0);

// =====================================================================
// CPU world: an AM5 motherboard with a Ryzen 9 7950X (2 CCDs + I/O die).
// =====================================================================
export const CPU_BOARD: Rect = { x: 0, y: 0, w: 2400, h: 1500 };
export const CPU_PKG: Rect = { x: 700, y: 450, w: 600, h: 600 };
export const CCDS: Rect[] = [{ x: 730, y: 540, w: 290, h: 180 }, { x: 730, y: 780, w: 290, h: 180 }];
export const IOD: Rect = { x: 1060, y: 590, w: 210, h: 320 };
export const DIMMS: Rect[] = Array.from({ length: 4 }, (_, i) => ({ x: 1390 + i * 55, y: 470, w: 34, h: 560 }));
export const VRMS: Rect[] = Array.from({ length: 8 }, (_, i) => ({ x: 590, y: 470 + i * 72, w: 70, h: 54 }));
export const NVME: Rect = { x: 260, y: 300, w: 380, h: 70 };
export const GPU_CARD: Rect = { x: 280, y: 1150, w: 1340, h: 220 };
export const PCIE_SLOT: Rect = { x: 300, y: 1215, w: 1300, h: 34 };
export const NUMA_GHOST: Rect = { x: 1760, y: 450, w: 560, h: 600 };
export const CPU_PKG_VIEW: Rect = { x: 670, y: 430, w: 960, h: 640 };

export function ccdCores(c: Rect): Rect[] {
  return Array.from({ length: 8 }, (_, i) => ({ x: c.x + 8 + (i % 4) * 70, y: c.y + (i < 4 ? 8 : 108), w: 64, h: 64 }));
}
export const ccdL3 = (c: Rect): Rect => ({ x: c.x + 8, y: c.y + 78, w: 274, h: 24 });
export const CORES: Rect[] = CCDS.flatMap(ccdCores);
export const CORE0 = CORES[0];
export const L3S: Rect[] = CCDS.map(ccdL3);
export const FABRIC_LINKS: Rect[] = CCDS.map(c => ({ x: 1022, y: c.y + 84, w: 36, h: 12 }));
export const IOD_MEMCTL: Rect = { x: IOD.x + 14, y: IOD.y + 14, w: IOD.w - 28, h: 88 };
export const IOD_PCIE: Rect = { x: IOD.x + 14, y: IOD.y + IOD.h - 102, w: IOD.w - 28, h: 88 };

/** Inside one Zen 4 core (stylised floor plan). */
export function coreInside(c: Rect) {
  const frontend = sub(c, 0.04, 0.04, 0.44, 0.26);
  const execs = sub(c, 0.52, 0.33, 0.44, 0.24);
  const eW = 0.44 / 5;
  return {
    frontend,
    bpred: sub(c, 0.06, 0.08, 0.19, 0.18),
    l1i: sub(c, 0.27, 0.08, 0.19, 0.18),
    decode: sub(c, 0.52, 0.04, 0.44, 0.26),
    ooo: sub(c, 0.04, 0.33, 0.44, 0.24),
    rob: sub(c, 0.06, 0.36, 0.13, 0.18),
    sched: sub(c, 0.205, 0.36, 0.13, 0.18),
    regs: sub(c, 0.35, 0.36, 0.11, 0.18),
    exec: execs,
    alu: sub(c, 0.53, 0.36, eW - 0.012, 0.18),
    fpu: sub(c, 0.53 + eW, 0.36, eW - 0.012, 0.18),
    simd: sub(c, 0.53 + 2 * eW, 0.36, eW - 0.012, 0.18),
    lsu: sub(c, 0.53 + 3 * eW, 0.36, eW - 0.012, 0.18),
    tlb: sub(c, 0.53 + 4 * eW, 0.36, eW - 0.02, 0.18),
    l1d: sub(c, 0.04, 0.6, 0.92, 0.12),
    l2: sub(c, 0.04, 0.75, 0.92, 0.21),
  };
}
export const CORE0_IN = coreInside(CORE0);
