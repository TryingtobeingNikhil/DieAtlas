import type { PartPage } from './types';

// Component pages are loaded on demand: only the id list is in the main bundle.
const LOADERS: Record<string, () => Promise<{ page: PartPage }>> = {
  'cpu.l1d': () => import('./cpu-l1d'),
  'cpu.core': () => import('./cpu-core'),
  'gpu.cu': () => import('./gpu-cu'),
  'gpu.devmem': () => import('./gpu-devmem'),
};

export const PAGE_IDS = Object.keys(LOADERS);
export const hasPage = (id: string) => id in LOADERS;
export const pageHref = (id: string) => `#/part/${id}`;
export const loadPage = (id: string) => LOADERS[id]?.().then(m => m.page);
