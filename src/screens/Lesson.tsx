import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, Check, FlaskConical } from 'lucide-react';
import { lesson, lessonHref } from '../content/lessons';
import { component } from '../content/components';
import { CHIP_WORLDS, regionForComp } from '../content/chipmaps';
import type { Kind, Lesson, LessonBody } from '../content/types';
import { T, Glyph, pick, rich } from '../lib/text';
import { useLevel, useStore } from '../state/store';
import { useRoute } from '../lib/router';
import { SceneView, type Layout } from '../scenes/SceneView';
import { ScenePlayer, type Caption } from '../scenes/player';
import { Tex } from '../components/Tex';
import { Quiz } from '../components/Quiz';
import { WIDGETS, type SceneApi } from '../widgets';

const NARROW_BELOW = 560;

function WidgetHost({ id, api, restore }: { id: string; api: SceneApi; restore: () => void }) {
  const W = WIDGETS[id];
  useEffect(() => restore, [restore]);
  return W ? <W api={api} /> : null;
}

function Crumbs({ l }: { l: Lesson }) {
  const c = component(l.components[0]);
  const world = l.world === 'cpu' || l.world === 'gpu' ? l.world : null;
  const region = world && c ? regionForComp(CHIP_WORLDS[world], c.id) : undefined;
  const level = useLevel();
  return (
    <nav className="crumbs eyebrow" aria-label="Breadcrumb">
      {world ? <a href={`#/${world}`}>{world === 'cpu' ? 'CPU world' : 'GPU world'}</a> : <a href="#/bridge">The bridge</a>}
      {c && world && <><span aria-hidden>›</span><a href={`#/${world}?sel=${region?.id ?? ''}`}>{level === 'beginner' ? c.friendly : c.tech}</a></>}
    </nav>
  );
}

export default function LessonScreen({ id }: { id: string }) {
  const l = lesson(id);
  if (!l || !l.body) return <ComingSoon l={l} />;
  return <Player l={l} body={l.body} />;
}

function ComingSoon({ l }: { l?: Lesson }) {
  return (
    <div className="page">
      {l && <Crumbs l={l} />}
      <h1 style={{ marginTop: 12 }}>{l ? <T v={l.title} /> : 'Lesson not found'}</h1>
      <p className="text2" style={{ marginTop: 16, maxWidth: '60ch' }}>{l ? <>This lesson arrives in the next batch. <T v={l.teaser} /></> : 'That lesson doesn’t exist.'}</p>
      <p style={{ marginTop: 24 }}><a className="btn" href="#/">Back to the atlas</a></p>
    </div>
  );
}

function Player({ l, body }: { l: Lesson; body: LessonBody }) {
  const level = useLevel();
  const route = useRoute();
  const complete = useStore(s => s.complete), visit = useStore(s => s.visit), done = useStore(s => !!s.completed[l.id]);
  const n = body.steps.length;
  const q = Number(route.query.get('step'));
  const [step, setStep] = useState<number>(q >= 1 && q <= n ? q - 1 : -1);
  const [hookFb, setHookFb] = useState<{ k: number; right: boolean } | null>(null);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [hookSolved, setHookSolved] = useState(step >= 0);
  const [wrap, setWrap] = useState(false);
  const [layout, setLayout] = useState<Layout>('wide');
  const [caption, setCaption] = useState<Caption | null>(null);
  const [playing, setPlaying] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const diagRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ScenePlayer | null>(null);
  const prev = useRef<{ layout: Layout; level: string; step: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { visit(l.id); }, [l.id, visit]);

  // layout: narrow (vertical) diagram when the stage is small
  useLayoutEffect(() => {
    const el = diagRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setLayout(el.clientWidth < NARROW_BELOW ? 'narrow' : 'wide'));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // player lifecycle. The SVG remounts when layout or level changes (it's keyed),
  // so the player is rebuilt then; a level switch keeps the current frame.
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const p0 = prev.current;
    let p = playerRef.current;
    const rebuilt = !p0 || p0.layout !== layout || p0.level !== level;
    if (rebuilt) {
      p?.destroy();
      p = new ScenePlayer(svg, body.steps, layout, setCaption, setPlaying);
      playerRef.current = p;
    }
    if (!p) return;
    if (step >= 0) {
      if (rebuilt && p0 && p0.step === step && p0.level !== level) p.settle(step);
      else if (rebuilt || !p0 || p0.step !== step) p.enter(step);
    } else setCaption(null);
    prev.current = { layout, level, step };
  }, [layout, level, step, body.steps]);
  useEffect(() => () => { playerRef.current?.destroy(); playerRef.current = null; prev.current = null; }, []);

  // bubble: point its tail at the component being discussed
  const placeBubble = useCallback(() => {
    const svg = svgRef.current, b = bubbleRef.current, d = diagRef.current;
    if (!svg || !b || !d || step < 0) return;
    const el = svg.querySelector(`[data-id="${body.steps[step].anchor}"]`) as SVGGraphicsElement | null;
    if (!el) return;
    const ar = el.getBoundingClientRect(), dr = d.getBoundingClientRect();
    if (layout === 'wide' && innerWidth > 900) {
      const cy = ar.top + ar.height / 2 - dr.top;
      const top = Math.max(0, Math.min(cy - 34, d.clientHeight - b.offsetHeight));
      b.style.marginTop = `${Math.max(0, top)}px`;
      b.style.setProperty('--tail', `${Math.max(16, Math.min(b.offsetHeight - 24, cy - Math.max(0, top) - 6))}px`);
    } else {
      b.style.marginTop = '';
      const br = b.getBoundingClientRect();
      b.style.setProperty('--tailx', `${Math.max(20, Math.min(br.width - 30, ar.left + ar.width / 2 - br.left - 6))}px`);
    }
    try { const bb = el.getBBox(); setAnchor({ x: bb.x, y: bb.y, w: bb.width, h: bb.height }); } catch { /* not rendered */ }
  }, [step, layout, body.steps]);
  useLayoutEffect(() => { placeBubble(); }, [placeBubble, level, wrap]);
  useEffect(() => {
    const ro = new ResizeObserver(() => placeBubble());
    if (bubbleRef.current) ro.observe(bubbleRef.current);
    if (diagRef.current) ro.observe(diagRef.current);
    return () => ro.disconnect();
  }, [placeBubble]);

  const go = useCallback((k: number) => { if (k >= 0 && k < n) { setStep(k); setHookSolved(true); } }, [n]);
  const next = useCallback(() => {
    if (step < 0) return;
    if (step < n - 1) go(step + 1);
    else { setWrap(true); setTimeout(() => wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
  }, [step, n, go]);

  // keyboard: ←/→ steps, space play/pause, R replay
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, select, textarea, [contenteditable]')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (step > 0) go(step - 1); }
      else if (e.code === 'Space' && !t.closest('button, summary, a')) { e.preventDefault(); playerRef.current?.toggle(); }
      else if (e.key === 'r' || e.key === 'R') playerRef.current?.replay();
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [next, go, step]);

  const pickHook = (k: number) => {
    const o = body.hook.options[k];
    setHookFb({ k, right: !!o.correct });
    if (!o.correct) { setWrong(w => new Set(w).add(k)); return; }
    setHookSolved(true);
    setTimeout(() => setStep(0), 1400);
  };

  const api = useMemo<SceneApi>(() => ({ setText: (i, r, t) => playerRef.current?.setText(i, r, t) }), []);
  const restore = useCallback(() => playerRef.current?.restoreText(), []);
  const hidden = step < 0 && !hookSolved ? body.hook.slot : null;
  const [slot, setSlot] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // The empty slot is exactly the size of the part it replaces (measured from the hidden part).
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!hidden || !svg) { setSlot(null); return; }
    const boxes = hidden.map(id => (svg.querySelector(`[data-id="${id}"]`) as SVGGraphicsElement | null)?.getBBox()).filter((b): b is DOMRect => !!b && b.width > 0);
    if (!boxes.length) return;
    const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
    const x1 = Math.max(...boxes.map(b => b.x + b.width)), y1 = Math.max(...boxes.map(b => b.y + b.height));
    setSlot({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden?.join(), layout, level]);
  const s = step >= 0 ? body.steps[step] : null;
  const anchorComp = component(l.components[0]);
  const anchorKind: Kind = (() => {
    if (!s) return anchorComp?.kind ?? 'mem';
    const base = s.anchor.split(/[:.]/)[0];
    const n = body.scene.nodes.find(x => x.id === base);
    return (n && 'kind' in n && n.kind) || 'mem';
  })();
  const kcol = anchorKind === 'neutral' ? 'var(--text-2)' : `var(--${anchorKind})`;

  return (
    <div className="page-wide">
      <header className="lesson-head">
        <Crumbs l={l} />
        <h1 style={{ fontSize: 'clamp(32px, 4.4vw, 48px)' }}><T v={l.title} /></h1>
        <div className="lesson-meta">
          <span>{n} steps · ~{l.minutes} min</span>
          {done && <span className="pill"><Check size={12} /> Completed</span>}
          <div className="stepdots" role="group" aria-label="Steps" style={{ marginLeft: 'auto' }}>
            {body.steps.map((st, i) => (
              <button key={st.id} onClick={() => go(i)} data-s={i < step ? 'done' : i === step ? 'cur' : 'todo'} aria-label={`Step ${i + 1}: ${pick(st.title, level)}`} aria-current={i === step ? 'step' : undefined}><i /></button>
            ))}
          </div>
        </div>
      </header>

      <section className="stage card" aria-label="Lesson animation">
        <div className="stage-diagram" ref={diagRef}>
          <SceneView key={`${layout}-${level}`} ref={svgRef} scene={body.scene} layout={layout} level={level} hidden={hidden} slot={slot}
            anchor={s ? anchor : null} label={pick(l.title, level)} />
        </div>

        {s ? (
          <aside className="bubble" ref={bubbleRef} aria-live="polite" style={{ ['--kc' as string]: kcol }}>
            <div className="who eyebrow"><Glyph kind={anchorKind} /> Step {step + 1} of {n}</div>
            <div className="steptitle"><T v={s.title} /></div>
            <p key={`${step}-${level}`} className="lvl">{rich('both' in s.say ? s.say.both : level === 'beginner' ? s.say.beginner : s.say.intermediate)}</p>
            {s.deeper && (
              <details className="deeper" key={`d-${step}-${level}`} open={level === 'intermediate'}>
                <summary>∑ {level === 'beginner' ? 'Show the math' : 'Go deeper'}</summary>
                <p className="dtext"><T v={s.deeper.text} /></p>
                {s.deeper.formula && <Tex tex={s.deeper.formula} />}
                {s.deeper.widget && <WidgetHost key={`w-${step}-${layout}`} id={s.deeper.widget} api={api} restore={restore} />}
              </details>
            )}
          </aside>
        ) : (
          <aside className="bubble" ref={bubbleRef}>
            <div className="who eyebrow">Before we start</div>
            <div className="steptitle"><T v={body.hook.prompt} /></div>
            <p className="text2" style={{ fontSize: 14 }}><T v={{ b: 'Pick one below. A wrong pick tells you what that part really does.', i: 'Pick one. Wrong picks explain what that part actually does.' }} /></p>
          </aside>
        )}

        {step < 0 && (
          <div className="hookpanel">
            <div className="opts">
              {body.hook.options.map((o, k) => (
                <button key={k} className="opt" data-r={wrong.has(k) ? 'wrong' : hookSolved && o.correct ? 'right' : undefined} disabled={hookSolved} onClick={() => pickHook(k)}>
                  <b>{o.label}</b><span><T v={o.sub} /></span>
                </button>
              ))}
            </div>
            <p className="hookfb" aria-live="polite">{hookFb && <span className={hookFb.right ? 'k-mem' : ''}><T v={body.hook.options[hookFb.k].feedback} /></span>}</p>
          </div>
        )}

        <div className="caption" aria-live="polite">
          <span className="now eyebrow"><i />Now</span>
          <span key={`${caption?.b}-${level}`} className="lvl">{step < 0 ? <T v={{ b: 'Waiting for your pick…', i: 'Hook: choose the missing component.' }} /> : caption ? rich(level === 'beginner' ? caption.b : caption.i) : ''}</span>
        </div>
      </section>

      <div className="controls">
        <button className="btn" onClick={() => playerRef.current?.toggle()} disabled={step < 0} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'Pause' : 'Play'} <span className="kbd">space</span>
        </button>
        <button className="btn opt-desktop" onClick={() => playerRef.current?.replay()} disabled={step < 0}><RotateCcw size={15} /> Replay <span className="kbd">R</span></button>
        {anchorComp?.sandbox && <a className="btn btn-ghost opt-desktop" href={anchorComp.sandbox.href}><FlaskConical size={15} /> {anchorComp.sandbox.label}</a>}
        <span className="spacer" />
        <button className="btn c-back" onClick={() => go(step - 1)} disabled={step <= 0}><ArrowLeft size={15} /> Back <span className="kbd">←</span></button>
        <button className="btn btn-primary" onClick={next} disabled={step < 0}>{step === n - 1 ? 'Finish' : 'Next step'} <ArrowRight size={15} /></button>
      </div>

      {s?.table && (
        <details className="statetbl card" key={`t-${step}-${level}`} open={level === 'intermediate'}>
          <summary><span className="eyebrow">{level === 'beginner' ? 'Show the details' : 'Live state'}</span> <T v={s.table.title} /></summary>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>{s.table.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{s.table.rows.map((r, i) => <tr key={i} data-tone={r.tone}>{r.cells.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      )}

      {wrap && (
        <section className="wrapup" ref={wrapRef} aria-label="Takeaways and quiz">
          <div className="card">
            <span className="eyebrow">Key takeaways</span>
            <ul className="takeaways">{body.takeaways.map((t, i) => <li key={i}><span className="k-math">∑</span><T v={t} richText /></li>)}</ul>
          </div>
          <div className="card">
            <span className="eyebrow">Quick check</span>
            <Quiz qs={body.quiz} onComplete={() => complete(l.id)} />
            {done && <p style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-sm" href={l.world === 'cpu' || l.world === 'gpu' ? `#/${l.world}` : '#/bridge'}>Back to the map</a>
              <a className="btn btn-sm" href={lessonHref(l.id === 'm-cache' ? lesson('g-simt')! : lesson('m-cache')!)}>Next: <T v={(l.id === 'm-cache' ? lesson('g-simt')! : lesson('m-cache')!).title} /></a>
            </p>}
          </div>
        </section>
      )}
    </div>
  );
}
