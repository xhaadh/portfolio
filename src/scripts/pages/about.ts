/**
 * About page: giant two-line heading (char reveal + hover scramble) and the clients / awards
 * columns (line-by-line masked reveal).
 */
import { config } from '../config';
import { conceal, hide, reveal } from '../ui/reveal';
import { scramble } from '../ui/scramble';
import { splitChars, wrapLine } from '../ui/splitText';

export class AboutPage {
  private headingChars: HTMLElement[][];
  private lines: HTMLElement[];

  constructor(root: HTMLElement) {
    const headingLines = Array.from(root.querySelectorAll<HTMLElement>('.about__heading-line'));
    this.headingChars = headingLines.map(splitChars);
    this.lines = Array.from(root.querySelectorAll<HTMLElement>('.about__cols [data-line]')).map(wrapLine);

    hide(this.headingChars.flat());
    hide(this.lines);

    headingLines.forEach((line, i) => {
      line.addEventListener('mouseenter', () => scramble(this.headingChars[i]));
    });
  }

  intro() {
    reveal(this.headingChars.flat(), { stagger: config.reveal.charStagger, delay: 0.1 });
    reveal(this.lines, { stagger: config.about.lineStagger, delay: 0.3 });
  }

  outro() {
    return Promise.all([
      conceal(this.headingChars.flat(), { stagger: 0.012 }),
      conceal(this.lines, { stagger: 0.004 }),
    ]);
  }
}
