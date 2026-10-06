import { useSyncExternalStore } from 'react';

// Tiny hash router: #/path/parts?query. Keeps the bundle small and works on any static host.
export interface Route { path: string; parts: string[]; query: URLSearchParams }

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  const parts = p.split('/').filter(Boolean);
  return { path: '/' + parts.join('/'), parts, query: new URLSearchParams(q) };
}

let current = parse();
const subs = new Set<() => void>();
addEventListener('hashchange', () => { current = parse(); subs.forEach(f => f()); });

export function useRoute(): Route {
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => current);
}

/** Update the query string without adding history entries or re-routing. */
export function replaceQuery(q: URLSearchParams) {
  const base = location.hash.split('?')[0] || '#/';
  const s = q.toString();
  history.replaceState(null, '', base + (s ? '?' + s : ''));
  current = { ...current, query: new URLSearchParams(s) };
}
