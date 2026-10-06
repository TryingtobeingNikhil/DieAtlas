import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronRight, FlaskConical, Maximize2, Minus, Plus, ArrowUpLeft, ZoomIn } from 'lucide-react';
import { CHIP_WORLDS, index, regionFocus, compsIn, type ChipRegion, type ChipWorld } from '../content/chipmaps';
import { component } from '../content/components';
import { lessonsFor, lessonHref, lessonsInWorld } from '../content/lessons';
import { type Rect, center } from '../art/geometry';
import { ArtDefs, CpuBoardArt, GpuServerArt, Mover } from '../art/ChipArt';
import { T, Glyph, pick, GLYPH } from '../lib/text';
import { useLevel, useStore } from '../state/store';
import { useRoute, replaceQuery } from '../lib/router';
import { Ring } from '../components/Ring';
import type { Kind, Level } from '../content/types';

interface TF { x: number; y: number; k: number }
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const kc = (k: Kind) => (k === 'neutral' ? 'var(--text-2)' : `var(--${k})`);
const CARD_W = 340;

/** Screen area the camera may use: leaves room for the docked card so it never covers parts. */
function fitArea(el: HTMLElement) {
  const w = el.clientWidth, h = el.clientHeight, wide = innerWidth > 900;
  const right = wide ? CARD_W + 40 : 12;
  const top = wide ? 96 : 84, bottom = wide ? 64 : 56, left = wide ? 24 : 12;
  return { x: left, y: top, w: Math.max(200, w - right - left), h: Math.max(160, h - top - bottom) };
}

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

  // ---------------- camera: transform written straight to the DOM ----------------
  const box = useRef<HTMLDivElement>(null);
  const g = useRef<SVGGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const tf = useRef<TF>({ x: 0, y: 0, k: 1 });
  const anim = useRef(0);
  const touched = useRef(false);
  const dragged = useRef(false);
  const kidsRef = useRef(kids); kidsRef.current = kids;
  const focusRef = useRef(focus); focusRef.current = focus;

  const apply = useCallback(() => {
    const t = tf.current;
    g.current?.setAttribute('transform', `translate(${t.x.toFixed(2)} ${t.y.toFixed(2)}) scale(${t.k.toFixed(5)})`);
    for (const r of kidsRef.current) {
      const el = labelRefs.current.get(r.id); if (!el) continue;
      const c = center(r.rects[r.labelOn ?? 0]);
      el.style.transform = `translate(${(t.x + c.x * t.k).toFixed(1)}px, ${(t.y + c.y * t.k).toFixed(1)}px) translate(-50%, -50%)`;
    }
  }, []);

  const fitTo = useCallback((r: Rect): TF => {
    const a = fitArea(box.current!);
    const k = clamp(Math.min(a.w / r.w, a.h / r.h), 0.02, 80);
    return { k, x: a.x + (a.w - r.w * k) / 2 - r.x * k, y: a.y + (a.h - r.h * k) / 2 - r.y * k };
  }, []);

  const animateTo = useCallback((to: TF, ms = 700) => {
    cancelAnimationFrame(anim.current);
    const from = { ...tf.current }, t0 = performance.now();
    const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const lk0 = Math.log(from.k), lk1 = Math.log(to.k);
    const a = fitArea(box.current!), cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    const wx0 = (cx - from.x) / from.k, wy0 = (cy - from.y) / from.k, wx1 = (cx - to.x) / to.k, wy1 = (cy - to.y) / to.k;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / ms), e = ease(u);
      const k = Math.exp(lk0 + (lk1 - lk0) * e);   // zoom in log space: big scale changes feel even
      const wx = wx0 + (wx1 - wx0) * e, wy = wy0 + (wy1 - wy0) * e;
      tf.current = { k, x: cx - wx * k, y: cy - wy * k };
      apply();
      if (u < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [apply]);

  const flyTo = useCallback((r: ChipRegion, animate = true) => {
    if (!box.current) return;
    const t = fitTo(regionFocus(r));
    if (animate) animateTo(t); else { tf.current = t; apply(); }
  }, [fitTo, animateTo, apply]);

  useLayoutEffect(() => { flyTo(focusRef.current, false); }, [flyTo]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    // refit on resize only if the user hasn't moved the camera (no snap-back)
    const ro = new ResizeObserver(() => { if (!touched.current) flyTo(focusRef.current, false); else apply(); });
    ro.observe(el); return () => ro.disconnect();
  }, [flyTo, apply]);
  useLayoutEffect(() => { apply(); }, [focusId, level, apply]);

  const goFocus = useCallback((r: ChipRegion, animate = true) => {
    touched.current = false;
    setFocusId(r.id); setSelId(null);
    if (animate) flyTo(r);
  }, [flyTo]);
  const goUp = useCallback(() => { const p = parentOf.get(focusRef.current.id); if (p) goFocus(p); }, [parentOf, goFocus]);

  // semantic zoom: after a manual zoom settles, open the region you zoomed into, or close the one you left
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

  // input: wheel pans, ⌘/Ctrl + wheel and pinch zoom, drag pans
  useEffect(() => {
    const el = box.current; if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; tx: number; ty: number } | null = null, pinch: number | null = null, timer = 0;
    const local = (e: { clientX: number; clientY: number }) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const zoomAt = (px: number, py: number, f: number) => {
      const t = tf.current, k2 = clamp(t.k * f, 0.02, 80);
      tf.current = { k: k2, x: px - (px - t.x) * (k2 / t.k), y: py - (py - t.y) * (k2 / t.k) };
      touched.current = true; apply();
      clearTimeout(timer); timer = window.setTimeout(semantic, 260);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); cancelAnimationFrame(anim.current);
      const p = local(e);
      if (e.ctrlKey || e.metaKey) zoomAt(p.x, p.y, clamp(Math.exp(-e.deltaY * 0.01), 0.8, 1.25));
      else { tf.current = { ...tf.current, x: tf.current.x - e.deltaX, y: tf.current.y - e.deltaY }; touched.current = true; apply(); }
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
        tf.current = { ...tf.current, x: start.tx + dx, y: start.ty + dy }; touched.current = true; apply();
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

  // URL = shareable state; Escape = deselect, then up one level
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
    tf.current = { k: t.k * f, x: cx - (cx - t.x) * f, y: cy - (cy - t.y) * f }; touched.current = true; apply();
  };

  const shown = selId ? byId.get(selId)! : focus;
  const ls = lessonsInWorld(world), prog = { d: ls.filter(l => done[l.id]).length, t: ls.length };
  const hovR = hover ? byId.get(hover) : null;
  const fr = regionFocus(focus);
  const spotD = focus === W.root ? null : `M-1e6 -1e6H1e6V1e6H-1e6Z M${fr.x} ${fr.y}h${fr.w}v${fr.h}h${-fr.w}Z`;

  return (
    <div className="chipmap">
      <div className="cm-canvas" ref={box}>
        <svg role="group" aria-label={`${W.title}: ${pick(focus.label, level)}`}>
          <ArtDefs />
          <g ref={g}>
            {world === 'gpu' ? <GpuServerArt /> : <CpuBoardArt />}
            {spotD && <path className="spot" d={spotD} fillRule="evenodd" onClick={goUp} />}
            <g className="chipart">
              {kids.map(r => (
                <g key={r.id} style={{ ['--kc' as string]: kc(r.kind) }}>
                  {r.rects.map((rc, i) => (
                    <rect key={i} className={'rg' + (selId === r.id ? ' sel' : '') + (hover === r.id ? ' hov' : '')} x={rc.x} y={rc.y} width={rc.w} height={rc.h}
                      rx={Math.min(rc.w, rc.h) * 0.06} tabIndex={i === 0 ? 0 : -1} role="button" aria-label={pick(r.label, level)}
                      onClick={() => click(r)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(r); } }}
                      onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(h => (h === r.id ? null : h))} />
                  ))}
                </g>
              ))}
            </g>
            <g key={focusId}>{focus.flows?.map((f, i) => <Mover key={i} f={f} />)}</g>
          </g>
        </svg>

        <div className="cm-labels">
          {kids.map(r => {
            const c = r.comp ? component(r.comp) : undefined;
            return (
              <button key={r.id + level} ref={el => { if (el) labelRefs.current.set(r.id, el); else labelRefs.current.delete(r.id); }}
                className={'cm-label lvl' + (selId === r.id ? ' sel' : '') + (r.children ? ' into' : '')} style={{ ['--kc' as string]: kc(r.kind) }}
                onClick={() => click(r)} onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(null)} tabIndex={-1}>
                <span><span className="g">{GLYPH[r.kind]}</span>{pick(r.label, level)}</span>
                {level === 'intermediate' && c?.num && <span className="n">{c.num}</span>}
              </button>
            );
          })}
        </div>
        <div ref={tipRef} className={'tip' + (hovR ? ' on' : '')}>{hovR && <Tip r={hovR} level={level} />}</div>
      </div>

      <div className="cm-head">
        <div className="cm-title">
          <Glyph kind={world} />{W.title}
          <Ring value={prog.d / prog.t} kind={world} size={26} label={`${prog.d} of ${prog.t} lessons done`} />
          <span className="mono muted" style={{ fontSize: 12, fontWeight: 400 }}>{prog.d}/{prog.t}</span>
        </div>
        <nav className="crumbline" aria-label="Zoom level">
          {path.map((r, i) => (
            <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i > 0 && <ChevronRight size={13} aria-hidden />}
              <button onClick={() => goFocus(r)} aria-current={r.id === focusId ? 'location' : undefined}>{pick(r.inside?.label ?? r.label, level)}</button>
            </span>
          ))}
        </nav>
      </div>

      <div className="cm-ctl">
        {parentOf.get(focusId) && <button className="btn btn-sm" onClick={goUp}><ArrowUpLeft size={14} /> Zoom out</button>}
        <button className="btn btn-sm" aria-label="Zoom out a little" onClick={() => nudge(1 / 1.3)}><Minus size={14} /></button>
        <button className="btn btn-sm" aria-label="Zoom in a little" onClick={() => nudge(1.3)}><Plus size={14} /></button>
        <button className="btn btn-sm" onClick={() => { touched.current = false; flyTo(focus); }}><Maximize2 size={13} /> Fit</button>
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
      <b>{c ? (level === 'beginner' ? c.friendly : c.tech) : pick(r.label, level)}</b>
      {level === 'intermediate' && c?.num && <span className="mono muted" style={{ fontSize: 12 }}> · {c.num}</span>}
      <div className="text2">{c ? pick(c.hover, level) : r.desc ? pick(r.desc, level) : ''}</div>
      {r.children && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Click to look inside</div>}
    </>
  );
}

function RegionCard({ r, isFocus, world, onInto, onPick }: { r: ChipRegion; isFocus: boolean; world: ChipWorld; onInto: (r: ChipRegion) => void; onPick: (id: string) => void }) {
  const level = useLevel();
  const done = useStore(s => s.completed);
  const c = r.comp ? component(r.comp) : undefined;
  // a group without its own component lists the lessons of the parts inside it
  // when you're inside a region, list the lessons of everything inside it
  const all = c && !(isFocus && r.children) ? lessonsFor(c.id) : [...new Map(compsIn(r).flatMap(id => lessonsFor(id)).map(l => [l.id, l])).values()];
  const inside = isFocus && r.inside;
  const ordered = level === 'beginner' ? [...all].sort((a, b) => (a.level === b.level ? 0 : a.level === 'beginner' ? -1 : 1)) : all;
  const ready = ordered.filter(l => l.status === 'ready');
  const soon = ordered.length - ready.length;
  const goto = r.comp === 'cpu.gpulink' ? { href: '#/gpu', label: 'Enter the GPU world' } : r.comp === 'gpu.host' ? { href: '#/cpu', label: 'Enter the CPU world' } : null;
  return (
    <>
      <div className="eyebrow" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Glyph kind={r.kind} /> {isFocus ? 'You are looking at' : 'Selected'}
      </div>
      <h3 key={level} className="lvl">{inside ? pick(inside.label, level) : c ? (level === 'beginner' ? c.friendly : c.tech) : pick(r.label, level)}</h3>
      {c && !inside && <div className="techsub">{level === 'beginner' ? c.tech : c.num ?? c.friendly}</div>}
      <p className="teaser"><T v={inside ? inside.desc : c ? c.teaser : r.desc ?? world.reference} /></p>

      {r.children && (
        isFocus ? (
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Inside</div>
            <div className="cm-inside">
              {r.children.map(k => <button key={k.id} className="pill" style={{ cursor: 'pointer' }} onClick={() => (k.children ? onInto(k) : onPick(k.id))}><Glyph kind={k.kind} /> <T v={k.label} /></button>)}
            </div>
          </div>
        ) : <div><button className="btn btn-sm" onClick={() => onInto(r)}><ZoomIn size={14} /> Look inside</button></div>
      )}

      {ready.length > 0 && (
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
