import { forwardRef, memo } from 'react';
import type { Kind, Level, Scene, SceneNode, GridNode } from '../content/types';
import { pick, GLYPH } from '../lib/text';

// Renders a declarative scene once. Animation never goes through React: the
// ScenePlayer flips data-state attributes and CSS transforms on these elements.

export type Layout = 'wide' | 'narrow';
const kc = (k?: Kind) => (!k || k === 'neutral' ? 'var(--text-2)' : `var(--${k})`);

export function nodeBox(n: SceneNode, layout: Layout) {
  const o = layout === 'narrow' && n.n ? n.n : undefined;
  const x = o?.x ?? n.x, y = o?.y ?? n.y;
  const w = (o && 'w' in o && o.w) || ('w' in n ? n.w : 0);
  const h = (o && 'h' in o && o.h) || ('h' in n ? n.h : 0);
  return { x, y, w, h };
}

export function gridGeom(n: GridNode, layout: Layout) {
  const nar = layout === 'narrow';
  const { x, y } = nodeBox(n, layout);
  const cw = (nar && n.cwN) || n.cw, ch = (nar && n.chN) || n.ch, gap = (nar && n.gapN != null ? n.gapN : n.gap);
  const lw = nar && n.labelWN != null ? n.labelWN : n.labelW ?? 0;
  return { x, y, cw, ch, gap, lw, width: lw + n.cols * (cw + gap) - gap, height: n.rows * (ch + gap) - gap };
}

function Grid({ n, layout }: { n: GridNode; layout: Layout }) {
  const g = gridGeom(n, layout);
  const marks = g.cw >= 20 && g.ch >= 16;
  return (
    <g className="sn sn-grid" data-id={n.id} data-state={n.initial ?? 'idle'} style={{ ['--kc' as string]: kc(n.kind), ['--rk' as string]: kc(n.rowKind ?? n.kind) }}>
      {n.colLabels && g.lw > 0 && n.colLabels.map((c, i) => (
        <text key={i} className="collbl" x={g.x + g.lw + i * (g.cw + g.gap) + g.cw / 2} y={g.y - 8} textAnchor="middle">{c}</text>
      ))}
      {Array.from({ length: n.rows }, (_, r) => {
        const ry = g.y + r * (g.ch + g.gap);
        return (
          <g key={r} className="row" data-id={`${n.id}:r${r}`} data-state="idle">
            <rect className="rowbg" x={g.x - 6} y={ry - 3} width={g.width + 12} height={g.ch + 6} rx={5} />
            {g.lw > 0 && n.rowLabels && <text className="rowlbl" data-role="label" x={g.x} y={ry + g.ch / 2 + 4}>{n.rowLabels[r]}</text>}
            {Array.from({ length: n.cols }, (_, c) => {
              const cx = g.x + g.lw + c * (g.cw + g.gap);
              return (
                <g key={c}>
                  <rect className="cell" data-id={`${n.id}.${r}.${c}`} data-state="idle" x={cx} y={ry} width={g.cw} height={g.ch} rx={Math.min(4, g.ch / 4)} />
                  {marks && <text className="cellmark x" x={cx + g.cw / 2} y={ry + g.ch / 2 + 3.5} textAnchor="middle">✕</text>}
                  {marks && <text className="cellmark v" x={cx + g.cw / 2} y={ry + g.ch / 2 + 3.5} textAnchor="middle">✓</text>}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function Node({ n, layout, level }: { n: SceneNode; layout: Layout; level: Level }) {
  const st = n.initial ?? 'idle';
  const { x, y, w, h } = nodeBox(n, layout);
  switch (n.type) {
    case 'box': {
      const small = h < 50;
      const sub = n.sub ? pick(n.sub, level) : '';
      const subMono = level === 'intermediate' && /[\d[\]<>]/.test(sub);
      return (
        <g className="sn sn-box" data-id={n.id} data-state={st} style={{ ['--kc' as string]: kc(n.kind) }}>
          <rect className="b" x={x} y={y} width={w} height={h} rx={10} />
          <text className="title" data-role="title" x={x + 14} y={small ? y + h / 2 + 4.5 : y + 26}>
            <tspan className="glyph-t" style={{ fill: kc(n.kind) }}>{GLYPH[n.kind]}</tspan>
            <tspan dx={7}>{pick(n.title, level)}</tspan>
          </text>
          {!small && sub && <text className={'sub' + (subMono ? ' mono' : '')} data-role="sub" x={x + 14} y={y + 45}>{sub}</text>}
        </g>
      );
    }
    case 'grid': return <Grid n={n} layout={layout} />;
    case 'arrow': {
      const n2 = layout === 'narrow' && n.n2 ? n.n2 : { x2: n.x2, y2: n.y2 };
      return (
        <g className="sn sn-arrow" data-id={n.id} data-state={st}>
          <line x1={x} y1={y} x2={n2.x2} y2={n2.y2} markerEnd="url(#sc-arrow)" style={n.kind ? { stroke: kc(n.kind) } : undefined} />
        </g>
      );
    }
    case 'badge':
      return (
        <g className="sn sn-badge" data-id={n.id} data-state={st} style={{ ['--kc' as string]: kc(n.kind) }}>
          <rect x={x} y={y} width={n.w} height={24} rx={12} />
          <text x={x + n.w / 2} y={y + 16} textAnchor="middle" data-role="text">{pick(n.text, level)}</text>
        </g>
      );
    case 'label':
      return (
        <g className={'sn sn-label' + (n.mono ? ' mono' : '')} data-id={n.id} data-state={st}>
          <text x={x} y={y} textAnchor={n.anchor ?? 'start'} data-role="text" style={{ fontSize: n.size ?? 12, ...(n.kind ? { fill: kc(n.kind) } : {}) }}>{pick(n.text, level)}</text>
        </g>
      );
    case 'token':
      return (
        <>
          {[2, 1].map(gi => (
            <g key={gi} className="sn sn-token" data-ghost-of={n.id} data-state={st} style={{ ['--kc' as string]: kc(n.kind), transitionDuration: `${750 + gi * 110}ms` }}>
              <rect className="trail" x={x + 4} y={y + 3} width={n.w - 8} height={14} rx={7} style={{ opacity: gi === 1 ? 0.22 : 0.1 }} />
            </g>
          ))}
          <g className="sn sn-token" data-id={n.id} data-state={st} style={{ ['--kc' as string]: kc(n.kind) }}>
            <g className="tk">
              <rect x={x} y={y} width={n.w} height={20} rx={10} />
              <text x={x + n.w / 2} y={y + 14} textAnchor="middle">{n.label}</text>
            </g>
          </g>
        </>
      );
  }
}

interface Props {
  scene: Scene;
  layout: Layout;
  level: Level;
  hidden?: string[] | null;
  slot?: { x: number; y: number; w: number; h: number } | null;
  anchor?: { x: number; y: number; w: number; h: number } | null;
  label: string;
}

export const SceneView = memo(forwardRef<SVGSVGElement, Props>(function SceneView({ scene, layout, level, hidden, slot, anchor, label }, ref) {
  const [vw, vh] = layout === 'narrow' ? scene.viewBoxN : scene.viewBox;
  // tokens render last so they travel above everything
  const order = [...scene.nodes].sort((a, b) => (a.type === 'token' ? 1 : 0) - (b.type === 'token' ? 1 : 0));
  return (
    <svg ref={ref} className="scene" viewBox={`0 0 ${vw} ${vh}`} role="img" aria-label={label}>
      <defs>
        <marker id="sc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
        </marker>
      </defs>
      {order.map(n => (
        <g key={n.id + layout} data-hook={hidden?.includes(n.id) ? 'hidden' : undefined} className="snap-in">
          <Node n={n} layout={layout} level={level} />
        </g>
      ))}
      {slot && (
        <g aria-hidden>
          <rect className="slot-ghost" x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx={12} />
          <text className="slot-q" x={slot.x + slot.w / 2} y={slot.y + slot.h / 2 + 14} textAnchor="middle">?</text>
        </g>
      )}
      {anchor && <rect className="anchor-ring" x={anchor.x - 6} y={anchor.y - 6} width={anchor.w + 12} height={anchor.h + 12} rx={12} />}
    </svg>
  );
}));
