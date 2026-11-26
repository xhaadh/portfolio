#!/usr/bin/env node
/**
 * Visual smoke test: drives every state of the site in headless Chromium and saves screenshots
 * to ./screenshots/<viewport>-<step>.png. Also reports console errors and the measured FPS.
 *
 *   npm run build && npm run preview      (in another terminal)
 *   node scripts/verify.mjs [baseUrl]     (default http://localhost:4321)
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4321';
const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const state = (page) => page.evaluate(() => window.__portfolio?.());
const waitMode = (page, mode, timeout = 15000) =>
  page.waitForFunction((m) => window.__portfolio?.().mode === m, mode, { timeout });

async function run(name, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(`${m.type()}: ${m.text()}`));
  const shot = (step) => page.screenshot({ path: `${OUT}/${name}-${step}.png` });
  const tap = (x, y) => (mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  const fps = [];

  const W = viewport.width;
  const H = viewport.height;
  // Centre of the 3rd slice at scroll 0 (see config.gallery).
  const slice = mobile ? { x: W * 0.38 + 1 * (W * 0.21) + W * 0.09, y: H / 2 } : { x: W * 0.48 + 2 * (W * 0.0455) + W * 0.019, y: H / 2 };

  await page.goto(`${BASE}/`);
  await page.waitForTimeout(500);
  await shot('00-loader');
  await waitMode(page, 'gallery');
  await page.waitForTimeout(2000);
  await shot('01-gallery');
  fps.push((await state(page)).fps);

  if (!mobile) {
    await page.mouse.move(slice.x, slice.y);
    await page.waitForTimeout(900);
    await shot('02-hover');
  }

  await tap(slice.x, slice.y);
  await page.waitForTimeout(2400);
  await shot('03-preview');
  fps.push((await state(page)).fps);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1700);
  await shot('04-preview-next');

  await page.click('#explore');
  await waitMode(page, 'project');
  await page.waitForTimeout(1600);
  await shot('05-project');

  await page.click('.pthumb >> nth=2');
  await page.waitForTimeout(1300);
  await shot('06-project-thumb');

  await page.click('.proj__back');
  await waitMode(page, 'preview');
  await page.waitForTimeout(1800);
  await shot('07-back-to-preview');

  if (mobile) {
    await page.touchscreen.tap(W / 2, H * 0.9); // no-op tap, then swipe
    await page.mouse.wheel(0, 200);
  } else {
    await page.mouse.move(W / 2, H / 2);
    await page.mouse.wheel(0, 300);
  }
  await waitMode(page, 'gallery').catch(() => {});
  await page.waitForTimeout(1700);
  await shot('08-preview-closed');

  await page.click('a[href="/about/"]');
  await waitMode(page, 'about');
  await page.waitForTimeout(2000);
  await shot('09-about');
  if (!mobile) {
    await page.hover('.about__heading-line >> nth=0');
    await page.waitForTimeout(150);
    await shot('10-about-scramble');
  }

  await page.click('[data-close]');
  await waitMode(page, 'gallery');
  await page.waitForTimeout(1500);
  await shot('11-after-about');

  await page.goto(`${BASE}/meridian/`);
  await waitMode(page, 'project');
  await page.waitForTimeout(2000);
  await shot('12-project-direct');
  fps.push((await state(page)).fps);

  await ctx.close();
  return { name, errors, fps: fps.map((f) => Math.round(f)) };
}

const results = [];
results.push(await run('desktop', { width: 1440, height: 900 }, false));
results.push(await run('mobile', { width: 390, height: 844 }, true));
await browser.close();

for (const r of results) {
  console.log(`\n[${r.name}] fps samples: ${r.fps.join(', ')}`);
  console.log(r.errors.length ? r.errors.join('\n') : 'no console errors');
}
