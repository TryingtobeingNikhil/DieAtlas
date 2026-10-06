import { Fragment, type ReactNode } from 'react';
import type { Kind, Level, LT } from '../content/types';
import { useLevel } from '../state/store';

export const pick = (v: LT, level: Level): string => (typeof v === 'string' ? v : level === 'beginner' ? v.b : v.i);

export function useT() {
  const level = useLevel();
  return (v: LT) => pick(v, level);
}

/** Inline markup: **bold**, `code`, {kind:text} where kind ∈ gpu|cpu|mem|math|err. */
export function rich(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`|\{(gpu|cpu|mem|math|err):(.+?)\}/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2]) out.push(<code key={k++} className="mono" style={{ fontSize: '0.92em' }}>{m[2]}</code>);
    else out.push(<span key={k++} className={`k-${m[3]}`} style={{ fontWeight: 500 }}>{m[4]}</span>);
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** Level-aware text with a short crossfade whenever the level changes. */
export function T({ v, richText = false, className }: { v: LT; richText?: boolean; className?: string }) {
  const level = useLevel();
  const s = pick(v, level);
  const same = typeof v === 'string';
  return (
    <span key={same ? 'x' : level} className={(same ? '' : 'lvl ') + (className ?? '')}>
      {richText ? <Fragment>{rich(s)}</Fragment> : s}
    </span>
  );
}

export const GLYPH: Record<Kind, string> = { gpu: '●', cpu: '◆', mem: '▬', math: '∑', err: '✕', neutral: '○' };

export function Glyph({ kind, className = '' }: { kind: Kind; className?: string }) {
  return <i aria-hidden className={`glyph k-${kind} ${className}`}>{GLYPH[kind]}</i>;
}
