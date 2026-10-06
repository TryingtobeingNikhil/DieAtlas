// A real (small) set-associative cache simulator. Pure TS: the UI animates it and
// the validation script runs it headlessly.

export type Policy = 'lru' | 'fifo' | 'random';
export type Pattern = 'seq' | 'stride' | 'random' | 'row' | 'col';

export interface CacheConfig {
  size: number;   // bytes
  ways: number;
  line: number;   // bytes
  policy: Policy;
  pattern: Pattern;
  /** seq/random: number of 4-byte elements; stride: number of elements. */
  count: number;
  /** stride pattern: bytes between elements. */
  stride: number;
  /** passes over the data. */
  repeat: number;
  /** row/col: matrix is n × n floats. */
  n: number;
  /** row/col: extra floats of padding per row. */
  pad: number;
  seed: number;
}

export const DEFAULT_CONFIG: CacheConfig = {
  size: 8192, ways: 2, line: 64, policy: 'lru', pattern: 'col', count: 2048, stride: 4096, repeat: 2, n: 64, pad: 0, seed: 7,
};

export type MissType = 'compulsory' | 'capacity' | 'conflict';

export interface AccessEvent {
  i: number;
  addr: number;
  set: number;
  tag: number;
  hit: boolean;
  way: number;
  evicted?: number; // evicted tag
  missType?: MissType;
}

export interface Way { valid: boolean; tag: number; lastUsed: number; inserted: number }

export const numSets = (c: Pick<CacheConfig, 'size' | 'ways' | 'line'>) => c.size / (c.ways * c.line);
export const isPow2 = (x: number) => Number.isInteger(x) && x > 0 && (x & (x - 1)) === 0;
export const configValid = (c: CacheConfig) => isPow2(c.line) && isPow2(numSets(c));

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The address stream for a pattern. 4-byte elements throughout. */
export function addresses(c: CacheConfig): number[] {
  const out: number[] = [];
  const rnd = mulberry32(c.seed);
  for (let r = 0; r < c.repeat; r++) {
    switch (c.pattern) {
      case 'seq': for (let i = 0; i < c.count; i++) out.push(i * 4); break;
      case 'stride': for (let i = 0; i < c.count; i++) out.push(i * c.stride); break;
      case 'random': for (let i = 0; i < c.count; i++) out.push(Math.floor(rnd() * c.count) * 4); break;
      case 'row': { const pitch = (c.n + c.pad) * 4; for (let i = 0; i < c.n; i++) for (let j = 0; j < c.n; j++) out.push(i * pitch + j * 4); break; }
      case 'col': { const pitch = (c.n + c.pad) * 4; for (let j = 0; j < c.n; j++) for (let i = 0; i < c.n; i++) out.push(i * pitch + j * 4); break; }
    }
  }
  return out;
}

export class CacheSim {
  readonly sets: number;
  readonly cfg: CacheConfig;
  readonly table: Way[][];
  private t = 0;
  private rnd: () => number;
  private seen = new Set<number>();
  private fa = new Map<number, true>(); // fully-associative LRU shadow (for 3C)
  private faCap: number;
  stats = { hits: 0, misses: 0, compulsory: 0, capacity: 0, conflict: 0 };

  constructor(cfg: CacheConfig) {
    this.cfg = cfg;
    this.sets = numSets(cfg);
    this.table = Array.from({ length: this.sets }, () => Array.from({ length: cfg.ways }, () => ({ valid: false, tag: 0, lastUsed: 0, inserted: 0 })));
    this.rnd = mulberry32(cfg.seed + 1);
    this.faCap = cfg.size / cfg.line;
  }

  access(addr: number, i = this.t): AccessEvent {
    const t = ++this.t;
    const lineAddr = Math.floor(addr / this.cfg.line);
    const set = lineAddr % this.sets;
    const tag = Math.floor(lineAddr / this.sets);
    const ways = this.table[set];

    // shadow fully-associative LRU, for capacity vs conflict
    const faHit = this.fa.has(lineAddr);
    if (faHit) this.fa.delete(lineAddr);
    this.fa.set(lineAddr, true);
    if (this.fa.size > this.faCap) this.fa.delete(this.fa.keys().next().value as number);

    const w = ways.findIndex(x => x.valid && x.tag === tag);
    if (w >= 0) {
      ways[w].lastUsed = t;
      this.stats.hits++;
      this.seen.add(lineAddr);
      return { i, addr, set, tag, hit: true, way: w };
    }
    this.stats.misses++;
    let missType: MissType;
    if (!this.seen.has(lineAddr)) missType = 'compulsory';
    else if (!faHit) missType = 'capacity';
    else missType = 'conflict';
    this.stats[missType]++;
    this.seen.add(lineAddr);

    let victim = ways.findIndex(x => !x.valid);
    let evicted: number | undefined;
    if (victim < 0) {
      if (this.cfg.policy === 'lru') victim = ways.reduce((b, x, k) => (x.lastUsed < ways[b].lastUsed ? k : b), 0);
      else if (this.cfg.policy === 'fifo') victim = ways.reduce((b, x, k) => (x.inserted < ways[b].inserted ? k : b), 0);
      else victim = Math.floor(this.rnd() * ways.length);
      evicted = ways[victim].tag;
    }
    ways[victim] = { valid: true, tag, lastUsed: t, inserted: t };
    return { i, addr, set, tag, hit: false, way: victim, evicted, missType };
  }

  get hitRate() { const n = this.stats.hits + this.stats.misses; return n ? this.stats.hits / n : 0; }
}

export function runAll(c: CacheConfig) {
  const sim = new CacheSim(c);
  addresses(c).forEach((a, i) => sim.access(a, i));
  return { ...sim.stats, hitRate: sim.hitRate, accesses: sim.stats.hits + sim.stats.misses };
}

// ---------- URL encoding (shareable sandbox links) ----------
const KEYS: (keyof CacheConfig)[] = ['size', 'ways', 'line', 'policy', 'pattern', 'count', 'stride', 'repeat', 'n', 'pad', 'seed'];
export function encodeConfig(c: CacheConfig): string {
  return KEYS.map(k => `${k}=${c[k]}`).join('&');
}
export function decodeConfig(q: URLSearchParams, base: CacheConfig = DEFAULT_CONFIG): CacheConfig {
  const c: CacheConfig = { ...base };
  for (const k of KEYS) {
    const v = q.get(k);
    if (v == null) continue;
    if (k === 'policy') { if (['lru', 'fifo', 'random'].includes(v)) c.policy = v as Policy; }
    else if (k === 'pattern') { if (['seq', 'stride', 'random', 'row', 'col'].includes(v)) c.pattern = v as Pattern; }
    else { const n = Number(v); if (Number.isFinite(n) && n >= 0 && n <= 1 << 24) (c as unknown as Record<string, number>)[k] = Math.floor(n); }
  }
  return c;
}
