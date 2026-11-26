/**
 * OGL renderer + perspective camera.
 *
 * The camera distance is chosen so that, on the z = 0 plane, 1 world unit == 1 CSS pixel.
 * That lets every layout computation happen in plain px (same numbers as the DOM), while the
 * perspective still gives the bulge (z push) a real magnification.
 */
import { Camera, Renderer, Transform } from 'ogl';
import { config } from '../config';
import { vp } from '../utils/viewport';

export class GL {
  readonly renderer: Renderer;
  readonly gl: Renderer['gl'];
  readonly camera: Camera;
  readonly scene = new Transform();
  /** Camera distance in px. */
  camZ = 1000;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer({
      canvas,
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: false,
      dpr: vp.dpr,
      powerPreference: 'high-performance',
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.camera = new Camera(this.gl, { fov: config.gl.fov, near: 1, far: 10000 });
    this.resize();
  }

  get isWebgl2() {
    return this.renderer.isWebgl2;
  }

  resize() {
    this.renderer.dpr = vp.dpr;
    this.renderer.setSize(vp.w, vp.h);
    const fov = (config.gl.fov * Math.PI) / 180;
    this.camZ = vp.h / 2 / Math.tan(fov / 2);
    this.camera.perspective({ aspect: vp.w / vp.h, near: 1, far: this.camZ * 4 });
    this.camera.position.set(0, 0, this.camZ);
  }

  render() {
    this.renderer.render({ scene: this.scene, camera: this.camera });
  }

  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}

/** True when the browser can create a WebGL context at all. */
export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
