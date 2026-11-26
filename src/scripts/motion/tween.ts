/**
 * Tiny tween engine driven by the global RAF (so it pauses with the tab).
 *
 *   animate(el, { yPercent: [110, 0], opacity: 1 }, { d: 1.2, e: 'o5', delay: 0.1 })
 *   animate(obj, { progress: 1 }, { d: 1.2, e: 'io4', onUpdate: () => draw(obj.progress) })
 *
 * - Values are either a target (`1`, tweened from the current value) or a `[from, to]`
 *   tuple. `from` values are applied immediately, even when the tween is delayed, so staggered
 *   reveals never flash.
 * - Elements: x, y (px), xPercent, yPercent, scale, scaleX, scaleY, rotate (deg), opacity.
 *   Transforms are composed into a single `translate3d(...) scale(...) rotate(...)` string.
 * - Plain objects: any numeric property.
 * - A new tween on the same target + property takes over that property from older tweens.
 */
import { raf } from './raf';
import { getEase, type Ease, type EaseName } from './ease';

export type TweenValue = number | [number, number];
export type TweenProps = Record<string, TweenValue>;

export interface TweenOptions {
  /** Duration in seconds (default 1). */
  d?: number;
  /** Easing name or function (default o5). */
  e?: EaseName | Ease;
  /** Delay in seconds. */
  delay?: number;
  /** Called on complete (not on kill). */
  cb?: () => void;
  /** Called every frame with eased progress. */
  onUpdate?: (p: number) => void;
}

type Target = HTMLElement | SVGElement | Record<string, any>;

interface ElState {
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  opacity: number;
}

const EL_KEYS = new Set(['x', 'y', 'xPercent', 'yPercent', 'scale', 'scaleX', 'scaleY', 'rotate', 'opacity']);
const elStates = new WeakMap<Element, ElState>();
const owners = new WeakMap<object, Map<string, Tween>>();
const active = new Set<Tween>();

const isElement = (t: unknown): t is HTMLElement | SVGElement => typeof Element !== 'undefined' && t instanceof Element;

function stateOf(el: Element): ElState {
  let s = elStates.get(el);
  if (!s) {
    s = { x: 0, y: 0, xPercent: 0, yPercent: 0, scaleX: 1, scaleY: 1, rotate: 0, opacity: 1 };
    const o = (el as HTMLElement).style?.opacity;
    if (o !== undefined && o !== '') s.opacity = parseFloat(o);
    elStates.set(el, s);
  }
  return s;
}

function render(el: HTMLElement | SVGElement, s: ElState) {
  let t = '';
  if (s.xPercent || s.yPercent) t += `translate3d(${s.xPercent}%,${s.yPercent}%,0) `;
  if (s.x || s.y) t += `translate3d(${s.x}px,${s.y}px,0) `;
  if (s.scaleX !== 1 || s.scaleY !== 1) t += `scale(${s.scaleX},${s.scaleY}) `;
  if (s.rotate) t += `rotate(${s.rotate}deg)`;
  el.style.transform = t.trim();
  el.style.opacity = s.opacity >= 1 ? '' : String(Math.max(0, s.opacity));
}

function readProp(target: Target, key: string): number {
  if (isElement(target)) {
    const s = stateOf(target);
    return key === 'scale' ? s.scaleX : (s as any)[key];
  }
  return target[key] as number;
}

function writeProp(target: Target, key: string, v: number) {
  if (isElement(target)) {
    const s = stateOf(target);
    if (key === 'scale') s.scaleX = s.scaleY = v;
    else (s as any)[key] = v;
  } else target[key] = v;
}

/** Set element/object properties immediately (kills running tweens on those props). */
export function set(target: Target, props: Record<string, number>) {
  release(target, Object.keys(props));
  for (const k in props) writeProp(target, k, props[k]);
  if (isElement(target)) render(target, stateOf(target));
}

/** Read the tween-managed transform state of an element. */
export const getState = (el: Element): Readonly<ElState> => stateOf(el);

function release(target: object, keys: string[], except?: Tween) {
  const map = owners.get(target);
  if (!map) return;
  for (const k of keys) {
    const owner = map.get(k);
    if (owner && owner !== except) {
      owner.drop(k);
      map.delete(k);
    }
  }
}

export class Tween {
  readonly finished: Promise<void>;
  private resolve!: () => void;
  private keys: string[];
  private from: Record<string, number> = {};
  private to: Record<string, number> = {};
  private explicitFrom: Record<string, number> = {};
  private elapsed = 0;
  private started = false;
  private done = false;
  private readonly d: number;
  private readonly ease: Ease;
  private readonly delay: number;

  constructor(
    private target: Target,
    props: TweenProps,
    private opts: TweenOptions,
  ) {
    this.finished = new Promise((r) => (this.resolve = r));
    this.d = Math.max(0, opts.d ?? 1);
    this.ease = getEase(opts.e);
    this.delay = Math.max(0, opts.delay ?? 0);
    this.keys = Object.keys(props);

    release(target, this.keys, this);
    let map = owners.get(target);
    if (!map) owners.set(target, (map = new Map()));
    for (const k of this.keys) {
      map.set(k, this);
      const v = props[k];
      if (Array.isArray(v)) {
        this.explicitFrom[k] = v[0];
        this.to[k] = v[1];
        writeProp(target, k, v[0]); // immediate render of `from`
      } else this.to[k] = v;
    }
    if (isElement(target) && Object.keys(this.explicitFrom).length) render(target, stateOf(target));
    active.add(this);
  }

  /** Remove a property from this tween (another tween took it over). */
  drop(key: string) {
    this.keys = this.keys.filter((k) => k !== key);
    if (!this.keys.length) this.kill();
  }

  /** Stop without calling `cb`. Resolves `finished`. */
  kill() {
    if (this.done) return;
    this.done = true;
    active.delete(this);
    const map = owners.get(this.target);
    if (map) for (const [k, t] of map) if (t === this) map.delete(k);
    if (isElement(this.target)) this.target.style.willChange = '';
    this.resolve();
  }

  /** @internal */
  tick(dt: number) {
    if (this.done) return;
    this.elapsed += dt;
    const local = this.elapsed - this.delay;
    if (local < 0) return;
    if (!this.started) {
      this.started = true;
      for (const k of this.keys) this.from[k] = k in this.explicitFrom ? this.explicitFrom[k] : readProp(this.target, k);
      if (isElement(this.target)) this.target.style.willChange = 'transform, opacity';
    }
    const raw = this.d === 0 ? 1 : Math.min(local / this.d, 1);
    const p = this.ease(raw);
    for (const k of this.keys) writeProp(this.target, k, this.from[k] + (this.to[k] - this.from[k]) * p);
    if (isElement(this.target)) render(this.target, stateOf(this.target));
    this.opts.onUpdate?.(p);
    if (raw >= 1) {
      this.kill();
      this.opts.cb?.();
    }
  }
}

function update(dt: number) {
  for (const t of Array.from(active)) t.tick(dt);
}

let registered = false;

export function animate(target: Target, props: TweenProps, opts: TweenOptions = {}): Tween {
  if (!registered && typeof window !== 'undefined') {
    raf.add(update, 10);
    registered = true;
  }
  for (const k of Object.keys(props)) {
    if (isElement(target) && !EL_KEYS.has(k)) console.warn(`[tween] unsupported element prop "${k}"`);
  }
  return new Tween(target, props, opts);
}

/** Animate a list of targets with a stagger. Resolves when the last one finishes. */
export function stagger(
  targets: ArrayLike<Target>,
  props: TweenProps,
  opts: TweenOptions & { stagger?: number } = {},
): Promise<void> {
  const list = Array.from(targets);
  const step = opts.stagger ?? 0.03;
  const base = opts.delay ?? 0;
  const tweens = list.map((t, i) => animate(t, props, { ...opts, delay: base + i * step, cb: i === list.length - 1 ? opts.cb : undefined }));
  return Promise.all(tweens.map((t) => t.finished)).then(() => undefined);
}

/** Kill every tween running on `target` (optionally only some properties). */
export function killTweens(target: object, keys?: string[]) {
  const map = owners.get(target);
  if (!map) return;
  for (const [k, t] of Array.from(map)) if (!keys || keys.includes(k)) t.drop(k);
}
