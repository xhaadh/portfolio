/**
 * Project page: title / meta reveals, thumbnail column, vertical swipe image swaps, and the
 * DOM side of the WebGL <-> <img> hand-off.
 */
import { config } from '../config';
import { animate, set } from '../motion/tween';
import { conceal, hide, reveal } from '../ui/reveal';
import { splitChars, splitLines, wrapLine } from '../ui/splitText';
import { loadImage } from '../utils/image';
import { vp } from '../utils/viewport';
import type { ClientProject } from '../utils/data';

export class ProjectPage {
  private title: HTMLElement;
  private titleChars: HTMLElement[];
  private uiParts: HTMLElement[];
  private metaLines: HTMLElement[];
  private thumbs: HTMLButtonElement[];
  private thumbInners: HTMLElement[];
  private media: HTMLElement;
  private img: HTMLImageElement;
  /** Second layer used while swiping to the next image (roles swap after each change). */
  private next: HTMLImageElement;
  private wipe: HTMLElement;
  private current = 0;
  private busy = false;
  private wheelAcc = 0;
  private wheelLocked = false;
  private wheelTimer = 0;

  constructor(
    root: HTMLElement,
    private project: ClientProject,
  ) {
    this.title = root.querySelector<HTMLElement>('.proj__title')!;
    this.titleChars = splitChars(this.title);
    this.fitTitle();
    this.uiParts = Array.from(root.querySelectorAll<HTMLElement>('.proj__back .ulink__in, .proj__back [data-mask-in]'));
    this.metaLines = [
      ...Array.from(root.querySelectorAll<HTMLElement>('.proj__meta [data-line]')).map(wrapLine),
      ...Array.from(root.querySelectorAll<HTMLElement>('.proj__desc')).flatMap(splitLines),
      ...Array.from(root.querySelectorAll<HTMLElement>('.proj__visit .ulink__in')),
    ];
    this.thumbs = Array.from(root.querySelectorAll<HTMLButtonElement>('.pthumb'));
    this.thumbInners = this.thumbs.map((b) => b.querySelector<HTMLElement>('.pthumb__in')!);
    this.media = root.querySelector<HTMLElement>('.proj__media')!;
    this.img = this.media.querySelector('img')!;
    this.wipe = this.media.querySelector<HTMLElement>('.proj__wipe')!;
    this.next = this.img.cloneNode() as HTMLImageElement;
    this.next.removeAttribute('fetchpriority');
    this.next.alt = '';
    this.media.insertBefore(this.next, this.wipe);
    set(this.next, { yPercent: 100 });

    hide(this.titleChars);
    hide(this.uiParts);
    hide(this.metaLines);
    hide(this.thumbInners);

    this.thumbs.forEach((b, i) => b.addEventListener('click', () => this.goTo(i)));
  }

  /**
   * Shrink long titles so they never run out from under the image (desktop) or off-screen
   * (mobile). Called on init and resize.
   */
  fitTitle() {
    const el = this.title;
    el.style.fontSize = '';
    const w = el.scrollWidth;
    const left = el.offsetLeft;
    const j = config.project.desktop;
    const max = vp.mobile ? vp.w - 2 * left : vp.w / 2 + (j.wVw * vp.w) / 2 - vp.w * 0.04 - left;
    if (w > max) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * max) / w}px`;
  }

  /** Hide the DOM image while the WebGL plane is standing in for it. */
  waitImage() {
    this.media.classList.add('is-waiting');
  }

  showImage() {
    this.media.classList.remove('is-waiting');
  }

  mediaRect(): DOMRect {
    return this.media.getBoundingClientRect();
  }

  get imageIndex() {
    return this.current;
  }

  /** Make sure the <img> is decoded before it is shown in place of the WebGL plane. */
  ready(): Promise<void> {
    return this.img.decode().catch(() => undefined);
  }

  intro({ fromPreview }: { fromPreview: boolean }) {
    const r = config.reveal;
    reveal(this.titleChars, { stagger: r.charStagger, delay: 0.05 });
    reveal(this.uiParts, { delay: 0.25, stagger: 0.08 });
    reveal(this.thumbInners, { delay: 0.35, stagger: 0.04 });
    reveal(this.metaLines, { delay: 0.45, stagger: r.lineStagger * 2 });
    if (!fromPreview) this.wipeIn();
  }

  /** Initial reveal when not coming from the gallery: colour panel slides off the image. */
  private wipeIn() {
    this.showImage();
    this.wipe.style.transformOrigin = 'right center';
    set(this.wipe, { scaleX: 1 });
    animate(this.wipe, { scaleX: 0 }, { d: config.project.wipeD * 1.2, e: 'io4', delay: 0.15 });
  }

  /**
   * Swipe to image `i`. dir > 0: the current image slides up and the new one comes in from
   * below; dir < 0: the opposite. Defaults to the direction of the index change.
   */
  async goTo(i: number, dir?: number, d: number = config.project.swapD) {
    const n = this.project.images.length;
    i = ((i % n) + n) % n;
    if (this.busy || i === this.current) return;
    this.busy = true;
    const s = Math.sign(dir ?? i - this.current) || 1;
    const src = this.project.images[i];
    this.setActive(i);
    await loadImage(src).catch(() => null);
    this.next.src = src;
    await this.next.decode().catch(() => undefined);
    const e = config.project.swapE;
    if (vp.reduced) {
      set(this.next, { yPercent: 0, opacity: 0 });
      await animate(this.next, { opacity: 1 }, { d: 0.4, e: 'o2' }).finished;
      set(this.img, { yPercent: 100 });
    } else {
      await Promise.all([
        animate(this.img, { yPercent: [0, -100 * s] }, { d, e }).finished,
        animate(this.next, { yPercent: [100 * s, 0] }, { d, e }).finished,
      ]);
    }
    // Swap roles: the visible layer becomes `img`, the other one waits off-screen.
    const old = this.img;
    this.img = this.next;
    this.next = old;
    set(this.next, { yPercent: 100, opacity: 1 });
    this.current = i;
    this.busy = false;
  }

  step(dir: number) {
    return this.goTo(this.current + dir, dir);
  }

  private setActive(i: number) {
    this.thumbs.forEach((b, k) => {
      b.classList.toggle('is-active', k === i);
      b.setAttribute('aria-current', k === i ? 'true' : 'false');
    });
  }

  /** One image per wheel gesture (debounced by wheel silence). */
  onWheel(delta: number) {
    clearTimeout(this.wheelTimer);
    this.wheelTimer = window.setTimeout(() => {
      this.wheelLocked = false;
      this.wheelAcc = 0;
    }, config.project.wheelIdle);
    if (this.wheelLocked || this.busy) return;
    this.wheelAcc += delta;
    if (Math.abs(this.wheelAcc) > config.project.wheelThreshold) {
      this.wheelLocked = true;
      this.step(Math.sign(this.wheelAcc));
      this.wheelAcc = 0;
    }
  }

  /** Exit animation. When going back to the gallery, first wipe back to the cover so the
   * WebGL plane (which uses the cover texture) can take over seamlessly. */
  async outro({ toHome }: { toHome: boolean }) {
    const tasks: Promise<unknown>[] = [
      conceal(this.titleChars, { stagger: 0.015 }),
      conceal(this.uiParts),
      conceal(this.thumbInners, { stagger: 0.015 }),
      conceal(this.metaLines, { stagger: 0.008 }),
    ];
    if (toHome && this.current !== 0) {
      while (this.busy) await new Promise((r) => setTimeout(r, 30));
      tasks.push(this.goTo(0, -1, 0.7));
    }
    await Promise.all(tasks);
  }

  destroy() {
    clearTimeout(this.wheelTimer);
  }
}
