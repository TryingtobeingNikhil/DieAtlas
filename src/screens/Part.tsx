import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Play, RotateCcw } from 'lucide-react';
import { loadPage, hasPage, pageHref } from '../content/parts';
import type { CheckQ, Cue, PartPage } from '../content/parts/types';
import { component } from '../content/components';
import { CHIP_WORLDS, index as indexWorld, regionForComp, type ChipRegion } from '../content/chipmaps';
import { lesson, lessonHref } from '../content/lessons';
import { FIGURES } from '../figures';
import { Prose, TermTip } from '../components/Prose';
import { Tex } from '../components/Tex';
import { Glyph, pick } from '../lib/text';
import { useLevel } from '../state/store';

/** Where this component sits in its world's map, as "CPU / Core / L1 data cache". */
function mapPath(id: string) {
  const world = id.startsWith('gpu.') ? 'gpu' : 'cpu';
  const W = CHIP_WORLDS[world];
  const r = regionForComp(W, id);
  if (!r) return { world, crumbs: [] as { label: string; href: string }[] };
  const { parentOf } = indexWorld(W);
  const chain: ChipRegion[] = [];
  for (let x: ChipRegion | null | undefined = r; x; x = parentOf.get(x.id)) chain.unshift(x);
  const crumbs = chain.slice(1).map(x => ({
    label: pick(x.crumb ?? x.label, 'intermediate'),
    href: `#/${world}?at=${encodeURIComponent(x.children ? x.id : parentOf.get(x.id)?.id ?? x.id)}${x.children ? '' : `&sel=${x.id}`}`,
  }));
  return { world, crumbs };
}

export default function PartScreen({ id }: { id: string }) {
  const [page, setPage] = useState<PartPage | null | undefined>(undefined);
  useEffect(() => { let alive = true; if (!hasPage(id)) setPage(null); else loadPage(id)!.then(p => alive && setPage(p)); return () => { alive = false; }; }, [id]);
  const c = component(id);
  if (page === null || !c) return <div className="page"><h1>Page coming soon</h1><p className="text2" style={{ marginTop: 12 }}><a className="link" href="#/cpu">Back to the CPU</a> · <a className="link" href="#/gpu">GPU</a></p></div>;
  if (!page) return <div className="page muted" aria-busy>Loading…</div>;
  return <PartView page={page} key={page.id} />;
}

function PartView({ page }: { page: PartPage }) {
  const level = useLevel();
  const c = component(page.id)!;
  const { world, crumbs } = mapPath(page.id);
  const Figure = FIGURES[page.figure];
  const [cue, setCue] = useState<Cue>(page.does.cue);
  const [label, setLabel] = useState('What it does');
  const [hover, setHover] = useState<string[] | null>(null);
  const [step, setStep] = useState(-1);
  const [deep, setDeep] = useState(level === 'intermediate');
  useEffect(() => setDeep(level === 'intermediate'), [level]);
  useEffect(() => { document.title = `${c.tech} · Die Atlas`; return () => { document.title = 'Die Atlas'; }; }, [c.tech]);

  const go = (i: number) => {
    const s = page.how[i];
    setStep(i); setCue(s.cue); setLabel(`Step ${i + 1} of ${page.how.length}: ${s.title}`);
  };
  const show = (cu: Cue, l: string) => { setCue(cu); setLabel(l); };
  const lsn = page.lesson ? lesson(page.lesson) : undefined;
  const P = (s: string) => <Prose s={s} onPart={setHover} />;

  return (
    <div className="pp" style={{ ['--kc' as string]: `var(--${c.kind === 'neutral' ? 'text-2' : c.kind})` }}>
      <TermTip />
      <header className="pp-head">
        <nav className="crumbline" aria-label="Where this part sits">
          <a href={`#/${world}`}>{world === 'cpu' ? 'CPU' : 'GPU'}</a>
          {crumbs.map(x => <span key={x.href}><span className="sep" aria-hidden>/</span><a href={x.href}>{x.label}</a></span>)}
        </nav>
        <h1><Glyph kind={c.kind} /> {c.tech}</h1>
        <div className="techsub">{c.friendly}{c.key ? ` · ${c.key.value}` : ''}</div>
      </header>

      <div className="pp-grid">
        <div className="pp-figwrap">
          <div className="pp-fig">
            <Suspense fallback={<div className="pp-figph" />}>
              <Figure cue={cue} hover={hover} />
            </Suspense>
            <div className="pp-figcap" aria-live="polite">
              <span className="now"><i />{label}</span>
              {step >= 0 && (
                <span className="pp-stepctl">
                  <button className="btn btn-sm btn-ghost" disabled={step === 0} onClick={() => go(step - 1)} aria-label="Previous step"><ArrowLeft size={14} /></button>
                  <button className="btn btn-sm" disabled={step === page.how.length - 1} onClick={() => go(step + 1)}>Next <ArrowRight size={14} /></button>
                </span>
              )}
            </div>
          </div>
        </div>

        <article className="pp-text">
          <section>
            <h2>What is it?</h2>
            <p className="pp-lede">{P(page.what)}</p>
          </section>

          <section>
            <h2>What does it do?</h2>
            <p>{P(page.does.text)}</p>
            <button className="btn btn-sm btn-ghost" onClick={() => { setStep(-1); show(page.does.cue, 'What it does'); }}><Play size={13} /> Show it working</button>
          </section>

          <section>
            <h2>Why do we need it?</h2>
            {page.why.map((s, i) => <p key={i}>{P(s)}</p>)}
          </section>

          <section>
            <h2>How does it work?</h2>
            <ol className="pp-steps">
              {page.how.map((s, i) => (
                <li key={i} className={step === i ? 'cur' : undefined}>
                  <button className="pp-stephead" onClick={() => go(i)} aria-current={step === i ? 'step' : undefined}>
                    <span className="n">{i + 1}</span><span>{s.title}</span>
                  </button>
                  <p>{P(s.text)}</p>
                </li>
              ))}
            </ol>
            <div className="pp-stepbar">
              {step < 0
                ? <button className="btn btn-primary" onClick={() => go(0)}>Step through it on the drawing <ArrowRight size={15} /></button>
                : <>
                    <button className="btn btn-sm btn-ghost" disabled={step === 0} onClick={() => go(step - 1)}><ArrowLeft size={14} /> Back</button>
                    <span className="mono muted" style={{ fontSize: 12 }}>step {step + 1} / {page.how.length}</span>
                    {step < page.how.length - 1
                      ? <button className="btn btn-sm" onClick={() => go(step + 1)}>Next <ArrowRight size={14} /></button>
                      : <button className="btn btn-sm btn-ghost" onClick={() => go(0)}><RotateCcw size={13} /> Start again</button>}
                  </>}
            </div>
          </section>

          <section>
            <h2>Key numbers</h2>
            <dl className="pp-nums">
              {page.numbers.map(n => <div key={n.value}><dt>{n.value}</dt><dd>{P(n.meaning)}</dd></div>)}
            </dl>
            <p className="pp-scope">Typical values: {page.numbersScope}. Real chips vary; see the Architectures pages for exact figures.</p>
          </section>

          <section>
            <h2>Check yourself</h2>
            <Check qs={page.check} />
            <p className="pp-real"><b>In the real world.</b> {P(page.realWorld)}</p>
          </section>

          <section className={'pp-deeper' + (deep ? ' open' : '')}>
            <button className="pp-deeper-h" aria-expanded={deep} onClick={() => setDeep(d => !d)}>
              <span>Go deeper</span><span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{deep ? 'the mechanism, the formula, the design choices' : 'open the mechanism, the formula and the design choices'}</span>
              <ChevronDown size={16} className="chev" />
            </button>
            {deep && (
              <div className="pp-deeper-b">
                {page.deeper.mechanism.map(m => (
                  <div key={m.title}>
                    <h3>{m.title}{m.cue && <button className="pp-showbtn" onClick={() => show(m.cue!, m.title)}>show on drawing</button>}</h3>
                    <p>{P(m.text)}</p>
                  </div>
                ))}
                <h3>The formula</h3>
                <div className="pp-formula"><Tex tex={page.deeper.formula.tex} block /></div>
                <p className="text2" style={{ fontSize: 14 }}>{P(page.deeper.formula.where)}</p>
                <div className="pp-worked">
                  <div className="eyebrow">Worked example</div>
                  <p>{P(page.deeper.worked.q)}</p>
                  <ol>{page.deeper.worked.steps.map((s, i) => <li key={i}>{P(s)}</li>)}</ol>
                  <p><b>Answer:</b> {P(page.deeper.worked.answer)}</p>
                </div>
                <h3>Design choices</h3>
                {page.deeper.choices.map(ch => <p key={ch.title}><b>{ch.title}.</b> {P(ch.text)}</p>)}
              </div>
            )}
          </section>

          <section className="pp-links">
            <h2>Connected to</h2>
            <ul>
              {page.connected.map(x => {
                const cc = component(x.id);
                const href = hasPage(x.id) ? pageHref(x.id) : (() => { const w = x.id.startsWith('gpu.') ? 'gpu' : 'cpu'; const r = regionForComp(CHIP_WORLDS[w], x.id); const par = r ? indexWorld(CHIP_WORLDS[w]).parentOf.get(r.id) : null; return `#/${w}?at=${par?.id ?? ''}&sel=${r?.id ?? ''}`; })();
                return (
                  <li key={x.id}>
                    <a href={href}>{cc && <Glyph kind={cc.kind} />} {cc?.tech ?? x.id} <ArrowRight size={13} /></a>
                    <span className="text2">{P(x.why)}</span>
                  </li>
                );
              })}
            </ul>
            {lsn && lsn.status === 'ready' && (
              <p style={{ marginTop: 14 }}><a className="btn btn-sm" href={lessonHref(lsn)}>Related lesson: {pick(lsn.title, level)} <ArrowRight size={14} /></a></p>
            )}
            {c.sandbox && <p style={{ marginTop: 8 }}><a className="link" href={c.sandbox.href}>Try it in Dielab: {c.sandbox.label} →</a></p>}
          </section>

          <section className="pp-sources">
            <h2>Sources</h2>
            <ul>{page.sources.map(s => <li key={s.title}>{s.url ? <a className="link" href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title} ({s.year})</li>)}</ul>
          </section>
        </article>
      </div>
    </div>
  );
}

function Check({ qs }: { qs: CheckQ[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => qs.map(() => null));
  return (
    <div>
      {qs.map((q, qi) => {
        const p = picked[qi];
        return (
          <div key={qi} className="quizq" role="group" aria-label={`Question ${qi + 1}`}>
            <div style={{ fontWeight: 500 }}><Prose s={q.q} /></div>
            {q.options.map((o, ci) => {
              const r = p == null ? undefined : ci === q.answer ? 'right' : ci === p ? 'wrong' : undefined;
              return (
                <button key={ci} className="qopt" data-r={r} disabled={p != null} onClick={() => setPicked(ps => ps.map((x, i) => (i === qi ? ci : x)))}>
                  <span aria-hidden style={{ width: 14 }} className={r === 'right' ? 'k-mem' : r === 'wrong' ? 'k-err' : 'muted'}>{r === 'right' ? '✓' : r === 'wrong' ? '✕' : '○'}</span>
                  <span><Prose s={o} /></span>
                  {r === 'right' && <span className="sr-only">correct answer</span>}
                  {r === 'wrong' && <span className="sr-only">your answer, incorrect</span>}
                </button>
              );
            })}
            {p != null && <p className="qwhy"><b className={p === q.answer ? 'k-mem' : 'k-err'}>{p === q.answer ? '✓ Right. ' : '✕ Not quite. '}</b><Prose s={q.why} /></p>}
          </div>
        );
      })}
    </div>
  );
}
