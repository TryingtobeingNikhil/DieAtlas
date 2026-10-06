import { ArrowRight, Check } from 'lucide-react';
import { COMPONENTS } from '../content/components';
import { lessonsFor, lessonHref } from '../content/lessons';
import { T, Glyph } from '../lib/text';
import { useLevel, useStore } from '../state/store';
import type { MapComponent } from '../content/types';

function Station({ c }: { c: MapComponent }) {
  const level = useLevel();
  const done = useStore(s => s.completed);
  const l = lessonsFor(c.id)[0];
  const ready = l?.status === 'ready';
  const inner = (
    <>
      <span className="eyebrow" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {c.kind !== 'neutral' && <Glyph kind={c.kind} />}
        <span key={level} className="lvl">{level === 'beginner' ? c.tech : c.friendly}</span>
        {ready && done[l.id] && <Check size={13} aria-label="completed" />}
      </span>
      <div className="st-title"><T v={level === 'beginner' ? c.friendly : c.tech} /></div>
      <p className="st-tease"><T v={c.teaser} /></p>
      <span className="muted" style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        {ready ? <span style={{ color: 'var(--text)' }}>Open <ArrowRight size={14} style={{ verticalAlign: -2 }} /></span> : 'Next batch'}
        {l && <span className="lvtag" style={{ marginLeft: 8 }}>For {l.level === 'beginner' ? 'beginners' : 'intermediate'}</span>}
      </span>
    </>
  );
  return ready ? <a className="station card" href={lessonHref(l)}>{inner}</a> : <div className="station card" style={{ opacity: 0.75 }}>{inner}</div>;
}

export default function BridgeScreen() {
  const level = useLevel();
  const all = COMPONENTS.filter(c => c.world === 'bridge');
  const isReady = (c: MapComponent) => lessonsFor(c.id).some(l => l.status === 'ready');
  const ready = all.filter(isReady), soon = all.filter(c => !isReady(c));
  return (
    <div className="page">
      <span className="eyebrow">Between the two worlds</span>
      <h1 style={{ marginTop: 8 }}>The bridge</h1>
      <p className="ticker" style={{ marginTop: 16 }}>
        <T v={{
          b: 'A CPU and a GPU are built for opposite goals. A CPU spends its silicon on finishing one task as fast as possible. A GPU spends it on running thousands of simple tasks at once. Here you race them on the same jobs.',
          i: 'Latency vs throughput. A CPU spends area on caches, prediction and out-of-order machinery to shorten one thread; a GPU spends it on lanes, registers and warps to maximise work per second. Same workloads, side by side, then the roofline and AI.',
        }} />
      </p>

      <div className="philo card">
        <div>
          <span className="eyebrow"><Glyph kind="cpu" /> CPU · latency</span>
          <ul>
            <li><T v={{ b: 'A few big, clever cores (16 in a Ryzen 9 7950X)', i: '16 Zen 4 cores, 6-wide dispatch, 320-entry ROB' }} /></li>
            <li><T v={{ b: 'Big caches so data is usually close', i: '1 MB L2 per core + 32 MB L3 per 8 cores' }} /></li>
            <li><T v={{ b: 'Guesses which way each “if” goes', i: 'Branch prediction + speculation hide control latency' }} /></li>
          </ul>
        </div>
        <div>
          <span className="eyebrow"><Glyph kind="gpu" /> GPU · throughput</span>
          <ul>
            <li><T v={{ b: 'Thousands of simple lanes (16,896 in an H100)', i: '132 SMs × 128 FP32 lanes = 16,896' }} /></li>
            <li><T v={{ b: 'A huge notepad so switching tasks is free', i: '256 KB register file per SM (33 MB across 132 SMs)' }} /></li>
            <li><T v={{ b: 'Doesn’t guess: switches to another group instead', i: 'Latency hidden by up to 64 resident warps per SM' }} /></li>
          </ul>
        </div>
      </div>

      <h2 style={{ marginTop: 40 }}>Stations</h2>
      <div className="stations">
        {ready.map(c => <Station key={c.id} c={c} />)}
      </div>
      <p className="soonline" style={{ marginTop: 14 }}>
        +{soon.length} more stations coming: {soon.map(c => (level === 'beginner' ? c.friendly : c.tech)).join(' · ')}.
      </p>
    </div>
  );
}
