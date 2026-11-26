/**
 * Every timing, easing and size lives here so the "feel" can be tuned in one place.
 *
 * Units:
 *  - durations / delays / staggers: seconds
 *  - `*Vw` / `*Vh` values: fraction of the viewport (0.05 = 5vw / 5vh)
 *  - damp `lambda`s: higher = snappier (frame-rate independent, see motion/math.ts)
 *
 * This file is imported both by the client scripts and by Base.astro (to emit CSS custom
 * properties), so it must stay free of DOM access.
 */
import type { EaseName } from './motion/ease';

export interface GalleryLayout {
  sliceWVw: number;
  sliceHVh: number;
  gapVw: number;
  /** Left edge of the first slice at scroll 0, as a fraction of viewport width. */
  stripStartVw: number;
}

export interface PreviewLayout {
  /** Selected (enlarged) plane. */
  wVw: number;
  hVh: number;
  /** Neighbour planes in preview mode. */
  neighbourWVw: number;
  gapVw: number;
}

export interface ProjectLayout {
  /** Main image on the project page (also where the WebGL plane lands). */
  wVw: number;
  hVh: number;
}

export const config = {
  breakpoint: 768,
  dprMax: 2,

  colors: {
    bg: '#141414',
    fg: '#BAC4B8',
    themeColor: '#171717',
    accent: '#CC9933',
  },

  gl: {
    fov: 45,
  },

  gallery: {
    desktop: { sliceWVw: 0.038, sliceHVh: 0.31, gapVw: 0.0075, stripStartVw: 0.48 } as GalleryLayout,
    mobile: { sliceWVw: 0.18, sliceHVh: 0.36, gapVw: 0.03, stripStartVw: 0.38 } as GalleryLayout,
    /** current = damp(current, target, scrollLambda, dt) */
    scrollLambda: 6,
    wheelMultiplier: 0.6,
    touchMultiplier: 1.8,
    dragMultiplier: 1.6,
    /** Keyboard arrow step, in slices. */
    keyStep: 1,
    /**
     * Speed lens: flat at rest; while scrolling, slices near the screen centre are pushed toward
     * the camera (bigger + full colour), outer ones turn edge-on. Strength follows scroll speed.
     */
    bulge: {
      /** Radius of the lens around screen centre (fraction of viewport width). */
      radiusVw: 0.3,
      /** Magnification of the centre slice at full speed (2 = twice as big). */
      maxZoom: 1.85,
      /** Magnification at rest (1 = perfectly flat strip). */
      restZoom: 1,
      /** Scroll speed (px/s, per 1440px of viewport width) that gives the full effect. */
      fullSpeed: 1000,
      /** Speed smoothing - lower = the lens lingers longer after you stop. */
      lambda: 5,
      /**
       * Response curve exponent: 1 = linear, >1 = gentle at slow speeds and only strong when
       * scrolling fast (the reference barely reacts to slow drags).
       */
      curve: 1.3,
      /**
       * Max rotation (degrees) of each card around its vertical axis at full speed, for cards at
       * the screen edge - they turn to face the centre, as if wrapped around a cylinder.
       */
      maxTurnDeg: 52,
      /** Colour brought back at the centre at full effect (clamped to maxColor). */
      colorAtFull: 1.6,
      maxColor: 1,
    },
    velocity: {
      /** Optional horizontal shear / vertical stretch from scroll velocity (0 = off, as in the reference). */
      skew: 0,
      stretch: 0,
      max: 0.12,
      lambda: 5,
    },
    /** Horizontal image pan inside narrow slices as they travel across the screen (0..1). */
    parallax: 0.55,
    /** Opacity of the grey (unhovered) slices. */
    greyAlpha: 0.42,
    hoverLambda: 7,
    /** First-load intro of the strip: a quick staggered fade in place (as in the reference). */
    intro: { stagger: 0.02, d: 0.7, e: 'o3' as EaseName, offsetVh: 0 },
  },

  preview: {
    desktop: { wVw: 0.4, hVh: 0.5, neighbourWVw: 0.21, gapVw: 0.095 } as PreviewLayout,
    mobile: { wVw: 0.8, hVh: 0.3, neighbourWVw: 0.5, gapVw: 0.06 } as PreviewLayout,
    d: 1.2,
    e: 'io4' as EaseName,
    /** Opacity of the duotoned neighbours. */
    neighbourAlpha: 0.75,
    /** Prev / next inside preview (arrow keys, clicking a neighbour). */
    stepD: 1.1,
    title: {
      stagger: 0.03,
      delay: 0.25,
      d: 1.2,
      e: 'o5' as EaseName,
      outD: 0.6,
      outE: 'i3' as EaseName,
      /** Fraction of letters drawn in front of the image (the rest sit behind it). */
      frontRatio: 0.55,
    },
    /** Wheel delta needed to close preview. */
    closeThreshold: 8,
  },

  project: {
    desktop: { wVw: 0.53, hVh: 0.54 } as ProjectLayout,
    mobile: { wVw: 0.88, hVh: 0.3 } as ProjectLayout,
    /** gallery preview -> project page plane morph. */
    exploreD: 1.1,
    exploreE: 'io4' as EaseName,
    /** project page -> preview plane morph (back). */
    backD: 1.2,
    /** Colour wipe that reveals the image when landing directly on a project page. */
    wipeD: 0.9,
    /** Vertical swipe between project images (thumbs / wheel / arrow keys). */
    swapD: 1.0,
    swapE: 'io4' as EaseName,
    /** ms of wheel silence that ends a "gesture" (one image per gesture). */
    wheelIdle: 220,
    wheelThreshold: 12,
  },

  reveal: {
    d: 1.2,
    e: 'o5' as EaseName,
    charStagger: 0.03,
    lineStagger: 0.02,
    outD: 0.55,
    outE: 'i3' as EaseName,
    outStagger: 0.012,
  },

  theme: {
    d: 1.2,
    e: 'io4' as EaseName,
  },

  about: {
    lineStagger: 0.02,
    glFadeD: 0.8,
    scrambleD: 0.4,
    scrambleGlyphs: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?',
  },

  loader: {
    /** Minimum time the counter is shown (s), so it never just flashes. */
    minD: 1.1,
    /** Pause on "100" before the digits leave. */
    holdD: 0.2,
    digitsInD: 0.7,
    digitsOutD: 0.35,
    /** Logo letters sliding in after the counter. */
    logoD: 0.6,
    logoStagger: 0.05,
  },

  ruler: {
    /** One tick per project (the count comes from the content collection). */
    tickW: 1,
    tickH: 12,
    tickGap: 15,
    /** Gap (px) opened on each side of the pagination label in preview mode. */
    paginationGap: 40,
    /** How many ticks around the scroll position light up (gallery). */
    spread: 1.6,
    lambda: 8,
    /** Keep the ticks visible next to the "03 [ ] 12" label in preview mode. */
    ticksInPagination: true,
    /** Overrides below the mobile breakpoint (set ticksInPagination: false to show only the label). */
    mobile: { tickGap: 6, paginationGap: 42, spread: 1.4, ticksInPagination: true },
  },
} as const;

export type Config = typeof config;

const pct = (v: number) => `${+(v * 100).toFixed(3)}`;

/** CSS custom properties derived from the config (emitted in <head> by Base.astro). */
export function cssVars(): string {
  const { preview: p, project: pr, gallery: g } = config;
  return (
    `:root{` +
    `--prev-w:${pct(p.desktop.wVw)}vw;--prev-h:${pct(p.desktop.hVh)}vh;` +
    `--proj-w:${pct(pr.desktop.wVw)}vw;--proj-h:${pct(pr.desktop.hVh)}vh;` +
    `--slice-h:${pct(g.desktop.sliceHVh)}vh;` +
    `--accent:${config.colors.accent};` +
    `}` +
    `@media (max-width:${config.breakpoint - 1}px){:root{` +
    `--prev-w:${pct(p.mobile.wVw)}vw;--prev-h:${pct(p.mobile.hVh)}vh;` +
    `--proj-w:${pct(pr.mobile.wVw)}vw;--proj-h:${pct(pr.mobile.hVh)}vh;` +
    `--slice-h:${pct(g.mobile.sliceHVh)}vh;` +
    `}}`
  );
}
