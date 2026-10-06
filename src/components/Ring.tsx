import type { Kind } from '../content/types';

export function Ring({ value, size = 40, kind = 'neutral', label }: { value: number; size?: number; kind?: Kind | 'bridge'; label?: string }) {
  const r = size / 2 - 3, c = 2 * Math.PI * r;
  const stroke = kind === 'bridge' ? 'url(#ring-bridge)' : kind === 'neutral' ? 'var(--text-2)' : `var(--${kind})`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(value * 100)}% complete`}>
      {kind === 'bridge' && (
        <defs><linearGradient id="ring-bridge" x1="0" x2="1"><stop offset="0" stopColor="var(--cpu)" /><stop offset="1" stopColor="var(--gpu)" /></linearGradient></defs>
      )}
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={2} />
      <circle className="ring-val" cx={size / 2} cy={size / 2} r={r} strokeWidth={2} stroke={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}
