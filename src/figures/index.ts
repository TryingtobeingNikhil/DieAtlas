import { lazy, type ComponentType } from 'react';
import type { Cue } from '../content/parts/types';

export type FigureProps = { cue: Cue; hover: string[] | null };

/** Figures, loaded with their page. */
export const FIGURES: Record<string, ComponentType<FigureProps>> = {
  cache: lazy(() => import('./cache')),
  core: lazy(() => import('./core')),
  cu: lazy(() => import('./cu')),
  devmem: lazy(() => import('./devmem')),
};

/** Part ids and modes per figure (checked by npm run validate). */
export const FIGURE_SPECS: Record<string, { parts: string[]; modes: string[] }> = {
  cache: {
    parts: ['core', 'lsu', 'tlb', 'addr', 'addr-tag', 'addr-index', 'addr-offset', 'array', 'set', 'ways', 'tags', 'data', 'compare', 'hit', 'miss', 'l2', 'fill', 'lru'],
    modes: ['lookup', 'split', 'index', 'compare', 'miss'],
  },
  core: {
    parts: ['bpred', 'l1i', 'fetch', 'decode', 'rename', 'sched', 'prf', 'alu', 'fpsimd', 'lsu', 'l1d', 'l2', 'rob', 'retire', 'thread2'],
    modes: ['flow', 'smt', 'predict', 'ooo', 'retire', 'mispredict'],
  },
  cu: {
    parts: ['warps', 'sched', 'dispatch', 'regs', 'int32', 'fp32', 'matrix', 'ldst', 'sfu', 'smem', 'l1'],
    modes: ['issue', 'occupancy', 'hide', 'diverge', 'smem'],
  },
  devmem: {
    parts: ['gpu-die', 'phy', 'channels', 'board-traces', 'gddr-chips', 'interposer', 'stack', 'base-die', 'dram-dies', 'tsv', 'banks'],
    modes: ['transfer', 'gddr', 'hbm', 'side'],
  },
};
