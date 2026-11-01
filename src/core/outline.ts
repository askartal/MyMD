export interface OutlineItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const READING_LINE = 24;

function headingsIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(HEADINGS)];
}

function slug(text: string): string {
  const id = text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-');
  return id || 'section';
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 1; used.has(id); n += 1) id = `${base}-${n}`;
  used.add(id);
  return id;
}

export function buildOutline(root: HTMLElement): OutlineItem[] {
  const used = new Set<string>();
  const items: OutlineItem[] = [];
  for (const heading of headingsIn(root)) {
    const text = (heading.textContent ?? '').replace(/\s+/g, ' ').trim();
    heading.id = uniqueId(slug(text), used);
    const level = Number(heading.tagName[1]);
    if (level === 1 || level === 2 || level === 3) items.push({ id: heading.id, text, level });
  }
  return items;
}

export function currentHeadingId(items: OutlineItem[], root: HTMLElement, scroller: HTMLElement): string | null {
  if (items.length === 0) return null;
  const line = scroller.getBoundingClientRect().top + READING_LINE;
  const headings = new Map(headingsIn(root).map((heading) => [heading.id, heading]));
  let current = items[0].id;
  for (const item of items) {
    const heading = headings.get(item.id);
    if (!heading || heading.getBoundingClientRect().top > line) break;
    current = item.id;
  }
  return current;
}

export function scrollToHeading(root: HTMLElement, id: string): void {
  if (!id) return;
  const target = headingsIn(root).find((heading) => heading.id === id)
    ?? [...root.querySelectorAll<HTMLElement>('[id]')].find((element) => element.id === id)
    ?? [...root.querySelectorAll<HTMLElement>('a[name]')].find((anchor) => anchor.getAttribute('name') === id);
  target?.scrollIntoView();
}
