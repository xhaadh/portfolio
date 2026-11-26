import { describe, expect, it } from 'vitest';
import { bulgeZ, centreScroll, computeDims, coverScale, galleryRect, indexAtScroll, previewRect, scrollBounds } from './layout';

const d = computeDims(1440, 900, false);

describe('gallery layout', () => {
  it('starts the strip at the configured fraction of the viewport', () => {
    const r = galleryRect(0, 0, d);
    expect(r.x - r.w / 2 + 720).toBeCloseTo(1440 * 0.48, 5);
  });

  it('centreScroll puts a slice at x = 0', () => {
    for (const i of [0, 3, 11]) expect(galleryRect(i, centreScroll(i, d), d).x).toBeCloseTo(0, 6);
  });

  it('indexAtScroll inverts centreScroll', () => {
    for (let i = 0; i < 12; i++) expect(indexAtScroll(centreScroll(i, d), 12, d)).toBe(i);
  });

  it('scroll bounds run from the start to the last slice centred', () => {
    const [min, max] = scrollBounds(12, d);
    expect(min).toBeLessThanOrEqual(0);
    expect(max).toBeCloseTo(centreScroll(11, d), 6);
  });
});

describe('preview layout', () => {
  it('selected plane is centred and big', () => {
    const r = previewRect(4, 4, d);
    expect(r).toMatchObject({ x: 0, w: d.pw, h: d.ph });
  });

  it('neighbours are spread symmetrically', () => {
    const l = previewRect(3, 4, d);
    const r = previewRect(5, 4, d);
    expect(l.x).toBeCloseTo(-r.x, 6);
    expect(r.x - r.w / 2 - d.pw / 2).toBeCloseTo(d.pgap, 6); // gap between image and neighbour
  });

  it('is continuous in the fractional centre index', () => {
    const a = previewRect(5, 5 - 1e-6, d);
    const b = previewRect(5, 5, d);
    expect(a.x).toBeCloseTo(b.x, 1);
    expect(a.w).toBeCloseTo(b.w, 1);
    const c = previewRect(6, 4 + 1e-6, d);
    const e = previewRect(6, 4, d);
    expect(c.x).toBeCloseTo(e.x, 1);
  });
});

describe('helpers', () => {
  it('bulge is max at the centre and zero outside the radius', () => {
    expect(bulgeZ(0, 100, 0.5)).toBeCloseTo(50, 6);
    expect(bulgeZ(100, 100, 0.5)).toBe(0);
    expect(bulgeZ(50, 100, 0.5)).toBeLessThan(50);
  });

  it('coverScale crops the long side only', () => {
    expect(coverScale(100, 400, 1.6)).toEqual([0.25 / 1.6, 1]);
    const [sx, sy] = coverScale(1600, 500, 1.6);
    expect(sx).toBe(1);
    expect(sy).toBeCloseTo(0.5, 6);
  });
});
