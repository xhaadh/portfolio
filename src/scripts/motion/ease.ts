/**
 * Easing functions, t in [0, 1] -> [0, 1].
 * Naming: i = in, o = out, io = in-out, number = polynomial power.
 */
export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;

export const i2: Ease = (t) => t * t;
export const i3: Ease = (t) => t * t * t;
export const i4: Ease = (t) => t * t * t * t;
export const i5: Ease = (t) => t * t * t * t * t;

export const o2: Ease = (t) => 1 - (1 - t) ** 2;
export const o3: Ease = (t) => 1 - (1 - t) ** 3;
export const o4: Ease = (t) => 1 - (1 - t) ** 4;
export const o5: Ease = (t) => 1 - (1 - t) ** 5;

export const io2: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const io3: Ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const io4: Ease = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
export const io5: Ease = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

/** Exponential out - long, soft landing. */
export const expo: Ease = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const ioExpo: Ease = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;

export const eases = { linear, i2, i3, i4, i5, o2, o3, o4, o5, io2, io3, io4, io5, expo, ioExpo } as const;

export type EaseName = keyof typeof eases;

export const getEase = (e: EaseName | Ease | undefined): Ease =>
  typeof e === 'function' ? e : e ? eases[e] : o5;
