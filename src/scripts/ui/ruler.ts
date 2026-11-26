/**
 * Top-centre tick ruler: one tick per project. In the gallery, ticks brighten around the scroll
 * position. In preview mode the current project's tick is replaced by the "03 [ ] 12" pagination
 * and the other ticks part around it.
 */
import { config } from '../config';
import { clamp, damp, hexToRgb, lerp, pad, rgbDistance } from '../motion/math';
import { theme } from '../utils/theme';
import { vp } from '../utils/viewport';

export class Ruler {
  private ticks: HTMLElement[] = [];
  private pag: HTMLElement;
  private cur: HTMLElement;
  private tot: HTMLElement;
  private mode = 0;
  private progress = 0;
  private last = '';
  private width = 0;

  constructor(
    private el: HTMLElement,
    /** Number of ticks = number of projects. */
    private count: number,
  ) {
    this.pag = el.querySelector<HTMLElement>('.ruler__pag')!;
    this.cur = el.querySelector<HTMLElement>('.ruler__cur')!;
    this.tot = el.querySelector<HTMLElement>('.ruler__tot')!;
    this.build();
  }

  /** Tick geometry for the current viewport (fewer, tighter ticks on mobile). */
  private get dims() {
    const r = config.ruler;
    return { ...(vp.mobile ? { ...r, ...r.mobile } : r), ticks: Math.max(this.count, 2) };
  }

  /** (Re)create the ticks - called on init and on resize. */
  build() {
    const { ticks, tickW, tickH, tickGap } = this.dims;
    const wrap = this.el.querySelector<HTMLElement>('.ruler__ticks')!;
    wrap.textContent = '';
    this.ticks = [];
    this.last = '';
    this.width = ticks * tickW + (ticks - 1) * tickGap;
    wrap.style.width = `${this.width}px`;
    wrap.style.height = `${tickH}px`;
    for (let i = 0; i < ticks; i++) {
      const t = document.createElement('i');
      t.style.width = `${tickW}px`;
      t.style.height = `${tickH}px`;
      t.style.left = `${i * (tickW + tickGap)}px`;
      wrap.appendChild(t);
      this.ticks.push(t);
    }
  }

  /** Re-attach to a (possibly new) DOM element after a page swap. */
  get element() {
    return this.el;
  }

  setVisible(v: boolean) {
    this.el.classList.toggle('is-hidden', !v);
  }

  /** @param bgHex the page colour the pagination will sit on */
  setPagination(index: number, total: number, bgHex?: string) {
    this.cur.textContent = pad(index + 1);
    this.tot.textContent = pad(total);
    // Accent colour, unless it would vanish into the page colour.
    const bg = bgHex ? hexToRgb(bgHex) : theme.bg;
    const near = rgbDistance(hexToRgb(config.colors.accent), bg) < 0.3;
    this.pag.classList.toggle('is-plain', near);
  }

  /**
   * @param progress 0..1 scroll progress (gallery) or index / (n - 1) (preview)
   * @param mode     0 = ruler, 1 = pagination
   */
  update(dt: number, progress: number, mode: number) {
    const { ticks, tickW, tickGap, paginationGap, spread, lambda, ticksInPagination } = this.dims;
    this.progress = damp(this.progress, clamp(progress), lambda, dt);
    this.mode = damp(this.mode, mode, lambda, dt);
    const key = `${this.progress.toFixed(4)}|${this.mode.toFixed(4)}`;
    if (key === this.last) return;
    this.last = key;

    const f = this.progress * (ticks - 1);
    const m = this.mode;
    for (let i = 0; i < ticks; i++) {
      const dist = i - f;
      const b = clamp(1 - Math.abs(dist) / spread);
      let o = lerp(0.28 + 0.72 * b * b, 0.4, m);
      // Ticks right at the pagination position fade away in pagination mode.
      o *= 1 - m * clamp(1 - Math.abs(dist) * 1.4);
      // Narrow screens: no room for ticks + label, so only the label remains in pagination mode.
      if (!ticksInPagination) o *= 1 - m;
      const shift = Math.sign(dist || -1) * paginationGap * m * clamp(Math.abs(dist) * 2);
      const t = this.ticks[i];
      t.style.opacity = o.toFixed(3);
      t.style.transform = shift ? `translate3d(${shift.toFixed(2)}px,0,0)` : '';
    }
    const x = f * (tickW + tickGap) - this.width / 2 + tickW / 2;
    this.pag.style.transform = `translate3d(calc(${x.toFixed(2)}px - 50%), -50%, 0)`;
    this.pag.style.opacity = clamp((m - 0.3) / 0.7).toFixed(3);
  }
}
