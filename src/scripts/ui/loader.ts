/**
 * First-load loader (matches the reference):
 *  - a 3-digit counter ("001" -> "100") sits exactly where the logo goes, in the logo font,
 *    and jumps with real preload progress;
 *  - when done it holds briefly, the digits slide out sideways inside their masks, and the
 *    logo letters slide in one after another, left to right, in the same spot.
 *
 * The overlay has the page background, so everything else stays hidden until `finish()`.
 */
import { config } from '../config';
import { raf, wait } from '../motion/raf';
import { animate, set, stagger } from '../motion/tween';
import { splitChars } from './splitText';
import { vp } from '../utils/viewport';

export class Loader {
  private count: HTMLElement;
  private target = 0;
  private text = '';
  private startTime = raf.time;
  private logoChars: HTMLElement[] = [];

  constructor(private el: HTMLElement) {
    this.count = el.querySelector<HTMLElement>('.loader__count')!;
    this.placeOnLogo();
    this.prepareLogo();
    this.render(0);
    const digits = this.digits();
    if (vp.reduced) {
      digits.forEach((d) => set(d, { opacity: 0 }));
      stagger(digits, { opacity: 1 }, { d: 0.4, stagger: 0 });
    } else {
      stagger(digits, { yPercent: [110, 0] }, { d: config.loader.digitsInD, e: 'o4', stagger: 0.05 });
    }
    raf.add(this.tick, 40);
  }

  /** Align the counter with the logo wordmark (same box, same font size). */
  private placeOnLogo() {
    const logo = document.querySelector<HTMLElement>('.logo');
    if (!logo) return;
    const r = logo.getBoundingClientRect();
    const cs = getComputedStyle(logo);
    Object.assign(this.count.style, {
      position: 'absolute',
      left: `${r.left}px`,
      top: `${r.top}px`,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
    });
  }

  /** Split the logo into letters and park them outside their masks; the loader reveals them. */
  private prepareLogo() {
    const logo = document.querySelector<HTMLElement>('.logo');
    const text = logo?.querySelector<HTMLElement>('[data-line]');
    if (!logo || !text) return;
    logo.dataset.mounted = ''; // keep corners.ts from running its own reveal on it
    this.logoChars = splitChars(text);
    this.logoChars.forEach((c) => set(c, vp.reduced ? { opacity: 0 } : { xPercent: -105 }));
  }

  /** 0..1 */
  setProgress(p: number) {
    this.target = Math.max(this.target, Math.min(1, p));
  }

  private digits() {
    return Array.from(this.count.querySelectorAll<HTMLElement>('.char__in'));
  }

  private render(n: number) {
    const text = String(Math.max(1, n)).padStart(3, '0');
    if (text === this.text) return;
    const digits = this.count.querySelectorAll<HTMLElement>('.char__in');
    if (digits.length === text.length) text.split('').forEach((c, i) => (digits[i].textContent = c));
    else this.count.innerHTML = text.split('').map((c) => `<span class="char"><span class="char__in">${c}</span></span>`).join('');
    this.text = text;
  }

  /** Jumps with real progress (no smoothing), like the reference. */
  private tick = () => this.render(Math.floor(this.target * 100));

  /**
   * Resolves when the digits have left; the logo letters keep animating in afterwards so the
   * page intro can start at the same moment (as in the reference).
   */
  async finish(): Promise<void> {
    this.setProgress(1);
    const rest = config.loader.minD - (raf.time - this.startTime);
    if (rest > 0) await wait(rest);
    this.render(100);
    raf.remove(this.tick);
    await wait(config.loader.holdD);

    const digits = this.digits();
    if (vp.reduced) await stagger(digits, { opacity: 0 }, { d: 0.3, stagger: 0 });
    else await stagger(digits.reverse(), { xPercent: 105 }, { d: config.loader.digitsOutD, e: 'i3', stagger: 0.04 });

    this.el.hidden = true;
    this.el.setAttribute('aria-busy', 'false');

    // Logo letters slide in, one after another.
    const L = config.loader;
    if (vp.reduced) stagger(this.logoChars, { opacity: 1 }, { d: 0.5, stagger: 0.02 });
    else stagger(this.logoChars, { xPercent: 0 }, { d: L.logoD, e: 'o4', stagger: L.logoStagger, delay: 0.05 });
  }
}
