/**
 * Hover scramble: characters cycle through random glyphs, then settle left-to-right.
 * RAF-driven, ~400ms (config.about.scrambleD).
 */
import { config } from '../config';
import { raf } from '../motion/raf';
import { vp } from '../utils/viewport';

const running = new WeakSet<HTMLElement>();

export function scramble(chars: HTMLElement[], duration = config.about.scrambleD) {
  if (vp.reduced || !chars.length) return;
  const glyphs = config.about.scrambleGlyphs;
  const originals = chars.map((c) => c.dataset.char ?? (c.dataset.char = c.textContent || ''));
  const active = chars.filter((c) => !running.has(c));
  if (!active.length) return;

  // Lock widths so the line doesn't jitter while glyphs change.
  active.forEach((c) => {
    running.add(c);
    c.style.width = `${c.getBoundingClientRect().width}px`;
  });

  const start = raf.time;
  let lastSwap = 0;
  const step = 0.045;
  const fn = (_dt: number, t: number) => {
    const el = t - start;
    const swap = el - lastSwap >= step;
    if (swap) lastSwap = el;
    let done = true;
    chars.forEach((c, i) => {
      if (!running.has(c)) return;
      // Settle progressively from the first to the last character.
      const settleAt = duration * (0.45 + (0.55 * (i + 1)) / chars.length);
      if (el >= settleAt) {
        c.textContent = originals[i];
        c.style.width = '';
        running.delete(c);
      } else {
        done = false;
        if (swap) c.textContent = glyphs[(Math.random() * glyphs.length) | 0];
      }
    });
    if (done) raf.remove(fn);
  };
  raf.add(fn, 40);
}
