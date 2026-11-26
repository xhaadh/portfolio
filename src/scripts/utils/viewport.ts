import { config } from '../config';

type ResizeFn = () => void;

/** Live viewport info shared by every module. */
export const vp = {
  w: typeof window !== 'undefined' ? window.innerWidth : 1440,
  h: typeof window !== 'undefined' ? window.innerHeight : 900,
  dpr: 1,
  mobile: false,
  reduced: false,
};

const listeners = new Set<ResizeFn>();
let timer = 0;

function measure() {
  vp.w = window.innerWidth;
  vp.h = window.innerHeight;
  vp.dpr = Math.min(window.devicePixelRatio || 1, config.dprMax);
  vp.mobile = vp.w < config.breakpoint;
}

export function initViewport() {
  measure();
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  vp.reduced = mq.matches;
  mq.addEventListener('change', () => {
    vp.reduced = mq.matches;
    listeners.forEach((fn) => fn());
  });
  // Debounced (100ms) - layout is recomputed from the viewport in px.
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      measure();
      listeners.forEach((fn) => fn());
    }, 100);
  });
}

export function onResize(fn: ResizeFn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
