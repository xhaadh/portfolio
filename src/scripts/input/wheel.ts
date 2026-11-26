/**
 * Unified input: wheel (mouse + trackpad), touch drag and mouse drag -> one scroll delta stream,
 * plus taps (click without drag) and pointer position for hover.
 *
 * Deltas are normalised across browsers (deltaMode lines/pages -> px) and scaled by the
 * multipliers in config.gallery. Positive delta = move the strip left (advance).
 */
import { config } from '../config';

export interface InputHandlers {
  /** Scroll delta in px. `source` lets consumers treat wheel vs drag differently. */
  onScroll?: (delta: number, source: 'wheel' | 'drag' | 'touch', e: Event) => void;
  /** Raw (normalised, unscaled) wheel event for consumers that want gesture logic. */
  onWheel?: (delta: number, e: WheelEvent) => void;
  /** Pointer click/tap that did not turn into a drag. */
  onTap?: (x: number, y: number, e: PointerEvent) => void;
  onMove?: (x: number, y: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Return true to preventDefault() wheel events (stops native scroll / swipe-back). */
  shouldPreventWheel?: () => boolean;
}

const LINE_HEIGHT = 16;
const DRAG_THRESHOLD = 6;

export function normalizeWheel(e: WheelEvent): number {
  let dx = e.deltaX;
  let dy = e.deltaY;
  if (e.deltaMode === 1) {
    dx *= LINE_HEIGHT;
    dy *= LINE_HEIGHT;
  } else if (e.deltaMode === 2) {
    dx *= window.innerHeight;
    dy *= window.innerHeight;
  }
  // Use the dominant axis so both vertical wheels and horizontal trackpad swipes work.
  return Math.abs(dy) >= Math.abs(dx) ? dy : dx;
}

export class Input {
  enabled = true;
  /** True while the user is dragging (mouse or touch). */
  dragging = false;
  x = -9999;
  y = -9999;
  private down = false;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private pointerType = 'mouse';
  private axis: 'x' | 'y' | null = null;

  constructor(private h: InputHandlers) {
    window.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('pointerdown', this.pointerDown);
    window.addEventListener('pointermove', this.pointerMove, { passive: true });
    window.addEventListener('pointerup', this.pointerUp);
    window.addEventListener('pointercancel', this.pointerUp);
    document.documentElement.addEventListener('pointerleave', () => {
      this.x = this.y = -9999;
      this.h.onMove?.(this.x, this.y);
    });
  }

  private wheel = (e: WheelEvent) => {
    if (e.ctrlKey) return; // pinch-zoom
    if (this.h.shouldPreventWheel?.()) e.preventDefault();
    const delta = normalizeWheel(e);
    this.h.onWheel?.(delta, e);
    if (!this.enabled) return;
    this.h.onScroll?.(delta * config.gallery.wheelMultiplier, 'wheel', e);
  };

  private pointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    // Let real UI (links, buttons) behave normally.
    if ((e.target as Element)?.closest?.('a, button, input, [data-no-drag]')) return;
    this.down = true;
    this.dragging = false;
    this.axis = null;
    this.pointerType = e.pointerType;
    this.startX = this.lastX = e.clientX;
    this.startY = this.lastY = e.clientY;
  };

  private pointerMove = (e: PointerEvent) => {
    this.x = e.clientX;
    this.y = e.clientY;
    this.h.onMove?.(e.clientX, e.clientY);
    if (!this.down) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (!this.dragging) {
      const tx = e.clientX - this.startX;
      const ty = e.clientY - this.startY;
      if (Math.hypot(tx, ty) < DRAG_THRESHOLD) return;
      this.dragging = true;
      // Touch: lock to the dominant axis (vertical swipe or horizontal swipe both scroll).
      this.axis = Math.abs(tx) >= Math.abs(ty) ? 'x' : 'y';
      this.h.onDragStart?.();
    }
    if (!this.enabled) return;

    const touch = this.pointerType !== 'mouse';
    const raw = touch ? (this.axis === 'x' ? -dx : -dy) : -dx;
    const mult = touch ? config.gallery.touchMultiplier : config.gallery.dragMultiplier;
    this.h.onScroll?.(raw * mult, touch ? 'touch' : 'drag', e);
  };

  private pointerUp = (e: PointerEvent) => {
    if (!this.down) return;
    this.down = false;
    if (this.dragging) {
      this.dragging = false;
      this.h.onDragEnd?.();
    } else if (e.type === 'pointerup') {
      this.h.onTap?.(e.clientX, e.clientY, e);
    }
  };
}
