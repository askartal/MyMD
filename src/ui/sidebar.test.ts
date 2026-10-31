import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSidebar, sidebarVisible } from './sidebar';

const files = [{ name: 'a.md', path: 'C:\\n\\a.md' }, { name: 'b.md', path: 'C:\\n\\b.md' }];
const items = [{ id: 'one', text: 'One', level: 1 as const }, { id: 'two', text: 'Two', level: 2 as const }];

describe('createSidebar', () => {
  let root: HTMLElement;
  const handlers = { onOpenFile: vi.fn(), onSelectHeading: vi.fn(), onViewChange: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    root = document.createElement('aside');
    document.body.replaceChildren(root);
  });

  it('marks one current file, matching path spelling loosely', () => {
    createSidebar(root, handlers).setFiles(files, 'c:/n/b.md');
    const current = root.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('b.md');
  });
  it('opens a clicked file', () => {
    createSidebar(root, handlers).setFiles(files, null);
    root.querySelectorAll<HTMLButtonElement>('[data-path]')[1].click();
    expect(handlers.onOpenFile).toHaveBeenCalledWith('C:\\n\\b.md');
  });
  it('moves focus with J, K and the arrow keys', () => {
    createSidebar(root, handlers).setFiles(files, null);
    const rows = root.querySelectorAll<HTMLButtonElement>('[data-path]');
    rows[0].focus();
    rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    expect(document.activeElement).toBe(rows[1]);
    rows[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(rows[0]);
  });
  it('shows one view at a time', () => {
    const sidebar = createSidebar(root, handlers);
    sidebar.setOutline(items);
    sidebar.setView('outline');
    expect(root.querySelector<HTMLElement>('[data-list="files"]')?.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-list="outline"]')?.hidden).toBe(false);
  });
  it('marks the current heading', () => {
    const sidebar = createSidebar(root, handlers);
    sidebar.setOutline(items);
    sidebar.setCurrentHeading('two');
    expect(root.querySelector('[aria-current="true"]')?.textContent).toContain('Two');
  });
  it('reports a view change and selects its tab', () => {
    createSidebar(root, handlers);
    const [filesTab, outlineTab] = root.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    outlineTab.click();
    expect(handlers.onViewChange).toHaveBeenCalledWith('outline');
    expect(outlineTab.getAttribute('aria-selected')).toBe('true');
    expect(filesTab.getAttribute('aria-selected')).toBe('false');
  });
  it('selects a heading from the outline', () => {
    const sidebar = createSidebar(root, handlers);
    sidebar.setOutline(items);
    root.querySelector<HTMLButtonElement>('[data-heading="two"]')?.click();
    expect(handlers.onSelectHeading).toHaveBeenCalledWith('two');
  });
  it('treats file names as text, not markup', () => {
    createSidebar(root, handlers).setFiles([{ name: '<img src=x>.md', path: 'C:\\n\\x.md' }], null);
    expect(root.querySelector('img')).toBeNull();
  });
  it('keeps the current file after the outline view changes it', () => {
    const sidebar = createSidebar(root, handlers);
    sidebar.setFiles(files, 'C:\\n\\a.md');
    sidebar.setOutline(items);
    sidebar.setCurrentHeading('one');
    sidebar.setView('outline');
    const current = root.querySelector<HTMLElement>('[data-list="files"] [aria-current="true"]');
    expect(current?.textContent).toContain('a.md');
  });
  it('keeps keyboard focus when the list is rebuilt', () => {
    const sidebar = createSidebar(root, handlers);
    sidebar.setFiles(files, null);
    root.querySelector<HTMLButtonElement>('[data-path="C:\\\\n\\\\b.md"]')?.focus();
    sidebar.setFiles([...files, { name: 'c.md', path: 'C:\\n\\c.md' }], null);
    expect((document.activeElement as HTMLElement).dataset.path).toBe('C:\\n\\b.md');
  });
  it('gives each list one tab stop, on the current row', () => {
    createSidebar(root, handlers).setFiles(files, 'C:\\n\\b.md');
    const rows = [...root.querySelectorAll<HTMLButtonElement>('[data-path]')];
    expect(rows.map((row) => row.tabIndex)).toEqual([-1, 0]);
  });
  it('falls back to the first row as the tab stop', () => {
    createSidebar(root, handlers).setFiles(files, null);
    const rows = [...root.querySelectorAll<HTMLButtonElement>('[data-path]')];
    expect(rows.map((row) => row.tabIndex)).toEqual([0, -1]);
  });
  it('says when a document has no headings', () => {
    createSidebar(root, handlers).setOutline([]);
    expect(root.querySelector('[data-list="outline"]')?.textContent).toBe('No headings in this file');
  });
  it('moves focus to the current row on request', () => {
    const sidebar = createSidebar(root, handlers);
    sidebar.setFiles(files, 'C:\\n\\b.md');
    sidebar.focus();
    expect(document.activeElement?.textContent).toBe('b.md');
  });
});

describe('sidebarVisible', () => {
  it.each([
    [true, 2, null, true],
    [true, 1, null, false],
    [false, 5, null, false],
    [false, 1, true, true],
    [true, 5, false, false],
  ])('remembered %s, %i files, override %s', (remembered, count, override, expected) => {
    expect(sidebarVisible(remembered, count, override)).toBe(expected);
  });
});
