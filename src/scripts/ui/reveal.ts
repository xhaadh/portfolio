/**
 * Masked reveal helpers. Inner spans slide translate3d(0, 110%, 0) -> 0 (in) and
 * 0 -> -110% (out). With prefers-reduced-motion they only fade.
 */
import { config } from '../config';
import { set, stagger, type TweenOptions } from '../motion/tween';
import { vp } from '../utils/viewport';

type Els = ArrayLike<HTMLElement>;
type Opts = TweenOptions & { stagger?: number };

/** Put elements in their pre-reveal state (below their mask). */
export function hide(els: Els, from = 110) {
  for (const el of Array.from(els)) {
    if (vp.reduced) set(el, { yPercent: 0, opacity: 0 });
    else set(el, { yPercent: from, opacity: 1 });
  }
}

/** Slide in from below. */
export function reveal(els: Els, opts: Opts = {}): Promise<void> {
  if (!els.length) return Promise.resolve();
  const o = { d: config.reveal.d, e: config.reveal.e, stagger: config.reveal.lineStagger, ...opts };
  if (vp.reduced) return stagger(els, { opacity: 1, yPercent: 0 }, { ...o, d: 0.6, e: 'o2', stagger: o.stagger / 2 });
  return stagger(els, { yPercent: 0, opacity: 1 }, o);
}

/** Slide out upward. */
export function conceal(els: Els, opts: Opts = {}): Promise<void> {
  if (!els.length) return Promise.resolve();
  const o = { d: config.reveal.outD, e: config.reveal.outE, stagger: config.reveal.outStagger, ...opts };
  if (vp.reduced) return stagger(els, { opacity: 0 }, { ...o, d: 0.35, e: 'o2', stagger: 0 });
  return stagger(els, { yPercent: -110 }, o);
}
