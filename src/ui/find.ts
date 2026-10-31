const MATCHES = 'mymd-find';
const CURRENT = 'mymd-find-current';
const BLOCKS = 'p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, td, th, summary, details, div, dd, dt';
// Sits between blocks in the joined text, so a match can't span them. It isn't whitespace, so \s+ stops at it.
const BLOCK_BREAK = '￼';

interface TextRun {
  node: Text;
  start: number;
}

function collectText(root: HTMLElement): { text: string; runs: TextRun[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const runs: TextRun[] = [];
  let text = '';
  let block: Element | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const nodeBlock: Element | null = node.parentElement?.closest(BLOCKS) ?? null;
    if (nodeBlock !== block) text += BLOCK_BREAK;
    block = nodeBlock;
    runs.push({ node: node as Text, start: text.length });
    text += node.textContent;
  }
  return { text, runs };
}

// Whitespace matches loosely, because a paragraph wrapped in its source renders on one line.
function queryPattern(query: string): RegExp {
  const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  // Case folding doesn't link the Turkish i letters, so they share one class.
  return new RegExp(literal.replace(/[iıIİ]/g, '[iıIİ]'), 'giu');
}

export function findRanges(root: HTMLElement, query: string): Range[] {
  if (query === '') return [];
  const { text, runs } = collectText(root);
  const ranges: Range[] = [];
  let first = 0;
  for (const match of text.matchAll(queryPattern(query))) {
    const end = match.index + match[0].length;
    while (first + 1 < runs.length && runs[first + 1].start <= match.index) first += 1;
    let last = first;
    while (last + 1 < runs.length && runs[last + 1].start < end) last += 1;
    const range = document.createRange();
    range.setStart(runs[first].node, match.index - runs[first].start);
    range.setEnd(runs[last].node, end - runs[last].start);
    ranges.push(range);
  }
  return ranges;
}

function openDetails(element: Element | null): void {
  const closed = () => element?.closest<HTMLDetailsElement>('details:not([open])');
  for (let details = closed(); details; details = closed()) details.open = true;
}

function reveal(range: Range, root: HTMLElement): void {
  const element = range.startContainer.parentElement;
  openDetails(element);
  const sideways = element?.closest('pre, .table-wrap');
  if (sideways) {
    const view = sideways.getBoundingClientRect();
    const box = range.getBoundingClientRect();
    if (box.left < view.left || box.right > view.right) sideways.scrollLeft += box.left - view.left - view.width / 2;
  }
  const scroller = root.parentElement;
  if (!scroller) return;
  const view = scroller.getBoundingClientRect();
  const box = range.getBoundingClientRect();
  if (box.top < view.top || box.bottom > view.bottom) scroller.scrollTop += box.top - view.top - view.height / 2;
}

export class FindController {
  private readonly root: HTMLElement;
  private readonly onChange: (index: number, total: number) => void;
  private query = '';
  private ranges: Range[] = [];
  private index = -1;

  constructor(root: HTMLElement, onChange: (index: number, total: number) => void) {
    this.root = root;
    this.onChange = onChange;
  }

  search(query: string): void {
    this.query = query;
    this.index = 0;
    this.update();
    this.revealCurrent();
  }

  next(): void {
    this.move(1);
  }

  previous(): void {
    this.move(-1);
  }

  refresh(): void {
    if (this.query) this.update();
  }

  clear(): void {
    this.query = '';
    this.ranges = [];
    this.index = -1;
    CSS.highlights.delete(MATCHES);
    CSS.highlights.delete(CURRENT);
  }

  private move(step: number): void {
    const total = this.ranges.length;
    if (total === 0) return;
    this.index = (this.index + step + total) % total;
    this.showCurrent();
    this.revealCurrent();
  }

  private update(): void {
    this.ranges = findRanges(this.root, this.query);
    const last = this.ranges.length - 1;
    this.index = last < 0 ? -1 : Math.min(Math.max(this.index, 0), last);
    const matches = new Highlight();
    for (const range of this.ranges) matches.add(range);
    CSS.highlights.set(MATCHES, matches);
    this.showCurrent();
  }

  private showCurrent(): void {
    const range = this.ranges[this.index];
    if (range) {
      const current = new Highlight(range);
      current.priority = 1;
      CSS.highlights.set(CURRENT, current);
    } else {
      CSS.highlights.delete(CURRENT);
    }
    this.onChange(this.index, this.ranges.length);
  }

  private revealCurrent(): void {
    const range = this.ranges[this.index];
    if (range) reveal(range, this.root);
  }
}
