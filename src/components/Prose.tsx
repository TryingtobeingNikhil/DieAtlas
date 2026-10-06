import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { term } from '../content/glossary';
import { pick } from '../lib/text';
import { useLevel } from '../state/store';

// Rich prose for component pages: everything rich() handles, plus
//   [[term]] / [[shown|glossary-id]]  → dotted underline, definition on hover/focus/tap
//   ((shown|part,part))               → highlights those parts of the page's figure on hover/focus

import { PROSE_RE as RE } from '../lib/prose';

export function Prose({ s, onPart }: { s: string; onPart?: (parts: string[] | null) => void }) {
  const out: ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, k = 0;
  RE.lastIndex = 0;
  while ((m = RE.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={k++}>{m[2]}</em>);
    else if (m[3]) out.push(<code key={k++} className="mono icode">{m[3]}</code>);
    else if (m[4]) out.push(<span key={k++} className={`k-${m[4]}`} style={{ fontWeight: 500 }}>{m[5]}</span>);
    else if (m[6]) {
      const [shown, id] = m[6].includes('|') ? m[6].split('|') : [m[6], m[6]];
      out.push(<Term key={k++} id={id} shown={shown} />);
    } else if (m[7]) {
      const parts = m[8].split(',').map(x => x.trim());
      out.push(
        <span key={k++} className="partref" tabIndex={onPart ? 0 : undefined}
          onPointerEnter={() => onPart?.(parts)} onPointerLeave={() => onPart?.(null)}
          onFocus={() => onPart?.(parts)} onBlur={() => onPart?.(null)}>{m[7]}</span>,
      );
    }
    last = RE.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return <>{out}</>;
}


// ---- one shared floating definition, positioned next to the term (never clipped by the viewport)
type TipState = { id: string; rect: DOMRect; uid: number } | null;
let tip: TipState = null;
const subs = new Set<() => void>();
const setTip = (t: TipState) => { tip = t; subs.forEach(f => f()); };
let uidN = 0;

function Term({ id, shown }: { id: string; shown: string }) {
  const t = term(id);
  const uid = useRef(++uidN).current;
  const el = useRef<HTMLSpanElement>(null);
  if (!t) return <span className="term term-missing" title={`glossary: ${id} not found`}>{shown}</span>;
  const show = () => el.current && setTip({ id: t.id, rect: el.current.getBoundingClientRect(), uid });
  const hide = () => { if (tip?.uid === uid) setTip(null); };
  return (
    <span ref={el} className="term" tabIndex={0} aria-describedby="term-tip"
      onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide}
      onClick={e => { e.stopPropagation(); if (tip?.uid === uid) setTip(null); else show(); }}>{shown}</span>
  );
}

export function TermTip() {
  const level = useLevel();
  const cur = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => tip);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!cur || !box.current) return;
    const w = box.current.offsetWidth, h = box.current.offsetHeight, r = cur.rect;
    const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    const below = r.bottom + 8 + h < innerHeight;
    setPos({ x, y: below ? r.bottom + 6 : r.top - h - 6 });
  }, [cur]);
  useEffect(() => {
    const off = () => setTip(null);
    addEventListener('scroll', off, { passive: true }); addEventListener('click', off);
    return () => { removeEventListener('scroll', off); removeEventListener('click', off); };
  }, []);
  const t = cur ? term(cur.id) : null;
  return (
    <div ref={box} id="term-tip" role="tooltip" className={'term-tip' + (t ? ' on' : '')} style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
      {t && <><b>{t.term}</b> <span>{pick(t.def, level)}</span>{level === 'intermediate' && t.vendor && <div className="muted mono" style={{ fontSize: 11, marginTop: 4 }}>{t.vendor}</div>}</>}
    </div>
  );
}
