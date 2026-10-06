import { useState } from 'react';
import type { QuizQ } from '../content/types';
import { T } from '../lib/text';

export function Quiz({ qs, onComplete }: { qs: QuizQ[]; onComplete: (score: number) => void }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => qs.map(() => null));
  const choose = (qi: number, ci: number) => {
    if (picked[qi] != null) return;
    const next = picked.map((p, i) => (i === qi ? ci : p));
    setPicked(next);
    if (next.every(p => p != null)) onComplete(next.filter((p, i) => p === qs[i].answer).length);
  };
  return (
    <div>
      {qs.map((q, qi) => {
        const p = picked[qi];
        return (
          <div key={qi} className="quizq" role="group" aria-label={`Question ${qi + 1}`}>
            <div style={{ fontWeight: 500 }}><T v={q.q} /></div>
            {q.choices.map((c, ci) => {
              const r = p == null ? undefined : ci === q.answer ? 'right' : ci === p ? 'wrong' : undefined;
              return (
                <button key={ci} className="qopt" data-r={r} disabled={p != null} onClick={() => choose(qi, ci)}>
                  <span aria-hidden style={{ width: 14 }} className={r === 'right' ? 'k-mem' : r === 'wrong' ? 'k-err' : 'muted'}>{r === 'right' ? '✓' : r === 'wrong' ? '✕' : '○'}</span>
                  <T v={c} />
                  {r === 'right' && <span className="sr-only">correct answer</span>}
                  {r === 'wrong' && <span className="sr-only">your answer, incorrect</span>}
                </button>
              );
            })}
            {p != null && (
              <p className="qwhy lvl">
                <b className={p === q.answer ? 'k-mem' : 'k-err'}>{p === q.answer ? '✓ Right. ' : '✕ Not quite. '}</b><T v={q.why} />
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
