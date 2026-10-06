import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Level } from '../content/types';

export type Theme = 'dark' | 'light';

interface State {
  theme: Theme;
  level: Level;
  completed: Record<string, true>;
  lastLesson?: string;
  setTheme: (t: Theme) => void;
  setLevel: (l: Level) => void;
  complete: (lessonId: string) => void;
  visit: (lessonId: string) => void;
}

const html = () => document.documentElement;
const initial = (): Pick<State, 'theme' | 'level'> => ({
  // index.html already applied saved values + URL overrides to <html>; it is the source of truth on boot.
  theme: html().dataset.theme === 'light' ? 'light' : 'dark',
  level: html().dataset.level === 'intermediate' ? 'intermediate' : 'beginner',
});

export const useStore = create<State>()(
  persist(
    set => ({
      ...initial(),
      completed: {},
      setTheme: theme => { html().dataset.theme = theme; set({ theme }); },
      setLevel: level => { html().dataset.level = level; set({ level }); },
      complete: id => set(s => ({ completed: { ...s.completed, [id]: true } })),
      visit: id => set({ lastLesson: id }),
    }),
    {
      name: 'die-atlas',
      version: 1,
      partialize: s => ({ theme: s.theme, level: s.level, completed: s.completed, lastLesson: s.lastLesson }),
      // Boot values from <html> (which include URL overrides) win over stored ones.
      merge: (persisted, current) => ({ ...current, ...(persisted as object), ...initial() }),
    },
  ),
);

export const useLevel = () => useStore(s => s.level);
