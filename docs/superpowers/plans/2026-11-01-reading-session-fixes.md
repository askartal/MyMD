# Reading session fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A different file opens at the top, the narrow sidebar gets out of the way, find starts at the first match, and a named anchor scrolls into view.

**Architecture:** The four fixes stay inside the modules that already own the behavior. Scroll memory and the drawer live in `src/main.ts`. Find keeps its match index in `src/ui/find.ts` and learns a separate restart for a new document. Fragment scrolling stays in `src/core/outline.ts`, which already owns heading ids. No new module, command, or setting.

**Tech Stack:** TypeScript, Vitest, jsdom. The Rust side does not change.

**Spec:** `docs/superpowers/specs/2026-10-31-mymd-markdown-viewer-design.md`

## Global Constraints

- No UI framework.
- Only `src/platform/bridge.ts` imports from `@tauri-apps/*`.
- `src/core` imports nothing from `src/ui` or `src/platform`.
- All Rust commands stay read-only. This plan does not change them.
- Interface copy stays sentence case. These fixes add no copy.
- Tests sit beside the code as `*.test.ts`. Write the failing test first.
- The repository is public. Commits, fixtures and tests contain no secrets, real local paths or private details.
- Do not push, tag or create a release until the maintainer explicitly says to.
- When a task finishes, tick it under Next in `TODO.md`.

## What this plan is

v0.1.0 is published. The next code change is this plan. Three later batches are written at the end of this file so they are not lost, and they are not tasks here.

## Review Focus

1. **Remembered scroll is not the live scroll.** `showDocument` already sets `scrollTop` to 0 when `keepScroll` is absent, so opening `b.md` from a scrolled `a.md` already lands at the top. The bug is `readingTop`, saved when a notice replaces the page. A later refresh of a different file, opened while that notice was up, puts the old offset back. The new test has to go through the notice.
2. **A refresh keeps the find index.** `FindController.refresh()` must still restore the current match after a save. Only a different document starts again at the first match.
3. **The drawer closes only for an outside open.** A live refresh must leave the drawer where the reader put it. A sidebar click already closes it.

## Files

- Modify: `src/main.ts` — scroll memory, drawer close, find restart call
- Modify: `src/main.test.ts` — scroll, drawer and find wiring
- Modify: `src/ui/find.ts` — `restart()`
- Modify: `src/ui/find.test.ts` — restart beside the existing refresh tests
- Modify: `src/core/outline.ts` — fragment lookup
- Modify: `src/core/outline.test.ts` — heading, id and `a[name]`
- Modify: `src/core/render.test.ts` — guard that `name` and `id` survive sanitizing
- Modify: `TODO.md`, `HANDOFF.md`, `CHANGELOG.md` — Task 5

---

### Task 1: Reset remembered scroll

**Files:**
- Modify: `src/main.test.ts`
- Modify: `src/main.ts` (`showDocument` around the `scrollTop` assignment, `showFailure`)
- Test: `src/main.test.ts`

**Interfaces:**
- Consumes: `readingTop`, `setCurrentDocument`, `showNotice`, `showDocument`, `showFailure`
- Produces: a new document leaves `readingTop` at 0. A refresh of the same document still uses the saved offset when the page is hidden.

The existing test `returns to the same place` must stay green. It deletes `a.md` at scroll 40 and restores that same file.

- [ ] **Step 1: Write the failing test**

Add this describe block at the end of `src/main.test.ts`:

```typescript
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/main.test.ts`

Expected: FAIL in `opens at the top after the previous file remembered a scroll position`. `scrollTop` is 40.

- [ ] **Step 3: Clear the saved offset when the path changes**

In `showDocument`, decide whether the path is new before reading `readingTop`, and forget that offset after the new page is shown. A fragment still scrolls after the top is set.

```typescript
function showDocument({ data, content, files }: Awaited<ReturnType<typeof loadDocument>>, options: OpenOptions): void {
  const isNew = setCurrentDocument(data.path, data.name);
  if (isNew) fileCount = files.length;
  const scrollTop = isNew ? 0 : (doc.hidden ? readingTop : scroller.scrollTop);
  if (stripFrontMatter(data.text).trim() === '') showNotice({ title: 'This file is empty.', body: '' });
  else showContent(content);
  sidebar.setFiles(files, data.path);
  applySidebar();
  if (isNew) readingTop = 0;
  scroller.scrollTop = !isNew && options.keepScroll ? scrollTop : 0;
  if (options.fragment) scrollToHeading(doc, options.fragment);
  updateCurrentHeading();
  restoreFocus();
}
```

`showNotice` can copy the visible scroll into `readingTop` before the line above clears it. The clear has to stay after `showNotice`.

Do the same when a different path fails to open. `showFailure` becomes:

```typescript
function showFailure(path: string, error: unknown): void {
  const name = fileNameOf(path);
  const isNew = setCurrentDocument(path, name);
  if (isNew) sidebarOverride = sidebarOpen;
  setStatus('');
  showNotice(noticeFor(error, name));
  if (isNew) readingTop = 0;
  applySidebar();
  restoreFocus();
  void refreshFiles();
}
```

Leave `setCurrentDocument` itself alone. Clearing `readingTop` inside it is too early: `showNotice` would save the previous file's scroll again.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/main.test.ts`

Expected: PASS, including `returns to the same place` and the new test.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/main.test.ts TODO.md
git commit -m "fix: open a different file at the top"
```

Tick Task 1 under Next in `TODO.md` before the commit.

---

### Task 2: Close the drawer on an outside open

**Files:**
- Modify: `src/main.test.ts`
- Modify: `src/main.ts` (`pickAndOpen`, `openFirstMarkdown`)
- Test: `src/main.test.ts`

**Interfaces:**
- Consumes: `closeDrawer`, `pickAndOpen`, `openFirstMarkdown`, `bridge.onOpenPath`, `bridge.onFileDrop`
- Produces: `Ctrl+O`, a dropped Markdown file, and a second-launch path close the drawer. A folder change does not.

`drawerQuery` is the object returned by `matchMedia` at import. The test has to keep that same object and flip `matches`, or the module never sees the drawer width.

- [ ] **Step 1: Write the failing test**

`drawerQuery` in `src/main.ts` keeps the object `matchMedia` returned when the module loaded. The test flips `matches` on that same object.

Inside the `vi.hoisted` factory in `src/main.test.ts`, replace the handler holder:

```typescript
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
```

Return `media` with the existing fields: `return { documents, held, holdNext, handlers, bridge, media };`

Replace the two no-op subscriptions on the fake bridge:

```typescript
onOpenPath(handler: (path: string) => void) {
  handlers.openPath = handler;
},
onFileDrop(handler: (paths: string[]) => void) {
  handlers.fileDrop = handler;
},
```

In `beforeEach`, before `import('./main')`, replace the `window.matchMedia` line with:

```typescript
fake.media.matches = false;
fake.bridge.pickFile = async () => null;
window.matchMedia = vi.fn().mockReturnValue(fake.media);
```

Add this describe block:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/main.test.ts`

Expected: FAIL in `closes when a file is picked`, `closes when a file is dropped`, and `closes when a second launch opens a file`. The sidebar stays visible (`hidden` is false). `stays open when the open file is saved` passes.

- [ ] **Step 3: Close the drawer at those three entries**

```typescript
function openFirstMarkdown(paths: string[]): void {
  const path = paths.find(isMarkdownPath);
  if (!path) return;
  closeDrawer();
  void openDocument(path);
}

async function pickAndOpen(): Promise<void> {
  closeDrawer();
  const path = await bridge.pickFile();
  if (path) await openDocument(path);
}
```

A drop or second launch with no Markdown path leaves the drawer alone, because no file opens. `Ctrl+O` closes the drawer when the picker opens. Sidebar clicks already call `closeDrawer` and stay that way. Do not call `closeDrawer` from `openDocument` or `refreshDocument`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/main.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/main.test.ts TODO.md
git commit -m "fix: close the drawer when a file is opened from outside"
```

Tick Task 2 under Next in `TODO.md` before the commit.

---

### Task 3: Restart find on a different document

**Files:**
- Modify: `src/ui/find.test.ts`
- Modify: `src/ui/find.ts`
- Modify: `src/main.ts` (`showContent`, `showDocument`)
- Modify: `src/main.test.ts`
- Test: `src/ui/find.test.ts`, `src/main.test.ts`

**Interfaces:**
- Consumes: `FindController.refresh()`, `FindController.search()`
- Produces: `FindController.restart(): void`. Sets the index to the first match of the current query and does not scroll. A missing query does nothing, the same as `refresh()`.

- [ ] **Step 1: Write the failing unit test**

Add both tests inside `describe('FindController')` in `src/ui/find.test.ts`, after `keeps the position across a refresh`:

```typescript
it('starts at the first match when restarted', () => {
  const find = new FindController(root, onChange);
  find.search('one');
  find.next();
  root.innerHTML = '<p>one two one two one</p>';
  find.restart();
  expect(onChange).toHaveBeenLastCalledWith(0, 3);
});

it('leaves the reading position alone on restart', () => {
  const find = new FindController(root, onChange);
  find.search('one');
  find.next();
  scroller.scrollTop = 0;
  root.innerHTML = '<p>one two one</p>';
  find.restart();
  expect(scroller.scrollTop).toBe(0);
  expect(onChange).toHaveBeenLastCalledWith(0, 2);
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `npx vitest run src/ui/find.test.ts`

Expected: FAIL because `find.restart` is not a function.

- [ ] **Step 3: Add restart**

In `src/ui/find.ts`, next to `refresh`:

```typescript
restart(): void {
  if (!this.query) return;
  this.index = 0;
  this.update();
}
```

`update` runs after the index is set to 0, so the clamp keeps the first match. It must not call `revealCurrent`.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `npx vitest run src/ui/find.test.ts`

Expected: PASS, including `keeps the position across a refresh`.

- [ ] **Step 5: Write the failing wiring test**

Add this test to `describe('a different file')` in `src/main.test.ts`:

```typescript
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
```

- [ ] **Step 6: Run the wiring test to verify it fails**

Run: `npx vitest run src/main.test.ts`

Expected: FAIL. The count stays `2 of 2`.

- [ ] **Step 7: Restart only when the document is new**

`showContent` takes the flag from the `isNew` value Task 1 already computes:

```typescript
function showContent(content: DocumentFragment, restartFind: boolean): void {
  doc.replaceChildren(content);
  doc.hidden = false;
  notice.hidden = true;
  outline = buildOutline(doc);
  sidebar.setOutline(outline);
  if (restartFind) find.restart();
  else find.refresh();
}
```

In `showDocument`, change the content branch to `showContent(content, isNew)`. Leave the `find.refresh()` call inside `showNotice` as it is. A notice has no matches, and a refresh of the same file still goes through `showContent(content, false)`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/ui/find.test.ts src/main.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/ui/find.ts src/ui/find.test.ts src/main.ts src/main.test.ts TODO.md
git commit -m "fix: start find at the first match in a different file"
```

Tick Task 3 under Next in `TODO.md` before the commit.

---

### Task 4: Scroll to named anchors

**Files:**
- Modify: `src/core/outline.test.ts`
- Modify: `src/core/outline.ts` (`scrollToHeading`)
- Modify: `src/core/render.test.ts`
- Test: `src/core/outline.test.ts`, `src/core/render.test.ts`

**Interfaces:**
- Consumes: `scrollToHeading(root: HTMLElement, id: string): void`
- Produces: the same function. It scrolls to the first match in this order: a heading with that id, any element with that id, then `a[name]`. An unknown id does nothing. Outline listing stays H1 to H3.

`renderMarkdown` already keeps `name` and `id`. The render test is a guard. It should pass with no change to `src/core/render.ts`.

- [ ] **Step 1: Write the failing test**

Add this import and describe block to `src/core/outline.test.ts`:

```typescript
import { buildOutline, currentHeadingId, scrollToHeading } from './outline';
```

```typescript
describe('scrollToHeading', () => {
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
```

Add this test inside `describe('renderMarkdown')` in `src/core/render.test.ts`:

```typescript
it('keeps named anchors and element ids', () => {
  const html = renderMarkdown('<a name="note"></a>\n\n<p id="note">Here</p>\n\n[here](#note)');
  expect(html).toContain('name="note"');
  expect(html).toContain('id="note"');
  expect(html).toContain('href="#note"');
});
```

- [ ] **Step 2: Run the tests to verify the new lookups fail**

Run: `npx vitest run src/core/outline.test.ts src/core/render.test.ts`

Expected: FAIL in `scrolls to an element id` and `scrolls to a named anchor`. The heading test, the preference test, the missing-id test and the render guard pass.

- [ ] **Step 3: Look past headings**

Replace `scrollToHeading` in `src/core/outline.ts`:

```typescript
export function scrollToHeading(root: HTMLElement, id: string): void {
  if (!id) return;
  const escaped = CSS.escape(id);
  const target = headingsIn(root).find((heading) => heading.id === id)
    ?? root.querySelector<HTMLElement>(`#${escaped}`)
    ?? root.querySelector<HTMLElement>(`a[name="${escaped}"]`);
  target?.scrollIntoView();
}
```

An empty id returns before `querySelector`. `CSS.escape` is present in the jsdom used by Vitest and in WebView2. Callers in `src/main.ts` stay as they are: outline clicks, `#fragment` links, and document links with a fragment all use this function.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/core/outline.test.ts src/core/render.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/outline.ts src/core/outline.test.ts src/core/render.test.ts TODO.md
git commit -m "fix: scroll to named anchors"
```

Tick Task 4 under Next in `TODO.md` before the commit.

---

### Task 5: Record the fixes

**Files:**
- Modify: `TODO.md`
- Modify: `HANDOFF.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the four behavior changes from Tasks 1 to 4
- Produces: the notes the next session reads

- [ ] **Step 1: Run the full checks**

Run: `npm test`

Expected: PASS. The count is higher than 149 by the tests added above.

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 2: Update the notes**

Under `## [Unreleased]` in `CHANGELOG.md`, add a `### Fixed` list:

```markdown
### Fixed

- A different file opens at the top, including after the previous file was missing or empty
- The sidebar drawer closes for Ctrl+O, a dropped file and a second launch
- Find starts at the first match when a different file opens, and keeps its place across a save
- A link to a named anchor or any element id scrolls to it
```

In `TODO.md`, tick Task 5. Leave the Later list and the remaining Deferred list unchecked.

Rewrite the Next step in `HANDOFF.md` so a cold start sees these four fixes as done, and points at "Not in this plan" below for the following batch. Keep the person-only checks as they are.

- [ ] **Step 3: Commit**

```bash
git add TODO.md HANDOFF.md CHANGELOG.md
git commit -m "docs: record the reading-session fixes"
```

---

## Not in this plan

These stay unscheduled. Each batch should get its own plan when it starts.

**Documents are untrusted.** Do this before another release.

- Render Markdown off the interface thread, with a timeout. `renderMarkdown` in `src/core/render.ts` runs on the interface thread, and a document full of repeated `_a ` can freeze the window.
- Turn on DOMPurify `SANITIZE_NAMED_PROPS` so an id inside a document cannot collide with the shell. Shell elements are cached with `shellElement` at startup in `src/main.ts`.
- Add `base-uri`, `form-action` and `object-src` to the `csp` string in `src-tauri/tauri.conf.json`, and add a Rust navigation guard.
- Mark `allow_images` and `watch_folder` in `src-tauri/src/lib.rs` as `#[tauri::command(async)]`, matching `read_document` and `list_folder`.

**The next tag.**

- In `.github/workflows/release.yml`, run `npm test` and `npm run build` before `tauri-action`, check the tag against the version, and pin actions to commit hashes.
- Remove the direct `serde_json` dependency from `src-tauri/Cargo.toml`. Nothing in `src-tauri/src` imports it.

**A person, on Windows.** Acrylic while dragging and resizing, the title bar in light mode, sidebar contrast, transparency turned off, and a live theme change. If Acrylic lags, change `acrylic` to `mica` in `src-tauri/tauri.conf.json` and record it in `docs/DECISIONS.md`.

**Out of scope until a decision.** Back and forward, subfolders in the Files view, recent files, Mermaid diagrams and math, export and printing, automatic updates, code signing, Windows 10. Subfolders and back/forward are the two that match reading a folder of notes. Signing and updates are release process.
