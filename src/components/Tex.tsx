import { useEffect, useRef } from 'react';

// KaTeX is loaded lazily, the first time any formula is shown.
let katexP: Promise<typeof import('katex').default> | null = null;
const loadKatex = () => (katexP ??= import('./katexLoader').then(m => m.default));

export function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let alive = true;
    loadKatex().then(k => { if (alive && ref.current) k.render(tex, ref.current, { throwOnError: false, displayMode: block }); });
    return () => { alive = false; };
  }, [tex, block]);
  return <span ref={ref} className="formula" style={{ display: block ? 'block' : 'inline-block' }}><span className="tex-raw">{tex}</span></span>;
}
