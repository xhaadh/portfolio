import { describe, expect, it } from 'vitest';
import { clamp, damp, hexToRgb, iLerp, lerp, mixRgb, pad, remap, rgbToHex, seeded } from './math';

describe('lerp / iLerp / remap', () => {
  it('lerp interpolates linearly', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(-10, 10, 1)).toBe(10);
  });

  it('iLerp is the inverse of lerp', () => {
    expect(iLerp(0, 10, 5)).toBe(0.5);
    expect(iLerp(10, 20, 25)).toBe(1.5);
    expect(iLerp(3, 3, 3)).toBe(0); // no division by zero
  });

  it('remap maps between ranges, optionally clamped', () => {
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(remap(20, 0, 10, 100, 200)).toBe(300);
    expect(remap(20, 0, 10, 100, 200, true)).toBe(200);
  });

  it('clamp bounds values', () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('damp', () => {
  it('converges to the target', () => {
    let v = 0;
    for (let i = 0; i < 600; i++) v = damp(v, 100, 6, 1 / 60);
    expect(v).toBeCloseTo(100, 5);
  });

  it('is frame-rate independent (60Hz vs 120Hz vs 30Hz)', () => {
    const run = (hz: number, seconds = 0.5) => {
      let v = 0;
      for (let i = 0; i < hz * seconds; i++) v = damp(v, 1, 6, 1 / hz);
      return v;
    };
    const at60 = run(60);
    expect(run(120)).toBeCloseTo(at60, 10);
    expect(run(30)).toBeCloseTo(at60, 10);
  });

  it('dt = 0 keeps the value', () => {
    expect(damp(3, 10, 6, 0)).toBe(3);
  });
});

describe('helpers', () => {
  it('pad zero-pads', () => {
    expect(pad(3)).toBe('03');
    expect(pad(12)).toBe('12');
  });

  it('seeded PRNG is deterministic and in [0, 1)', () => {
    const a = seeded('meridian');
    const b = seeded('meridian');
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(seeded('atlas')()).not.toBe(seeded('meridian')());
  });

  it('hex <-> rgb round-trips and mixes', () => {
    expect(rgbToHex(hexToRgb('#D9483B'))).toBe('#d9483b');
    expect(rgbToHex(mixRgb(hexToRgb('#000000'), hexToRgb('#ffffff'), 0.5))).toBe('#808080');
  });
});
