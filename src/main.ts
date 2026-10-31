import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/app.css';
import './styles/prose.css';
import './styles/code.css';
import { createLatest, retryOnce } from './core/async';
import { applyLocalImages } from './core/images';
import { classifyLink, folderOf, isMarkdownPath, samePath } from './core/links';
import { buildOutline, currentHeadingId, scrollToHeading, type OutlineItem } from './core/outline';
import { linkNotice, noticeFor } from './core/notice';
import { renderMarkdown, stripFrontMatter } from './core/render';
import { wrapTables } from './core/tables';
import { bridge, type FileEntry } from './platform/bridge';
import { FindController } from './ui/find';
import { createSidebar, sidebarVisible } from './ui/sidebar';

interface OpenOptions {
  keepScroll?: boolean;
  fragment?: string | null;
  fromLink?: boolean;
}

const READ_RETRY_MS = 100;
const STATUS_MS = 4000;
const SIDEBAR_OPEN_KEY = 'mymd.sidebarOpen';
const SIDEBAR_VIEW_KEY = 'mymd.sidebarView';
const drawerQuery = window.matchMedia('(width < 768px)');

// Cached at startup, because headings in a document can reuse these ids.
function shellElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing shell element: ${id}`);
  return element as T;
}

const app = shellElement('app');
const sidebarElement = shellElement('sidebar');
const panel = shellElement('panel');
const toggleButton = shellElement('toggle-sidebar');
const docName = shellElement('doc-name');
const docStatus = shellElement('doc-status');
const scroller = shellElement('scroller');
const doc = shellElement('doc');
const notice = shellElement('notice');
const noticeTitle = shellElement('notice-title');
const noticeBody = shellElement('notice-body');
const noticeOpen = shellElement('notice-open');
const noticeHints = shellElement('notice-hints');
const findSlot = shellElement('find-slot');
const findInput = shellElement<HTMLInputElement>('find-input');
const findCount = shellElement('find-count');

const latest = createLatest();
const latestFiles = createLatest();
let currentPath: string | null = null;
let watchedFolder: string | null = null;
let outline: OutlineItem[] = [];
let fileCount = 0;
let sidebarOpen = recall(SIDEBAR_OPEN_KEY) !== 'false';
let sidebarOverride: boolean | null = null;
let drawerOpen = false;
let readingTop = 0;
let statusTimer = 0;
let loadsInFlight = 0;
let waitingChanges: string[] = [];

function recall(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked, and the app works without it.
  }
}

const sidebar = createSidebar(sidebarElement, {
  onOpenFile(path) {
    closeDrawer();
    void openDocument(path);
  },
  onSelectHeading(id) {
    closeDrawer();
    scrollToHeading(doc, id);
  },
  onViewChange(view) {
    remember(SIDEBAR_VIEW_KEY, view);
  },
});

const find = new FindController(doc, (index, total) => {
  findCount.textContent = index >= 0 ? `${index + 1} of ${total}` : findInput.value ? 'No matches' : '';
});

function focusDocument(): void {
  scroller.focus({ preventScroll: true, focusVisible: false });
}

function applySidebar(): void {
  const isDrawer = drawerQuery.matches;
  const visible = isDrawer ? drawerOpen : sidebarVisible(sidebarOpen, fileCount, sidebarOverride);
  panel.inert = isDrawer && visible;
  toggleButton.setAttribute('aria-expanded', String(visible));
  if (!visible && sidebarElement.contains(document.activeElement)) focusDocument();
  sidebarElement.hidden = !visible;
}

function toggleSidebar(): void {
  if (!currentPath) return;
  if (drawerQuery.matches) {
    drawerOpen = !drawerOpen;
  } else {
    sidebarOpen = !sidebarVisible(sidebarOpen, fileCount, sidebarOverride);
    sidebarOverride = sidebarOpen;
    remember(SIDEBAR_OPEN_KEY, String(sidebarOpen));
  }
  applySidebar();
  if (drawerOpen) sidebar.focus();
}

function closeDrawer(): void {
  drawerOpen = false;
  applySidebar();
}

function openFind(): void {
  if (!currentPath) return;
  closeDrawer();
  findSlot.hidden = false;
  findInput.focus();
  findInput.select();
}

function closeFind(): void {
  findSlot.hidden = true;
  findInput.value = '';
  findCount.textContent = '';
  find.clear();
  focusDocument();
}

function updateCurrentHeading(): void {
  sidebar.setCurrentHeading(currentHeadingId(outline, doc, scroller));
}

function listFiles(path: string): Promise<FileEntry[]> {
  return bridge.listFolder(folderOf(path)).catch(() => []);
}

async function refreshFiles(): Promise<void> {
  const path = currentPath;
  if (!path) return;
  const files = await latestFiles(() => listFiles(path));
  if (files && path === currentPath) sidebar.setFiles(files, path);
}

function watchFolderOf(path: string): void {
  const folder = folderOf(path);
  if (watchedFolder && samePath(watchedFolder, folder)) return;
  watchedFolder = folder;
  // A watcher failure is not shown, because the document stays readable.
  bridge.watchFolder(folder).catch(() => {
    watchedFolder = null;
  });
}

function setStatus(text: string): void {
  window.clearTimeout(statusTimer);
  docStatus.textContent = text;
}

function showBriefly(text: string): void {
  setStatus(text);
  statusTimer = window.setTimeout(() => setStatus(''), STATUS_MS);
}

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function setCurrentDocument(path: string, name: string): boolean {
  const isNew = !currentPath || !samePath(currentPath, path);
  if (isNew) {
    sidebarOverride = null;
    setStatus('');
  }
  currentPath = path;
  toggleButton.hidden = false;
  docName.textContent = name;
  void bridge.setTitle(`${name} - MyMD`);
  watchFolderOf(path);
  return isNew;
}

function showContent(content: DocumentFragment): void {
  doc.replaceChildren(content);
  doc.hidden = false;
  notice.hidden = true;
  outline = buildOutline(doc);
  sidebar.setOutline(outline);
  find.refresh();
}

function showNotice({ title, body }: { title: string; body: string }): void {
  if (!doc.hidden) readingTop = scroller.scrollTop;
  doc.hidden = true;
  doc.replaceChildren();
  outline = [];
  sidebar.setOutline(outline);
  find.refresh();
  noticeTitle.textContent = title;
  noticeBody.textContent = body;
  noticeBody.hidden = !body;
  noticeHints.hidden = true;
  notice.hidden = false;
}

// Arrow keys and Page Down need focus inside the scroller.
function restoreFocus(): void {
  if (document.activeElement === document.body) focusDocument();
}

async function loadDocument(path: string) {
  const data = await retryOnce(() => bridge.readDocument(path), READ_RETRY_MS);
  const template = document.createElement('template');
  template.innerHTML = renderMarkdown(data.text);
  wrapTables(template.content);
  await bridge.allowImages(applyLocalImages(template.content, data.path, bridge.imageUrl));
  return { data, content: template.content, files: await listFiles(data.path) };
}

function showDocument({ data, content, files }: Awaited<ReturnType<typeof loadDocument>>, options: OpenOptions): void {
  const scrollTop = doc.hidden ? readingTop : scroller.scrollTop;
  // The sidebar's start state is set once per document, so a refresh never moves the page.
  if (setCurrentDocument(data.path, data.name)) fileCount = files.length;
  if (stripFrontMatter(data.text).trim() === '') showNotice({ title: 'This file is empty.', body: '' });
  else showContent(content);
  sidebar.setFiles(files, data.path);
  applySidebar();
  scroller.scrollTop = options.keepScroll ? scrollTop : 0;
  if (options.fragment) scrollToHeading(doc, options.fragment);
  updateCurrentHeading();
  restoreFocus();
}

function showFailure(path: string, error: unknown): void {
  const name = fileNameOf(path);
  // With nothing to read, the sidebar follows the remembered choice so other files stay in reach.
  if (setCurrentDocument(path, name)) sidebarOverride = sidebarOpen;
  setStatus('');
  showNotice(noticeFor(error, name));
  applySidebar();
  restoreFocus();
  void refreshFiles();
}

async function openDocument(path: string, options: OpenOptions = {}): Promise<void> {
  loadsInFlight += 1;
  try {
    const loaded = await latest(() => loadDocument(path));
    if (loaded) showDocument(loaded, options);
  } catch (error) {
    // With no history to go back through, a dead link leaves the reader on their page.
    if (options.fromLink) showBriefly(linkNotice(fileNameOf(path)));
    else showFailure(path, error);
  } finally {
    loadsInFlight -= 1;
    if (loadsInFlight === 0 && waitingChanges.length > 0) {
      const paths = waitingChanges;
      waitingChanges = [];
      handleFolderChange(paths);
    }
  }
}

async function refreshDocument(path: string): Promise<void> {
  await openDocument(path, { keepScroll: true });
  if (!doc.hidden && currentPath && samePath(currentPath, path)) showBriefly('Updated just now');
}

function handleFolderChange(paths: string[]): void {
  const path = currentPath;
  if (!path) return;
  if (paths.some((changed) => samePath(changed, path))) void refreshDocument(path);
  else void refreshFiles();
}

function openFirstMarkdown(paths: string[]): void {
  const path = paths.find(isMarkdownPath);
  if (path) void openDocument(path);
}

async function pickAndOpen(): Promise<void> {
  const path = await bridge.pickFile();
  if (path) await openDocument(path);
}

function followLink(link: Element): void {
  if (!currentPath) return;
  const action = classifyLink(link.getAttribute('href') ?? '', currentPath);
  if (action.kind === 'anchor') scrollToHeading(doc, action.fragment);
  if (action.kind === 'external') void bridge.openExternal(action.url);
  if (action.kind === 'document') void openDocument(action.path, { fragment: action.fragment, fromLink: true });
}

function showMissingImage(image: HTMLImageElement): void {
  const missing = document.createElement('span');
  missing.className = 'img-missing';
  missing.textContent = image.alt || 'Image not available';
  image.replaceWith(missing);
}

function isBlockedKey(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return key === 'f3' || key === 'f5' || (event.ctrlKey && ['g', 'p', 'r'].includes(key));
}

let scrollFrame = 0;

scroller.addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    updateCurrentHeading();
  });
}, { passive: true });

doc.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('a, area') : null;
  if (!link) return;
  event.preventDefault();
  followLink(link);
});

doc.addEventListener('auxclick', (event) => event.preventDefault());

doc.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement) showMissingImage(event.target);
}, true);

findInput.addEventListener('input', () => find.search(findInput.value));

findInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  if (event.shiftKey) find.previous();
  else find.next();
});

noticeOpen.addEventListener('click', () => void pickAndOpen());
toggleButton.addEventListener('click', toggleSidebar);

// The panel is inert under the drawer, so a click beside it lands on the app.
app.addEventListener('click', (event) => {
  if (event.target === app) closeDrawer();
});

drawerQuery.addEventListener('change', closeDrawer);

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (isBlockedKey(event)) event.preventDefault();
  if (event.key === 'Escape') {
    if (drawerOpen) closeDrawer();
    else if (!findSlot.hidden) closeFind();
  }
  if (!event.ctrlKey) return;
  if (key === 'o') {
    event.preventDefault();
    void pickAndOpen();
  }
  if (key === 'b') {
    event.preventDefault();
    toggleSidebar();
  }
  if (key === 'f') {
    event.preventDefault();
    openFind();
  }
});

window.addEventListener('contextmenu', (event) => {
  if (!window.getSelection()?.toString()) event.preventDefault();
});

bridge.onOpenPath((path) => openFirstMarkdown([path]));
bridge.onFileDrop(openFirstMarkdown);

// Changes wait for any load in flight, so a save can't cancel a newer open and bursts coalesce.
bridge.onFolderChanged((paths) => {
  if (loadsInFlight > 0) waitingChanges.push(...paths);
  else handleFolderChange(paths);
});

async function start(): Promise<void> {
  if (bridge.isBrowser) document.documentElement.dataset.shell = 'browser';
  sidebar.setView(recall(SIDEBAR_VIEW_KEY) === 'outline' ? 'outline' : 'files');
  try {
    const path = await bridge.initialPath();
    if (path) await openDocument(path);
  } finally {
    await bridge.showWindow();
  }
}

void start();
