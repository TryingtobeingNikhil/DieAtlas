import { useEffect, useRef, type ReactNode } from 'react';
import type { Cue } from '../content/parts/types';

// Component-page figures. Each figure is one static SVG. Two things change it:
//  · highlight: elements carry data-p="part part"; lit parts stay bright, the rest dim.
//  · mode: a looping timeline that writes opacity / transform / dash offset / classes
//    straight to elements tagged data-a="name" (refs, never a React render per frame).

/** Keyframes: [time 0–1 of the loop, value]; held before the first and after the last. */
export type K = [number, number][];
export interface Track {
  /** data-a name (all elements with that name) */
  a: string;
  o?: K; x?: K; y?: K; sx?: K; d?: K;
  /** class switched on during these [from, to) windows */
  cls?: [string, [number, number][]];
}
export interface Anim { dur: number; tracks: Track[]; /** frame shown when motion is reduced (0–1) */ still?: number }

function at(k: K, t: number): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [t0, v0] = k[i - 1], [t1, v1] = k[i];
      return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return k[k.length - 1][1];
}

/** Hold v until t, then jump (for discrete steps inside a K). */
export const step = (pairs: [number, number][]): K => pairs.flatMap(([t, v], i) => (i === 0 ? [[t, v]] : [[t - 0.0001, pairs[i - 1][1]], [t, v]])) as K;
/** Visible during [t0, t1] with short fades. */
export const showK = (t0: number, t1: number, f = 0.02): K => [[t0 - f, 0], [t0, 1], [t1, 1], [t1 + f, 0]];
/** Move through points at the given times. */
export const pathK = (pts: [number, number, number][]): { x: K; y: K } => ({ x: pts.map(p => [p[0], p[1]]), y: pts.map(p => [p[0], p[2]]) });

export function Fig({ name, cue, hover, modes, label, viewBox = '0 0 800 440', children }: {
  name: string; cue: Cue; hover: string[] | null; modes: Record<string, Anim>; label: string; viewBox?: string; children: ReactNode;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const parts = hover && hover.length ? hover : cue.parts ?? [];

  // highlight: toggle .on for matching parts (only when the cue or hover changes)
  useEffect(() => {
    const el = svg.current; if (!el) return;
    el.classList.toggle('has-hl', parts.length > 0);
    el.querySelectorAll<SVGElement>('[data-p]').forEach(n => {
      const ps = (n.dataset.p ?? '').split(' ');
      n.classList.toggle('on', ps.some(p => parts.includes(p)));
    });
  }, [parts.join(' ')]); // eslint-disable-line react-hooks/exhaustive-deps

  // animation loop for the current mode; paused while off-screen
  const mode = cue.mode && modes[cue.mode] ? cue.mode : null;
  useEffect(() => {
    const el = svg.current; if (!el || !mode) return;
    const anim = modes[mode];
    const sets = anim.tracks.map(tr => Array.from(el.querySelectorAll<SVGElement>(`[data-a~="${tr.a}"]`)));
    const touched = new Set<SVGElement>(sets.flat());
    // remember each element's resting style so leaving the mode restores it
    const rest = new Map([...touched].map(n => [n, { o: n.style.opacity, t: n.style.transform, d: n.style.strokeDashoffset }]));
    touched.forEach(n => { n.style.transformBox = 'fill-box'; n.style.transformOrigin = 'left center'; });
    const apply = (t: number) => {
      anim.tracks.forEach((tr, i) => {
        const o = tr.o && at(tr.o, t), x = tr.x ? at(tr.x, t) : 0, y = tr.y ? at(tr.y, t) : 0, sx = tr.sx && at(tr.sx, t), d = tr.d && at(tr.d, t);
        const tf = tr.x || tr.y || tr.sx ? `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)${tr.sx ? ` scaleX(${(sx as number).toFixed(3)})` : ''}` : null;
        const on = tr.cls ? tr.cls[1].some(([a, b]) => t >= a && t < b) : false;
        for (const n of sets[i]) {
          if (tr.o) n.style.opacity = (o as number).toFixed(3);
          if (tf) n.style.transform = tf;
          if (tr.d) n.style.strokeDashoffset = (d as number).toFixed(1);
          if (tr.cls) n.classList.toggle(tr.cls[0], on);
        }
      });
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, visible = true, t0 = performance.now();
    const loop = (now: number) => { apply((((now - t0) / 1000) % anim.dur) / anim.dur); if (visible) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was && !reduced) { t0 = performance.now(); raf = requestAnimationFrame(loop); }
    });
    io.observe(el);
    if (reduced) apply(anim.still ?? 0.7); else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      rest.forEach((r, n) => { n.style.opacity = r.o; n.style.transform = r.t; n.style.strokeDashoffset = r.d; });
      anim.tracks.forEach((tr, i) => { if (tr.cls) sets[i].forEach(n => n.classList.remove(tr.cls![0])); });
    };
  }, [mode, modes]);

  return (
    <svg ref={svg} className={`fig fig-${name}`} viewBox={viewBox} role="img" aria-label={label}>
      <FigDefs />
      {children}
    </svg>
  );
}

function FigDefs() {
  return (
    <defs>
      <pattern id="f-bc" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M0 0H4M0 0V4" fill="none" stroke="var(--mem)" strokeOpacity="0.28" strokeWidth="0.5" />
      </pattern>
      <pattern id="f-sc" width="26" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 0H26M0 4H26M3 0v4M9 0v4M17 0v4M22 0v4M6 4v4M13 4v4M20 4v4" fill="none" stroke="var(--cpu)" strokeOpacity="0.3" strokeWidth="0.5" />
      </pattern>
      <pattern id="f-mac" width="5" height="5" patternUnits="userSpaceOnUse">
        <rect x="0.7" y="0.7" width="3.6" height="3.6" fill="var(--gpu)" fillOpacity="0.22" />
        <path d="M0.7 4.3L4.3 0.7" stroke="var(--gpu)" strokeOpacity="0.45" strokeWidth="0.4" />
      </pattern>
      <marker id="f-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0.5L7.5 4L0 7.5" fill="none" stroke="context-stroke" strokeWidth="1.2" />
      </marker>
    </defs>
  );
}

/** A labelled block. k = colour meaning. */
export function B({ x, y, w, h, k, p, a, label, sub, fill, lx, ly, anchor = 'start', children }: {
  x: number; y: number; w: number; h: number; k: 'cpu' | 'mem' | 'gpu' | 'n' | 'err'; p?: string; a?: string; label?: string; sub?: string;
  fill?: string; lx?: number; ly?: number; anchor?: 'start' | 'middle'; children?: ReactNode;
}) {
  return (
    <g data-p={p} data-a={a} className={`fb fb-${k}`}>
      <rect x={x} y={y} width={w} height={h} className="fb-r" />
      {fill && <rect x={x} y={y} width={w} height={h} fill={fill} />}
      {children}
      {label && <text x={lx ?? (anchor === 'middle' ? x + w / 2 : x + 6)} y={ly ?? y + 14} textAnchor={anchor} className="fl">{label}</text>}
      {sub && <text x={lx ?? (anchor === 'middle' ? x + w / 2 : x + 6)} y={(ly ?? y + 14) + 12} textAnchor={anchor} className="fl-s">{sub}</text>}
    </g>
  );
}

/** Grid of cells inside a rect. */
export function cellRects(x: number, y: number, w: number, h: number, cols: number, rows: number, gap = 1.5) {
  const cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
  return Array.from({ length: cols * rows }, (_, i) => ({ x: x + (i % cols) * (cw + gap), y: y + Math.floor(i / cols) * (ch + gap), w: cw, h: ch, c: i % cols, r: Math.floor(i / cols) }));
}
