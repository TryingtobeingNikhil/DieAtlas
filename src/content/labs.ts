import type { LT } from './types';
import type { CacheConfig } from '../sim/cache';
import { DEFAULT_CONFIG } from '../sim/cache';

// Missions: a build goal with a live checklist.
// Challenges: a design that ships broken, a measurable goal, progressive hints.
// scripts/validate.ts proves each one fails as shipped and passes with its fix.

export interface Check { id: string; label: LT; test: (c: CacheConfig, r: { hitRate: number }) => boolean }

export interface CacheLab {
  id: string;
  type: 'mission' | 'challenge';
  title: LT;
  brief: LT;
  start: CacheConfig;
  checks: Check[];
  hints: LT[];
  /** Intended fix, used by the validation script. */
  fix: Partial<CacheConfig>;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
export { pct };

export const CACHE_LABS: CacheLab[] = [
  {
    id: 'stop-thrash',
    type: 'mission',
    title: { b: 'Stop the cache from thrashing', i: 'Stop the thrashing' },
    brief: {
      b: 'A program reads a 64 × 64 grid of numbers column by column, and almost every read misses. Get the hit rate to 90% or more without making the cache bigger than 8 KB.',
      i: 'Column-order walk over a row-major 64 × 64 FP32 matrix on an 8 KB, 2-way cache: nearly every access misses. Reach ≥ 90% hits with size ≤ 8 KB.',
    },
    start: { ...DEFAULT_CONFIG, size: 8192, ways: 2, line: 64, policy: 'lru', pattern: 'col', n: 64, pad: 0, repeat: 1 },
    checks: [
      { id: 'hit', label: { b: 'Hit rate ≥ 90%', i: 'hit rate ≥ 90%' }, test: (_, r) => r.hitRate >= 0.9 },
      { id: 'size', label: { b: 'Cache no bigger than 8 KB', i: 'size ≤ 8 KB' }, test: c => c.size <= 8192 },
      { id: 'same', label: { b: 'Still the same 64 × 64 grid', i: 'same workload: 64 × 64 matrix, every element once' }, test: c => (c.pattern === 'row' || c.pattern === 'col') && c.n === 64 && c.repeat === 1 },
    ],
    hints: [
      { b: 'Look at the sets that light up. Are all the rows of the cache being used?', i: 'Watch the set index of each access. How many distinct sets does one column touch?' },
      { b: 'Walking down a column jumps 256 bytes each time, so only every 4th row of the cache ever gets used.', i: 'Column stride = 64 × 4 B = 256 B = 4 lines, so a column only touches 16 of the 64 sets, 4 lines each, in a 2-way cache.' },
      { b: 'Try reading the grid row by row, or add one number of padding to each row.', i: 'Fix the access order (row-major walk), or pad each row by one float so consecutive rows land in different sets.' },
    ],
    fix: { pattern: 'row' },
  },
  {
    id: 'stride-4k',
    type: 'challenge',
    title: { b: 'The 4 KB trap', i: 'The 4 KB stride' },
    brief: {
      b: 'This loop reads just 8 numbers, over and over, and still misses every time. The cache is 8 KB, so the data easily fits. Find the one change that makes it hit at least 80% of the time.',
      i: '8 elements, 4096 B apart, read 50 times on an 8 KB, 2-way, 64 B-line cache: 0% hits despite a 512 B working set. Reach ≥ 80% hits; keep size ≤ 8 KB.',
    },
    start: { ...DEFAULT_CONFIG, size: 8192, ways: 2, line: 64, policy: 'lru', pattern: 'stride', count: 8, stride: 4096, repeat: 50 },
    checks: [
      { id: 'hit', label: { b: 'Hit rate ≥ 80%', i: 'hit rate ≥ 80%' }, test: (_, r) => r.hitRate >= 0.8 },
      { id: 'size', label: { b: 'Cache no bigger than 8 KB', i: 'size ≤ 8 KB' }, test: c => c.size <= 8192 },
      { id: 'same', label: { b: 'Still 8 numbers, read 50 times', i: 'same loop: 8 elements × 50 passes' }, test: c => c.pattern === 'stride' && c.count === 8 && c.repeat === 50 },
    ],
    hints: [
      { b: 'Watch which row of the cache each read goes to.', i: 'Which set does each access map to?' },
      { b: 'Every read lands in the same row, and a row only has 2 slots for 8 numbers.', i: '4096 B = 64 lines = exactly one lap of the 64 sets: all 8 lines map to set 0, which has 2 ways.' },
      { b: 'Space the numbers 4,160 bytes apart instead (one extra chunk), or give each row more slots.', i: 'Pad the stride by one line (4096 + 64 = 4160 B), or raise associativity to ≥ 8 ways.' },
    ],
    fix: { stride: 4160 },
  },
];
