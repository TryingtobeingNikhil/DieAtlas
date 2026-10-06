// A component page: the same six short sections for every component, plus "Go deeper".
// Text is prose (2–4 sentences per paragraph). Inline markup, rendered by rich():
//   **bold**   `code`   {mem:…}/{cpu:…}/{gpu:…}/{math:…}/{err:…} colour meanings
//   [[term]] or [[shown text|glossary-id]]   dotted underline + definition (src/content/glossary.ts)
//   ((shown text|part,part))                 highlights those parts of the figure on hover
// Numbers in generic pages are typical ranges ("typically", "~"), never one fake-precise value.

/** Which parts of the figure are lit, and which looping animation runs. */
export interface Cue { parts?: string[]; mode?: string }

export interface CheckQ {
  q: string;
  options: string[];
  /** index of the right option */
  answer: number;
  /** why the answer is right (shown after any choice) */
  why: string;
}

export interface PartPage {
  /** Component id (src/content/reference/*). */
  id: string;
  /** Figure drawn at the top (src/figures): 'cache' | 'core' | 'cu' | 'devmem'. */
  figure: string;

  /** 1 · What is it? 1–2 sentences, plain words. */
  what: string;
  /** 2 · What does it do? Its job; the figure plays `cue.mode`. */
  does: { text: string; cue: Cue };
  /** 3 · Why do we need it? What goes wrong without it, with one concrete number. */
  why: string[];
  /** 4 · How does it work? 3–5 steps; each lights its part of the figure. */
  how: { title: string; text: string; cue: Cue }[];
  /** 5 · Key numbers: 2–4 typical values with a one-line meaning. */
  numbers: { value: string; meaning: string }[];
  /** Scope of the key numbers, e.g. "typical desktop CPUs, 2020s". */
  numbersScope: string;
  /** 6 · Check yourself: 1–2 questions, plus one real-world line. */
  check: CheckQ[];
  realWorld: string;

  /** The concrete example the page is built around (validated: must appear in the text). */
  example: { label: string; mustContain: string };

  /** Intermediate opens this by default. */
  deeper: {
    mechanism: { title: string; text: string; cue?: Cue }[];
    formula: { tex: string; where: string };
    worked: { q: string; steps: string[]; answer: string };
    choices: { title: string; text: string }[];
  };

  /** 2–3 neighbouring components (ids) and why they're connected. */
  connected: { id: string; why: string }[];
  /** Related lesson id, if one exists. */
  lesson?: string;
  sources: { title: string; year: number; url?: string }[];
}
