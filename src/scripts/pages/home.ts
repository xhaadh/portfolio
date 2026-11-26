/**
 * Home page DOM layer: the giant split title + "Explore" block shown in preview mode, and the
 * hidden (screen-reader / keyboard) project list.
 *
 * The title is rendered twice with identical letter positions:
 *   .ptitle--back  (z 5)  below the WebGL canvas (z 10) -> hidden by the image where they overlap
 *   .ptitle--front (z 20) above the canvas, but only some letters are visible
 * so some letters appear in front of the image and some behind it.
 */
import { config } from '../config';
import { seeded } from '../motion/math';
import { conceal, hide, reveal } from '../ui/reveal';
import { splitLines, wrapLine } from '../ui/splitText';
import { vp } from '../utils/viewport';
import type { ClientProject } from '../utils/data';

interface Letter {
  back: HTMLElement;
  front: HTMLElement;
  backIn: HTMLElement;
  frontIn: HTMLElement;
  /** Starts a new spaced-out group. */
  brk: boolean;
  /** Extra gap weight before this letter (a real space in the title). */
  space: boolean;
}

export class HomeUI {
  private back: HTMLElement;
  private front: HTMLElement;
  private explore: HTMLAnchorElement;
  private plus: HTMLAnchorElement | null;
  private metaList: HTMLElement | null;
  private metaDesc: HTMLElement | null;
  private metaParts: HTMLElement[] = [];
  private exploreParts: HTMLElement[];
  private letters: Letter[] = [];
  private project: ClientProject | null = null;
  private token = 0;
  readonly links: HTMLAnchorElement[];

  constructor(private root: HTMLElement) {
    this.back = root.querySelector<HTMLElement>('.ptitle--back')!;
    this.front = root.querySelector<HTMLElement>('.ptitle--front')!;
    this.explore = root.querySelector<HTMLAnchorElement>('#explore')!;
    this.plus = root.querySelector<HTMLAnchorElement>('.pexplore__plus');
    this.metaList = root.querySelector<HTMLElement>('.pmeta__list');
    this.metaDesc = root.querySelector<HTMLElement>('.pmeta__desc');
    this.exploreParts = Array.from(root.querySelectorAll<HTMLElement>('.pexplore .ulink__in, .pexplore [data-mask-in]'));
    this.links = Array.from(document.querySelectorAll<HTMLAnchorElement>('#project-list a'));
    hide(this.exploreParts);
  }

  get current() {
    return this.project;
  }

  private build(p: ClientProject) {
    const rng = seeded(p.slug);
    this.back.textContent = '';
    this.front.textContent = '';
    this.letters = [];
    let pendingSpace = false;
    let count = 0;
    for (const ch of p.title) {
      if (!ch.trim()) {
        pendingSpace = true;
        continue;
      }
      const make = (layer: HTMLElement) => {
        const o = document.createElement('span');
        o.className = 'pchar';
        const i = document.createElement('span');
        i.className = 'pchar__in';
        i.textContent = ch;
        o.appendChild(i);
        layer.appendChild(o);
        return [o, i] as const;
      };
      const [back, backIn] = make(this.back);
      const [front, frontIn] = make(this.front);
      if (rng() > config.preview.title.frontRatio) front.classList.add('is-ghost');
      // Irregular grouping: ~half of the letters start a new group ("C  AN  A LS").
      const brk = count > 0 && (pendingSpace || rng() < 0.58);
      this.letters.push({ back, front, backIn, frontIn, brk, space: pendingSpace });
      pendingSpace = false;
      count++;
    }
    // Make sure there are at least two gaps for short titles.
    if (this.letters.length > 2 && this.letters.filter((l) => l.brk).length < 2) {
      this.letters.forEach((l, i) => i > 0 && (l.brk = true));
    }
    this.root.style.setProperty('--ptitle-scale', '1');
    this.layout();
    hide(this.letters.flatMap((l) => [l.backIn, l.frontIn]));
  }

  /** Position letters across the width with irregular gaps (stable per project). */
  layout() {
    const p = this.project;
    if (!p || !this.letters.length) return;
    const rng = seeded(`${p.slug}:gaps`);
    const vw = vp.w;
    const containerW = vw * (vp.mobile ? 0.9 : 0.66);

    this.root.style.setProperty('--ptitle-scale', '1');
    let widths = this.letters.map((l) => l.back.offsetWidth);
    let sum = widths.reduce((a, b) => a + b, 0);
    // Long titles: shrink so letters still leave room for gaps.
    const maxFill = 0.72;
    if (sum > containerW * maxFill) {
      const scale = (containerW * maxFill) / sum;
      this.root.style.setProperty('--ptitle-scale', scale.toFixed(4));
      widths = widths.map((w) => w * scale);
      sum *= scale;
    }

    const weights = this.letters.map((l) => (l.brk ? 0.55 + rng() * 0.9 + (l.space ? 0.6 : 0) : 0));
    const wSum = weights.reduce((a, b) => a + b, 0) || 1;
    const free = Math.max(containerW - sum, 0);
    // Reference title sits slightly left of centre (13% -> 78% of the width).
    const offset = vp.mobile ? 0 : (-0.04 + (rng() - 0.5) * 0.04) * vw;
    let x = (vw - containerW) / 2 + offset;
    this.letters.forEach((l, i) => {
      x += (free * weights[i]) / wSum;
      const left = `${x.toFixed(1)}px`;
      l.back.style.left = left;
      l.front.style.left = left;
      x += widths[i];
    });
  }

  private setLinks(p: ClientProject) {
    this.explore.href = `/${p.slug}/`;
    this.explore.setAttribute('aria-label', `Explore ${p.titleMixedCase}`);
    if (this.plus) this.plus.href = `/${p.slug}/`;
  }

  /** Fill the bottom details row (A completed / B type / C role + description). */
  private buildMeta(p: ClientProject) {
    if (!this.metaList || !this.metaDesc) return;
    this.metaList.textContent = '';
    const rows: [string, string, string][] = [
      ['A', 'Completed', p.completed],
      ['B', 'Type', p.type],
      ['C', 'Role', p.role],
    ];
    const parts: HTMLElement[] = [];
    for (const [k, label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'pmeta__row';
      for (const [cls, text] of [
        ['pmeta__k', k],
        ['pmeta__l', label],
        ['pmeta__v', value],
      ]) {
        const cell = document.createElement('span');
        cell.className = cls;
        cell.textContent = text;
        row.appendChild(cell);
        parts.push(wrapLine(cell));
      }
      this.metaList.appendChild(row);
    }
    this.metaDesc.textContent = p.description;
    delete this.metaDesc.dataset.split;
    parts.push(...splitLines(this.metaDesc));
    this.metaParts = parts;
    hide(parts);
  }

  show(p: ClientProject, delay = 0) {
    ++this.token;
    this.project = p;
    this.build(p);
    this.setLinks(p);
    this.root.classList.add('is-active');
    this.buildMeta(p);
    const t = config.preview.title;
    const o = { d: t.d, e: t.e, stagger: t.stagger, delay };
    reveal(this.letters.map((l) => l.backIn), o);
    reveal(this.letters.map((l) => l.frontIn), o);
    reveal(this.exploreParts, { delay: delay + 0.35, stagger: 0.08 });
    reveal(this.metaParts, { delay: delay + 0.45, stagger: 0.02 });
  }

  /** Swap the title to another project (prev / next inside preview). */
  async swap(p: ClientProject) {
    const tk = ++this.token;
    const t = config.preview.title;
    const o = { d: 0.45, e: t.outE, stagger: 0.015 };
    await Promise.all([
      conceal(this.letters.map((l) => l.backIn), o),
      conceal(this.letters.map((l) => l.frontIn), o),
      conceal(this.metaParts, { d: 0.45, stagger: 0.008 }),
    ]);
    if (tk !== this.token) return;
    this.project = p;
    this.build(p);
    this.setLinks(p);
    this.buildMeta(p);
    const r = { d: t.d, e: t.e, stagger: t.stagger, delay: 0.05 };
    reveal(this.letters.map((l) => l.backIn), r);
    reveal(this.letters.map((l) => l.frontIn), r);
    reveal(this.metaParts, { delay: 0.2, stagger: 0.02 });
  }

  async hide() {
    const tk = ++this.token;
    const t = config.preview.title;
    const o = { d: t.outD, e: t.outE, stagger: 0.015 };
    await Promise.all([
      conceal(this.letters.map((l) => l.backIn), o),
      conceal(this.letters.map((l) => l.frontIn), o),
      conceal(this.exploreParts, { stagger: 0.05 }),
      conceal(this.metaParts, { stagger: 0.008 }),
    ]);
    if (tk === this.token) this.root.classList.remove('is-active');
  }
}
