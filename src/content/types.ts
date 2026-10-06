// Content contract. Everything a learner reads lives in typed data like this,
// so adding a lesson means adding a data file, not UI code.

export type Level = 'beginner' | 'intermediate';

/** Level-dependent text. Plain string = same for both levels. */
export type LT = string | { b: string; i: string };

/** Colour meaning. Same meaning, same colour, everywhere. */
export type Kind = 'gpu' | 'cpu' | 'mem' | 'math' | 'err' | 'neutral';

export type World = 'foundations' | 'cpu' | 'gpu' | 'bridge';

// ---------- map components ----------
export interface VendorNames { nvidia?: string; amd?: string; intel?: string; apple?: string; arm?: string }
/** A number shown to learners: either sourced (profile) or a typical range with its scope (generic). */
export interface KeyNumber { value: string; scope?: string; src?: string }

export interface MapComponent {
  id: string;
  world: World;
  kind: Kind;
  /** Technical name (shown first in Intermediate). */
  tech: string;
  /** Plain-language name (shown first in Beginner). */
  friendly: string;
  /** Hover one-liner. */
  hover: LT;
  /** Tiny analogy for Beginner tooltips. */
  analogy?: string;
  /** One key number for Intermediate tooltips: a typical range + scope in generic mode. */
  key?: KeyNumber;
  /** Quick look: why it matters, one sentence. */
  why?: string;
  /** Card / quick-look teaser. */
  teaser: LT;
  vendor?: VendorNames;
  /** Dossier title when it differs from the map name (e.g. "Cache coherence (MESI/MOESI)"). */
  dossierTitle?: string;
  sandbox?: { label: string; href: string };
  /** Legacy: zone of the old flat maps (unused by chip maps). */
  zone?: string;
}

export interface Zone {
  id: string;
  world: World;
  title: LT;
  /** Layout in map units (wide layout). */
  x: number; y: number; w: number; h: number;
}

export interface MapPlacement {
  id: string; x: number; y: number; w: number; h: number;
  /** One-line label only (small repeated parts). */
  compact?: boolean;
  /** Short label override for small boxes. */
  label?: LT;
  /** Decorative die-shot art drawn inside the part. */
  art?: 'smgrid' | 'hbm' | 'cores';
}

export interface WorldMap {
  world: 'cpu' | 'gpu';
  title: string;
  reference: string; // which real chip the numbers come from
  width: number; height: number;
  zones: Zone[];
  parts: MapPlacement[];
  /** Decorative groupings (e.g. SM partitions), drawn as faint outlines. */
  groups?: { x: number; y: number; w: number; h: number; label?: string }[];
  note?: LT;
  /** Ambient data/instruction flows: SVG path in map units. */
  flows: { kind: Kind; d: string; dur: number; delay?: number }[];
}

// ---------- lessons ----------
export interface QuizQ {
  q: LT;
  choices: LT[];
  answer: number;
  why: LT;
}

export interface Lesson {
  id: string;
  title: LT;
  world: World;
  /** Map component ids this lesson belongs to (first = primary). */
  components: string[];
  level: Level;
  minutes: number;
  status: 'ready' | 'planned';
  teaser: LT;
  /** Present only when status === 'ready' and the lesson uses the standard player. */
  body?: LessonBody;
  /** Ready lessons with their own page (e.g. the bridge race). */
  custom?: { href: string; takeaways: LT[]; quiz: QuizQ[] };
}

export interface LessonBody {
  scene: Scene;
  hook: Hook;
  steps: Step[];
  takeaways: LT[];
  quiz: QuizQ[];
}

export interface Hook {
  /** Node ids hidden behind the empty slot (first one sets the slot's outline). */
  slot: string[];
  prompt: LT;
  options: { label: string; sub: LT; correct?: boolean; feedback: LT }[];
}

export interface Step {
  id: string;
  title: LT;
  /** Speech-bubble text. Both levels required unless sameForBothLevels. */
  say: { beginner: string; intermediate: string } | { both: string; sameForBothLevels: true };
  /** Node the bubble points at. */
  anchor: string;
  /** "Go deeper" (Intermediate, open) / "Show the math" (Beginner, closed). */
  deeper?: { text: LT; widget?: string; formula?: string };
  /** Animation keyframes. */
  timeline: Keyframe[];
  /** Live state table at the end of this step. */
  table?: StateTable;
}

export interface Keyframe {
  at: number; // ms from step start
  caption?: { b: string; i: string };
  do?: Action[];
}

export interface Action {
  /** Node id, or a prefix ending in '*' (e.g. "l1.r3.*"). */
  t: string;
  /** Visual state. */
  s?: NodeState;
  /** Move a token to [x,y] (wide layout) / [x,y] narrow. Relative to its origin. */
  move?: [number, number];
  moveN?: [number, number];
  /** Stagger per matched node, ms. */
  stagger?: number;
}

export type NodeState = 'idle' | 'active' | 'hit' | 'miss' | 'new' | 'dim' | 'hidden' | 'shown' | 'focus';

export interface StateTable {
  title: LT;
  columns: string[];
  rows: { cells: string[]; tone?: Kind; note?: LT }[];
}

// ---------- scene (declarative SVG diagram) ----------
export interface Scene {
  viewBox: [number, number];
  viewBoxN: [number, number]; // narrow (phone) layout
  nodes: SceneNode[];
}

interface NodeBase {
  id: string;
  x: number; y: number;
  /** Narrow-layout position override. */
  n?: { x: number; y: number; w?: number; h?: number };
  initial?: NodeState;
}

export interface BoxNode extends NodeBase { type: 'box'; w: number; h: number; kind: Kind; title: LT; sub?: LT; mono?: boolean }
export interface GridNode extends NodeBase {
  type: 'grid'; rows: number; cols: number; cw: number; ch: number; gap: number; kind: Kind;
  rowLabels?: string[]; colLabels?: string[]; labelW?: number;
  /** Colour of an active row highlight (default: kind). */
  rowKind?: Kind;
  /** Narrow overrides. */
  cwN?: number; chN?: number; gapN?: number; labelWN?: number;
}
export interface TokenNode extends NodeBase { type: 'token'; w: number; label: string; kind: Kind }
export interface ArrowNode extends NodeBase { type: 'arrow'; x2: number; y2: number; kind?: Kind; n2?: { x2: number; y2: number } }
export interface BadgeNode extends NodeBase { type: 'badge'; text: LT; kind: Kind; w: number }
export interface LabelNode extends NodeBase { type: 'label'; text: LT; kind?: Kind; size?: number; anchor?: 'start' | 'middle' | 'end'; mono?: boolean }

export type SceneNode = BoxNode | GridNode | TokenNode | ArrowNode | BadgeNode | LabelNode;

// ---------- hardware specs ----------
export interface Spec {
  id: string;
  name: string;
  year: number;
  kind: 'cpu' | 'gpu' | 'soc';
  source: string;
  /** Peak FP32 (non-tensor) FLOP/s, dense. */
  fp32: number;
  /** Peak tensor/matrix FLOP/s, dense, with the precision named. */
  tensor?: { flops: number; precision: string; note?: string };
  /** Memory bandwidth, bytes/s. */
  bw: number;
  memName: string;
  /** Host link to this device (GPUs), bytes/s per direction. */
  link?: { name: string; bw: number };
  approx?: string; // what is approximate and why
}
