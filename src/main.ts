import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/app.css';
import './styles/prose.css';
import './styles/code.css';
import { createLatest, retryOnce } from './core/async';
import { applyLocalImages } from './core/images';
import { classifyLink, isMarkdownPath } from './core/links';
import { buildOutline, scrollToHeading } from './core/outline';
import { renderMarkdown } from './core/render';
import { wrapTables } from './core/tables';
import { bridge } from './platform/bridge';

const READ_RETRY_MS = 100;

// Cached at startup, because headings in a document can reuse these ids.
function shellElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing shell element: ${id}`);
  return element;
}

const docName = shellElement('doc-name');
const scroller = shellElement('scroller');
const doc = shellElement('doc');
const notice = shellElement('notice');
const noticeOpen = shellElement('notice-open');

const latest = createLatest();
let currentPath: string | null = null;

async function loadDocument(path: string) {
  const data = await retryOnce(() => bridge.readDocument(path), READ_RETRY_MS);
  const template = document.createElement('template');
  template.innerHTML = renderMarkdown(data.text);
  wrapTables(template.content);
  await bridge.allowImages(applyLocalImages(template.content, data.path, bridge.imageUrl));
  return { data, content: template.content };
}

async function openDocument(path: string, options: { keepScroll?: boolean; fragment?: string | null } = {}): Promise<void> {
  const loaded = await latest(() => loadDocument(path));
  if (!loaded) return;
  const { data, content } = loaded;
  const scrollTop = scroller.scrollTop;
  doc.replaceChildren(content);
  doc.hidden = false;
  notice.hidden = true;
  currentPath = data.path;
  docName.textContent = data.name;
  void bridge.setTitle(`${data.name} - MyMD`);
  buildOutline(doc);
  scroller.scrollTop = options.keepScroll ? scrollTop : 0;
  if (options.fragment) scrollToHeading(doc, options.fragment);
  // Arrow keys and Page Down need focus inside the scroller.
  if (document.activeElement === document.body) scroller.focus({ preventScroll: true, focusVisible: false });
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
  return key === 'f5' || (event.ctrlKey && (key === 'p' || key === 'r'));
}

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

noticeOpen.addEventListener('click', () => void pickAndOpen());

window.addEventListener('keydown', (event) => {
  if (isBlockedKey(event)) event.preventDefault();
  if (event.ctrlKey && event.key.toLowerCase() === 'o') {
    event.preventDefault();
    void pickAndOpen();
  }
});

window.addEventListener('contextmenu', (event) => {
  if (!window.getSelection()?.toString()) event.preventDefault();
});

bridge.onOpenPath((path) => openFirstMarkdown([path]));
bridge.onFileDrop(openFirstMarkdown);

async function start(): Promise<void> {
  if (bridge.isBrowser) document.documentElement.dataset.shell = 'browser';
  try {
    const path = await bridge.initialPath();
    if (path) await openDocument(path);
  } finally {
    await bridge.showWindow();
  }
}

void start();
