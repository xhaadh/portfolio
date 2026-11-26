/**
 * The four fixed corners. Corners that are identical between two pages are kept by Astro
 * (`transition:persist`), so only corners that actually change animate out / in.
 */
import type { PageName } from '../utils/data';
import { conceal, hide, reveal } from './reveal';
import { wrapLine } from './splitText';

const variantOf = (page: PageName) => (page === 'about' ? 'about' : 'main');

function inners(scope: Element): HTMLElement[] {
  const out: HTMLElement[] = [];
  scope.querySelectorAll<HTMLElement>('[data-line], .ulink__in').forEach((el) => {
    if (el.matches('[data-line]')) out.push(wrapLine(el));
    else if (!el.closest('[data-line]')) out.push(el);
  });
  return out;
}

/** Hide corner elements that haven't been revealed yet; returns their animatable parts. */
export function prepareCorners(): HTMLElement[] {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-corner]:not([data-mounted])'));
  const parts = els.flatMap(inners);
  hide(parts);
  els.forEach((el) => (el.dataset.mounted = ''));
  return parts;
}

export function revealCorners(parts: HTMLElement[], delay = 0) {
  return reveal(parts, { delay, stagger: 0.05 });
}

/** Animate out the corners that will change between `from` and `to`. */
export function cornersOut(from: PageName, to: PageName): Promise<void> {
  if (variantOf(from) === variantOf(to)) return Promise.resolve();
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-corner][data-variant="${variantOf(from)}"]`));
  return conceal(els.flatMap(inners), { stagger: 0.03 });
}
