import { samePath } from '../core/links';
import type { OutlineItem } from '../core/outline';
import type { FileEntry } from '../platform/bridge';

export type SidebarView = 'files' | 'outline';

export interface Sidebar {
  setFiles(files: FileEntry[], currentPath: string | null): void;
  setOutline(items: OutlineItem[]): void;
  setCurrentHeading(id: string | null): void;
  setView(view: SidebarView): void;
  focus(): void;
}

interface SidebarHandlers {
  onOpenFile(path: string): void;
  onSelectHeading(id: string): void;
  onViewChange(view: SidebarView): void;
}

const VIEW_LABELS: Record<SidebarView, string> = { files: 'Files', outline: 'Outline' };
const NEXT_KEYS = ['j', 'arrowdown'];
const PREVIOUS_KEYS = ['k', 'arrowup'];

function createTab(view: SidebarView): HTMLButtonElement {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.textContent = VIEW_LABELS[view];
  tab.setAttribute('role', 'tab');
  return tab;
}

function createList(view: SidebarView): HTMLElement {
  const list = document.createElement('div');
  list.className = 'side-list';
  list.dataset.list = view;
  list.setAttribute('role', 'tabpanel');
  list.setAttribute('aria-label', VIEW_LABELS[view]);
  return list;
}

function createRow(text: string): HTMLButtonElement {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'side-row';
  row.textContent = text;
  row.title = text;
  return row;
}

function rowsIn(list: HTMLElement): HTMLButtonElement[] {
  return [...list.querySelectorAll('button')];
}

function rowKey(row: HTMLElement): string | undefined {
  return row.dataset.path ?? row.dataset.heading;
}

function setRows(list: HTMLElement, rows: HTMLButtonElement[], emptyText: string): void {
  const focused = rowsIn(list).find((row) => row === document.activeElement);
  if (rows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'side-empty';
    empty.textContent = emptyText;
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...rows);
  if (focused) rows.find((row) => rowKey(row) === rowKey(focused))?.focus();
}

function markCurrent(list: HTMLElement, current: HTMLButtonElement | undefined): void {
  const rows = rowsIn(list);
  for (const row of rows) {
    row.tabIndex = row === (current ?? rows[0]) ? 0 : -1;
    if (row === current) row.setAttribute('aria-current', 'true');
    else row.removeAttribute('aria-current');
  }
}

export function createSidebar(root: HTMLElement, handlers: SidebarHandlers): Sidebar {
  const tabs = { files: createTab('files'), outline: createTab('outline') };
  const lists = { files: createList('files'), outline: createList('outline') };
  const tablist = document.createElement('div');
  tablist.className = 'segmented';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Sidebar view');
  tablist.append(tabs.files, tabs.outline);
  root.replaceChildren(tablist, lists.files, lists.outline);

  let view: SidebarView = 'files';
  let currentHeading: string | null = null;

  function setView(next: SidebarView): void {
    view = next;
    for (const name of ['files', 'outline'] as const) {
      tabs[name].setAttribute('aria-selected', String(name === next));
      tabs[name].tabIndex = name === next ? 0 : -1;
      lists[name].hidden = name !== next;
    }
  }

  function chooseView(next: SidebarView): void {
    setView(next);
    handlers.onViewChange(next);
  }

  tabs.files.addEventListener('click', () => chooseView('files'));
  tabs.outline.addEventListener('click', () => chooseView('outline'));

  tablist.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const next = view === 'files' ? 'outline' : 'files';
    chooseView(next);
    tabs[next].focus();
  });

  root.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey || !(event.target instanceof HTMLElement)) return;
    const key = event.key.toLowerCase();
    const step = NEXT_KEYS.includes(key) ? 1 : PREVIOUS_KEYS.includes(key) ? -1 : 0;
    const row = event.target.closest<HTMLButtonElement>('.side-row');
    if (step === 0 || !row?.parentElement) return;
    event.preventDefault();
    const rows = rowsIn(row.parentElement);
    rows[rows.indexOf(row) + step]?.focus();
  });

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    const { path, heading } = event.target.dataset;
    if (path) handlers.onOpenFile(path);
    if (heading) handlers.onSelectHeading(heading);
  });

  setView('files');

  return {
    setFiles(files, currentPath) {
      const rows = files.map((file) => {
        const row = createRow(file.name);
        row.dataset.path = file.path;
        return row;
      });
      setRows(lists.files, rows, 'No Markdown files here');
      markCurrent(lists.files, rows.find((row) => currentPath && samePath(row.dataset.path ?? '', currentPath)));
    },
    setOutline(items) {
      const rows = items.map((item) => {
        const row = createRow(item.text);
        row.dataset.heading = item.id;
        row.dataset.level = String(item.level);
        return row;
      });
      setRows(lists.outline, rows, 'No headings in this file');
      markCurrent(lists.outline, undefined);
      currentHeading = null;
    },
    setCurrentHeading(id) {
      if (id === currentHeading) return;
      currentHeading = id;
      const current = rowsIn(lists.outline).find((row) => row.dataset.heading === id);
      markCurrent(lists.outline, current);
      current?.scrollIntoView({ block: 'nearest' });
    },
    setView,
    focus() {
      const row = rowsIn(lists[view]).find((candidate) => candidate.tabIndex === 0);
      (row ?? tabs[view]).focus();
    },
  };
}

export function sidebarVisible(remembered: boolean, fileCount: number, override: boolean | null): boolean {
  return override ?? (remembered && fileCount > 1);
}
