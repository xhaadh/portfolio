/**
 * One textured plane per project. Every frame `update()` derives each plane's rect from the
 * scene state by blending three layouts:
 *
 *   gallery rect --(preview)--> preview rect --(project, selected plane only)--> project rect
 *
 * so every transition is just a 0..1 number being tweened by app.ts.
 */
import { Mesh, Plane, Program, Texture } from 'ogl';
import { config } from '../config';
import { clamp, damp, lerp } from '../motion/math';
import { theme } from '../utils/theme';
import { vp } from '../utils/viewport';
import type { ClientProject } from '../utils/data';
import type { GL } from './renderer';
import {
  bulgeZ,
  computeDims,
  coverScale,
  galleryRect,
  lerpRect,
  previewRect,
  projectRect,
  type Dims,
  type Rect,
} from './layout';
import vertex from './shaders/slice.vert?raw';
import fragment from './shaders/slice.frag?raw';

export interface SceneState {
  /** Damped gallery scroll (px). */
  scroll: number;
  /** Scroll velocity (px/s, damped). */
  velocity: number;
  /** 0 = gallery, 1 = preview. */
  preview: number;
  /** 0 = preview, 1 = selected plane sits on the project page image. */
  project: number;
  /** Fractional centre index of the preview layout. */
  kf: number;
  /** Selected project index (0-based). */
  selected: number;
  /** Opacity of the selected plane (0 once the DOM image has taken over). */
  selAlpha: number;
  /** Global opacity (0 on the about page). */
  alpha: number;
  /** Index whose slice should show full colour (pointer hover / keyboard focus), -1 for none. */
  hover: number;
  /** Bulge + velocity multiplier (0 with prefers-reduced-motion). */
  motion: number;
  /** Live project image rect, when the project page DOM exists. */
  projectRect: Rect | null;
}

interface PlaneData {
  mesh: Mesh;
  texture: Texture;
  image: HTMLImageElement | null;
  aspect: number;
  uploaded: boolean;
  hover: number;
  intro: number;
  rect: Rect;
  /** Projected screen rect (centre-origin), for hit-testing. */
  hit: Rect;
  visible: boolean;
  u: { scale: [number, number]; parallax: [number, number]; hover: number; color: number; alpha: number; tint: number; turn: number };
}

export class Slices {
  readonly planes: PlaneData[] = [];
  dims: Dims;
  private program: Program;
  private shared: Record<string, { value: any }>;
  private tmpA: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private tmpB: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private tmpJ: Rect = { x: 0, y: 0, w: 0, h: 0 };
  /** Smoothed absolute scroll speed driving the lens (px/s). */
  private speed = 0;

  constructor(
    private gl: GL,
    projects: ClientProject[],
  ) {
    const ctx = gl.gl;
    this.dims = computeDims(vp.w, vp.h, vp.mobile);
    const b = config.gallery.bulge;

    // Uniforms shared by every plane (same {value} objects).
    this.shared = {
      uRadius: { value: this.dims.radius },
      uStrength: { value: 0 },
      uDepthToColor: { value: 0 },
      uMaxColor: { value: b.maxColor },
      uSkew: { value: 0 },
      uStretch: { value: 0 },
      uGreyAlpha: { value: config.gallery.greyAlpha },
      uTint: { value: [...theme.bg] },
    };

    // One program for all planes; per-plane uniforms are written in onBeforeRender.
    this.program = new Program(ctx, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false as unknown as number,
      uniforms: {
        ...this.shared,
        uTex: { value: null },
        uScale: { value: [1, 1] },
        uParallax: { value: [0, 0] },
        uHover: { value: 0 },
        uColor: { value: 0 },
        uAlpha: { value: 1 },
        uTurn: { value: 0 },
        uTintAmt: { value: 0 },
      },
    });

    const geometry = new Plane(ctx, { width: 1, height: 1, widthSegments: 20, heightSegments: 1 });

    projects.forEach(() => {
      const texture = new Texture(ctx, {
        generateMipmaps: true,
        minFilter: ctx.LINEAR_MIPMAP_LINEAR,
      });
      const mesh = new Mesh(ctx, { geometry, program: this.program, frustumCulled: false });
      const plane: PlaneData = {
        mesh,
        texture,
        image: null,
        aspect: 1.6,
        uploaded: false,
        hover: 0,
        intro: 1,
        rect: { x: 0, y: 0, w: 0, h: 0 },
        hit: { x: 0, y: 0, w: 0, h: 0 },
        visible: false,
        u: { scale: [1, 1], parallax: [0, 0], hover: 0, color: 0, alpha: 0, tint: 0, turn: 0 },
      };
      mesh.onBeforeRender(() => {
        const U = this.program.uniforms;
        U.uTex.value = plane.texture;
        U.uScale.value = plane.u.scale;
        U.uParallax.value = plane.u.parallax;
        U.uHover.value = plane.u.hover;
        U.uColor.value = plane.u.color;
        U.uAlpha.value = plane.u.alpha;
        U.uTurn.value = plane.u.turn;
        U.uTintAmt.value = plane.u.tint;
      });
      mesh.setParent(gl.scene);
      this.planes.push(plane);
    });
  }

  get count() {
    return this.planes.length;
  }

  /** Give a plane its decoded image. Uploaded lazily, the first time the plane is visible. */
  setImage(i: number, img: HTMLImageElement) {
    const p = this.planes[i];
    if (!p) return;
    p.image = img;
    p.aspect = img.naturalWidth / Math.max(img.naturalHeight, 1);
  }

  /** Force-upload a texture now (e.g. before it is shown at a large size). */
  upload(i: number) {
    const p = this.planes[i];
    if (p?.image && !p.uploaded) {
      p.texture.image = p.image;
      p.uploaded = true;
    }
  }

  /** Set intro progress per plane (0 = hidden/below, 1 = in place). */
  setIntro(i: number, v: number) {
    if (this.planes[i]) this.planes[i].intro = v;
  }

  resize() {
    this.dims = computeDims(vp.w, vp.h, vp.mobile);
    this.shared.uRadius.value = this.dims.radius;
  }

  update(s: SceneState, dt: number) {
    const d = this.dims;
    const cfg = config.gallery;
    const camZ = this.gl.camZ;
    const motion = s.motion * (1 - s.preview);

    // Shared uniforms
    const velo = clamp(s.velocity * cfg.velocity.skew, -cfg.velocity.max, cfg.velocity.max) * motion;
    this.shared.uSkew.value = velo;
    this.shared.uStretch.value = Math.min(Math.abs(s.velocity) * cfg.velocity.stretch, cfg.velocity.max) * motion;
    // Speed lens: z push at the centre so the centre slice is magnified up to maxZoom.
    const b = cfg.bulge;
    this.speed = damp(this.speed, Math.abs(s.velocity), b.lambda, dt);
    const full = b.fullSpeed * (d.vw / 1440);
    const t = clamp(this.speed / full);
    // Gentle at slow speeds, strong only when fast. `window.__lens = 0..1` forces it (tuning aid).
    const forced = (globalThis as { __lens?: number }).__lens;
    const amount = typeof forced === 'number' ? clamp(forced) : Math.pow(t, b.curve);
    const zoom = lerp(b.restZoom, b.maxZoom, amount * motion);
    const zMax = camZ * (1 - 1 / Math.max(zoom, 1));
    const strength = zMax / Math.max(d.radius, 1);
    this.shared.uStrength.value = strength;
    const zFull = camZ * (1 - 1 / b.maxZoom);
    this.shared.uDepthToColor.value = b.colorAtFull / Math.max(zFull, 1);
    const maxTurn = ((b.maxTurnDeg * Math.PI) / 180) * amount * motion;
    const bg = theme.bg;
    const tint = this.shared.uTint.value as number[];
    tint[0] = bg[0];
    tint[1] = bg[1];
    tint[2] = bg[2];

    const jRect = s.projectRect ?? projectRect(d, this.tmpJ);
    const margin = d.vw * 0.1;
    const introOffset = cfg.intro.offsetVh * d.vh;

    for (let i = 0; i < this.planes.length; i++) {
      const p = this.planes[i];
      const r = p.rect;
      galleryRect(i, s.scroll, d, this.tmpA);
      previewRect(i, s.kf, d, this.tmpB);
      lerpRect(this.tmpA, this.tmpB, s.preview, r);

      const isSel = clamp(1 - Math.abs(i - s.kf)) * s.preview;
      let alpha = s.alpha * p.intro;
      if (i === s.selected) {
        if (s.project > 0) lerpRect(r, jRect, s.project, r);
        alpha *= s.selAlpha;
      } else {
        alpha *= 1 - s.project;
      }
      alpha *= lerp(1, config.preview.neighbourAlpha, s.preview - isSel);
      r.y += (1 - p.intro) * introOffset * s.motion;

      // Hover (gallery + preview neighbours)
      const hoverTarget = i === s.hover ? 1 : 0;
      p.hover = damp(p.hover, hoverTarget, cfg.hoverLambda, dt);

      // object-fit: cover + horizontal pan while travelling across the screen
      const [sx, sy] = coverScale(r.w, r.h, p.aspect);
      p.u.scale[0] = sx;
      p.u.scale[1] = sy;
      const room = (1 - sx) / 2;
      const travel = clamp(r.x / (d.vw / 2), -1.2, 1.2);
      const pan = -travel * room * cfg.parallax * s.motion * (1 - isSel) * (1 - (i === s.selected ? s.project : 0));
      p.u.parallax[0] = clamp(pan, -room, room);
      p.u.parallax[1] = 0;

      p.u.hover = p.hover * (1 - s.preview * 0.6);
      p.u.color = isSel;
      p.u.tint = (s.preview - isSel) * (1 - p.hover * 0.4);
      p.u.alpha = alpha;

      p.visible = alpha > 0.002 && r.x + r.w / 2 > -d.vw / 2 - margin && r.x - r.w / 2 < d.vw / 2 + margin;
      p.mesh.visible = p.visible;
      if (p.visible && !p.uploaded && p.image) this.upload(i);

      p.mesh.position.set(r.x, -r.y, 0);
      p.mesh.scale.set(r.w, r.h, 1);

      // Projected rect for hit-testing (perspective magnification from the bulge).
      const z = bulgeZ(r.x, d.radius, strength);
      const k = camZ / Math.max(camZ - z, 1);
      p.hit.x = r.x * k;
      p.hit.y = r.y * k;
      // Cards turn toward the centre: the further from it, the more edge-on.
      p.u.turn = clamp(r.x / (d.vw / 2), -1.15, 1.15) * maxTurn;
      p.hit.w = r.w * k * Math.max(Math.cos(p.u.turn), 0.2);
      p.hit.h = r.h * k * (1 + this.shared.uStretch.value);
    }
  }

  /** Index of the plane under a screen point (centre-origin px), or -1. */
  hitTest(x: number, y: number): number {
    for (let i = 0; i < this.planes.length; i++) {
      const p = this.planes[i];
      if (!p.visible || p.u.alpha < 0.05) continue;
      const h = p.hit;
      if (Math.abs(x - h.x) <= h.w / 2 && Math.abs(y - h.y) <= h.h / 2) return i;
    }
    return -1;
  }

  get anyVisible() {
    return this.planes.some((p) => p.visible);
  }
}
