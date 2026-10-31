# MyMD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MyMD, an open-source, read-only Windows 11 Markdown viewer in the Soft Order look with a frosted glass window, ready to publish on GitHub.

**Architecture:** A Tauri 2 shell with one small Rust file for file access and watching, and a plain TypeScript interface split into single-purpose modules. Only `src/platform/bridge.ts` touches Tauri, so the interface also runs in a normal browser against fixtures for layout checks.

**Tech Stack:** Tauri 2, TypeScript, Vite, Vitest, jsdom, `marked`, `highlight.js`, `DOMPurify`, `notify-debouncer-mini`, Inter Variable.

**Spec:** `docs/superpowers/specs/2026-10-31-mymd-markdown-viewer-design.md`

## Global Constraints

- Windows 11 x64 only. Default window 1100 × 760, minimum 480 × 400.
- No UI framework.
- Only `src/platform/bridge.ts` imports from `@tauri-apps/*`.
- `src/core` imports nothing from `src/ui` or `src/platform`.
- All Rust commands are read-only.
- After each task, tick it in `TODO.md` and update `HANDOFF.md`. Record new decisions in `docs/DECISIONS.md`.
- Every color, font, size and spacing value in CSS comes from a token in `src/styles/tokens.css`.
- Red appears at most once in a view: one 8 px `--accent` dot. Syntax highlighting never uses red.
- Interface copy is sentence case. Errors say what happened and what to do, with no raw exception text.
- No italic headings and no fabricated content, including in fixtures.
- Every interactive element has a visible `--focus` ring. Motion respects reduced motion.
- End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- The repository is public: https://github.com/askartal/MyMD. Commits, fixtures and tests contain no secrets, real local paths or private details.
- Do not push, tag or create a release until the user explicitly says to.

## Review Focus

1. **One path spelled two ways.** Explorer, the watcher and links can give `C:\Notes\A.md` and `c:/notes/a.md` for one file. Live refresh must still fire. Pinned in Task 3.
2. **Spaces, Unicode and percent-encoding in names.** `my notes/İş planı.md` and `![x](my%20image.png)` must resolve correctly. Pinned in Task 3.
3. **Notepad's UTF-16 files.** A file saved as "Unicode" must read normally, not as garbage. Pinned in Task 5.
4. **Out-of-order reads.** With fast sidebar clicks or a burst of saves, an older read must never replace a newer one. Pinned in Task 6.
5. **Malformed documents.** Empty files, CRLF line endings, unclosed front matter, a leading horizontal rule and an unclosed code fence must never swallow or crash a document. Pinned in Task 2.

## Files beyond the spec's unit list

- `src/core/async.ts`: `createLatest` and `retryOnce`
- `src/core/images.ts`: rewrites local image sources
- `src/platform/fixtures.ts`: browser-only sample documents, loaded in dev builds only

---

### Task 1: Toolchain, scaffold and glass check

**Files:**
- Create: `LICENSE`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/platform/bridge.ts`, `src-tauri/**`

**Interfaces:**
- Produces: `bridge.showWindow(): Promise<void>` in `src/platform/bridge.ts`; npm scripts `dev`, `build`, `test`, `tauri`.

- [ ] **Step 1: Install Rust and the C++ Build Tools (the user approves an admin prompt)**

```bash
winget install --id Rustlang.Rustup -e --accept-package-agreements --accept-source-agreements
```

```bash
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-package-agreements --accept-source-agreements --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

If the second ID isn't found, run `winget search "Build Tools"` and use the newest Visual Studio Build Tools package with the same override.

- [ ] **Step 2: Verify the toolchain in a new shell**

Run: `cargo -V`
Expected: prints a version. If not found, add `%USERPROFILE%\.cargo\bin` to `PATH` for the session.

- [ ] **Step 3: Create the front-end project by hand**

Do not use `create-tauri-app` here, because it can clear a non-empty folder and `docs/` must survive.

- `LICENSE`: the standard MIT text, `Copyright (c) 2026 Ali Sinan Kartal`.
- `package.json`: `"name": "mymd"`, `"version": "0.1.0"`, `"license": "MIT"`, `"repository": "github:askartal/MyMD"`, `"private": true`, `"type": "module"`, scripts `dev: vite`, `build: tsc --noEmit && vite build`, `test: vitest run`, `tauri: tauri`. `private` only blocks npm publishing.
- Dependencies: `marked`, `dompurify`, `highlight.js`, `@fontsource-variable/inter`, `@tauri-apps/api`.
- Dev dependencies: `typescript`, `vite`, `vitest`, `jsdom`, `@tauri-apps/cli`.
- `vite.config.ts`: server port `1420`, `strictPort: true`, `clearScreen: false`, Vitest `environment: 'jsdom'`.
- `tsconfig.json`: strict, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `types: ["vite/client"]`, `include: ["src"]`.
- `.gitignore` already exists. Keep `package-lock.json` and `src-tauri/Cargo.lock` committed.
- `src/platform/bridge.ts`: export `bridge` with `showWindow()`, calling `getCurrentWindow().show()` when `'__TAURI_INTERNALS__' in window`.
- `src/main.ts`: calls `bridge.showWindow()`. `index.html` loads it and has a transparent `body`.

- [ ] **Step 4: Add Tauri and its plugins**

```bash
npx tauri init --ci -A MyMD -W MyMD -D ../dist -P http://localhost:1420 --before-dev-command "npm run dev" --before-build-command "npm run build"
```

```bash
npx tauri add single-instance
```

```bash
npx tauri add opener
```

```bash
npx tauri add dialog
```

```bash
npx tauri add window-state
```

- [ ] **Step 5: Configure the app**

In `src-tauri/tauri.conf.json`:

```json
{
  "productName": "MyMD",
  "version": "0.1.0",
  "identifier": "io.github.askartal.mymd",
  "app": {
    "windows": [{
      "title": "MyMD", "width": 1100, "height": 760, "minWidth": 480, "minHeight": 400,
      "visible": false, "transparent": true, "zoomHotkeysEnabled": true,
      "windowEffects": { "effects": ["acrylic"] }
    }],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' asset: http://asset.localhost https: data:; connect-src ipc: http://ipc.localhost",
      "devCsp": null,
      "assetProtocol": { "enable": true, "scope": [] }
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "windows": { "nsis": { "installMode": "currentUser" } },
    "fileAssociations": [{ "ext": ["md", "markdown"], "name": "Markdown document", "role": "Viewer" }]
  }
}
```

In `src-tauri/Cargo.toml`, add the `protocol-asset` feature to `tauri`, and set `version = "0.1.0"`, `license = "MIT"` and `repository = "https://github.com/askartal/MyMD"`. In `src-tauri/capabilities/default.json`, the permissions must include `core:default`, `core:window:allow-show`, `dialog:allow-open`, `opener:allow-open-url` and `window-state:default`.

- [ ] **Step 6: Check the riskiest thing first**

Run: `npm run tauri dev`
Expected: a window opens with the desktop blurred behind it.

Drag and resize it for a few seconds. If it visibly lags, change `acrylic` to `mica` in `tauri.conf.json` and repeat. Check whether the title bar shows the same glass. Record both results under "Task results" in `HANDOFF.md`, and update decision 007 in `docs/DECISIONS.md`.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold Tauri app with glass window"
```

### Task 2: Markdown rendering

**Files:**
- Create: `src/core/render.ts`
- Test: `src/core/render.test.ts`

**Interfaces:**
- Produces: `stripFrontMatter(text: string): string`; `renderMarkdown(text: string): string` (sanitized HTML).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { renderMarkdown, stripFrontMatter } from './render';

describe('stripFrontMatter', () => {
  it('removes a YAML block', () => expect(stripFrontMatter('---\ntitle: A\n---\n# B')).toBe('# B'));
  it('handles CRLF', () => expect(stripFrontMatter('---\r\ntitle: A\r\n---\r\n# B')).toBe('# B'));
  it('keeps unclosed front matter', () => expect(stripFrontMatter('---\ntitle: A\n# B')).toBe('---\ntitle: A\n# B'));
  it('keeps a leading horizontal rule', () => {
    const text = '---\n\nHello\n\n---\n\nWorld';
    expect(stripFrontMatter(text)).toBe(text);
  });
});

describe('renderMarkdown', () => {
  it('renders tables', () => expect(renderMarkdown('|a|\n|-|\n|b|')).toContain('<table>'));
  it('renders task lists', () => expect(renderMarkdown('- [x] done')).toContain('type="checkbox"'));
  it('renders strikethrough', () => expect(renderMarkdown('~~a~~')).toContain('<del>'));
  it('highlights known languages', () => expect(renderMarkdown('```js\nconst a = 1\n```')).toContain('hljs-keyword'));
  it('escapes unknown languages', () => expect(renderMarkdown('```nope\n<b>\n```')).toContain('&lt;b&gt;'));
  it('removes scripts and event handlers', () => {
    const html = renderMarkdown('<script>x()</script><img src="a.png" onerror="x()">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });
  it('removes embedded content and styling', () => {
    const html = renderMarkdown('<iframe></iframe><object></object><embed><form></form><style>a{}</style><p style="color:red">t</p>');
    for (const bad of ['<iframe', '<object', '<embed', '<form', '<style', 'style=']) expect(html).not.toContain(bad);
  });
  it('keeps details and images', () => {
    const html = renderMarkdown('<details><summary>s</summary>t</details>\n\n![a](b.png)');
    expect(html).toContain('<details>');
    expect(html).toContain('<img');
  });
  it('survives an unclosed fence', () => expect(renderMarkdown('```js\nconst a')).toContain('<code'));
  it('returns nothing for an empty file', () => expect(renderMarkdown('')).toBe(''));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/render.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/core/render.ts`**

- Front matter is stripped only when it starts at the first byte, has a closing `---` line, and its first non-empty line matches `^[\w-]+:`.
- Use `marked` with `gfm: true` and `async: false`, and a `code` renderer using `highlight.js/lib/common`. Highlight only when `hljs.getLanguage(lang)` is true; otherwise output escaped text.
- Sanitize with `DOMPurify`, using `FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'button', 'select', 'textarea']` and `FORBID_ATTR: ['style']`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/render.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/render.ts src/core/render.test.ts
git commit -m "feat: render and sanitize Markdown"
```

### Task 3: Paths and links

**Files:**
- Create: `src/core/links.ts`
- Test: `src/core/links.test.ts`

**Interfaces:**
- Produces:

```ts
export type LinkAction =
  | { kind: 'anchor'; fragment: string }
  | { kind: 'external'; url: string }
  | { kind: 'document'; path: string; fragment: string | null }
  | { kind: 'ignore' };
export function classifyLink(href: string, currentPath: string): LinkAction;
export function resolvePath(target: string, currentPath: string): string;
export function localImagePath(src: string, currentPath: string): string | null;
export function folderOf(path: string): string;
export function samePath(a: string, b: string): boolean;
export function isMarkdownPath(path: string): boolean;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { classifyLink, folderOf, isMarkdownPath, localImagePath, resolvePath, samePath } from './links';

const current = 'C:\\Users\\Test User\\notes\\guide.md';

describe('classifyLink', () => {
  it('anchors', () => expect(classifyLink('#setup', current)).toEqual({ kind: 'anchor', fragment: 'setup' }));
  it('decodes anchors', () => expect(classifyLink('#%C4%B0%C5%9F', current)).toEqual({ kind: 'anchor', fragment: 'İş' }));
  it.each(['https://a.io', 'http://a.io', 'mailto:a@b.io'])('external %s', (url) =>
    expect(classifyLink(url, current)).toEqual({ kind: 'external', url }));
  it('relative documents', () => expect(classifyLink('other.md', current)).toEqual({
    kind: 'document', path: 'C:\\Users\\Test User\\notes\\other.md', fragment: null }));
  it('documents with fragments, spaces and Unicode', () => expect(classifyLink('../my%20notes/İş%20planı.MD#giriş', current)).toEqual({
    kind: 'document', path: 'C:\\Users\\Test User\\my notes\\İş planı.MD', fragment: 'giriş' }));
  it('absolute documents', () => expect(classifyLink('D:/docs/a.markdown', current)).toEqual({
    kind: 'document', path: 'D:\\docs\\a.markdown', fragment: null }));
  it('file URLs', () => expect(classifyLink('file:///D:/docs/a.md', current)).toEqual({
    kind: 'document', path: 'D:\\docs\\a.md', fragment: null }));
  it.each(['setup.exe', 'run.bat', 'javascript:x()', 'ms-settings:privacy', 'file:///C:/a.exe', ''])('ignores %s', (href) =>
    expect(classifyLink(href, current)).toEqual({ kind: 'ignore' }));
});

describe('paths', () => {
  it('resolves parent segments', () => expect(resolvePath('../img/a.png', current)).toBe('C:\\Users\\Test User\\img\\a.png'));
  it('finds the folder', () => expect(folderOf(current)).toBe('C:\\Users\\Test User\\notes'));
  it('matches case and slash variants', () => expect(samePath('C:\\Notes\\A.md', 'c:/notes/a.md')).toBe(true));
  it('tells different files apart', () => expect(samePath('C:\\Notes\\A.md', 'C:\\Notes\\B.md')).toBe(false));
  it('recognizes Markdown in any case', () => {
    expect(isMarkdownPath('A.MD')).toBe(true);
    expect(isMarkdownPath('a.markdown')).toBe(true);
    expect(isMarkdownPath('a.txt')).toBe(false);
  });
});

describe('localImagePath', () => {
  it('resolves encoded names', () => expect(localImagePath('my%20image.png', current)).toBe('C:\\Users\\Test User\\notes\\my image.png'));
  it.each(['https://a.io/b.png', 'data:image/png;base64,AA'])('leaves %s alone', (src) =>
    expect(localImagePath(src, current)).toBeNull());
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/links.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/core/links.ts`**

- A one-letter scheme is a drive letter, not a URL scheme.
- `file:///` URLs convert to Windows paths and then follow the document rules.
- Decode with `decodeURIComponent`, falling back to the raw string if decoding throws.
- `resolvePath` normalizes `/` to `\`, and collapses `.` and `..` segments.
- `samePath` compares lowercased paths with slashes normalized.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/links.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/links.ts src/core/links.test.ts
git commit -m "feat: classify links and resolve Windows paths"
```

### Task 4: Outline

**Files:**
- Create: `src/core/outline.ts`
- Test: `src/core/outline.test.ts`

**Interfaces:**
- Produces:

```ts
export interface OutlineItem { id: string; text: string; level: 1 | 2 | 3 }
export function buildOutline(root: HTMLElement): OutlineItem[];
export function currentHeadingId(items: OutlineItem[], root: HTMLElement, scroller: HTMLElement): string | null;
export function scrollToHeading(root: HTMLElement, id: string): void;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { buildOutline, currentHeadingId } from './outline';

function doc(html: string) {
  const root = document.createElement('article');
  root.innerHTML = html;
  return root;
}

describe('buildOutline', () => {
  it('lists H1 to H3 only', () => {
    expect(buildOutline(doc('<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4>')).map((i) => i.level)).toEqual([1, 2, 3]);
  });
  it('gives H4 an id for links even though it is not listed', () => {
    const root = doc('<h4>Deep part</h4>');
    buildOutline(root);
    expect(root.querySelector('h4')?.id).toBe('deep-part');
  });
  it('makes duplicate ids unique', () => {
    expect(buildOutline(doc('<h2>Setup</h2><h2>Setup</h2><h2>Setup</h2>')).map((i) => i.id)).toEqual(['setup', 'setup-1', 'setup-2']);
  });
  it('keeps Unicode letters', () => {
    expect(buildOutline(doc('<h2>İş Planı</h2>'))[0].id).toBe('İş Planı'.toLowerCase().replace(' ', '-'));
  });
  it('uses heading text without markup', () => expect(buildOutline(doc('<h2>Use <code>npm</code></h2>'))[0].text).toBe('Use npm'));
  it('names headings with no letters', () => expect(buildOutline(doc('<h2>***</h2>'))[0].id).toBe('section'));
});

describe('currentHeadingId', () => {
  it('returns the last heading at or above the reading line', () => {
    const root = doc('<h2>A</h2><h2>B</h2><h2>C</h2>');
    const items = buildOutline(root);
    const scroller = document.createElement('div');
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: 100 } as DOMRect);
    const tops = [40, 110, 500];
    root.querySelectorAll('h2').forEach((h, i) => vi.spyOn(h, 'getBoundingClientRect').mockReturnValue({ top: tops[i] } as DOMRect));
    expect(currentHeadingId(items, root, scroller)).toBe('b');
  });
  it('returns null with no headings', () => {
    expect(currentHeadingId([], doc(''), document.createElement('div'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/outline.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/core/outline.ts`**

Ids apply to H1 to H6: lowercase with `toLowerCase`, keep `\p{L}\p{N}\p{M}` and hyphens, turn whitespace into hyphens. The reading line is 24 px below the scroller's top. If no heading has reached it, return the first item. Find elements with `CSS.escape`. `scrollToHeading` uses `scrollIntoView`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/outline.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/outline.ts src/core/outline.test.ts
git commit -m "feat: build the document outline"
```

### Task 5: Rust backend

**Files:**
- Modify: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`

**Interfaces:**
- Produces commands: `initial_path() -> Option<String>`; `read_document(path: String) -> Result<Document, String>`; `list_folder(path: String) -> Result<Vec<FileEntry>, String>`; `watch_folder(path: String) -> Result<(), String>`; `allow_images(paths: Vec<String>) -> Result<(), String>`.
- `Document { name, path, text }` and `FileEntry { name, path }`, all `String`.
- Read errors are exactly `"missing"` or `"unreadable"`.
- Events: `open-path` (payload `String`) and `folder-changed` (payload `Vec<String>`).

- [ ] **Step 1: Write the failing tests in a `#[cfg(test)]` module in `lib.rs`**

Add dev dependency `tempfile` and dependency `notify-debouncer-mini`.

```rust
#[test] fn decode_strips_utf8_bom() { assert_eq!(decode(b"\xEF\xBB\xBF# Hi"), "# Hi"); }
#[test] fn decode_replaces_invalid_utf8() { assert_eq!(decode(b"a\xFFb"), "a\u{FFFD}b"); }
#[test] fn decode_reads_utf16_le() {
    let bytes: Vec<u8> = [0xFF, 0xFE].into_iter().chain("# Hi".encode_utf16().flat_map(u16::to_le_bytes)).collect();
    assert_eq!(decode(&bytes), "# Hi");
}
#[test] fn decode_reads_utf16_be() {
    let bytes: Vec<u8> = [0xFE, 0xFF].into_iter().chain("# Hi".encode_utf16().flat_map(u16::to_be_bytes)).collect();
    assert_eq!(decode(&bytes), "# Hi");
}
#[test] fn markdown_check_ignores_case() {
    assert!(is_markdown(Path::new("A.MD")) && is_markdown(Path::new("a.markdown")));
    assert!(!is_markdown(Path::new("a.txt")) && !is_markdown(Path::new("md")));
}
#[test] fn image_check_rejects_programs() {
    assert!(is_image(Path::new("a.PNG")) && is_image(Path::new("a.svg")));
    assert!(!is_image(Path::new("a.exe")));
}
#[test] fn natural_order_is_numeric_and_case_insensitive() {
    assert_eq!(natural_cmp("note2.md", "note10.md"), Ordering::Less);
    assert_eq!(natural_cmp("a.md", "B.md"), Ordering::Less);
}
#[test] fn listing_is_flat_filtered_and_sorted() {
    let dir = tempfile::tempdir().unwrap();
    for name in ["b.markdown", "a.md", "c.txt"] { fs::write(dir.path().join(name), "").unwrap(); }
    fs::create_dir(dir.path().join("sub")).unwrap();
    fs::write(dir.path().join("sub").join("d.md"), "").unwrap();
    let names: Vec<String> = list_markdown(dir.path()).unwrap().into_iter().map(|f| f.name).collect();
    assert_eq!(names, ["a.md", "b.markdown"]);
}
#[test] fn reading_reports_missing_files() {
    assert_eq!(read_file(Path::new("C:\\nope\\a.md")).unwrap_err(), "missing");
}
#[test] fn reading_rejects_other_files() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("a.txt");
    fs::write(&path, "x").unwrap();
    assert_eq!(read_file(&path).unwrap_err(), "unreadable");
}
#[test] fn args_give_first_markdown_as_absolute_path() {
    let args: Vec<String> = ["mymd.exe", "--flag", "notes\\a.md", "b.md"].map(String::from).to_vec();
    assert_eq!(path_from_args(&args, Path::new("C:\\work")), Some("C:\\work\\notes\\a.md".to_string()));
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: FAIL, functions not defined.

- [ ] **Step 3: Implement the pure helpers**

`decode(&[u8]) -> String`, `is_markdown(&Path) -> bool`, `is_image(&Path) -> bool` (`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `avif`, `bmp`), `natural_cmp(&str, &str) -> Ordering`, `list_markdown(&Path) -> io::Result<Vec<FileEntry>>`, `read_file(&Path) -> Result<Document, String>` and `path_from_args(&[String], &Path) -> Option<String>`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

- [ ] **Step 5: Implement the commands and app setup**

- Register the single-instance plugin first. Its callback calls `path_from_args`, emits `open-path`, then unminimizes and focuses the main window.
- Configure window state with `StateFlags::all() & !StateFlags::VISIBLE`, so the hidden start is kept.
- Hold the start path in `Mutex<Option<String>>`.
- `watch_folder` holds one debouncer in a `Mutex`, replaces it on each call, watches `NonRecursive` with a 150 ms debounce, and emits `folder-changed`.
- `allow_images` calls `asset_protocol_scope().allow_file` only for paths passing `is_image`.

- [ ] **Step 6: Verify the build**

Run: `cargo build --manifest-path src-tauri/Cargo.toml`
Expected: finishes with no errors.

- [ ] **Step 7: Commit**

```bash
git add src-tauri
git commit -m "feat: add file access and folder watching"
```

### Task 6: Bridge, fixtures and async helpers

**Files:**
- Create: `src/core/async.ts`, `src/platform/fixtures.ts`
- Modify: `src/platform/bridge.ts`
- Test: `src/core/async.test.ts`

**Interfaces:**
- Consumes: the Task 5 commands and events.
- Produces:

```ts
// src/core/async.ts
export function createLatest(): <T>(task: () => Promise<T>) => Promise<T | null>;
export function retryOnce<T>(task: () => Promise<T>, delayMs: number): Promise<T>;

// src/platform/bridge.ts
export interface DocumentData { name: string; path: string; text: string }
export interface FileEntry { name: string; path: string }
export const bridge: {
  isBrowser: boolean;
  showWindow(): Promise<void>;
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
};
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createLatest, retryOnce } from './async';

describe('createLatest', () => {
  it('discards an older task that finishes last', async () => {
    const latest = createLatest();
    let finishOld!: (value: string) => void;
    const older = latest(() => new Promise<string>((resolve) => { finishOld = resolve; }));
    const newer = latest(async () => 'new');
    expect(await newer).toBe('new');
    finishOld('old');
    expect(await older).toBeNull();
  });
  it('swallows errors from stale tasks', async () => {
    const latest = createLatest();
    const older = latest(() => Promise.reject(new Error('gone')));
    await latest(async () => 'new');
    await expect(older).resolves.toBeNull();
  });
  it('passes on errors from the current task', async () => {
    await expect(createLatest()(() => Promise.reject(new Error('gone')))).rejects.toThrow('gone');
  });
});

describe('retryOnce', () => {
  it('retries once after the delay', async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockRejectedValueOnce(new Error('missing')).mockResolvedValueOnce('ok');
    const result = retryOnce(task, 100);
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe('ok');
    expect(task).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
  it('gives up after the second failure', async () => {
    const task = vi.fn().mockRejectedValue(new Error('missing'));
    await expect(retryOnce(task, 0)).rejects.toThrow('missing');
    expect(task).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/async.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/core/async.ts`**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/async.test.ts`
Expected: PASS.

- [ ] **Step 5: Complete `src/platform/bridge.ts` and add `src/platform/fixtures.ts`**

- Set `isBrowser` to `!('__TAURI_INTERNALS__' in window)`.
- In a Tauri window, each method maps to its command, event or plugin: `open` from the dialog plugin with a Markdown filter, `openUrl` from the opener plugin, `convertFileSrc`, and `getCurrentWebview().onDragDropEvent` for `drop` events.
- In a browser dev build, load `fixtures.ts` with a dynamic `import` behind `import.meta.env.DEV`, so it stays out of production.
- `fixtures.ts` holds `guide.md` and `shortcuts.md` in a fake folder `C:\Fixtures`. `guide.md` must exercise H1 to H4, a table, a task list, fenced code, a blockquote, a relative link to `shortcuts.md`, a missing local image and enough text to scroll. Write it about MyMD itself, with no invented figures.

- [ ] **Step 6: Verify types and tests**

Run: `npm run build`
Expected: finishes with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: add Tauri bridge, fixtures and async helpers"
```

### Task 7: Shell, styles and opening documents

Before writing CSS, load `anthropic-skills:soft-order-ui` and `modern-web-guidance:modern-web-guidance`.

**Files:**
- Create: `src/core/images.ts`, `src/styles/tokens.css`, `src/styles/app.css`, `src/styles/prose.css`, `src/styles/code.css`
- Modify: `index.html`, `src/main.ts`
- Test: `src/core/images.test.ts`

**Interfaces:**
- Consumes: `renderMarkdown`, `classifyLink`, `localImagePath`, `folderOf`, `isMarkdownPath`, `buildOutline`, `scrollToHeading`, `bridge`, `createLatest`, `retryOnce`.
- Produces: `applyLocalImages(root: ParentNode, currentPath: string, toUrl: (path: string) => string): string[]`, and `openDocument(path: string, options?: { keepScroll?: boolean; fragment?: string | null }): Promise<void>` inside `main.ts`.
- Element ids: `app`, `sidebar`, `panel`, `topbar`, `toggle-sidebar`, `doc-name`, `doc-status`, `find-slot`, `scroller`, `doc`, `notice`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from 'vitest';
import { applyLocalImages } from './images';

const current = 'C:\\notes\\guide.md';

it('rewrites local images and returns their paths', () => {
  const root = document.createElement('div');
  root.innerHTML = '<img src="my%20image.png"><img src="https://a.io/b.png">';
  const paths = applyLocalImages(root, current, (path) => `asset://${path}`);
  expect(paths).toEqual(['C:\\notes\\my image.png']);
  const [local, web] = root.querySelectorAll('img');
  expect(local.getAttribute('src')).toBe('asset://C:\\notes\\my image.png');
  expect(web.getAttribute('src')).toBe('https://a.io/b.png');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/core/images.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/core/images.ts`**

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/core/images.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/styles/tokens.css`**

Copy the Soft Order `:root` tokens, then add these. Mirror the dark set under `:root[data-theme="dark"]`, and guard the media query with `:root:not([data-theme="light"])`.

```css
/* Light */
--font: "Inter Variable", "Inter", system-ui, sans-serif;
--font-mono: "Cascadia Mono", Consolas, monospace;
--fs-read: 16px;
--lh-read: 1.65;
--sidebar-w: 248px;
--measure: 720px;
--sel: rgb(255 255 255 / .62);
--track: rgb(22 23 28 / .07);
/* Dark */
--sel: rgb(255 255 255 / .1);
--track: rgb(255 255 255 / .08);
```

- [ ] **Step 6: Build the shell in `index.html` and `app.css`**

- `#app` uses `background: var(--glass)`. Use `--canvas` under `prefers-reduced-transparency: reduce` and when `html[data-shell="browser"]`, which `main.ts` sets when `bridge.isBrowser` is true.
- `#panel` is solid `--surface` with radius `--r-xl`, 8 px from the window edges.
- `#topbar` holds a 32 px ghost `#toggle-sidebar` button, `#doc-name`, `#doc-status` and `#find-slot`.
- `#scroller` scrolls. `#doc` uses the `prose` class and is centered at `--measure`.
- The empty state in `#notice` uses a 48 px line icon, "Open a Markdown file to start reading.", an "Open file" secondary button, and chips "Ctrl O to open" and "Drop a file here".

- [ ] **Step 7: Write `prose.css` and `code.css`**

Follow the spec's typography section exactly. Task checkboxes, tables, blockquotes and images fit the measure. Tables scroll inside their own wrapper. Syntax colors use `--tag-blue`, `--tag-green`, `--tag-violet`, `--tag-amber` and `--text-2`.

- [ ] **Step 8: Implement opening in `src/main.ts`**

- Import `@fontsource-variable/inter` and the four stylesheets.
- Cache shell elements at startup, because headings in a document can reuse ids.
- `openDocument` runs `retryOnce(() => bridge.readDocument(path), 100)` through one `createLatest` guard and returns early on `null`.
- Render into a detached `<template>`, call `applyLocalImages`, await `bridge.allowImages`, then swap the content into `#doc`.
- Set `#doc-name` and the window title, call `buildOutline`, and scroll to `fragment` if given.
- Handle clicks in `#doc` through `classifyLink`: anchors call `scrollToHeading`, external links call `bridge.openExternal`, documents call `openDocument`, and everything else does nothing.
- In a capture `error` listener on `#doc`, replace a failed `img` with a `span.img-missing` showing its alt text.
- `Ctrl+O` uses `bridge.pickFile`. `bridge.onOpenPath` and `bridge.onFileDrop` open the first path passing `isMarkdownPath`.
- Suppress `Ctrl+P`, `Ctrl+R` and `F5`. Suppress the context menu unless text is selected.
- Run startup in `try` with `bridge.showWindow()` in `finally`, so a failure can't leave an invisible window.

- [ ] **Step 9: Check it in a browser**

Run: `npm run dev`, then open `http://localhost:1420` with the `guide.md` fixture loaded.
Expected: headings, table, code and task list follow the spec; the missing image shows its alt text; there's no horizontal scrolling at 1440, 1024, 768 or 480 px; and both `data-theme="light"` and `data-theme="dark"` read well.

- [ ] **Step 10: Commit**

```bash
git add index.html src
git commit -m "feat: add Soft Order shell and open documents"
```

### Task 8: Sidebar

**Files:**
- Create: `src/ui/sidebar.ts`
- Modify: `index.html`, `src/main.ts`, `src/styles/app.css`
- Test: `src/ui/sidebar.test.ts`

**Interfaces:**
- Consumes: `FileEntry`, `OutlineItem`, `currentHeadingId`.
- Produces:

```ts
export type SidebarView = 'files' | 'outline';
export interface Sidebar {
  setFiles(files: FileEntry[], currentPath: string | null): void;
  setOutline(items: OutlineItem[]): void;
  setCurrentHeading(id: string | null): void;
  setView(view: SidebarView): void;
}
export function createSidebar(root: HTMLElement, handlers: {
  onOpenFile(path: string): void;
  onSelectHeading(id: string): void;
  onViewChange(view: SidebarView): void;
}): Sidebar;
export function sidebarVisible(remembered: boolean, fileCount: number, override: boolean | null): boolean;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSidebar, sidebarVisible } from './sidebar';

const files = [{ name: 'a.md', path: 'C:\\n\\a.md' }, { name: 'b.md', path: 'C:\\n\\b.md' }];
const items = [{ id: 'one', text: 'One', level: 1 as const }, { id: 'two', text: 'Two', level: 2 as const }];

describe('createSidebar', () => {
  let root: HTMLElement;
  const handlers = { onOpenFile: vi.fn(), onSelectHeading: vi.fn(), onViewChange: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/ui/sidebar.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/ui/sidebar.ts`**

`createSidebar` builds the segmented control (`role="tablist"`, two `role="tab"` buttons) and two lists. Rows are `<button>` elements carrying `data-path` or `data-heading`. Set `aria-current="true"` only on the current row, and on the current heading's row in Outline. Use `textContent` for names, never `innerHTML`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/ui/sidebar.test.ts`
Expected: PASS.

- [ ] **Step 5: Style and wire the sidebar**

- In `app.css`, the sidebar has no background of its own and is `--sidebar-w` wide. Labels use `--text`, the selected row uses `--sel`, and the track uses `--track`. `[aria-current="true"]::before` is the only red: an 8 px `--accent` dot.
- Below 768 px, the sidebar becomes a drawer over the panel, on solid `--surface` so its text stays readable. `Esc` closes it.
- In `main.ts`, call `listFolder` after each document opens. Remember `mymd.sidebarOpen` and `mymd.sidebarView` in `localStorage`, with reads and writes in `try/catch`; defaults are `true` and `files`.
- `Ctrl+B` and `#toggle-sidebar` set a per-document override and update the remembered choice. Reset the override when a different document opens, but not on a live refresh.
- On scroll, throttled with `requestAnimationFrame`, call `setCurrentHeading` with `currentHeadingId`.

- [ ] **Step 6: Check it in a browser**

Run: `npm run dev`, then open `http://localhost:1420`.
Expected: both views work; the dot follows scrolling and is the only red; `Ctrl+B` persists through reload; `J`, `K` and `Enter` work; and the drawer works at 700 px.

- [ ] **Step 7: Commit**

```bash
git add index.html src
git commit -m "feat: add Files and Outline sidebar"
```

### Task 9: Find in page

**Files:**
- Create: `src/ui/find.ts`
- Modify: `index.html`, `src/main.ts`, `src/styles/app.css`
- Test: `src/ui/find.test.ts`

**Interfaces:**
- Produces:

```ts
export function findRanges(root: HTMLElement, query: string): Range[];
export class FindController {
  constructor(root: HTMLElement, onChange: (index: number, total: number) => void);
  search(query: string): void;
  next(): void;
  previous(): void;
  refresh(): void;
  clear(): void;
}
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { findRanges } from './find';

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
  it('returns nothing for an empty query', () => expect(findRanges(doc('<p>a</p>'), '')).toEqual([]));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/ui/find.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `findRanges`**

Walk text nodes with a `TreeWalker`, join them, and match with an escaped `RegExp` using flags `giu`. Regex offsets refer to the original text, which avoids the lowercase length problem. Map each offset back to its text node.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/ui/find.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `FindController` and the control**

- Use the CSS Custom Highlight API with highlight names `mymd-find` and `mymd-find-current`. Style `::highlight()` with `--peri-soft` and `--peri-ink`.
- Scroll the current match into view. `refresh()` repeats the search and keeps the index where it can.
- `Ctrl+F` opens the pill in `#find-slot` and focuses the input. `Enter` and `Shift+Enter` move between matches, `Esc` closes and clears, and the count reads "3 of 12" in tabular numbers.

- [ ] **Step 6: Check it in a browser**

Run: `npm run dev`, then open `http://localhost:1420`.
Expected: `Ctrl+F` opens the app's control, not a browser find bar; moving through matches works; and `Esc` clears the highlights.

- [ ] **Step 7: Commit**

```bash
git add index.html src
git commit -m "feat: add find in page"
```

### Task 10: Live refresh and error states

**Files:**
- Modify: `src/main.ts`, `src/styles/app.css`
- Test: `src/core/notice.test.ts`
- Create: `src/core/notice.ts`

**Interfaces:**
- Consumes: `bridge.onFolderChanged`, `samePath`, `folderOf`, `FindController.refresh`.
- Produces: `noticeFor(error: unknown, name: string): { title: string; body: string }`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, it } from 'vitest';
import { noticeFor } from './notice';

it('explains a moved file', () => {
  expect(noticeFor('missing', 'a.md')).toEqual({
    title: 'This file was moved or deleted.',
    body: 'Pick another file, or press Ctrl O to open one.',
  });
});

it('explains an unreadable file without raw error text', () => {
  expect(noticeFor(new Error('os error 5'), 'a.md')).toEqual({
    title: "a.md couldn't be opened.",
    body: 'Check that it is a readable Markdown file, then try again.',
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/core/notice.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `noticeFor`**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/core/notice.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire refresh and errors in `main.ts`**

- After opening a document, call `bridge.watchFolder(folderOf(path))`. A watcher failure is not shown; the document stays readable.
- On `folder-changed`, if any path matches the current one by `samePath`, call `openDocument(path, { keepScroll: true })`, then `FindController.refresh()`.
- Show "Updated just now" in `#doc-status` for 4 seconds after a refresh.
- On every `folder-changed`, call `listFolder` and `setFiles`.
- `keepScroll` restores `scrollTop`, clamped to the new height.
- A failed read shows `noticeFor` in `#notice`, hides `#doc` and clears the outline. The Files view keeps working.
- A document whose text is empty after front matter shows "This file is empty." in `#notice`.

- [ ] **Step 6: Check it in the real app**

Run: `npm run tauri dev`, and open a Markdown file through `Ctrl+O`.
Expected:
- Saving in an editor refreshes the view without moving the scroll position.
- Deleting the file shows the moved-or-deleted notice.
- Restoring the file brings it back.
- Adding a file updates the Files view.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: add live refresh and error states"
```

### Task 11: Packaging, public repository files and final verification

**Files:**
- Create: `src-tauri/app-icon.svg`, `.hallmark/log.json` (ignored), `README.md`, `THIRD_PARTY_NOTICES.md`, `docs/screenshot.png`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Modify: `CHANGELOG.md`, `TODO.md`, `HANDOFF.md`, `src/styles/tokens.css`, `src-tauri/icons/**`, possibly `src-tauri/src/lib.rs`

- [ ] **Step 1: Finish the title bar**

Use the Task 1 result. If the title bar doesn't show the glass, set `DWMWA_CAPTION_COLOR` from Rust to match `--canvas` for the current theme, and update it on the window's theme-changed event.

- [ ] **Step 2: Create the icon**

Draw `src-tauri/app-icon.svg`: a rounded off-white sheet with one red dot. Then run:

```bash
npx tauri icon src-tauri/app-icon.svg
```

- [ ] **Step 3: Add the workflows**

Use the current major version of each action.

- `ci.yml`: on pushes and pull requests to `main`, on `windows-latest`. Set up Node LTS and stable Rust, then run `npm ci`, `npm test`, `npm run build` and `cargo test --manifest-path src-tauri/Cargo.toml`.
- `release.yml`: on tags matching `v*`, on `windows-latest`, with `permissions: contents: write`. Set up the same tools, run `npm ci`, then `tauri-apps/tauri-action` with `tagName: ${{ github.ref_name }}`, `releaseName: MyMD ${{ github.ref_name }}` and `releaseDraft: true`, passing `GITHUB_TOKEN`.

- [ ] **Step 4: Write the public documents**

- `README.md`: cover every item the spec's Open source section lists for the README. Use only true statements, with no invented numbers. Include how to run (`npm run tauri dev`), test (`npm test` and `cargo test --manifest-path src-tauri/Cargo.toml`) and build (`npm run tauri build`), and the one-time **Open with → Always** step.
- `docs/screenshot.png`: a real capture of the installed app showing a non-private sample document. Add it after Step 9.
- `THIRD_PARTY_NOTICES.md`: list each bundled runtime dependency with its license, taken from the installed package metadata, not from memory. Include the full SIL Open Font License text for Inter.
- `CHANGELOG.md`: list what `0.1.0` includes under `## [Unreleased]`. Move it under a dated `## [0.1.0]` heading when the release is tagged.

- [ ] **Step 5: Add the Hallmark records**

Put this first in `tokens.css`, replacing the scores with honest ones from the pre-emit critique:

```css
/* Hallmark · macrostructure: none (desktop app shell) · tone: soft · anchor hue: red
 * theme: Soft Order · pre-emit critique: P_ H_ E_ S_ R_ V_ */
```

Create `.hallmark/log.json` as an array with one entry: the build date, `"macrostructure": "none (app shell)"`, `"theme": "Soft Order"`, `"enrichment": "none"` and `"brief": "MyMD · Windows Markdown viewer"`.

- [ ] **Step 6: Run the Hallmark slop test**

Load the Hallmark skill's `references/slop-test.md` and run its universal gates against the app, skipping marketing-page and mobile-width gates. Fix any failure.

- [ ] **Step 7: Run every automated check**

Run: `npm test` and `npm run build` and `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: all pass.

- [ ] **Step 8: Build the installer**

Run: `npm run tauri build`
Expected: an installer under `src-tauri/target/release/bundle/nsis/`.

- [ ] **Step 9: Install and verify against the spec**

Install it with no admin prompt, then confirm each of these and record the results:

- [ ] Double-clicking a `.md` opens it with the app closed, within the 1 second target
- [ ] Double-clicking another `.md` switches the running window and brings it forward, even when minimized
- [ ] A file in a path with spaces and Unicode opens, and its relative images and links work
- [ ] A file saved as UTF-16 from Notepad reads correctly
- [ ] Live refresh works from an editor that saves by renaming
- [ ] Acrylic stays smooth while dragging and resizing
- [ ] The sidebar stays readable over light and dark wallpaper
- [ ] Turning off Windows transparency effects gives the solid canvas
- [ ] Light and dark follow the Windows setting
- [ ] `Ctrl+Plus`, `Ctrl+Minus` and `Ctrl+0` zoom
- [ ] Window size and position return after a restart
- [ ] A web link opens in the browser, and a link to a `.exe` does nothing

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: add packaging, public docs and workflows"
```

- [ ] **Step 11: Publish, only when the user says so**

```bash
git push -u origin main
```

Expected: the CI workflow passes on GitHub. When the user approves a release, tag `v0.1.0`, push the tag, and confirm that a draft Release appears with the installer. The user reviews and publishes the draft.
