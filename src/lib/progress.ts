import { LESSONS, lessonsFor } from '../content/lessons';
import type { World } from '../content/types';

export const componentProgress = (id: string, done: Record<string, true>) => {
  const ls = lessonsFor(id);
  return { done: ls.filter(l => done[l.id]).length, total: ls.length };
};

export const worldProgress = (w: World, done: Record<string, true>) => {
  const ls = LESSONS.filter(l => l.world === w);
  return { done: ls.filter(l => done[l.id]).length, total: ls.length };
};
