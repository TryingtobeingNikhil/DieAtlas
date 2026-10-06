import type { Action, Keyframe, Step } from '../content/types';
import type { Layout } from './SceneView';

export type Caption = { b: string; i: string };

/**
 * Plays a lesson's step timelines on an already-rendered SVG scene.
 * Everything here is attribute/transform writes on existing elements, so a
 * running animation costs no React renders. Staggers use CSS transition-delay.
 */
export class ScenePlayer {
  private els = new Map<string, Element[]>();
  private ghosts = new Map<string, Element[]>();
  private ids: string[] = [];
  private base = new Map<Element, string>();
  private timers: number[] = [];
  private startedAt = 0;
  private elapsed = 0;
  private pending: Keyframe[] = [];
  private step = 0;
  playing = false;
  private texts = new Map<Element, string>();

  constructor(
    private svg: SVGSVGElement,
    private steps: Step[],
    private layout: Layout,
    private onCaption: (c: Caption | null) => void,
    private onState: (playing: boolean) => void,
  ) {
    svg.querySelectorAll('[data-id]').forEach(el => {
      const id = el.getAttribute('data-id')!;
      if (!this.els.has(id)) { this.els.set(id, []); this.ids.push(id); }
      this.els.get(id)!.push(el);
      this.base.set(el, el.getAttribute('data-state') ?? 'idle');
    });
    svg.querySelectorAll('[data-ghost-of]').forEach(el => {
      const id = el.getAttribute('data-ghost-of')!;
      if (!this.ghosts.has(id)) this.ghosts.set(id, []);
      this.ghosts.get(id)!.push(el);
      this.base.set(el, el.getAttribute('data-state') ?? 'idle');
    });
  }

  private match(pat: string): Element[] {
    if (!pat.endsWith('*')) return this.els.get(pat) ?? [];
    const pre = pat.slice(0, -1);
    return this.ids.filter(id => id.startsWith(pre)).flatMap(id => this.els.get(id)!);
  }

  private act(a: Action) {
    const els = this.match(a.t);
    els.forEach((el, i) => {
      const s = (el as HTMLElement | SVGElement).style;
      s.transitionDelay = a.stagger ? `${i * a.stagger}ms` : '';
      if (a.s) el.setAttribute('data-state', a.s);
    });
    const mv = this.layout === 'narrow' ? a.moveN ?? a.move : a.move;
    if (mv) {
      const tr = `translate(${mv[0]}px, ${mv[1]}px)`;
      [...els, ...(this.ghosts.get(a.t) ?? [])].forEach(el => { (el as SVGElement).style.transform = tr; });
    }
    if (a.s) (this.ghosts.get(a.t) ?? []).forEach(el => el.setAttribute('data-state', a.s!));
  }

  private instant(fn: () => void) {
    this.svg.classList.add('instant');
    fn();
    void this.svg.getBoundingClientRect();
    requestAnimationFrame(() => this.svg.classList.remove('instant'));
  }

  private reset() {
    this.base.forEach((s, el) => {
      el.setAttribute('data-state', s);
      const st = (el as SVGElement).style;
      st.transform = ''; st.transitionDelay = '';
    });
  }

  private clear() { this.timers.forEach(clearTimeout); this.timers = []; }

  /** Jump to a step: previous steps applied instantly, this step plays from t=0. */
  enter(k: number, autoplay = true) {
    this.clear();
    this.step = k;
    this.instant(() => {
      this.reset();
      for (let i = 0; i < k; i++) this.steps[i].timeline.forEach(kf => kf.do?.forEach(a => this.act(a)));
    });
    this.pending = [...this.steps[k].timeline].sort((a, b) => a.at - b.at);
    this.elapsed = 0;
    this.onCaption(this.pending.find(kf => kf.caption)?.caption ?? null);
    if (autoplay) this.play(); else { this.playing = false; this.onState(false); }
  }

  /** Show the end state of step k (used for layout changes and "pause at end"). */
  settle(k: number) {
    this.clear();
    this.step = k;
    this.instant(() => {
      this.reset();
      for (let i = 0; i <= k; i++) this.steps[i].timeline.forEach(kf => kf.do?.forEach(a => this.act(a)));
    });
    const caps = this.steps[k].timeline.filter(kf => kf.caption);
    this.onCaption(caps.length ? caps[caps.length - 1].caption! : null);
    this.pending = [];
    this.playing = false; this.onState(false);
  }

  play() {
    if (!this.pending.length) { this.enter(this.step); return; }
    this.playing = true; this.onState(true);
    this.startedAt = performance.now() - this.elapsed;
    for (const kf of this.pending) {
      this.timers.push(window.setTimeout(() => {
        kf.do?.forEach(a => this.act(a));
        if (kf.caption) this.onCaption(kf.caption);
        this.pending = this.pending.filter(p => p !== kf);
        if (!this.pending.length) this.timers.push(window.setTimeout(() => { this.playing = false; this.onState(false); }, 700));
      }, Math.max(0, kf.at - this.elapsed)));
    }
  }

  pause() {
    if (!this.playing) return;
    this.elapsed = performance.now() - this.startedAt;
    this.clear();
    this.playing = false; this.onState(false);
  }

  toggle() { if (this.playing) this.pause(); else this.play(); }
  replay() { this.enter(this.step); }

  /** Widgets may relabel nodes live (e.g. a slider changing the set index). */
  setText(id: string, role: string, text: string) {
    for (const el of this.els.get(id) ?? []) {
      const t = el.querySelector(`[data-role="${role}"]`) ?? (el.getAttribute('data-role') === role ? el : null);
      if (!t) continue;
      const target = t.querySelector('tspan:last-child') ?? t;
      if (!this.texts.has(target)) this.texts.set(target, target.textContent ?? '');
      target.textContent = text;
    }
  }
  restoreText() { this.texts.forEach((v, el) => { el.textContent = v; }); this.texts.clear(); }

  destroy() { this.clear(); this.restoreText(); }
}
