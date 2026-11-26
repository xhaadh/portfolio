/**
 * Pure layout maths for the slice planes (no DOM / WebGL - unit tested).
 *
 * All rects are in CSS px, origin at the viewport CENTRE, y pointing DOWN (like the DOM),
 * `x`/`y` are the rect's centre. gl/slices.ts flips y when writing mesh positions.
 */
import { config } from '../config';
import { clamp, lerp } from '../motion/math';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dims {
  vw: number;
  vh: number;
  /** gallery slice */
  sw: number;
  sh: number;
  gap: number;
  /** left edge of slice 0 at scroll 0 (centre-origin x) */
  startX: number;
  /** preview: selected + neighbours */
  pw: number;
  ph: number;
  nw: number;
  pgap: number;
  /** project page main image */
  jw: number;
  jh: number;
  /** bulge radius */
  radius: number;
}

export function computeDims(vw: number, vh: number, mobile: boolean): Dims {
  const g = mobile ? config.gallery.mobile : config.gallery.desktop;
  const p = mobile ? config.preview.mobile : config.preview.desktop;
  const j = mobile ? config.project.mobile : config.project.desktop;
  return {
    vw,
    vh,
    sw: g.sliceWVw * vw,
    sh: g.sliceHVh * vh,
    gap: g.gapVw * vw,
    startX: -vw / 2 + g.stripStartVw * vw,
    pw: p.wVw * vw,
    ph: p.hVh * vh,
    nw: p.neighbourWVw * vw,
    pgap: p.gapVw * vw,
    jw: j.wVw * vw,
    jh: j.hVh * vh,
    radius: config.gallery.bulge.radiusVw * (mobile ? 1.6 : 1) * vw,
  };
}

export const pitch = (d: Dims) => d.sw + d.gap;

/** Scroll value that puts slice `i` at the horizontal centre of the screen. */
export const centreScroll = (i: number, d: Dims) => d.startX + i * pitch(d) + d.sw / 2;

/** [min, max] scroll: from the initial position to the last slice being centred. */
export function scrollBounds(count: number, d: Dims): [number, number] {
  return [Math.min(0, centreScroll(0, d)), Math.max(0, centreScroll(Math.max(count - 1, 0), d))];
}

/** Nearest slice index for a scroll value. */
export const indexAtScroll = (scroll: number, count: number, d: Dims) =>
  clamp(Math.round((scroll - d.startX - d.sw / 2) / pitch(d)), 0, count - 1);

export function galleryRect(i: number, scroll: number, d: Dims, out: Rect = { x: 0, y: 0, w: 0, h: 0 }): Rect {
  out.x = d.startX + i * pitch(d) + d.sw / 2 - scroll;
  out.y = 0;
  out.w = d.sw;
  out.h = d.sh;
  return out;
}

/**
 * Preview layout around a (fractional) centre index `kf`: the selected plane is big and
 * centred, neighbours are spread out with wider gaps. Continuous in `kf`, so stepping from one
 * project to the next can simply tween `kf`.
 */
export function previewRect(i: number, kf: number, d: Dims, out: Rect = { x: 0, y: 0, w: 0, h: 0 }): Rect {
  const off = i - kf;
  const a = Math.abs(off);
  const s = Math.sign(off);
  const firstSlot = d.pw / 2 + d.pgap + d.nw / 2;
  if (a <= 1) {
    out.x = s * lerp(0, firstSlot, a);
    out.w = lerp(d.pw, d.nw, a);
  } else {
    out.x = s * (firstSlot + (a - 1) * (d.nw + d.pgap));
    out.w = d.nw;
  }
  out.y = 0;
  out.h = d.ph;
  return out;
}

/** Project page main image rect (fallback before the real DOM image exists). */
export function projectRect(d: Dims, out: Rect = { x: 0, y: 0, w: 0, h: 0 }): Rect {
  out.x = 0;
  out.y = 0;
  out.w = d.jw;
  out.h = d.jh;
  return out;
}

export function lerpRect(a: Rect, b: Rect, t: number, out: Rect = { x: 0, y: 0, w: 0, h: 0 }): Rect {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.w = lerp(a.w, b.w, t);
  out.h = lerp(a.h, b.h, t);
  return out;
}

/** DOMRect (top-left origin) -> centre-origin Rect. */
export function fromDomRect(r: { left: number; top: number; width: number; height: number }, vw: number, vh: number): Rect {
  return { x: r.left + r.width / 2 - vw / 2, y: r.top + r.height / 2 - vh / 2, w: r.width, h: r.height };
}

const io2 = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/** Same bulge as the vertex shader (CPU copy, used for hit-testing). */
export function bulgeZ(x: number, radius: number, strength: number): number {
  const dist = Math.abs(x);
  return dist < radius ? (radius - io2(dist / radius) * radius) * strength : 0;
}

/** UV scale that reproduces `object-fit: cover`. */
export function coverScale(planeW: number, planeH: number, imgAspect: number): [number, number] {
  const planeAspect = planeW / Math.max(planeH, 1e-6);
  return planeAspect < imgAspect ? [planeAspect / imgAspect, 1] : [1, imgAspect / planeAspect];
}
