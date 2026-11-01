import { beforeEach, describe, expect, it, vi } from 'vitest';
import shell from '../index.html?raw';

const fake = vi.hoisted(() => {
  const documents = new Map<string, string>();
  const held = new Map<string, () => void>();
  const holdNext = new Set<string>();
  const media = { matches: false, addEventListener: () => {} };
  const handlers: {
    folderChanged: (paths: string[]) => void;
    openPath: (path: string) => void;
    fileDrop: (paths: string[]) => void;
  } = {
    folderChanged: () => {},
    openPath: () => {},
    fileDrop: () => {},
  };
  const nameOf = (path: string) => path.split('\\').pop() ?? path;
  const bridge = {
    isBrowser: false,
    showWindow: async () => {},
    setTitle: async () => {},
    initialPath: async () => 'C:\\n\\a.md',
    async readDocument(path: string) {
      const text = documents.get(path);
      if (holdNext.delete(path)) await new Promise<void>((resolve) => held.set(path, resolve));
      if (text === undefined) throw 'missing';
      return { name: nameOf(path), path, text };
    },
    listFolder: async () => [...documents.keys()].map((path) => ({ name: nameOf(path), path })),
    watchFolder: async () => {},
    allowImages: async () => {},
    imageUrl: (path: string) => path,
    pickFile: async (): Promise<string | null> => null,
    openExternal: async () => {},
    onOpenPath(handler: (path: string) => void) {
      handlers.openPath = handler;
    },
    onFolderChanged(handler: (paths: string[]) => void) {
      handlers.folderChanged = handler;
    },
    onFileDrop(handler: (paths: string[]) => void) {
      handlers.fileDrop = handler;
    },
  };
  return { documents, held, holdNext, handlers, bridge, media };
});

vi.mock('./platform/bridge', () => ({ bridge: fake.bridge }));

const A = 'C:\\n\\a.md';
const B = 'C:\\n\\b.md';

const element = (id: string) => document.getElementById(id) as HTMLElement;
const pageText = () => element('doc').textContent ?? '';
const row = (path: string) => document.querySelector<HTMLElement>(`[data-path="${path.replace(/\\/g, '\\\\')}"]`);
const release = (path: string) => fake.held.get(path)?.();

async function heldRead(path: string) {
  await vi.waitFor(() => expect(fake.held.has(path)).toBe(true));
}

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  fake.documents.clear();
  fake.held.clear();
  fake.holdNext.clear();
  fake.documents.set(A, '# Doc A');
  fake.documents.set(B, '# Doc B');
  vi.stubGlobal('Highlight', class extends Set<Range> {
    constructor(...ranges: Range[]) {
      super(ranges);
    }
  });
  vi.stubGlobal('CSS', { highlights: new Map() });
  Range.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0 }) as DOMRect;
  Element.prototype.scrollIntoView = vi.fn();
  fake.media.matches = false;
  fake.bridge.pickFile = async () => null;
  window.matchMedia = vi.fn().mockReturnValue(fake.media);
  const parsed = new DOMParser().parseFromString(shell, 'text/html');
  parsed.querySelector('script')?.remove();
  document.body.replaceChildren(...parsed.body.children);
  await import('./main');
  await vi.waitFor(() => expect(pageText()).toContain('Doc A'));
});

describe('a save while another file is opening', () => {
  it('does not cancel the file being opened', async () => {
    fake.holdNext.add(B);
    row(B)?.click();
    await heldRead(B);
    fake.handlers.folderChanged([A]);
    release(B);
    await vi.waitFor(() => expect(pageText()).toContain('Doc B'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(pageText()).toContain('Doc B');
    expect(element('doc-name').textContent).toBe('b.md');
  });

  it('refreshes the opened file if it changed meanwhile', async () => {
    fake.holdNext.add(B);
    row(B)?.click();
    await heldRead(B);
    fake.documents.set(B, '# Doc B again');
    fake.handlers.folderChanged([B]);
    release(B);
    await vi.waitFor(() => expect(pageText()).toContain('Doc B again'));
  });

  it('settles on the last save when saves outrun a slow read', async () => {
    fake.holdNext.add(A);
    fake.documents.set(A, '# Second');
    fake.handlers.folderChanged([A]);
    await heldRead(A);
    fake.documents.set(A, '# Third');
    fake.handlers.folderChanged([A]);
    fake.documents.set(A, '# Fourth');
    fake.handlers.folderChanged([A]);
    release(A);
    await vi.waitFor(() => expect(pageText()).toContain('Fourth'));
  });
});

describe('an older read', () => {
  it('never replaces a newer one', async () => {
    fake.holdNext.add(A);
    fake.documents.set(A, '# Old copy');
    fake.handlers.folderChanged([A]);
    await heldRead(A);
    row(B)?.click();
    await vi.waitFor(() => expect(pageText()).toContain('Doc B'));
    release(A);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(pageText()).toContain('Doc B');
  });
});

describe('a link to a file that is not there', () => {
  it('keeps the page and says what happened', async () => {
    const link = document.createElement('a');
    link.setAttribute('href', 'gone.md');
    element('doc').append(link);
    link.click();
    await vi.waitFor(() => expect(element('doc-status').textContent).toContain("gone.md couldn't be opened"));
    expect(pageText()).toContain('Doc A');
    expect(element('doc').hidden).toBe(false);
    expect(element('doc-name').textContent).toBe('a.md');
  });
});

describe('the open file going away', () => {
  it('shows the notice, keeps the sidebar, and returns to the same place', async () => {
    element('scroller').scrollTop = 40;
    fake.documents.delete(A);
    fake.handlers.folderChanged([A]);
    await vi.waitFor(() => expect(element('notice').hidden).toBe(false));
    expect(element('notice-title').textContent).toBe('This file was moved or deleted.');
    expect(element('sidebar').hidden).toBe(false);
    fake.documents.set(A, '# Doc A');
    fake.handlers.folderChanged([A]);
    await vi.waitFor(() => expect(pageText()).toContain('Doc A'));
    expect(element('notice').hidden).toBe(true);
    expect(element('scroller').scrollTop).toBe(40);
  });
});

describe('a different file', () => {
  it('opens at the top after the previous file remembered a scroll position', async () => {
    element('scroller').scrollTop = 40;
    fake.documents.delete(A);
    fake.handlers.folderChanged([A]);
    await vi.waitFor(() => expect(element('notice').hidden).toBe(false));
    fake.documents.set(B, '');
    row(B)?.click();
    await vi.waitFor(() => expect(element('notice-title').textContent).toBe('This file is empty.'));
    fake.documents.set(B, '# Doc B');
    fake.handlers.folderChanged([B]);
    await vi.waitFor(() => expect(pageText()).toContain('Doc B'));
    expect(element('scroller').scrollTop).toBe(0);
  });

  it('starts find at the first match', async () => {
    fake.documents.set(A, 'one one');
    fake.documents.set(B, 'one one');
    fake.handlers.folderChanged([A]);
    await vi.waitFor(() => expect(pageText()).toContain('one one'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    const input = element('find-input') as HTMLInputElement;
    input.value = 'one';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(element('find-count').textContent).toBe('2 of 2');
    row(B)?.click();
    await vi.waitFor(() => expect(element('doc-name').textContent).toBe('b.md'));
    expect(element('find-count').textContent).toBe('1 of 2');
  });
});

describe('the narrow sidebar', () => {
  async function openDrawer() {
    fake.media.matches = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    expect(element('sidebar').hidden).toBe(false);
  }

  it('closes when a file is picked', async () => {
    await openDrawer();
    fake.bridge.pickFile = async () => B;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true }));
    await vi.waitFor(() => expect(pageText()).toContain('Doc B'));
    expect(element('sidebar').hidden).toBe(true);
  });

  it('closes when a file is dropped', async () => {
    await openDrawer();
    fake.handlers.fileDrop([B]);
    await vi.waitFor(() => expect(pageText()).toContain('Doc B'));
    expect(element('sidebar').hidden).toBe(true);
  });

  it('closes when a second launch opens a file', async () => {
    await openDrawer();
    fake.handlers.openPath(B);
    await vi.waitFor(() => expect(pageText()).toContain('Doc B'));
    expect(element('sidebar').hidden).toBe(true);
  });

  it('stays open when the open file is saved', async () => {
    await openDrawer();
    fake.documents.set(A, '# Doc A saved');
    fake.handlers.folderChanged([A]);
    await vi.waitFor(() => expect(pageText()).toContain('Doc A saved'));
    expect(element('sidebar').hidden).toBe(false);
  });
});
