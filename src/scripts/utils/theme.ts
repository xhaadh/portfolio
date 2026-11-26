/**
 * Page colours (background + UI text) as CSS custom properties on <html>.
 *
 * Astro's ClientRouter replaces <html> attributes on every navigation, so the JS state here is
 * the source of truth and is re-applied in `astro:after-swap` (see app.ts).
 */
import { config } from '../config';
import { hexToRgb, mixRgb, rgbToHex, type RGB } from '../motion/math';
import { animate, type Tween } from '../motion/tween';
import type { EaseName } from '../motion/ease';

const state = {
  bg: hexToRgb(config.colors.bg),
  fg: hexToRgb(config.colors.fg),
};
let tween: Tween | null = null;

/** Current colours as 0..1 RGB (read every frame by WebGL for the neighbour tint). */
export const theme = {
  get bg(): RGB {
    return state.bg;
  },
  get fg(): RGB {
    return state.fg;
  },
};

export function applyTheme() {
  const root = document.documentElement;
  const bg = rgbToHex(state.bg);
  root.style.setProperty('--bg', bg);
  root.style.setProperty('--fg', rgbToHex(state.fg));
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = bg === config.colors.bg.toLowerCase() ? config.colors.themeColor : bg;
}

export function setTheme(
  bgHex: string,
  fgHex: string,
  opts: { d?: number; e?: EaseName; delay?: number; instant?: boolean } = {},
): Promise<void> {
  tween?.kill();
  const toBg = hexToRgb(bgHex);
  const toFg = hexToRgb(fgHex);
  if (opts.instant) {
    state.bg = toBg;
    state.fg = toFg;
    applyTheme();
    return Promise.resolve();
  }
  const fromBg = state.bg;
  const fromFg = state.fg;
  const p = { t: 0 };
  tween = animate(
    p,
    { t: 1 },
    {
      d: opts.d ?? config.theme.d,
      e: opts.e ?? config.theme.e,
      delay: opts.delay,
      onUpdate: () => {
        state.bg = mixRgb(fromBg, toBg, p.t);
        state.fg = mixRgb(fromFg, toFg, p.t);
        applyTheme();
      },
    },
  );
  return tween.finished;
}

export const resetTheme = (opts?: Parameters<typeof setTheme>[2]) => setTheme(config.colors.bg, config.colors.fg, opts);
