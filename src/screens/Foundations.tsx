import { ArrowRight } from 'lucide-react';
import { LESSONS, lesson, lessonHref } from '../content/lessons';
import { T } from '../lib/text';
import { useLevel } from '../state/store';

// Foundations lessons arrive in a later batch. This page must never be a dead end:
// it says what's coming and sends people to a lesson that assumes nothing.
export default function Foundations() {
  const level = useLevel();
  const coming = LESSONS.filter(l => l.world === 'foundations');
  const start = lesson('m-cache')!;
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <span className="eyebrow">The entrance</span>
      <h1 style={{ marginTop: 8 }}>Foundations</h1>
      <p className="ticker" style={{ marginTop: 14 }}>
        <T v={{
          b: 'Switches, gates, clocks and how numbers are stored. You don’t need these first: every lesson explains its words as it goes.',
          i: 'Transistors, gates → ALU, clocking, two’s complement and IEEE 754 (FP32/FP16/BF16/FP8). Optional; nothing is locked behind it.',
        }} />
      </p>
      <section className="card" style={{ padding: 22, marginTop: 24, display: 'grid', gap: 14 }}>
        <span className="eyebrow">{level === 'beginner' ? 'Start here' : 'Good first lesson'}</span>
        <h2 style={{ fontSize: 22 }}><T v={start.title} /></h2>
        <p className="text2"><T v={{ b: 'How a CPU finds one byte among thousands, in about 4 ticks. No background needed.', i: 'Tag/index/offset, set selection, LRU fill and AMAT, with a live cache diagram.' }} /></p>
        <div><a className="btn btn-primary" href={lessonHref(start)}>Start the lesson <ArrowRight size={15} /></a></div>
      </section>
      <p className="soonline" style={{ marginTop: 18 }}>
        +{coming.length} Foundations lessons coming: {coming.map(l => (typeof l.title === 'string' ? l.title : level === 'beginner' ? l.title.b : l.title.i)).join(' · ')}.
      </p>
      <p style={{ marginTop: 18, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14 }}>
        <a className="link" href="#/cpu">Explore the CPU world</a>
        <a className="link" href="#/gpu">Explore the GPU world</a>
      </p>
    </div>
  );
}
