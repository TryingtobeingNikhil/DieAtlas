import type { LT } from '../types';

export interface Problem { q: string; steps: string[]; answer: string }
export interface Source { title: string; year: number; url?: string }

/**
 * A "types of architecture" page. Same markup rules as dossiers ([[glossary]] terms,
 * **bold**, `code`, {kind:…}). Each section may set `mode` to drive the diagram.
 */
export interface Concept {
  id: string;
  title: LT;
  teaser: LT;
  status: 'ready' | 'planned';
  diagram?: string;
  intro?: LT;
  sections?: { title: string; text: LT; mode?: string }[];
  table?: { caption: string; columns: string[]; rows: string[][] };
  options?: { name: string; pros: string[]; cons: string[] }[];
  /** Real examples: architecture ids from the Architectures registry. */
  examples?: { arch: string; text: string }[];
  practice?: Problem[];
  sources?: Source[];
}
