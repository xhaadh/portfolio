/**
 * Text splitting for masked reveals. Each piece is wrapped like:
 *
 *   <span class="char"><span class="char__in">A</span></span>    (overflow hidden, inline-block)
 *   <span class="line"><span class="line__in">...</span></span>  (overflow hidden, block)
 *
 * The inner span is what gets animated (translate3d(0, 110%, 0) -> 0).
 * The original text is kept in aria-label so screen readers read words, not letters.
 */

/** Split an element's text into characters. Returns the inner (animatable) spans. */
export function splitChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === 'chars') return Array.from(el.querySelectorAll<HTMLElement>('.char__in'));
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const frag = document.createDocumentFragment();
  for (const ch of text) {
    if (ch === ' ') {
      const s = document.createElement('span');
      s.className = 'char-space';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ' ';
      frag.appendChild(s);
      continue;
    }
    const outer = document.createElement('span');
    outer.className = 'char';
    outer.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'char__in';
    inner.textContent = ch;
    outer.appendChild(inner);
    frag.appendChild(outer);
  }
  el.appendChild(frag);
  el.dataset.split = 'chars';
  return Array.from(el.querySelectorAll<HTMLElement>('.char__in'));
}

/**
 * Split flowing text into visual lines (measured after layout, so fonts must be loaded).
 * Returns the inner spans, one per line.
 */
export function splitLines(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === 'lines') return Array.from(el.querySelectorAll<HTMLElement>(':scope > .line > .line__in'));
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  el.textContent = '';
  const words = text.split(' ').map((w) => {
    const s = document.createElement('span');
    s.textContent = w;
    s.style.display = 'inline-block';
    el.appendChild(s);
    el.appendChild(document.createTextNode(' '));
    return s;
  });
  const lines: string[][] = [];
  let lastTop = -Infinity;
  for (const w of words) {
    const top = w.offsetTop;
    if (Math.abs(top - lastTop) > 2) {
      lines.push([]);
      lastTop = top;
    }
    lines[lines.length - 1].push(w.textContent || '');
  }
  el.textContent = '';
  for (const line of lines) el.appendChild(mask(line.join(' ')));
  el.dataset.split = 'lines';
  return Array.from(el.querySelectorAll<HTMLElement>(':scope > .line > .line__in'));
}

/** Wrap an element's existing content in a single line mask. Returns the inner span. */
export function wrapLine(el: HTMLElement): HTMLElement {
  if (el.dataset.split === 'line') return el.querySelector<HTMLElement>(':scope > .line > .line__in')!;
  const outer = document.createElement('span');
  outer.className = 'line';
  const inner = document.createElement('span');
  inner.className = 'line__in';
  while (el.firstChild) inner.appendChild(el.firstChild);
  outer.appendChild(inner);
  el.appendChild(outer);
  el.dataset.split = 'line';
  return inner;
}

function mask(text: string): HTMLElement {
  const outer = document.createElement('span');
  outer.className = 'line';
  const inner = document.createElement('span');
  inner.className = 'line__in';
  inner.textContent = text;
  outer.appendChild(inner);
  return outer;
}
