import type { LT } from '../types';

/**
 * A dossier is the encyclopedia page for one component. Every one follows the same
 * 17-section template. Text is short (2–5 sentences per section, or one table);
 * depth comes from more sections, not longer ones.
 *
 * Each section can carry a `cue`: which parts of the dossier's figure to highlight and
 * which animation mode to run while the reader is on that section (scrollytelling).
 *
 * Inline markup in text: **bold**, `code`, {mem:…}/{cpu:…}/{gpu:…}/{math:…}/{err:…} colour
 * meanings, and [[term]] or [[shown text|glossary-id]] for glossary terms (dotted underline +
 * hover definition). Every glossary id must exist in src/content/glossary.ts.
 */
export interface Cue { parts?: string[]; mode?: string }
export interface Para { text: LT; cue?: Cue }
export interface Problem { q: string; steps: string[]; answer: string }
export interface Source { title: string; year: number; url?: string }
/** A number in a generic dossier: always a typical range with its scope. */
export interface TypicalNumber { label: string; value: string; scope: string }

export interface Dossier {
  /** Component id (generic, or an architecture's own part such as 'hopper.tma'). */
  id: string;
  /** Display title, e.g. "Cache coherence (MESI/MOESI)". */
  title: string;
  /** Figure to draw (see src/dossier/figures): 'cache' | 'core' | 'cu' | 'devmem' | 'gfx' | 'tma'. */
  figure: string;
  /** Short dossiers (e.g. architecture-specific parts) may skip the starred sections. */
  short?: boolean;

  /* 1 */ oneLine: Para;
  /* 2 */ whatItDoes: Para;
  /* 3 */ whyItMatters: Para;                 // must contain a concrete number
  /* 4 */ howItWorks: { title: string; text: LT; cue: Cue }[];   // 3–6 steps
  /* 5 */ analogy: { text: string; limits: string };             // Beginner only
  /* 6 */ keyNumbers: TypicalNumber[];
  /* 7 */ math: { intro: LT; formulas: { tex: string; note?: string }[]; widget?: string; cue?: Cue };
  /* 8 */ tradeoffs: Para[];
  /* 9 */ misconceptions: { myth: string; reality: string }[];  // 2–3
  /* 10 */ evolution: { year: string; event: string }[];         // 3–5
  /* 11 */ connections: { fedBy: string[]; feeds: string[]; text: LT };  // component ids
  /* 12 */ twin: { comp: string; text: LT };
  /* 13 */ vendorNames: { nvidia?: string; amd?: string; intel?: string; apple?: string; arm?: string };
  /* 14 "In this chip" comes from the Architectures section, not from this file. */
  /* 15 */ course: { definition: string; definitionSource: string; worked: Problem; practice: Problem[]; mistakes: string[] };
  /* 16 */ realWorld: { inChips: LT; engineer: LT; code?: { lang: string; title: string; src: string }; measure: { tool: string; how: string }[] };
  /* 17 */ learnMore: { lessons: string[]; sandbox?: string; sources: Source[] };
  /** "See it in real chips": links into the Architectures section (architecture ids). */
  seeInRealChips: { arch: string; text: string }[];
  /** Extra sections folded in from parts that aren't separate components (prefetchers, SMT …). */
  extra?: { title: string; text: LT; cue?: Cue; after: 'howItWorks' | 'tradeoffs' }[];
}
