import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FindController, findRanges } from './find';

function doc(html: string) {
  const root = document.createElement('article');
  root.innerHTML = html;
  return root;
}

describe('findRanges', () => {
  it('ignores case', () => expect(findRanges(doc('<p>Note note NOTE</p>'), 'note')).toHaveLength(3));
  it('matches across inline elements', () => {
    const [range] = findRanges(doc('<p>foo <b>bar</b> baz</p>'), 'oo ba');
    expect(range.toString()).toBe('oo ba');
  });
  it('stays accurate after letters that change length when lowercased', () => {
    const [range] = findRanges(doc('<p>İİİ sokak</p>'), 'sokak');
    expect(range.toString()).toBe('sokak');
  });
  it('treats punctuation literally', () => expect(findRanges(doc('<p>a.b axb</p>'), 'a.b')).toHaveLength(1));
  it('accepts every regular expression character', () => {
    expect(findRanges(doc('<p>a-b/(c)[d]{e}^$|\\*+?</p>'), 'a-b/(c)[d]{e}^$|\\*+?')).toHaveLength(1);
  });
  it('returns nothing for an empty query', () => expect(findRanges(doc('<p>a</p>'), '')).toEqual([]));
  it('does not match across block boundaries', () => {
    expect(findRanges(doc('<p>end</p><p>start</p>'), 'endstart')).toEqual([]);
    expect(findRanges(doc('<p>end</p><p>start</p>'), 'end start')).toEqual([]);
  });
  it('matches a phrase wrapped across source lines', () => {
    expect(findRanges(doc('<p>one\ntwo</p>'), 'one two')).toHaveLength(1);
  });
  it('finds every match in a long run of text nodes', () => {
    expect(findRanges(doc('<b>a</b><i>a</i>a<b>a</b>'), 'a')).toHaveLength(4);
  });
  it('treats the Turkish i letters as one letter', () => {
    expect(findRanges(doc('<p>İş planı</p>'), 'iş')).toHaveLength(1);
    expect(findRanges(doc('<p>İstanbul</p>'), 'istanbul')).toHaveLength(1);
    expect(findRanges(doc('<p>planı</p>'), 'PLANI')).toHaveLength(1);
  });
});

describe('FindController', () => {
  const onChange = vi.fn();
  let root: HTMLElement;
  let scroller: HTMLElement;

  beforeEach(() => {
    onChange.mockClear();
    vi.stubGlobal('Highlight', class extends Set<Range> {
      constructor(...ranges: Range[]) {
        super(ranges);
      }
    });
    vi.stubGlobal('CSS', { highlights: new Map() });
    // jsdom does no layout, so every match reads as sitting far below the view.
    Range.prototype.getBoundingClientRect = () => ({ top: 500, bottom: 520, left: 0, right: 10 }) as DOMRect;
    root = doc('<p>one two one two one</p>');
    scroller = document.createElement('div');
    scroller.append(root);
    document.body.replaceChildren(scroller);
  });

  it('reports the first match', () => {
    new FindController(root, onChange).search('one');
    expect(onChange).toHaveBeenLastCalledWith(0, 3);
  });
  it('highlights every match and the current one', () => {
    new FindController(root, onChange).search('one');
    expect(CSS.highlights.get('mymd-find')?.size).toBe(3);
    expect(CSS.highlights.get('mymd-find-current')?.size).toBe(1);
  });
  it('wraps forwards and backwards', () => {
    const find = new FindController(root, onChange);
    find.search('one');
    find.previous();
    expect(onChange).toHaveBeenLastCalledWith(2, 3);
    find.next();
    expect(onChange).toHaveBeenLastCalledWith(0, 3);
  });
  it('reports no matches', () => {
    new FindController(root, onChange).search('nothing');
    expect(onChange).toHaveBeenLastCalledWith(-1, 0);
  });
  it('scrolls to the current match', () => {
    new FindController(root, onChange).search('one');
    expect(scroller.scrollTop).not.toBe(0);
  });
  it('opens a closed details block holding the current match', () => {
    root.innerHTML = '<details><summary>s</summary>one</details>';
    new FindController(root, onChange).search('one');
    expect(root.querySelector('details')?.open).toBe(true);
  });
  it('keeps the position across a refresh', () => {
    const find = new FindController(root, onChange);
    find.search('one');
    find.next();
    root.innerHTML = '<p>one two one two one four</p>';
    find.refresh();
    expect(onChange).toHaveBeenLastCalledWith(1, 3);
  });
  it('clamps the position when matches disappear', () => {
    const find = new FindController(root, onChange);
    find.search('one');
    find.previous();
    root.innerHTML = '<p>one two</p>';
    find.refresh();
    expect(onChange).toHaveBeenLastCalledWith(0, 1);
  });
  it('finds matches again after they all disappear', () => {
    const find = new FindController(root, onChange);
    find.search('one');
    root.innerHTML = '<p>nothing here</p>';
    find.refresh();
    expect(onChange).toHaveBeenLastCalledWith(-1, 0);
    root.innerHTML = '<p>one two one</p>';
    find.refresh();
    expect(onChange).toHaveBeenLastCalledWith(0, 2);
  });
  it('leaves the reading position alone on refresh', () => {
    const find = new FindController(root, onChange);
    find.search('one');
    scroller.scrollTop = 0;
    find.refresh();
    expect(scroller.scrollTop).toBe(0);
  });
  it('removes the highlights on clear', () => {
    const find = new FindController(root, onChange);
    find.search('one');
    find.clear();
    expect(CSS.highlights.size).toBe(0);
  });
  it('does nothing on refresh after clear', () => {
    const find = new FindController(root, onChange);
    find.search('one');
    find.clear();
    onChange.mockClear();
    find.refresh();
    expect(onChange).not.toHaveBeenCalled();
  });
});
