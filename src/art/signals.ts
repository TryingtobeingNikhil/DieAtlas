// Signal layer: every moving thing on a chip view is drawn here, on one canvas,
// from one global cycle counter. Pure imperative drawing in requestAnimationFrame;
// React never renders per frame.
//
// Style rules: signals move at constant speed (linear), as short streaks along routed
// wires; glow is a tight 1–4 px bloom on active elements only.

import { type Rect, center, route, gpuPackage, genGpuPackage, genCpuDie, DIMMS, smInside, cells, SM_OFF, HBM_OFF, GPU_PKGS } from './geometry';

export type Pt = [number, number];
export interface TF { x: number; y: number; k: number }
export interface Palette { gpu: string; cpu: string; mem: string; err: string; text: string; muted: string }

/** A routed wire with precomputed lengths, for walking a pulse along it. */
export class Wire {
  readonly pts: Pt[];
  readonly cum: number[];
  readonly len: number;
  constructor(waypoints: Pt[], chamfer = 6) {
    this.pts = route(waypoints, chamfer);
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(this.pts[i][0] - this.pts[i - 1][0], this.pts[i][1] - this.pts[i - 1][1]));
    this.len = this.cum[this.cum.length - 1];
  }
  at(d: number): Pt {
    d = Math.max(0, Math.min(this.len, d));
    let i = 1; while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const t = (d - this.cum[i - 1]) / (this.cum[i] - this.cum[i - 1] || 1);
    const [ax, ay] = this.pts[i - 1], [bx, by] = this.pts[i];
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  }
  /** points between distances a..b (inclusive of bends) */
  slice(a: number, b: number): Pt[] {
    a = Math.max(0, a); b = Math.min(this.len, b);
    const out: Pt[] = [this.at(a)];
    for (let i = 1; i < this.pts.length - 1; i++) if (this.cum[i] > a && this.cum[i] < b) out.push(this.pts[i]);
    out.push(this.at(b));
    return out;
  }
  reversed() { return new Wire([...this.pts].reverse(), 0); }
}

// ---------------------------------------------------------------- drawing helpers
export interface Draw {
  ctx: CanvasRenderingContext2D;
  k: number;            // world → css px scale
  dpr: number;
  pal: Palette;
  world(): void;        // switch to world coordinates
  screen(): void;       // switch to css-px coordinates
  toScreen(p: Pt): Pt;
  /** annotations are queued and drawn last, so flashes never cover them */
  marks: (() => void)[];
}

/** A pulse: bright head with a short fading tail, following the wire. lenPx/widthPx in screen px. */
export function streak(d: Draw, w: Wire, head: number, color: string, lenPx = 18, widthPx = 2.5) {
  const { ctx, k } = d;
  const L = lenPx / k, segs = 6;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = color;
  ctx.lineWidth = widthPx / k;
  for (let i = 0; i < segs; i++) {
    const a = head - L + (L * i) / segs, b = head - L + (L * (i + 1)) / segs;
    if (b <= 0 || a >= w.len) continue;
    const pts = w.slice(a, b);
    ctx.globalAlpha = ((i + 1) / segs) ** 2;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke();
  }
  // the head: the last few px at full brightness with a tight 1–3 px bloom (no round dot)
  const hp = w.slice(Math.max(0, head - 4 / k), Math.min(w.len, head));
  ctx.globalAlpha = 1; ctx.lineCap = 'square';
  ctx.shadowColor = color; ctx.shadowBlur = 3 * d.dpr;
  ctx.beginPath(); ctx.moveTo(hp[0][0], hp[0][1]); for (const p of hp.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke();
  ctx.shadowBlur = 0; ctx.lineCap = 'butt';
}

/** An instruction "flit": thin amber rectangle aligned with the wire; labelled when zoomed in. */
export function flit(d: Draw, w: Wire, head: number, color: string, label?: string) {
  const p = w.at(head), q = w.at(head - 4 / d.k);
  const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
  const { ctx } = d;
  d.screen();
  const [sx, sy] = d.toScreen(p);
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 2 * d.dpr;
  ctx.fillRect(-9, -1.5, 9, 3);
  ctx.restore(); ctx.shadowBlur = 0;
  if (label) {
    ctx.font = '600 10.5px "JetBrains Mono", monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(10,15,12,0.82)'; ctx.fillRect(sx + 6, sy - 17, tw + 8, 14);
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.8; ctx.strokeRect(sx + 6.5, sy - 16.5, tw + 7, 13); ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.fillText(label, sx + 10, sy - 6.5);
  }
  d.world();
}

/** Fill a rect with a colour at alpha a, with an optional tight glow. */
export function flash(d: Draw, r: Rect, color: string, a: number, glow = true) {
  if (a <= 0.01) return;
  const { ctx } = d;
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 3 * d.dpr; }
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

/** Hairline outline in screen px. */
export function outline(d: Draw, r: Rect, color: string, a: number, px = 1) {
  if (a <= 0.01) return;
  const { ctx } = d;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = color; ctx.lineWidth = px / d.k;
  ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.globalAlpha = 1;
}

/** Small screen-space marker (✓ / ✕) so hit/miss never relies on colour alone. */
export function mark(d: Draw, p: Pt, text: string, color: string, a: number) {
  if (a <= 0.01) return;
  d.marks.push(() => drawMark(d, p, text, color, a));
}
function drawMark(d: Draw, p: Pt, text: string, color: string, a: number) {
  d.screen();
  const [sx, sy] = d.toScreen(p);
  const { ctx } = d;
  ctx.globalAlpha = Math.min(1, a);
  ctx.font = '700 12px Inter, sans-serif'; ctx.fillStyle = color; ctx.textAlign = 'center';
  ctx.fillText(text, sx, sy - 6);
  ctx.textAlign = 'start'; ctx.globalAlpha = 1;
  d.world();
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: number) => String(n).split('').map(ch => SUP[+ch] ?? ch).join('');
const hash = (a: number, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const decay = (dt: number, len: number) => (dt < 0 || dt > len ? 0 : 1 - dt / len);

// ---------------------------------------------------------------- scenarios
export interface Scenario {
  /** cycles per real second at this zoom (the slow-motion factor follows from the device clock) */
  rate: number;
  deviceHz: number;
  /** what the time readout should add */
  note: string;
  draw(d: Draw, cycle: number): void;
  /** static highlighted paths for reduced motion */
  paths: Wire[];
}

/** What a package-view scenario needs to know about a GPU floorplan. */
export interface PkgGeo {
  /** compute units that issue loads (enabled ones only) */
  units: Rect[];
  /** L2 halves: [left, right] */
  l2: [Rect, Rect];
  /** x that splits the die into the left and right L2 halves */
  midX: number;
  die: Rect;
  /** memory controllers: [left, right] */
  memctl: [Rect, Rect];
  /** device-memory sites (stacks or chips) */
  mem: Rect[];
  /** host link: polyline from outside the package to the L2 */
  host: Pt[];
}
export interface PkgTiming {
  /** round trips in cycles (one value each; the note states the honest range) */
  l2: number; mem: number; hz: number; note: string;
}

export function hopperGeo(): PkgGeo {
  const g = gpuPackage(GPU_PKGS[0]), p = GPU_PKGS[0];
  return {
    units: g.sms.filter((_, i) => !SM_OFF.has(i)), l2: [g.l2[0], g.l2[1]], midX: g.blockSched.x, die: g.die,
    memctl: [g.memctl[0], g.memctl[1]], mem: g.hbm.filter((_, i) => i !== HBM_OFF),
    host: [[p.x + 520, p.y + p.h + 60], [p.x + 520, g.io[1].y + 4], [p.x + 520, g.l2[1].y + g.l2[1].h - 4]],
  };
}
export function genericGpuGeo(): PkgGeo {
  const p = GPU_PKGS[0], g = genGpuPackage(p), cx = g.die.x + g.die.w / 2;
  return {
    units: g.cus, l2: [g.l2h[0], g.l2h[1]], midX: cx, die: g.die, memctl: [g.memctl[0], g.memctl[1]], mem: g.mem,
    host: [[g.hostIf.x + 40, p.y - 60], [g.hostIf.x + 40, g.hostIf.y + g.hostIf.h], [g.hostIf.x + 40, g.l2h[0].y + 4]],
  };
}
/** H100: Luo et al. 2025 (H800 PCIe) measured L2 ≈ 258–414 cycles (near/far partition) and ≈ 556–744 on a miss. */
export const HOPPER_TIMING: PkgTiming = { l2: 260, mem: 600, hz: 1.98e9, note: 'L2 hit ≈ 260–410 · HBM ≈ 560–740 cycles round trip (measured, approx.)' };
/** Generic GPU: typical ranges, not any one product. */
export const GENERIC_GPU_TIMING: PkgTiming = { l2: 300, mem: 600, hz: 2e9, note: 'L2 hit ~200–400 · device memory ~400–800 cycles round trip (typical)' };

/** One GPU, package view: memory requests CU → L2 (→ device memory) and back; CUs firing. */
export function gpuPackageScenario(g: PkgGeo, tm: PkgTiming): Scenario {
  const toL2 = tm.l2 / 2, toMem = (tm.mem - tm.l2) / 2;   // one-way legs; miss = 2·toL2 + 2·toMem
  const pick = g.units.filter((_, j) => j % 5 === 0 || g.units.length < 40);
  const half = (r: Rect) => (r.x + r.w / 2 < g.midX ? g.l2[0] : g.l2[1]);
  const unitWire = (s: Rect) => {
    const h = half(s), top = s.y < h.y;
    const c = center(s), yEdge = top ? h.y + 4 : h.y + h.h - 4;
    const bx = Math.max(h.x + 8, Math.min(h.x + h.w - 8, c.x + 14));
    return new Wire([[c.x, c.y], [c.x, (c.y + yEdge) / 2], [bx, (c.y + yEdge) / 2], [bx, yEdge]] as Pt[], 5);
  };
  const memWire = (h: Rect, m: Rect) => {
    const left = m.x < g.die.x, mc = left ? g.memctl[0] : g.memctl[1];
    const mcen = center(m), y = mcen.y + 10;
    return new Wire([[center(h).x, center(h).y], [left ? h.x + 6 : h.x + h.w - 6, center(h).y], [mc.x + mc.w / 2, center(h).y], [mc.x + mc.w / 2, y], [mcen.x, y]] as Pt[], 8);
  };
  const P = 1200, EVERY = 30;
  const events = Array.from({ length: P / EVERY }, (_, n) => {
    const u = pick[Math.floor(hash(n, 1) * pick.length)];
    const hit = hash(n, 2) < 0.6;
    const h = half(u), left = h === g.l2[0];
    const sites = g.mem.filter(m => (m.x < g.die.x) === left);
    const site = sites[Math.floor(hash(n, 3) * sites.length)];
    const a = unitWire(u), b = memWire(h, site);
    const bank = cells(h, 8, 2, 0.06)[Math.floor(hash(n, 4) * 16)];
    return { start: n * EVERY, u, hit, a, ar: a.reversed(), b, br: b.reversed(), site, bank };
  });
  const host = new Wire(g.host, 6);
  return {
    rate: 110, deviceHz: tm.hz, note: tm.note,
    paths: events.slice(0, 6).flatMap(e => [e.a, e.b]),
    draw(d, cyc) {
      const { pal } = d;
      // compute units firing: green flashes on the tiles
      g.units.forEach((s, i) => {
        const win = Math.floor(cyc / 14), ph = (cyc % 14) / 14;
        if (hash(i, win) < 0.09) flash(d, s, pal.gpu, 0.32 * (1 - ph));
      });
      for (const e of events) {
        let dt = ((cyc - e.start) % P + P) % P;
        if (dt > tm.mem + 20) continue;
        if (dt < toL2) streak(d, e.a, (dt / toL2) * e.a.len, pal.mem, 12, 1.5);
        if (e.hit) {
          if (dt >= toL2 && dt < tm.l2) streak(d, e.ar, ((dt - toL2) / toL2) * e.a.len, pal.mem, 20, 2.5);
          flash(d, e.bank, pal.mem, 0.7 * decay(dt - toL2, 14));
          mark(d, [center(e.bank).x, e.bank.y], '✓', pal.mem, decay(dt - toL2, 40));
          flash(d, e.u, pal.mem, 0.45 * decay(dt - tm.l2, 12));
        } else {
          outline(d, e.bank, pal.err, decay(dt - toL2, 30), 1.5);
          mark(d, [center(e.bank).x, e.bank.y], '✕ miss', pal.err, decay(dt - toL2, 50));
          dt -= toL2;
          if (dt >= 0 && dt < toMem) streak(d, e.b, (dt / toMem) * e.b.len, pal.mem, 12, 1.5);
          flash(d, e.site, pal.mem, 0.28 * decay(dt - toMem, 24));
          dt -= toMem;
          // the line streams back: a longer, brighter pulse
          if (dt >= 0 && dt < toMem) streak(d, e.br, (dt / toMem) * e.b.len, pal.mem, 30, 2.5);
          flash(d, e.bank, pal.mem, 0.7 * decay(dt - toMem, 14));
          dt -= toMem;
          if (dt >= 0 && dt < toL2) streak(d, e.ar, (dt / toL2) * e.a.len, pal.mem, 20, 2.5);
          flash(d, e.u, pal.mem, 0.45 * decay(dt - toL2, 12));
        }
      }
      const h = ((cyc % 400) + 400) % 400;
      if (h < 90) streak(d, host, (h / 90) * host.len, pal.mem, 20, 2);
    },
  };
}

/**
 * Generic CPU die: loads that miss in a core's private caches go over the ring to an L3
 * slice; L3 misses continue to the memory controller and out to a DIMM. Typical desktop values.
 */
export function cpuDieScenario(): Scenario {
  const g = genCpuDie(), r = g.ring, ry = r.y + r.h / 2;
  const L3 = 50, MEM = 380;                                   // round trips in cycles (typical)
  const toL3 = L3 / 2, toMem = (MEM - L3) / 2;
  const dimm = DIMMS[0];
  const reqWire = (ci: number, si: number) => {
    const c = g.cores[ci], s = g.slices[si], top = ci < 4;
    const cx = c.x + c.w / 2, sx = s.x + s.w / 2, sy = s.y + s.h / 2;
    return new Wire([[cx, top ? c.y + c.h - 6 : c.y + 6], [cx, ry], [sx, ry], [sx, sy]] as Pt[], 4);
  };
  const memWire = (si: number) => {
    const s = g.slices[si], sx = s.x + s.w / 2, mc = center(g.imc);
    return new Wire([[sx, s.y + s.h / 2], [sx, ry], [mc.x, ry], [mc.x, mc.y - 60], [dimm.x + dimm.w / 2, mc.y - 60]] as Pt[], 6);
  };
  const P = 900, EVERY = 45;
  const events = Array.from({ length: P / EVERY }, (_, n) => {
    const ci = Math.floor(hash(n, 1) * 8), si = Math.floor(hash(n, 2) * 8), hit = hash(n, 3) < 0.65;
    const a = reqWire(ci, si), b = memWire(si);
    return { start: n * EVERY, core: g.cores[ci], slice: g.slices[si], hit, a, ar: a.reversed(), b, br: b.reversed() };
  });
  return {
    rate: 45, deviceHz: 4e9,
    note: 'L3 hit ~40–80 · DRAM ~300–450 cycles round trip (typical desktop, approx.)',
    paths: events.slice(0, 6).flatMap(e => [e.a, e.b]),
    draw(d, cyc) {
      const { pal } = d;
      for (const e of events) {
        let dt = ((cyc - e.start) % P + P) % P;
        if (dt > MEM + 20) continue;
        flash(d, e.core, pal.cpu, 0.18 * decay(dt, 10), false);
        if (dt < toL3) streak(d, e.a, (dt / toL3) * e.a.len, pal.mem, 14, 1.5);
        if (e.hit) {
          if (dt >= toL3 && dt < L3) streak(d, e.ar, ((dt - toL3) / toL3) * e.a.len, pal.mem, 20, 2.5);
          flash(d, e.slice, pal.mem, 0.6 * decay(dt - toL3, 8));
          mark(d, [center(e.slice).x, e.slice.y], '✓ L3', pal.mem, decay(dt - toL3, 30));
        } else {
          outline(d, e.slice, pal.err, decay(dt - toL3, 30), 1.5);
          mark(d, [center(e.slice).x, e.slice.y], '✕ miss', pal.err, decay(dt - toL3, 40));
          dt -= toL3;
          if (dt >= 0 && dt < toMem) streak(d, e.b, (dt / toMem) * e.b.len, pal.mem, 14, 1.5);
          dt -= toMem;
          if (dt >= 0 && dt < toMem) streak(d, e.br, (dt / toMem) * e.b.len, pal.mem, 30, 2.5);
          dt -= toMem;
          if (dt >= 0 && dt < toL3) streak(d, e.ar, (dt / toL3) * e.a.len, pal.mem, 20, 2.5);
          flash(d, e.core, pal.mem, 0.35 * decay(dt - toL3, 10));
        }
      }
    },
  };
}

/** Inside SM 0: four schedulers issue one warp-instruction per cycle each. */
export function smScenario(s: Rect, generic = false): Scenario {
  const k = smInside(s);
  const PROG = ['FFMA', 'FFMA', 'LDS', 'FFMA', 'HMMA', 'IMAD', 'FFMA', 'DFMA', 'FFMA·div', 'LDG', 'FFMA', 'HMMA'];
  // vendor-neutral names for the generic compute unit
  const NAME: Record<string, string> = generic ? { FFMA: 'FMA', HMMA: 'MMA', IMAD: 'INT', DFMA: 'FP64', LDS: 'LD.shared', LDG: 'LD.global' } : {};
  const nm = (o: string) => NAME[o] ?? o;
  const SMEM_LAT = 30;
  const parts = k.inner.map((q, p) => {
    const unitOf = (op: string): Rect => (op.startsWith('FFMA') ? q.fp32 : op === 'IMAD' ? q.int32 : op === 'DFMA' ? q.fp64 : op === 'HMMA' ? q.tensor : q.ldst);
    const issue = new Wire([[center(q.l0).x, q.l0.y + q.l0.h], [center(q.sched).x, center(q.sched).y], [center(q.dispatch).x, center(q.dispatch).y]] as Pt[], 0.15);
    const toUnit = (u: Rect) => new Wire([[center(q.dispatch).x, center(q.dispatch).y], [center(q.dispatch).x, q.regs.y + q.regs.h + 0.15], [center(u).x, q.regs.y + q.regs.h + 0.15], [center(u).x, u.y]] as Pt[], 0.12);
    const units: Record<string, Wire> = {};
    for (const op of ['FFMA', 'IMAD', 'DFMA', 'HMMA', 'LDS']) units[op] = toUnit(unitOf(op));
    const smemWire = new Wire([[center(q.ldst).x, q.ldst.y + q.ldst.h], [center(q.ldst).x, k.smem.y]] as Pt[], 0.1);
    const back = new Wire([[center(q.ldst).x + 0.4, k.smem.y], [center(q.ldst).x + 0.4, q.regs.y + q.regs.h]] as Pt[], 0.1);
    const exitX = p % 2 === 0 ? s.x - 1.5 : s.x + s.w + 1.5;
    const out = new Wire([[center(q.ldst).x, center(q.ldst).y], [p % 2 === 0 ? q.ldst.x - 0.2 : q.ldst.x + q.ldst.w + 0.2, center(q.ldst).y], [exitX, center(q.ldst).y]] as Pt[], 0.1);
    return {
      q, issue, units, smemWire, back, out, unitOf,
      lanes: { FFMA: cells(q.fp32, 8, 4), IMAD: cells(q.int32, 4, 4), DFMA: cells(q.fp64, 4, 4) } as Record<string, Rect[]>,
      ldst: cells(q.ldst, 8, 1, 0.22),
      macRows: Array.from({ length: 6 }, (_, r) => ({ x: q.tensor.x, y: q.tensor.y + (r * q.tensor.h) / 6, w: q.tensor.w, h: q.tensor.h / 6 })),
    };
  });
  const banks = cells(k.smem, 32, 1, 0.08);
  const op = (n: number, p: number) => PROG[(((n + 3 * p) % PROG.length) + PROG.length) % PROG.length];
  const warp = (n: number, p: number) => (((n * 5 + p * 7) % 16) + 16) % 16;
  return {
    rate: 4, deviceHz: 1.98e9,
    note: generic ? '1 warp-instruction per scheduler per cycle · shared memory ~20–40 cycles (typical)' : `1 warp-instruction per scheduler per cycle · shared memory ≈ ${SMEM_LAT} cycles (approx.)`,
    paths: parts.flatMap(pp => [pp.issue, pp.units.FFMA]),
    draw(d, cyc) {
      const { pal } = d;
      const n = Math.floor(cyc), f = cyc - n;
      parts.forEach((pp, p) => {
        const o = op(n, p), base = o.replace('·div', '');
        // scheduler picks a warp: amber flash, flit travels to dispatch, then to the unit
        outline(d, pp.q.sched, pal.cpu, decay(f, 0.4), 1);
        flash(d, pp.q.sched, pal.cpu, 0.22 * decay(f, 0.35), false);
        if (f < 0.35) flit(d, pp.issue, (f / 0.35) * pp.issue.len, pal.cpu, `w${warp(n, p)} ${nm(base)}`);
        flash(d, pp.q.regs, pal.mem, 0.35 * decay(f - 0.3, 0.3));
        const wire = pp.units[base === 'LDG' ? 'LDS' : base];
        if (f >= 0.35 && f < 0.55) flit(d, wire, ((f - 0.35) / 0.2) * wire.len, pal.cpu);
        const g = f - 0.55;
        if (base in pp.lanes) {
          // a 32-wide (or 16-wide) wave; divergence: half the lanes stay dark
          const lanes = pp.lanes[base];
          lanes.forEach((r, i) => {
            const col = i % (base === 'FFMA' ? 8 : 4), row = Math.floor(i / (base === 'FFMA' ? 8 : 4));
            const on = !(o.endsWith('div') && i >= lanes.length / 2);
            const t = g - (col * 0.035 + row * 0.01);
            if (on) flash(d, r, pal.gpu, 0.85 * decay(t, 0.35));
            else outline(d, r, pal.muted, 0.6 * decay(g, 0.45), 0.5);
          });
          if (o.endsWith('div')) mark(d, [center(pp.q.fp32).x, pp.q.fp32.y], '16 / 32 active', pal.muted, decay(g, 0.45));
        } else if (base === 'HMMA') {
          pp.macRows.forEach((r, i) => flash(d, r, pal.gpu, 0.7 * decay(g - i * 0.05, 0.3)));
        } else {
          pp.ldst.forEach((r, i) => flash(d, r, pal.mem, 0.7 * decay(g - i * 0.02, 0.3)));
        }
      });
      // memory ops in flight from earlier cycles
      for (let m = n - SMEM_LAT - 1; m <= n; m++) {
        parts.forEach((pp, p) => {
          const o = op(m, p), t = cyc - m - 0.55;
          if (o === 'LDS') {
            if (t >= 0 && t < 1) streak(d, pp.smemWire, t * pp.smemWire.len, pal.mem, 16, 2);
            if (t >= 0.8) banks.forEach((b, i) => flash(d, b, pal.mem, 0.55 * decay(t - 0.8 - i * 0.012, 0.6)));
            const r = t - (SMEM_LAT - 1);
            if (r >= 0 && r < 1) streak(d, pp.back, r * pp.back.len, pal.mem, 20, 2.5);
            flash(d, pp.q.regs, pal.mem, 0.45 * decay(r - 1, 0.5));
          } else if (o === 'LDG') {
            if (t >= 0 && t < 2) streak(d, pp.out, (t / 2) * pp.out.len, pal.mem, 18, 2);
            if (t >= 0.5 && t < 4) mark(d, [center(pp.q.ldst).x, pp.q.ldst.y], generic ? 'load → L2/memory ~200–800 cyc' : 'LDG → L2/HBM ≈ 260–740 cyc', pal.mem, Math.min(1, 4 - t));
          }
        });
      }
    },
  };
}

// ---------------------------------------------------------------- engine
export class SignalLayer {
  private raf = 0;
  private running = false;
  private visible = true;
  private cycle = 0;
  private last = 0;
  private pal: Palette;
  private io: IntersectionObserver;
  private mo: MutationObserver;
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  get isRunning() { return this.running; }

  constructor(
    private canvas: HTMLCanvasElement,
    private getTf: () => TF,
    private scenario: Scenario | null,
    private readout: HTMLElement | null,
  ) {
    this.pal = this.readPalette();
    this.io = new IntersectionObserver(es => { this.visible = es[0]?.isIntersecting ?? true; this.kick(); });
    this.io.observe(canvas);
    this.mo = new MutationObserver(() => { this.pal = this.readPalette(); this.render(); });
    this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', this.kick);
    this.kick();
  }

  private readPalette(): Palette {
    const cs = getComputedStyle(document.documentElement), v = (n: string) => cs.getPropertyValue(n).trim();
    return { gpu: v('--gpu'), cpu: v('--cpu'), mem: v('--mem'), err: v('--err'), text: v('--text'), muted: v('--muted') };
  }

  setScenario(s: Scenario | null) { this.scenario = s; this.cycle = 0; this.render(); this.kick(); }

  private kick = () => {
    const should = !!this.scenario && !this.reduced && this.visible && !document.hidden;
    if (should && !this.running) { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
    if (!should && this.running) { this.running = false; cancelAnimationFrame(this.raf); }
    if (!should) this.render();
  };

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);   // clamp so a background tab doesn't jump
    this.last = now;
    if (this.scenario) this.cycle += dt * this.scenario.rate;
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Reduced motion: advance by hand. */
  step(cycles: number) { this.cycle += cycles; this.render(); }

  render() {
    const c = this.canvas, dpr = Math.min(2, devicePixelRatio || 1);
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const s = this.scenario;
    if (!s) { if (this.readout) this.readout.textContent = ''; return; }
    const tf = this.getTf();
    const d: Draw = {
      ctx, k: tf.k, dpr, pal: this.pal,
      world: () => ctx.setTransform(dpr * tf.k, 0, 0, dpr * tf.k, dpr * tf.x, dpr * tf.y),
      screen: () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0),
      toScreen: p => [tf.x + p[0] * tf.k, tf.y + p[1] * tf.k],
      marks: [],
    };
    d.world();
    if (this.reduced) {
      // static highlighted paths instead of motion
      ctx.strokeStyle = this.pal.mem; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5 / tf.k;
      for (const p of s.paths) { ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); for (const q of p.pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    s.draw(d, this.cycle);
    d.marks.forEach(m => m());
    if (this.readout) {
      const perCycleMs = 1000 / s.rate, slow = s.deviceHz / s.rate;
      const e = Math.floor(Math.log10(slow)), m = slow / 10 ** e;
      this.readout.textContent = `cycle ${Math.floor(this.cycle).toLocaleString('en-US')} · 1 cycle ≈ ${perCycleMs >= 100 ? Math.round(perCycleMs) : perCycleMs.toFixed(1)} ms on screen · slowed ≈ ${m.toFixed(1)}×10${sup(e)}× · ${s.note}`;
    }
  }

  destroy() {
    this.running = false; cancelAnimationFrame(this.raf);
    this.io.disconnect(); this.mo.disconnect();
    document.removeEventListener('visibilitychange', this.kick);
  }
}
