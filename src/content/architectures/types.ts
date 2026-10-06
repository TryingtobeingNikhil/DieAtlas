import type { LT, MapComponent } from '../types';
import type { ChipWorld } from '../chipmaps';

export interface Source { id: string; title: string; url?: string; year: number }
/** An architecture number: always tied to one of the page's sources. */
export interface ANum { label: string; value: string; src: string }

/** What a generic part looks like in this chip. */
export interface ArchPart { note?: LT; key?: ANum }

/** A part that only exists in this architecture; it has its own (short) dossier. */
export interface OwnPart extends MapComponent { dossier: string; extends?: string }

export const COMPARE_ROWS = [
  ['type', 'Type'], ['process', 'Process'], ['packaging', 'Construction'], ['compute', 'Compute'], ['clock', 'Clock'],
  ['fp32', 'Peak FP32'], ['matrix', 'Matrix / AI'], ['memory', 'Memory'], ['bandwidth', 'Memory bandwidth'],
  ['llc', 'Last-level cache'], ['power', 'Power'], ['links', 'External links'],
] as const;
export type CompareKey = (typeof COMPARE_ROWS)[number][0];
/** Compare-table cell: a sourced value, or a typical range (reference chips). */
export type CompareCell = { value: string; src?: string; scope?: string };

export interface Architecture {
  id: string;
  world: 'cpu' | 'gpu' | 'accel';
  group: 'CPU families' | 'GPU families' | 'Other accelerators' | 'Reference chips';
  family: string;                // "x86 · AMD", "NVIDIA" …
  name: string;
  short: string;
  maker: string;
  year?: number;
  status: 'ready' | 'planned';
  isa?: string;
  usedIn?: string;
  /** Its own clickable floorplan (ready architectures). */
  tree?: ChipWorld;
  /** Spec preset for the bridge race (src/content/specs.ts). */
  spec?: string;
  glance?: ANum[];
  parts?: Record<string, ArchPart>;
  ownParts?: OwnPart[];
  diff?: LT[];
  choices?: { title: string; text: LT }[];
  timeline?: { year: string; name: string; note: string; current?: boolean }[];
  strengths?: string[];
  weaknesses?: string[];
  course?: { q: string; steps: string[]; answer: string };
  realWorld?: LT[];
  compare?: Partial<Record<CompareKey, CompareCell>>;
  sources?: Source[];
}
