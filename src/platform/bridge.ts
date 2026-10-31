import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';

export interface DocumentData {
  name: string;
  path: string;
  text: string;
}

export interface FileEntry {
  name: string;
  path: string;
}

export interface Bridge {
  isBrowser: boolean;
  showWindow(): Promise<void>;
  setTitle(title: string): Promise<void>;
  initialPath(): Promise<string | null>;
  readDocument(path: string): Promise<DocumentData>;
  listFolder(folder: string): Promise<FileEntry[]>;
  watchFolder(folder: string): Promise<void>;
  allowImages(paths: string[]): Promise<void>;
  imageUrl(path: string): string;
  pickFile(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  onOpenPath(handler: (path: string) => void): void;
  onFolderChanged(handler: (paths: string[]) => void): void;
  onFileDrop(handler: (paths: string[]) => void): void;
}

const tauriBridge: Bridge = {
  isBrowser: false,
  showWindow: () => getCurrentWindow().show(),
  setTitle: (title) => getCurrentWindow().setTitle(title),
  initialPath: () => invoke('initial_path'),
  readDocument: (path) => invoke('read_document', { path }),
  listFolder: (folder) => invoke('list_folder', { path: folder }),
  watchFolder: (folder) => invoke('watch_folder', { path: folder }),
  allowImages: (paths) => invoke('allow_images', { paths }),
  imageUrl: (path) => convertFileSrc(path),
  pickFile: () => open({ filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }] }),
  openExternal: (url) => openUrl(url),
  onOpenPath(handler) {
    void listen<string>('open-path', (event) => handler(event.payload));
  },
  onFolderChanged(handler) {
    void listen<string[]>('folder-changed', (event) => handler(event.payload));
  },
  onFileDrop(handler) {
    void getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'drop') handler(event.payload.paths);
    });
  },
};

async function loadFixtures() {
  if (!import.meta.env.DEV) throw new Error('Fixtures exist only in development builds.');
  return import('./fixtures');
}

// Fixtures let the interface run in a normal browser for layout checks.
const browserBridge: Bridge = {
  isBrowser: true,
  showWindow: async () => {},
  async setTitle(title) {
    document.title = title;
  },
  async initialPath() {
    if (new URLSearchParams(location.search).has('empty')) return null;
    return (await loadFixtures()).fixtures[0].path;
  },
  async readDocument(path) {
    const { fixtures } = await loadFixtures();
    const found = fixtures.find((fixture) => fixture.path.toLowerCase() === path.toLowerCase());
    if (!found) throw 'missing';
    return found;
  },
  async listFolder() {
    const { fixtures } = await loadFixtures();
    return fixtures.map(({ name, path }) => ({ name, path }));
  },
  watchFolder: async () => {},
  allowImages: async () => {},
  imageUrl: (path) => `/fixture-images/${encodeURIComponent(path)}`,
  async pickFile() {
    return (await loadFixtures()).fixtures[1].path;
  },
  async openExternal(url) {
    window.open(url, '_blank', 'noopener');
  },
  onOpenPath: () => {},
  onFolderChanged: () => {},
  onFileDrop: () => {},
};

export const bridge = '__TAURI_INTERNALS__' in window ? tauriBridge : browserBridge;
