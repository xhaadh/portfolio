/**
 * The one and only requestAnimationFrame loop.
 *
 * Systems register `update(dt, t)` with a priority (lower runs first):
 *   0  input        10 tweens        20 scene state / layout
 *   30 WebGL render 40 DOM UI (ruler, etc.)
 *
 * `t` is an internal clock that only advances while the tab is visible, so every tween and
 * timer driven from here pauses on `visibilitychange` and resumes exactly where it left off.
 */
export type RafCallback = (dt: number, t: number) => void;

interface Sub {
  fn: RafCallback;
  priority: number;
}

const subs: Sub[] = [];
let rafId = 0;
let last = 0;
let time = 0;
let running = false;

/** Clamp dt so a long frame (tab switch, heavy decode) never makes things teleport. */
const MAX_DT = 1 / 15;

function loop(now: number) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_DT);
  last = now;
  time += dt;
  // Copy: callbacks may add/remove subscribers while iterating.
  const list = subs.slice();
  for (let i = 0; i < list.length; i++) list[i].fn(dt, time);
}

function start() {
  if (running || typeof window === 'undefined') return;
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (subs.length) start();
  });
}

export const raf = {
  add(fn: RafCallback, priority = 20) {
    if (subs.some((s) => s.fn === fn)) return;
    subs.push({ fn, priority });
    subs.sort((a, b) => a.priority - b.priority);
    if (!document.hidden) start();
  },
  remove(fn: RafCallback) {
    const i = subs.findIndex((s) => s.fn === fn);
    if (i > -1) subs.splice(i, 1);
  },
  /** Seconds elapsed on the (pausable) internal clock. */
  get time() {
    return time;
  },
};

/** Promise that resolves after `seconds` of *visible* time. */
export function wait(seconds: number): Promise<void> {
  if (seconds <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const end = time + seconds;
    const fn: RafCallback = (_dt, t) => {
      if (t >= end) {
        raf.remove(fn);
        resolve();
      }
    };
    raf.add(fn, 5);
  });
}

/** Resolve on the next frame (after the current one has been painted). */
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
