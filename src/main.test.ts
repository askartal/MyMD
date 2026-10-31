import { beforeEach, describe, expect, it, vi } from 'vitest';
import shell from '../index.html?raw';

const fake = vi.hoisted(() => {
  const documents = new Map<string, string>();
  const held = new Map<string, () => void>();
  const holdNext = new Set<string>();
  const handlers: { folderChanged: (paths: string[]) => void } = { folderChanged: () => {} };
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
    pickFile: async () => null,
    openExternal: async () => {},
    onOpenPath: () => {},
    onFolderChanged(handler: (paths: string[]) => void) {
      handlers.folderChanged = handler;
    },
    onFileDrop: () => {},
  };
  return { documents, held, holdNext, handlers, bridge };
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
  vi.stubGlobal('Highlight', class extends Set<Range> {});
  vi.stubGlobal('CSS', { highlights: new Map() });
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() });
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
