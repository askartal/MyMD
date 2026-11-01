import { describe, expect, it, vi } from 'vitest';
import { buildOutline, currentHeadingId, scrollToHeading } from './outline';

function doc(html: string) {
  const root = document.createElement('article');
  root.innerHTML = html;
  return root;
}

describe('buildOutline', () => {
  it('lists H1 to H3 only', () => {
    expect(buildOutline(doc('<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4>')).map((i) => i.level)).toEqual([1, 2, 3]);
  });
  it('gives H4 an id for links even though it is not listed', () => {
    const root = doc('<h4>Deep part</h4>');
    buildOutline(root);
    expect(root.querySelector('h4')?.id).toBe('deep-part');
  });
  it('makes duplicate ids unique', () => {
    expect(buildOutline(doc('<h2>Setup</h2><h2>Setup</h2><h2>Setup</h2>')).map((i) => i.id)).toEqual(['setup', 'setup-1', 'setup-2']);
  });
  it('keeps Unicode letters', () => {
    expect(buildOutline(doc('<h2>İş Planı</h2>'))[0].id).toBe('İş Planı'.toLowerCase().replace(' ', '-'));
  });
  it('uses heading text without markup', () => expect(buildOutline(doc('<h2>Use <code>npm</code></h2>'))[0].text).toBe('Use npm'));
  it('names headings with no letters', () => expect(buildOutline(doc('<h2>***</h2>'))[0].id).toBe('section'));
});

describe('currentHeadingId', () => {
  it('returns the last heading at or above the reading line', () => {
    const root = doc('<h2>A</h2><h2>B</h2><h2>C</h2>');
    const items = buildOutline(root);
    const scroller = document.createElement('div');
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    const tops = [40, 110, 500];
    root.querySelectorAll('h2').forEach((h, i) => vi.spyOn(h, 'getBoundingClientRect').mockReturnValue({ top: tops[i] } as DOMRect));
    expect(currentHeadingId(items, root, scroller)).toBe('b');
  });
  it('returns null with no headings', () => {
    expect(currentHeadingId([], doc(''), document.createElement('div'))).toBeNull();
  });
});

describe('scrollToHeading', () => {
  Element.prototype.scrollIntoView = () => {};

  it('scrolls to a heading id', () => {
    const root = doc('<h2>Setup</h2>');
    buildOutline(root);
    const heading = root.querySelector('h2') as HTMLElement;
    const scroll = vi.spyOn(heading, 'scrollIntoView');
    scrollToHeading(root, 'setup');
    expect(scroll).toHaveBeenCalledOnce();
  });

  it('scrolls to an element id', () => {
    const root = doc('<p id="note">Here</p>');
    const paragraph = root.querySelector('p') as HTMLElement;
    const scroll = vi.spyOn(paragraph, 'scrollIntoView');
    scrollToHeading(root, 'note');
    expect(scroll).toHaveBeenCalledOnce();
  });

  it('scrolls to a named anchor', () => {
    const root = doc('<a name="note">Here</a>');
    const anchor = root.querySelector('a') as HTMLElement;
    const scroll = vi.spyOn(anchor, 'scrollIntoView');
    scrollToHeading(root, 'note');
    expect(scroll).toHaveBeenCalledOnce();
  });

  it('prefers the heading when another element reuses the id', () => {
    const root = doc('<h2>Setup</h2><p id="setup">x</p>');
    buildOutline(root);
    const heading = root.querySelector('h2') as HTMLElement;
    const paragraph = root.querySelector('p') as HTMLElement;
    const headingScroll = vi.spyOn(heading, 'scrollIntoView');
    const paragraphScroll = vi.spyOn(paragraph, 'scrollIntoView');
    scrollToHeading(root, 'setup');
    expect(headingScroll).toHaveBeenCalledOnce();
    expect(paragraphScroll).not.toHaveBeenCalled();
  });

  it('does nothing when nothing matches', () => {
    const root = doc('<p>Hi</p>');
    expect(() => scrollToHeading(root, 'missing')).not.toThrow();
  });
});
