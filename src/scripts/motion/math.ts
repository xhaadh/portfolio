/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, min = 0, max = 1): number => (v < min ? min : v > max ? max : v);

/** Inverse lerp: where `v` sits between `a` and `b` (0..1 when inside). */
export const iLerp = (a: number, b: number, v: number): number => (a === b ? 0 : (v - a) / (b - a));

/** Map `v` from [inMin, inMax] to [outMin, outMax]. */
export const remap = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clamped = false,
): number => {
  const t = iLerp(inMin, inMax, v);
  return lerp(outMin, outMax, clamped ? clamp(t) : t);
};

/**
 * Frame-rate independent smoothing. Use this instead of `lerp(a, b, 0.1)` so motion feels
 * identical at 60Hz and 120Hz. `lambda` ~ "how many times per second we close the gap".
 */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

export const round = (v: number, precision = 1000): number => Math.round(v * precision) / precision;

/** Zero-padded integer, e.g. pad(3) -> "03". */
export const pad = (n: number, len = 2): string => String(n).padStart(len, '0');

/** Deterministic PRNG (mulberry32) so "random" layouts are stable per project. */
export function seeded(seed: string | number): () => number {
  let h = typeof seed === 'number' ? seed : 0;
  if (typeof seed === 'string') for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RGB = [number, number, number];

/** "#D9483B" -> [0.85, 0.28, 0.23] */
export function hexToRgb(hex: string): RGB {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (x: number) => Math.round(clamp(x) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Euclidean distance between two colours in RGB space (0..~1.73). */
export const rgbDistance = (a: RGB, b: RGB): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
