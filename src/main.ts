import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/app.css';
import './styles/prose.css';
import './styles/code.css';
import { createLatest, retryOnce } from './core/async';
import { applyLocalImages } from './core/images';
import { classifyLink, folderOf, isMarkdownPath, samePath } from './core/links';
import { buildOutline, currentHeadingId, scrollToHeading, type OutlineItem } from './core/outline';
import { renderMarkdown } from './core/render';
import { wrapTables } from './core/tables';
import { bridge, type FileEntry } from './platform/bridge';
import { FindController } from './ui/find';
import { createSidebar, sidebarVisible } from './ui/sidebar';

const READ_RETRY_MS = 100;
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
const scroller = shellElement('scroller');
const doc = shellElement('doc');
const notice = shellElement('notice');
const noticeOpen = shellElement('notice-open');
const findSlot = shellElement('find-slot');
const findInput = shellElement<HTMLInputElement>('find-input');
const findCount = shellElement('find-count');

const latest = createLatest();
let currentPath: string | null = null;
let outline: OutlineItem[] = [];
let fileCount = 0;
let sidebarOpen = recall(SIDEBAR_OPEN_KEY) !== 'false';
let sidebarOverride: boolean | null = null;
let drawerOpen = false;

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

function showFiles(files: FileEntry[]): void {
  fileCount = files.length;
  sidebar.setFiles(files, currentPath);
  applySidebar();
}

function updateCurrentHeading(): void {
  sidebar.setCurrentHeading(currentHeadingId(outline, doc, scroller));
}

function listFiles(path: string): Promise<FileEntry[]> {
  return bridge.listFolder(folderOf(path)).catch(() => []);
}

async function loadDocument(path: string) {
  const data = await retryOnce(() => bridge.readDocument(path), READ_RETRY_MS);
  const template = document.createElement('template');
  template.innerHTML = renderMarkdown(data.text);
  wrapTables(template.content);
  await bridge.allowImages(applyLocalImages(template.content, data.path, bridge.imageUrl));
  return { data, content: template.content, files: await listFiles(data.path) };
}

async function openDocument(path: string, options: { keepScroll?: boolean; fragment?: string | null } = {}): Promise<void> {
  const loaded = await latest(() => loadDocument(path));
  if (!loaded) return;
  const { data, content, files } = loaded;
  const scrollTop = scroller.scrollTop;
  if (!currentPath || !samePath(currentPath, data.path)) sidebarOverride = null;
  doc.replaceChildren(content);
  doc.hidden = false;
  notice.hidden = true;
  toggleButton.hidden = false;
  currentPath = data.path;
  docName.textContent = data.name;
  void bridge.setTitle(`${data.name} - MyMD`);
  outline = buildOutline(doc);
  sidebar.setOutline(outline);
  find.refresh();
  showFiles(files);
  scroller.scrollTop = options.keepScroll ? scrollTop : 0;
  if (options.fragment) scrollToHeading(doc, options.fragment);
  updateCurrentHeading();
  // Arrow keys and Page Down need focus inside the scroller.
  if (document.activeElement === document.body) focusDocument();
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
  if (action.kind === 'document') void openDocument(action.path, { fragment: action.fragment });
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
