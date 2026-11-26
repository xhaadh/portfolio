import { describe, expect, it } from 'vitest';
import { eases, getEase, io2, io4, o5 } from './ease';

describe('easings', () => {
  for (const [name, fn] of Object.entries(eases)) {
    it(`${name}: starts at 0, ends at 1`, () => {
      expect(fn(0)).toBeCloseTo(0, 6);
      expect(fn(1)).toBeCloseTo(1, 6);
    });

    it(`${name}: is monotonic`, () => {
      let prev = -Infinity;
      for (let i = 0; i <= 200; i++) {
        const v = fn(i / 200);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = v;
      }
    });
  }

  it('in-out easings are symmetric around 0.5', () => {
    for (const fn of [eases.io2, eases.io3, eases.io4, eases.io5, eases.ioExpo]) {
      expect(fn(0.5)).toBeCloseTo(0.5, 6);
      expect(fn(0.25) + fn(0.75)).toBeCloseTo(1, 6);
    }
  });

  it('io2 matches the shader formula from the spec', () => {
    const glsl = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    for (let i = 0; i <= 20; i++) expect(io2(i / 20)).toBeCloseTo(glsl(i / 20), 10);
  });

  it('out easings are ahead of linear, in-out cross at the middle', () => {
    expect(o5(0.2)).toBeGreaterThan(0.2);
    expect(io4(0.2)).toBeLessThan(0.2);
    expect(io4(0.8)).toBeGreaterThan(0.8);
  });

  it('getEase resolves names, functions and the default', () => {
    expect(getEase('io4')).toBe(io4);
    const custom = (t: number) => t;
    expect(getEase(custom)).toBe(custom);
    expect(getEase(undefined)).toBe(o5);
  });
});
