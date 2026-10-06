import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FlaskConical, Maximize2, Minus, Plus, ArrowUpLeft, ZoomIn, StepForward } from 'lucide-react';
import { CHIP_WORLDS, index, regionFocus, compsIn, type ChipRegion, type ChipWorld } from '../content/chipmaps';
import { component } from '../content/components';
import { lessonsFor, lessonHref, lessonsInWorld } from '../content/lessons';
import { type Rect, union, GPU_MM_PER_UNIT, CPU_PKG, SM0 } from '../art/geometry';
import { ArtDefs, CpuBoardArt, Mover } from '../art/ChipArt';
import { GpuDefs, GpuWorldArt, HbmSideView, type Lod } from '../art/GpuArt';
import { SignalLayer, gpuPackageScenario, smScenario, type Scenario } from '../art/signals';
import { T, Glyph, pick, GLYPH } from '../lib/text';
import { useLevel, useStore } from '../state/store';
import { useRoute, replaceQuery } from '../lib/router';
import { Ring } from '../components/Ring';
import type { Kind, Level } from '../content/types';

interface TF { x: number; y: number; k: number }
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const kc = (k: Kind) => (k === 'neutral' ? 'var(--text-2)' : `var(--${k})`);
const CARD_W = 340;
/** AM5 package is 40 mm across, drawn 600 units wide. */
const CPU_MM_PER_UNIT = 40 / CPU_PKG.w;

/** Screen area for the drawing: leaves room for callouts on both sides and for the docked card. */
function fitArea(el: HTMLElement) {
  const w = el.clientWidth, h = el.clientHeight, wide = innerWidth > 900;
  const card = wide ? CARD_W + 32 : 0, side = wide ? 215 : 96;
  const top = wide ? 92 : 80, bottom = wide ? 64 : 56;
  return { x: side, y: top, w: Math.max(160, w - card - 2 * side), h: Math.max(160, h - top - bottom) };
}

const NICE_MM = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
const holeD = (outer: Rect | null, inner: Rect) =>
  (outer ? `M${outer.x} ${outer.y}h${outer.w}v${outer.h}h${-outer.w}Z` : 'M-1e7 -1e7H1e7V1e7H-1e7Z') + ` M${inner.x} ${inner.y}h${inner.w}v${inner.h}h${-inner.w}Z`;

export default function WorldMapScreen({ world }: { world: 'cpu' | 'gpu' }) {
  const W: ChipWorld = CHIP_WORLDS[world];
  const { byId, parentOf } = useMemo(() => index(W), [W]);
  const level = useLevel();
  const done = useStore(s => s.completed);
  const route = useRoute();

  const q0 = route.query;
  const [focusId, setFocusId] = useState(() => {
    const sel = q0.get('sel'), at = q0.get('at');
    if (at && byId.has(at)) return at;
    if (sel && byId.has(sel)) return parentOf.get(sel)?.id ?? W.initial;
    return W.initial;
  });
  const [selId, setSelId] = useState<string | null>(() => { const s = q0.get('sel'); return s && byId.has(s) ? s : null; });
  const [hover, setHover] = useState<string | null>(null);

  const focus = byId.get(focusId)!;
  const kids = focus.children ?? [];
  const path: ChipRegion[] = [];
  for (let r: ChipRegion | null | undefined = focus; r; r = parentOf.get(r.id)) path.unshift(r);
  const lod: Lod = focusId === 'server' ? 'server' : focusId === 'sms' ? 'sm' : 'pkg';

  // ---------------- refs: everything per-frame is written straight to the DOM ----------------
  const box = useRef<HTMLDivElement>(null);
  const g = useRef<SVGGElement>(null);
  const artRef = useRef<SVGSVGElement>(null);
  const committed = useRef<TF>({ x: 0, y: 0, k: 1 });
  const commitTimer = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const callRefs = useRef(new Map<string, HTMLElement>());
  const leadRefs = useRef(new Map<string, SVGPathElement>());
  const dotRefs = useRef(new Map<string, SVGCircleElement>());
  const scaleLine = useRef<SVGPathElement>(null), scaleText = useRef<SVGTextElement>(null), ticks = useRef<SVGPathElement>(null);
  const sizes = useRef(new Map<string, { w: number; h: number }>());
  const tf = useRef<TF>({ x: 0, y: 0, k: 1 });
  const anim = useRef(0);
  const touched = useRef(false);
  const dragged = useRef(false);
  const signals = useRef<SignalLayer | null>(null);
  const kidsRef = useRef(kids); kidsRef.current = kids;
  const focusRef = useRef(focus); focusRef.current = focus;

  /** Callouts: labels in the side margins, joined to their region by an orthogonal leader with a 45° knee. */
  const layoutCallouts = useCallback((t: TF) => {
    const el = box.current; if (!el) return;
    const a = fitArea(el), fr = regionFocus(focusRef.current);
    const F = { x: t.x + fr.x * t.k, y: t.y + fr.y * t.k, w: fr.w * t.k, h: fr.h * t.k };
    const items = kidsRef.current.map(r => {
      const rr = r.rects[r.labelOn ?? 0];
      const sx = t.x + rr.x * t.k, sy = t.y + rr.y * t.k, sw = rr.w * t.k, sh = rr.h * t.k;
      const side: 'L' | 'R' = sx + sw / 2 < F.x + F.w / 2 ? 'L' : 'R';
      const sz = sizes.current.get(r.id) ?? { w: 140, h: 34 };
      return { r, side, ax: side === 'L' ? sx : sx + sw, ay: sy + sh / 2, ...sz, top: 0 };
    });
    for (const side of ['L', 'R'] as const) {
      const col = items.filter(i => i.side === side).sort((p, q) => p.ay - q.ay);
      let prev = a.y - 10;
      for (const it of col) { it.top = Math.max(it.ay - it.h / 2, prev + 10); prev = it.top + it.h; }
      let next = el.clientHeight - 60;
      for (let i = col.length - 1; i >= 0; i--) { col[i].top = Math.min(col[i].top, next - col[i].h); next = col[i].top - 10; }
    }
    for (const it of items) {
      const lab = callRefs.current.get(it.r.id), lead = leadRefs.current.get(it.r.id), dot = dotRefs.current.get(it.r.id);
      if (!lab || !lead || !dot) continue;
      const ly = it.top + it.h / 2;
      const edge = it.side === 'L' ? Math.min(F.x - 14, it.ax - 6) : Math.max(F.x + F.w + 14, it.ax + 6);
      // label column: 40 px beyond the drawing, but never off the canvas
      const lx = it.side === 'L' ? Math.max(8 + it.w + 4, edge - 40) : Math.min(el.clientWidth - 8 - it.w - 4, edge + 40);
      const gap = Math.abs(edge - lx) - 6, dy = ly - it.ay, s = it.side === 'L' ? -1 : 1;
      const knee = Math.min(Math.abs(dy), gap);
      const pts = [[it.ax, it.ay], [edge, it.ay], [edge, ly - Math.sign(dy) * knee], [edge + s * knee, ly], [lx, ly]];
      lead.setAttribute('d', 'M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L'));
      dot.setAttribute('cx', it.ax.toFixed(1)); dot.setAttribute('cy', it.ay.toFixed(1));
      lab.style.transform = `translate(${(it.side === 'L' ? lx - it.w - 4 : lx + 4).toFixed(1)}px, ${it.top.toFixed(1)}px)`;
    }
  }, []);

  /** Scale bar + edge ticks ("≈" because the drawings are stylised). */
  const layoutScale = useCallback((t: TF) => {
    const mmPerUnit = world === 'gpu' ? GPU_MM_PER_UNIT : CPU_MM_PER_UNIT;
    const pxPerMm = t.k / mmPerUnit;
    const L = NICE_MM.find(m => m * pxPerMm >= 60) ?? 200;
    const px = L * pxPerMm;
    scaleLine.current?.setAttribute('d', `M0 6V12H${px.toFixed(1)}V6`);
    if (scaleText.current) scaleText.current.textContent = `≈ ${L >= 1 ? L : L.toString().replace(/^0/, '')} mm (approx.)`;
    const el = box.current; if (!el || !ticks.current) return;
    const step = px / 2, w = el.clientWidth, h = el.clientHeight;
    const ox = ((t.x % step) + step) % step, oy = ((t.y % step) + step) % step;
    let d = '';
    for (let x = ox; x < w; x += step) d += `M${x.toFixed(1)} 0v${Math.round((x - t.x) / step) % 2 ? 4 : 8}`;
    for (let y = oy; y < h; y += step) d += `M0 ${y.toFixed(1)}h${Math.round((y - t.y) / step) % 2 ? 4 : 8}`;
    ticks.current.setAttribute('d', d);
  }, [world]);

  /**
   * Re-render the vector art for the current camera (one raster). The art layer has a 25%
   * overscan so short pans don't reveal its edges.
   */
  const commit = useCallback((at?: TF) => {
    const t = at ?? tf.current, el = box.current, art = artRef.current;
    if (!el || !art) return;
    const ox = el.clientWidth * 0.25, oy = el.clientHeight * 0.25;
    g.current?.setAttribute('transform', `translate(${(t.x + ox).toFixed(2)} ${(t.y + oy).toFixed(2)}) scale(${t.k.toFixed(5)})`);
    committed.current = { ...t };
    art.style.transformOrigin = `${ox}px ${oy}px`;
    art.classList.remove('moving');
  }, []);

  /**
   * Per-frame camera update. While moving, the art is only transformed as a composited
   * layer (no repaint); callouts, scale and signals are redrawn in screen space every frame.
   * 150 ms after movement stops, the art is re-rendered crisply.
   */
  const apply = useCallback((live = false) => {
    const t = tf.current, art = artRef.current;
    if (!live) { clearTimeout(commitTimer.current); commit(); if (art) art.style.transform = ''; }
    else if (art) {
      const c = committed.current, sc = t.k / c.k;
      art.classList.add('moving');
      art.style.transform = `translate(${(t.x - c.x * sc).toFixed(2)}px, ${(t.y - c.y * sc).toFixed(2)}px) scale(${sc.toFixed(5)})`;
      clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(() => { commit(); art.style.transform = ''; }, 150);
    }
    layoutCallouts(t);
    layoutScale(t);
    if (signals.current && !signals.current.isRunning) signals.current.render();
  }, [layoutCallouts, layoutScale, commit]);

  const fitTo = useCallback((r: Rect): TF => {
    const a = fitArea(box.current!);
    const k = clamp(Math.min(a.w / r.w, a.h / r.h), 0.02, 120);
    return { k, x: a.x + (a.w - r.w * k) / 2 - r.x * k, y: a.y + (a.h - r.h * k) / 2 - r.y * k };
  }, []);

  const animateTo = useCallback((to: TF, ms = 420) => {
    cancelAnimationFrame(anim.current);
    const from = { ...tf.current }, t0 = performance.now();
    const ease = (u: number) => { // cubic-bezier(.2,.8,.2,1), no overshoot
      let lo = 0, hi = 1, x = u;
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2, bx = 3 * (1 - m) ** 2 * m * 0.2 + 3 * (1 - m) * m * m * 0.2 + m ** 3; if (bx < u) lo = m; else hi = m; x = m; }
      return 3 * (1 - x) ** 2 * x * 0.8 + 3 * (1 - x) * x * x + x ** 3;
    };
    const lk0 = Math.log(from.k), lk1 = Math.log(to.k);
    const a = fitArea(box.current!), cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    const wx0 = (cx - from.x) / from.k, wy0 = (cy - from.y) / from.k, wx1 = (cx - to.x) / to.k, wy1 = (cy - to.y) / to.k;
    const big = Math.abs(lk1 - lk0) > 2 ? 1.6 : 1;   // long zooms get a little more time, still eased
    // render the art once at the wider of the two views, then fly by moving that layer
    const el = box.current!, view = (t: TF) => ({ x: -t.x / t.k, y: -t.y / t.k, w: el.clientWidth / t.k, h: el.clientHeight / t.k });
    commit(from.k < to.k ? from : (() => { const v = view(to); return fitTo(union([view(from), v])); })());
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / (ms * big)), e = ease(u);
      const k = Math.exp(lk0 + (lk1 - lk0) * e);
      tf.current = { k, x: cx - (wx0 + (wx1 - wx0) * e) * k, y: cy - (wy0 + (wy1 - wy0) * e) * k };
      apply(u < 1);
      if (u < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [apply, commit, fitTo]);

  const flyTo = useCallback((r: ChipRegion, animate = true) => {
    if (!box.current) return;
    const t = fitTo(regionFocus(r));
    if (animate) animateTo(t); else { tf.current = t; apply(); }
  }, [fitTo, animateTo, apply]);

  useLayoutEffect(() => { flyTo(focusRef.current, false); }, [flyTo]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => { if (!touched.current) flyTo(focusRef.current, false); else apply(); });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(commitTimer.current); };
  }, [flyTo, apply]);
  // measure callout sizes once per render (not per frame), then lay out
  useLayoutEffect(() => {
    sizes.current.clear();
    callRefs.current.forEach((el, id) => sizes.current.set(id, { w: el.offsetWidth, h: el.offsetHeight }));
    apply();
  }, [focusId, level, apply, selId]);

  // signal layer: one canvas, one clock
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    signals.current = new SignalLayer(c, () => tf.current, null, clockRef.current);
    return () => { signals.current?.destroy(); signals.current = null; };
  }, []);
  const scenario = useMemo<Scenario | null>(() => (world !== 'gpu' ? null : focusId === 'pkg' ? gpuPackageScenario() : focusId === 'sms' ? smScenario(SM0) : null), [world, focusId]);
  useEffect(() => { signals.current?.setScenario(scenario); }, [scenario]);

  const goFocus = useCallback((r: ChipRegion, animate = true) => {
    touched.current = false;
    setFocusId(r.id); setSelId(null);
    if (animate) flyTo(r);
  }, [flyTo]);
  const goUp = useCallback(() => { const p = parentOf.get(focusRef.current.id); if (p) goFocus(p); }, [parentOf, goFocus]);

  // semantic zoom: after a manual zoom settles, open the region you zoomed into or close the one you left
  const semantic = useCallback(() => {
    const el = box.current; if (!el) return;
    const t = tf.current, a = fitArea(el), f = focusRef.current, fr = regionFocus(f), par = parentOf.get(f.id);
    if (par && fr.w * t.k < a.w * 0.3 && fr.h * t.k < a.h * 0.3) { setFocusId(par.id); setSelId(null); return; }
    for (const c of f.children ?? []) {
      if (!c.children) continue;
      const r = regionFocus(c), sx = t.x + (r.x + r.w / 2) * t.k, sy = t.y + (r.y + r.h / 2) * t.k;
      const inView = sx > a.x && sx < a.x + a.w && sy > a.y && sy < a.y + a.h;
      if (inView && (r.w * t.k > a.w * 0.6 || r.h * t.k > a.h * 0.6)) { setFocusId(c.id); setSelId(null); return; }
    }
  }, [parentOf]);

  useEffect(() => {
    const el = box.current; if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; tx: number; ty: number } | null = null, pinch: number | null = null, timer = 0;
    const local = (e: { clientX: number; clientY: number }) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const zoomAt = (px: number, py: number, f: number) => {
      const t = tf.current, k2 = clamp(t.k * f, 0.02, 120);
      tf.current = { k: k2, x: px - (px - t.x) * (k2 / t.k), y: py - (py - t.y) * (k2 / t.k) };
      touched.current = true; apply(true);
      clearTimeout(timer); timer = window.setTimeout(semantic, 260);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); cancelAnimationFrame(anim.current);
      const p = local(e);
      if (e.ctrlKey || e.metaKey) zoomAt(p.x, p.y, clamp(Math.exp(-e.deltaY * 0.01), 0.8, 1.25));
      else { tf.current = { ...tf.current, x: tf.current.x - e.deltaX, y: tf.current.y - e.deltaY }; touched.current = true; apply(true); }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(anim.current);
      pts.set(e.pointerId, local(e)); dragged.current = false;
      if (pts.size === 1) start = { ...local(e), tx: tf.current.x, ty: tf.current.y };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    };
    const onMove = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) {
        const t = tipRef.current; if (!t) return;
        const r = el.getBoundingClientRect();
        t.style.transform = `translate(${clamp(e.clientX - r.left + 14, 8, r.width - t.offsetWidth - 8)}px, ${clamp(e.clientY - r.top + 18, 8, r.height - t.offsetHeight - 8)}px)`;
        return;
      }
      pts.set(e.pointerId, local(e));
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch); pinch = d; dragged.current = true; return;
      }
      if (start) {
        const p = local(e), dx = p.x - start.x, dy = p.y - start.y;
        if (!dragged.current && Math.hypot(dx, dy) < 4) return;
        if (!dragged.current) { dragged.current = true; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); }
        tf.current = { ...tf.current, x: start.tx + dx, y: start.ty + dy }; touched.current = true; apply(true);
      }
    };
    const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { start = null; el.classList.remove('dragging'); } };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('wheel', onWheel); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); clearTimeout(timer); cancelAnimationFrame(anim.current);
    };
  }, [apply, semantic]);

  useEffect(() => {
    const q = new URLSearchParams(); q.set('at', focusId); if (selId) q.set('sel', selId);
    replaceQuery(q);
  }, [focusId, selId]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (selId) setSelId(null); else goUp(); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [selId, goUp]);

  const click = (r: ChipRegion) => {
    if (dragged.current) return;
    if (r.children) goFocus(r);
    else setSelId(s => (s === r.id ? null : r.id));
  };
  const nudge = (f: number) => {
    const a = fitArea(box.current!), t = tf.current, cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    tf.current = { k: t.k * f, x: cx - (cx - t.x) * f, y: cy - (cy - t.y) * f }; touched.current = true; apply(true);
  };

  const shown = selId ? byId.get(selId)! : focus;
  const ls = lessonsInWorld(world), prog = { d: ls.filter(l => done[l.id]).length, t: ls.length };
  const hovR = hover ? byId.get(hover) : null;
  const parent = parentOf.get(focusId);
  const fr = regionFocus(focus);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="chipmap">
      <div className="cm-canvas" ref={box}>
        <svg ref={artRef} className="cm-art" role="group" aria-label={`${W.title}: ${pick(focus.label, level)}`}>
          <ArtDefs />
          {world === 'gpu' && <GpuDefs />}
          <g ref={g}>
            {world === 'gpu' ? <GpuWorldArt lod={lod} /> : <CpuBoardArt />}
            {/* brightness hierarchy: focus crisp, neighbours ~50%, everything else ~25% */}
            {parent && <path className="dim dim-near" d={holeD(regionFocus(parent), fr)} fillRule="evenodd" onClick={goUp} />}
            {parent && <path className="dim dim-far" d={holeD(null, regionFocus(parent))} fillRule="evenodd" onClick={goUp} />}
            <g className="chipart">
              {kids.map(r => (
                <g key={r.id} style={{ ['--kc' as string]: kc(r.kind) }}>
                  {r.rects.map((rc, i) => (
                    <rect key={i} className={'rg' + (selId === r.id ? ' sel' : '') + (hover === r.id ? ' hov' : '')} x={rc.x} y={rc.y} width={rc.w} height={rc.h}
                      tabIndex={i === 0 ? 0 : -1} role="button" aria-label={pick(r.label, level)}
                      onClick={() => click(r)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(r); } }}
                      onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(h => (h === r.id ? null : h))} />
                  ))}
                </g>
              ))}
            </g>
            <g key={focusId}>{focus.flows?.map((f, i) => <Mover key={i} f={f} />)}</g>
          </g>
        </svg>
        <canvas ref={canvasRef} className="cm-signals" aria-hidden />

        {/* screen-space annotation layer: leaders, ticks, scale bar */}
        <svg className="cm-anno" aria-hidden>
          <path ref={ticks} className="ticks" />
          {kids.map(r => (
            <g key={r.id} style={{ ['--kc' as string]: kc(r.kind) }} className={(hover === r.id || selId === r.id) ? 'lead-on' : undefined}>
              <path ref={el => { if (el) leadRefs.current.set(r.id, el); else leadRefs.current.delete(r.id); }} className="leader" />
              <circle ref={el => { if (el) dotRefs.current.set(r.id, el); else dotRefs.current.delete(r.id); }} className="leader-dot" r={2} />
            </g>
          ))}
        </svg>
        <div className="cm-callouts">
          {kids.map(r => {
            const c = r.comp ? component(r.comp) : undefined;
            const b = pick(r.label, 'beginner'), i = pick(r.label, 'intermediate');
            return (
              <button key={r.id + level} ref={el => { if (el) callRefs.current.set(r.id, el); else callRefs.current.delete(r.id); }}
                className={'callout lvl' + (selId === r.id ? ' sel' : '') + (hover === r.id ? ' hov' : '') + (r.children ? ' into' : '')} style={{ ['--kc' as string]: kc(r.kind) }}
                onClick={() => click(r)} onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(null)} tabIndex={-1}>
                <span className="c1"><span className="g">{GLYPH[r.kind]}</span>{level === 'beginner' ? b : i}{r.children ? ' ⤢' : ''}</span>
                <span className="c2">{level === 'beginner' ? (i !== b ? i : c?.tech ?? '') : b}</span>
                {level === 'intermediate' && c?.num && <span className="c3">{c.num}</span>}
              </button>
            );
          })}
        </div>
        <div ref={tipRef} className={'tip' + (hovR ? ' on' : '')}>{hovR && <Tip r={hovR} level={level} />}</div>

        <div className="cm-foot">
          <div className="cm-ctl">
            {parent && <button className="btn btn-sm" onClick={goUp}><ArrowUpLeft size={14} /> Zoom out</button>}
            <button className="btn btn-sm btn-ghost" aria-label="Zoom out a little" onClick={() => nudge(1 / 1.3)}><Minus size={14} /></button>
            <button className="btn btn-sm btn-ghost" aria-label="Zoom in a little" onClick={() => nudge(1.3)}><Plus size={14} /></button>
            <button className="btn btn-sm btn-ghost" onClick={() => { touched.current = false; flyTo(focus); }}><Maximize2 size={13} /> Fit</button>
            {reduced && scenario && <button className="btn btn-sm" onClick={() => signals.current?.step(focusId === 'sms' ? 1 : 20)}><StepForward size={13} /> Step</button>}
          </div>
          <svg className="scalebar" width="160" height="30" aria-label="Scale bar">
            <path ref={scaleLine} />
            <text ref={scaleText} x="0" y="26" />
          </svg>
          <div className="legend" aria-label="Legend">
            <span className="k-gpu">● compute</span><span className="k-cpu">◆ control</span><span className="k-mem">▬ memory</span><span className="k-err">✕ stall</span>
          </div>
          <div ref={clockRef} className="clock" aria-live="off" />
        </div>
      </div>

      <div className="cm-head">
        <div className="cm-title">
          <Glyph kind={world} />{W.title}
          <Ring value={prog.d / prog.t} kind={world} size={18} label={`${prog.d} of ${prog.t} lessons done`} />
          <span className="mono muted" style={{ fontSize: 11.5, fontWeight: 400 }}>{prog.d}/{prog.t}</span>
        </div>
        <nav className="crumbline" aria-label="Zoom level">
          {path.map((r, i) => (
            <span key={r.id}>
              {i > 0 && <span className="sep" aria-hidden>/</span>}
              <button onClick={() => goFocus(r)} aria-current={r.id === focusId ? 'location' : undefined}>{pick(r.crumb ?? r.label, level)}</button>
            </span>
          ))}
        </nav>
      </div>

      <aside className="cm-card" aria-live="polite">
        <RegionCard r={shown} isFocus={shown === focus} world={W} onInto={goFocus} onPick={id => setSelId(id)} />
      </aside>
    </div>
  );
}

function Tip({ r, level }: { r: ChipRegion; level: Level }) {
  const c = r.comp ? component(r.comp) : undefined;
  return (
    <>
      <b>{level === 'beginner' ? pick(r.label, 'beginner') : pick(r.label, 'intermediate')}</b>
      {level === 'intermediate' && c?.num && <span className="mono muted" style={{ fontSize: 11.5 }}> · {c.num}</span>}
      <div className="text2">{c ? pick(c.hover, level) : r.desc ? pick(r.desc, level) : ''}</div>
      {r.id === 'hbm' && (
        <div style={{ marginTop: 8 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Side view · one stack</div>
          <HbmSideView beginner={level === 'beginner'} />
          {level === 'intermediate' && <div className="mono muted" style={{ fontSize: 11 }}>8-high · 16 GB per stack (80 GB ÷ 5)</div>}
        </div>
      )}
      {r.children && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Click to look inside</div>}
    </>
  );
}

function RegionCard({ r, isFocus, world, onInto, onPick }: { r: ChipRegion; isFocus: boolean; world: ChipWorld; onInto: (r: ChipRegion) => void; onPick: (id: string) => void }) {
  const level = useLevel();
  const done = useStore(s => s.completed);
  const c = r.comp ? component(r.comp) : undefined;
  const all = c && !(isFocus && r.children) ? lessonsFor(c.id) : [...new Map(compsIn(r).flatMap(id => lessonsFor(id)).map(l => [l.id, l])).values()];
  const inside = isFocus && r.inside;
  const ordered = level === 'beginner' ? [...all].sort((a, b) => (a.level === b.level ? 0 : a.level === 'beginner' ? -1 : 1)) : all;
  const ready = ordered.filter(l => l.status === 'ready');
  const soon = ordered.length - ready.length;
  const specs = r.specs ?? c?.specs;
  const goto = r.comp === 'cpu.gpulink' ? { href: '#/gpu', label: 'Enter the GPU world' } : r.comp === 'gpu.host' ? { href: '#/cpu', label: 'Enter the CPU world' } : null;
  const title = inside ? pick(inside.label, level) : c ? (level === 'beginner' ? c.friendly : c.tech) : pick(r.label, level);
  const sub = !inside && c ? (level === 'beginner' ? c.tech : c.friendly) : null;
  return (
    <>
      <div className="ds-kicker"><Glyph kind={r.kind} /> {isFocus ? 'Looking at' : 'Selected'}</div>
      <div>
        <h3 key={level} className="lvl">{title}</h3>
        {sub && <div className="techsub">{sub}</div>}
      </div>
      <p className="teaser"><T v={inside ? inside.desc : c ? c.teaser : r.desc ?? world.reference} /></p>

      {level === 'intermediate' && specs && (
        <table className="kv">
          <tbody>{specs.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
        </table>
      )}

      {r.children && (isFocus ? (
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Inside</div>
          <ul className="inside">
            {r.children.map(k => (
              <li key={k.id}><button onClick={() => (k.children ? onInto(k) : onPick(k.id))}><Glyph kind={k.kind} /> <T v={k.label} />{k.children ? <span className="muted"> ⤢</span> : null}</button></li>
            ))}
          </ul>
        </div>
      ) : <div><button className="btn btn-sm" onClick={() => onInto(r)}><ZoomIn size={14} /> Look inside</button></div>)}

      {ready.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Lessons</div>
          <ul className="lessonlist">
            {ready.map(l => (
              <li key={l.id}>
                <a href={lessonHref(l)}>
                  <span aria-hidden className={done[l.id] ? 'k-mem' : 'muted'}>{done[l.id] ? '✓' : '○'}</span>
                  <T v={l.title} />
                  <span className="lvtag">For {l.level === 'beginner' ? 'beginners' : 'intermediate'}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {soon > 0 && <p className="soonline">+{soon} more lesson{soon > 1 ? 's' : ''} coming</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        {ready[0] && <a className="btn btn-primary" href={lessonHref(ready[0])}>Start lesson <ArrowRight size={15} /></a>}
        {c?.sandbox && <a className="btn btn-sm btn-ghost" href={c.sandbox.href}><FlaskConical size={14} /> {c.sandbox.label}</a>}
        {goto && <a className="btn btn-sm" href={goto.href}>{goto.label} <ArrowRight size={14} /></a>}
      </div>
    </>
  );
}
