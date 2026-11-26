/**
 * App conductor. Boots once (the module is not re-executed on Astro client-side navigation),
 * owns the RAF-driven scene state, input, and the page state machine:
 *
 *   gallery <-> preview -> project  (and back),   any <-> about
 *
 * WebGL never re-initialises: the canvas host is `transition:persist`ed in Base.astro.
 * Page changes are orchestrated with Astro's View Transition events:
 *   astro:before-preparation -> outro animations run in parallel with the page fetch
 *   astro:after-swap         -> restore theme, prepare the new page, start its intro
 */
import { navigate } from 'astro:transitions/client';
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import { config } from './config';
import { clamp, damp } from './motion/math';
import { raf } from './motion/raf';
import { animate, killTweens } from './motion/tween';
import { GL, supportsWebGL } from './gl/renderer';
import { Slices, type SceneState } from './gl/slices';
import { centreScroll, fromDomRect, lerpRect, projectRect, scrollBounds, type Rect } from './gl/layout';
import { Input } from './input/wheel';
import { Loader } from './ui/loader';
import { Ruler } from './ui/ruler';
import { cornersOut, prepareCorners, revealCorners } from './ui/corners';
import { HomeUI } from './pages/home';
import { ProjectPage } from './pages/project';
import { AboutPage } from './pages/about';
import { currentPage, getProjects, pageFromPath, type ClientProject, type PageName } from './utils/data';
import { loadImage } from './utils/image';
import { applyTheme, resetTheme, setTheme } from './utils/theme';
import { initViewport, onResize, vp } from './utils/viewport';

type Mode = 'loading' | 'gallery' | 'preview' | 'project' | 'about' | 'busy';
interface PageRef {
  page: PageName;
  slug?: string;
}

const S: SceneState = {
  scroll: 0,
  velocity: 0,
  preview: 0,
  project: 0,
  kf: 0,
  selected: 0,
  selAlpha: 1,
  alpha: 1,
  hover: -1,
  motion: 1,
  projectRect: null,
};

let mode: Mode = 'loading';
let target = 0;
let projects: ClientProject[] = [];
let gl: GL | null = null;
let slices: Slices | null = null;
let ruler: Ruler | null = null;
let input: Input;
let home: HomeUI | null = null;
let projectPage: ProjectPage | null = null;
let about: AboutPage | null = null;
let pointerHover = -1;
let focusHover = -1;
let previewWheel = 0;
let previewWheelTimer = 0;
let cleared = false;
let cursorOn = false;
let navFrom: PageRef | null = null;
let internalNavs = 0;

/** Smoothed frames-per-second (exposed through window.__portfolio()). */
const fps = {
  value: 60,
  tick: (dt: number) => {
    if (dt > 0) fps.value = fps.value * 0.95 + (1 / dt) * 0.05;
  },
};

// ---------------------------------------------------------------------------------------------
// Boot

export function boot() {
  const w = window as unknown as { __portfolioBooted?: boolean };
  if (w.__portfolioBooted) return;
  w.__portfolioBooted = true;

  initViewport();
  S.motion = vp.reduced ? 0 : 1;
  projects = getProjects();

  const canvas = document.querySelector<HTMLCanvasElement>('#gl canvas');
  if (canvas && supportsWebGL()) {
    try {
      gl = new GL(canvas);
      slices = new Slices(gl, projects);
    } catch (err) {
      console.error('[gl] init failed, falling back to DOM', err);
      gl = null;
      slices = null;
    }
  }
  markNoWebGL();

  const rulerEl = document.querySelector<HTMLElement>('[data-ruler]');
  if (rulerEl) ruler = new Ruler(rulerEl, projects.length);

  input = new Input({
    onScroll,
    onWheel,
    onTap,
    onDragStart: () => document.documentElement.classList.add('is-dragging'),
    onDragEnd: () => document.documentElement.classList.remove('is-dragging'),
    shouldPreventWheel: () => {
      const page = currentPage().page;
      return page === 'home' || (page === 'project' && !vp.mobile);
    },
  });
  window.addEventListener('keydown', onKey);
  onResize(handleResize);
  // "Close" on the about page goes back to the previous route (capture phase, before the router).
  document.addEventListener(
    'click',
    (e) => {
      if ((e.target as Element)?.closest?.('[data-close]')) {
        e.preventDefault();
        closeAbout();
      }
    },
    true,
  );

  raf.add(update, 20);
  raf.add(render, 30);

  // Read-only state snapshot for debugging / automated checks: window.__portfolio()
  (window as unknown as { __portfolio: () => object }).__portfolio = () => ({ mode, target, ...S, fps: fps.value });
  raf.add(fps.tick, 50);

  document.addEventListener('astro:before-preparation', onBeforePreparation as EventListener);
  document.addEventListener('astro:after-swap', onAfterSwap);

  start();
}

async function start() {
  const loaderEl = document.getElementById('loader');
  const loader = loaderEl ? new Loader(loaderEl) : null;
  const total = projects.length + 1;
  let done = 0;
  const tick = () => loader?.setProgress(++done / total);

  const fonts = document.fonts.ready.then(tick);
  const images = projects.map((p, i) =>
    loadImage(p.cover)
      .then((img) => slices?.setImage(i, img))
      .catch((err) => console.warn(err))
      .finally(tick),
  );
  await Promise.all([fonts, ...images]);

  const page = currentPage();
  const corners = prepareCorners();
  preparePage(page);
  if (page.page === 'home' && slices) for (let i = 0; i < slices.count; i++) slices.setIntro(i, 0);
  // Counter leaves, then logo letters, corners and the page intro all start together.
  await loader?.finish();
  revealCorners(corners, 0.05);
  enterPage(page, null);
}

function markNoWebGL() {
  document.documentElement.classList.toggle('no-webgl', !gl);
}

// ---------------------------------------------------------------------------------------------
// Frame loop

function update(dt: number) {
  if (!slices) return;
  const d = slices.dims;
  const [min, max] = scrollBounds(slices.count, d);
  target = clamp(target, min, max);
  const prev = S.scroll;
  S.scroll = damp(S.scroll, target, config.gallery.scrollLambda, dt);
  if (Math.abs(S.scroll - target) < 0.01) S.scroll = target;
  const v = dt > 0 ? (S.scroll - prev) / dt : 0;
  S.velocity = damp(S.velocity, v, config.gallery.velocity.lambda, dt);

  // Hover follows the pointer even while slices move underneath it.
  const interactive = (mode === 'gallery' || mode === 'preview') && !input.dragging;
  const hit = interactive && input.x > -9000 ? slices.hitTest(input.x - vp.w / 2, input.y - vp.h / 2) : -1;
  pointerHover = mode === 'preview' && hit === S.selected ? -1 : hit;
  setCursor(hit >= 0);
  S.hover = focusHover >= 0 ? focusHover : pointerHover;

  slices.update(S, dt);

  if (ruler) {
    const progress = mode === 'preview' ? S.selected / Math.max(slices.count - 1, 1) : max > min ? (S.scroll - min) / (max - min) : 0;
    ruler.update(dt, progress, mode === 'preview' ? 1 : 0);
  }
}

function render() {
  if (!gl || !slices) return;
  if (slices.anyVisible) {
    gl.render();
    cleared = false;
  } else if (!cleared) {
    gl.clear();
    cleared = true;
  }
}

function setCursor(on: boolean) {
  if (on === cursorOn) return;
  cursorOn = on;
  document.documentElement.classList.toggle('is-pointer', on);
}

// ---------------------------------------------------------------------------------------------
// Input

function onScroll(delta: number, source: 'wheel' | 'drag' | 'touch') {
  if (mode === 'gallery') {
    target += delta;
  } else if (mode === 'preview') {
    if (source === 'wheel') {
      // Accumulate a little so a stray trackpad tick doesn't close the preview.
      previewWheel += delta;
      clearTimeout(previewWheelTimer);
      previewWheelTimer = window.setTimeout(() => (previewWheel = 0), 200);
      if (Math.abs(previewWheel) < config.preview.closeThreshold) return;
      previewWheel = 0;
    }
    closePreview();
    target += delta;
  }
}

function onWheel(delta: number) {
  if (mode === 'project' && !vp.mobile) projectPage?.onWheel(delta);
}

function onTap(x: number, y: number) {
  if (!slices) return;
  const i = slices.hitTest(x - vp.w / 2, y - vp.h / 2);
  if (i < 0) return;
  if (mode === 'gallery') openPreview(i);
  else if (mode === 'preview') {
    if (i === S.selected) explore();
    else stepPreview(i);
  }
}

function onKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  const next = k === 'ArrowRight' || k === 'ArrowDown';
  const prev = k === 'ArrowLeft' || k === 'ArrowUp';
  if (mode === 'gallery' && slices) {
    if (next || prev) {
      e.preventDefault();
      target += (next ? 1 : -1) * config.gallery.keyStep * (slices.dims.sw + slices.dims.gap);
    }
  } else if (mode === 'preview') {
    if (next || prev) {
      e.preventDefault();
      stepPreview(S.selected + (next ? 1 : -1));
    } else if (k === 'Escape') closePreview();
    else if (k === 'Enter' && !(document.activeElement instanceof HTMLAnchorElement)) explore();
  } else if (mode === 'project') {
    if (next || prev) {
      e.preventDefault();
      projectPage?.step(next ? 1 : -1);
    } else if (k === 'Escape') navigate('/');
  } else if (mode === 'about' && k === 'Escape') {
    closeAbout();
  }
}

function handleResize() {
  S.motion = vp.reduced ? 0 : 1;
  if (gl && slices) {
    const old = slices.dims;
    const fi = (target - old.startX - old.sw / 2) / (old.sw + old.gap);
    gl.resize();
    slices.resize();
    const d = slices.dims;
    target = mode === 'preview' ? centreScroll(S.selected, d) : d.startX + d.sw / 2 + fi * (d.sw + d.gap);
    S.scroll = target;
  }
  home?.layout();
  ruler?.build();
  projectPage?.fitTitle();
  if (S.projectRect && projectPage) S.projectRect = fromDomRect(projectPage.mediaRect(), vp.w, vp.h);
}

// ---------------------------------------------------------------------------------------------
// Gallery <-> preview

function openPreview(i: number) {
  if (!slices || !home) return;
  const p = projects[i];
  mode = 'preview';
  S.selected = i;
  S.kf = i;
  target = centreScroll(i, slices.dims);
  slices.upload(i);
  animate(S, { preview: 1 }, { d: config.preview.d, e: config.preview.e });
  setTheme(p.color, p.textColor);
  ruler?.setPagination(i, projects.length, p.color);
  home.show(p, config.preview.title.delay);
}

function closePreview() {
  if (mode !== 'preview') return;
  mode = 'gallery';
  animate(S, { preview: 0 }, { d: config.preview.d, e: config.preview.e });
  resetTheme();
  home?.hide();
}

function stepPreview(i: number) {
  if (!slices || !home) return;
  const n = clamp(i, 0, projects.length - 1);
  if (n === S.selected) return;
  const p = projects[n];
  S.selected = n;
  target = centreScroll(n, slices.dims);
  slices.upload(n);
  animate(S, { kf: n }, { d: config.preview.stepD, e: 'io4' });
  setTheme(p.color, p.textColor, { d: config.preview.stepD });
  ruler?.setPagination(n, projects.length, p.color);
  home.swap(p);
}

function explore() {
  const p = projects[S.selected];
  if (p) navigate(`/${p.slug}/`);
}

function closeAbout() {
  // Back to wherever we came from inside the site, otherwise home.
  if (internalNavs > 0 && navFrom && navFrom.page !== 'about') history.back();
  else navigate('/');
}

// ---------------------------------------------------------------------------------------------
// Navigation

function onBeforePreparation(e: TransitionBeforePreparationEvent) {
  const from = currentPage();
  const to = pageFromPath(e.to.pathname);
  navFrom = from;
  const original = e.loader;
  e.loader = async () => {
    await Promise.all([original(), outro(from, to)]);
  };
}

async function outro(from: PageRef, to: PageRef): Promise<void> {
  const prevMode = mode;
  mode = 'busy';
  setCursor(false);
  focusHover = -1;
  const tasks: Promise<unknown>[] = [cornersOut(from.page, to.page)];

  if (from.page === 'home') {
    home?.hide().catch(() => undefined);
    ruler?.setVisible(false);
    const toSelected = to.page === 'project' && to.slug === projects[S.selected]?.slug;
    if (prevMode === 'preview' && toSelected) {
      // Explore: the preview plane morphs to where the project image will be.
      S.projectRect = null;
      slices?.upload(S.selected);
      tasks.push(animate(S, { project: 1 }, { d: config.project.exploreD, e: config.project.exploreE }).finished);
    } else {
      tasks.push(animate(S, { alpha: 0 }, { d: config.about.glFadeD, e: 'o3' }).finished);
      if (to.page === 'about') tasks.push(resetTheme({ d: config.about.glFadeD }));
    }
    tasks.push(new Promise((r) => setTimeout(r, 450))); // let the title leave
  } else if (from.page === 'project' && projectPage) {
    const page = projectPage;
    if (to.page === 'home') {
      tasks.push(page.outro({ toHome: true }).then(() => handBackToGL(page)));
    } else {
      tasks.push(page.outro({ toHome: false }));
      if (to.page === 'about') tasks.push(resetTheme({ d: config.about.glFadeD }));
    }
  } else if (from.page === 'about' && about) {
    tasks.push(about.outro());
  }

  await Promise.all(tasks);
}

/** Project page -> gallery: put the WebGL plane exactly over the DOM image, then hide the DOM image. */
function handBackToGL(page: ProjectPage): Promise<void> {
  if (!slices) return Promise.resolve();
  killTweens(S);
  S.projectRect = fromDomRect(page.mediaRect(), vp.w, vp.h);
  S.preview = 1;
  S.project = 1;
  S.kf = S.selected;
  S.selAlpha = 1;
  S.alpha = 1;
  slices.upload(S.selected);
  // Hide the DOM image right after the canvas has drawn the plane (same composited frame).
  return new Promise((resolve) => {
    let frames = 0;
    const fn = () => {
      if (++frames < 2) return;
      raf.remove(fn);
      page.waitImage();
      resolve();
    };
    raf.add(fn, 35);
  });
}

function onAfterSwap() {
  internalNavs++;
  applyTheme(); // <html> attributes were replaced by the new document's
  markNoWebGL();
  cursorOn = false; // class list was reset too
  const rulerEl = document.querySelector<HTMLElement>('[data-ruler]');
  if (rulerEl && ruler?.element !== rulerEl) ruler = new Ruler(rulerEl, projects.length);
  const page = currentPage();
  const corners = prepareCorners();
  preparePage(page);
  revealCorners(corners, 0.15);
  enterPage(page, navFrom);
}

/** Split / hide the new page's text before it is painted. */
function preparePage(page: PageRef) {
  projectPage?.destroy();
  home = null;
  projectPage = null;
  about = null;
  const main = document.getElementById('page');
  if (!main) return;
  if (page.page === 'home') {
    home = new HomeUI(main.querySelector<HTMLElement>('.preview') ?? main);
    bindProjectList(home);
  } else if (page.page === 'project') {
    const p = projects.find((x) => x.slug === page.slug);
    if (p) projectPage = new ProjectPage(main, p);
  } else if (page.page === 'about') {
    about = new AboutPage(main);
  }
}

function enterPage(page: PageRef, from: PageRef | null) {
  if (page.page === 'home') enterHome(from);
  else if (page.page === 'project') enterProject(page, from);
  else enterAbout();
}

function enterHome(from: PageRef | null) {
  ruler?.setVisible(true);
  if (from?.page === 'project' && slices && home) {
    // Coming back from a project: land in preview mode for that project.
    const p = projects[S.selected];
    mode = 'preview';
    target = S.scroll = centreScroll(S.selected, slices.dims);
    setTheme(p.color, p.textColor, { d: 0.4 });
    ruler?.setPagination(S.selected, projects.length, p.color);
    home.show(p, 0.35);
    animate(
      S,
      { project: 0 },
      {
        d: config.project.backD,
        e: 'io4',
        cb: () => (S.projectRect = null),
      },
    );
    return;
  }

  mode = 'gallery';
  killTweens(S);
  S.preview = 0;
  S.project = 0;
  S.selAlpha = 1;
  S.projectRect = null;
  resetTheme({ instant: !from });

  if (!from && slices) {
    // First load: slices rise in, staggered.
    S.alpha = 1;
    const it = config.gallery.intro;
    for (let i = 0; i < slices.count; i++) {
      const o = { v: 0 };
      const idx = i;
      animate(o, { v: 1 }, { d: it.d, e: it.e, delay: i * it.stagger, onUpdate: () => slices?.setIntro(idx, o.v) });
    }
  } else {
    animate(S, { alpha: 1 }, { d: config.about.glFadeD, e: 'o3' });
  }
}

async function enterProject(page: PageRef, from: PageRef | null) {
  const i = projects.findIndex((p) => p.slug === page.slug);
  if (i < 0 || !projectPage) return;
  const p = projects[i];
  const pp = projectPage;
  ruler?.setVisible(false);
  const fromPreview = from?.page === 'home' && S.selected === i && S.project > 0.99 && S.selAlpha > 0;

  if (fromPreview && slices) {
    // The plane is sitting where the image should be. Align precisely with the real DOM
    // rect, then let the <img> take over underneath the canvas.
    pp.waitImage();
    setTheme(p.color, p.textColor, { d: 0.3 });
    pp.intro({ fromPreview: true });
    const measured = fromDomRect(pp.mediaRect(), vp.w, vp.h);
    const start = projectRect(slices.dims);
    if (rectDistance(start, measured) > 1) {
      const o = { t: 0 };
      const tmp: Rect = { ...start };
      S.projectRect = tmp;
      await animate(o, { t: 1 }, { d: 0.45, e: 'io3', onUpdate: () => lerpRect(start, measured, o.t, tmp) }).finished;
    }
    S.projectRect = measured;
    await pp.ready();
    pp.showImage();
    await new Promise((r) => requestAnimationFrame(r));
    S.selAlpha = 0;
    S.projectRect = null;
  } else {
    killTweens(S);
    S.selected = i;
    S.kf = i;
    S.preview = 1;
    S.project = 1;
    S.selAlpha = 0;
    S.projectRect = null;
    setTheme(p.color, p.textColor, { instant: !from });
    pp.intro({ fromPreview: false });
  }
  mode = 'project';
}

function enterAbout() {
  mode = 'about';
  ruler?.setVisible(false);
  if (S.alpha > 0) animate(S, { alpha: 0 }, { d: config.about.glFadeD, e: 'o3' });
  resetTheme({ d: config.about.glFadeD });
  about?.intro();
}

/** Hidden project list: keyboard focus highlights the slice, Enter opens the preview. */
function bindProjectList(ui: HomeUI) {
  ui.links.forEach((a, i) => {
    a.addEventListener('focus', () => {
      focusHover = i;
      if (mode === 'gallery' && slices) target = centreScroll(i, slices.dims);
    });
    a.addEventListener('blur', () => {
      if (focusHover === i) focusHover = -1;
    });
    a.addEventListener('click', (e) => {
      if (mode === 'busy' || mode === 'loading') return e.preventDefault();
      if (mode === 'preview' && S.selected === i) return; // let the router navigate
      e.preventDefault();
      if (mode === 'gallery') openPreview(i);
      else if (mode === 'preview') stepPreview(i);
    });
  });
}

const rectDistance = (a: Rect, b: Rect) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));

