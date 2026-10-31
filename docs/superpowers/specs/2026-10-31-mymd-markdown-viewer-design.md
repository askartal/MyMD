# MyMD design

A beautiful, minimal Markdown viewer for Windows 11.

- **Date:** 2026-10-31
- **Status:** design approved in conversation; written spec awaiting review

## Purpose

**Outcome.** Double-click a `.md` file in Explorer and read it in a calm, polished window.

**Audience.** One person, on their own Windows 11 PC. It works offline, with no accounts.

**What it's used for.** All four of these, without the app feeling busy:

- Reading single files opened from Explorer
- Moving through a folder of notes
- Watching files that an editor or AI tool is writing
- Navigating long documents

**Success criteria.**

- A double-clicked file is open and readable straight away, with a target of under 1 second on this PC.
- A saved change appears without any action and without losing the reading position.
- The app stays easy to maintain: no UI framework, small single-purpose modules, and one small Rust file.
- The window follows the Soft Order look in light and dark, with frosted glass behind the content.

## Scope

**In scope**

- Read-only rendering of `.md` and `.markdown` files
- GitHub-style Markdown: tables, task lists, strikethrough, autolinks and fenced code with syntax highlighting
- Local and web images
- Hidden YAML front matter
- Files and Outline sidebar views
- Live refresh, find in page and zoom
- Opening through Explorer, `Ctrl+O` or drag and drop
- Light and dark modes that follow the Windows setting
- A per-user installer with `.md` and `.markdown` file associations

**Out of scope**

- Editing
- Tabs and multiple windows
- Recent files
- Back and forward history
- Subfolders in the Files view
- Mermaid diagrams and math
- Export and printing
- An in-app theme switch
- Automatic updates
- Windows 10 and other platforms

## User experience

### Window

One window holds an optional sidebar and one reading panel. The default size is 1100 × 760 and the minimum is 480 × 400. Window size and position are restored on launch.

The app keeps the native Windows title bar so Snap Layouts and the window buttons behave normally.

The reading panel has a slim top bar with the file name on the left and the find control on the right. The document sits in a centered column about 720 px wide.

### Sidebar

The sidebar is 248 px wide and has no panel of its own: it sits directly on the glass, in both light and dark modes. A segmented control at the top switches between two views.

- **Files** lists the `.md` and `.markdown` files in the current document's folder, in natural, case-insensitive name order. Subfolders are not shown.
- **Outline** lists H1 to H3 headings from the current document and follows the reading position.

`Ctrl+B` toggles the sidebar. The choice and the last selected view are remembered. When a document's folder holds only that one Markdown file, the sidebar starts hidden for that document whatever the remembered choice is. The first-run default is the Files view.

Below 768 px window width, the sidebar becomes a drawer over the reading panel.

### Opening files

| How | What happens |
| --- | --- |
| Double-click in Explorer, app closed | The app opens with that file |
| Double-click in Explorer, app running | The existing window switches to that file and comes forward |
| `Ctrl+O` | The Windows file picker opens, filtered to Markdown files |
| Drag a Markdown file onto the window | The window switches to that file |
| Launch with no file | The empty state appears |

The app only opens `.md` and `.markdown` files; any other dropped file is ignored. If several files arrive at once, it opens the first Markdown file among them.

The empty state follows the Soft Order pattern: a centered 48 px line icon, one line of text and keyboard hints.

Windows doesn't let apps make themselves the default handler, so the user chooses MyMD once through **Open with → Always**.

### Live refresh

The app watches the current document's folder rather than the file, because many editors save by writing a temporary file and renaming it over the original. Changes are debounced by 150 ms.

- When the current document changes, it's re-read and re-rendered, and the scroll position is kept, clamped to the new document height.
- The top bar shows "Updated just now" for 4 seconds after a refresh.
- When files are added, removed or renamed, the Files view refreshes.

### Find

`Ctrl+F` opens a pill-shaped find control in the top bar. Matching is case-insensitive and covers the rendered document only.

- `Enter` moves to the next match and `Shift+Enter` to the previous one.
- The control shows the position, such as "3 of 12", in tabular numbers.
- `Esc` closes it and clears the highlights.
- Matches stay highlighted across a live refresh.

### Links

| Link | Behavior |
| --- | --- |
| `#heading` | Scrolls within the document |
| `http:`, `https:`, `mailto:` | Opens in the default browser or mail app |
| Relative or absolute path ending in `.md` or `.markdown`, with an optional `#fragment` | Opens in the app and scrolls to the fragment |
| Anything else | Does nothing |

The last rule stops a link in a downloaded document from launching a program.

### Keyboard

| Keys | Action |
| --- | --- |
| `Ctrl+O` | Open a file |
| `Ctrl+B` | Toggle the sidebar |
| `Ctrl+F` | Find |
| `Esc` | Close find or the sidebar drawer |
| `Up`, `Down`, `J`, `K`, `Enter` | Move through and open sidebar items |
| `Ctrl+Plus`, `Ctrl+Minus`, `Ctrl+0` | Zoom in, zoom out and reset |

### Errors

Messages say what happened and what to do next, with no raw exception text.

- **File briefly missing during a save:** retry once after 100 ms before showing anything.
- **File really moved or deleted:** the reading panel shows a calm message, and the sidebar keeps working.
- **Unreadable file:** the panel shows a calm message with the file name.
- **Invalid UTF-8:** the file is decoded lossily and shown anyway.
- **Local image missing:** the image's alt text is shown.

## Visual design

### Design system

Soft Order supplies the tokens and components. Its hex tokens are kept as written, in place of Hallmark's OKLCH default, because Soft Order is the system chosen for this project.

Hallmark supplies these rules on top:

- Every color and font in the app comes from a token.
- No fabricated content in fixtures or the UI.
- No italic headings.
- `tokens.css` carries the Hallmark stamp, and the build is recorded in `.hallmark/log.json`.
- The universal Hallmark slop-test gates run before handoff. Its marketing-page gates and mobile widths don't apply, because this is a desktop app with a 480 px minimum width.

The app sets its design tokens in `src/styles/tokens.css` and keeps Soft Order's `[data-theme]` attribute, which is used for screenshots even though the app has no theme switch.

### Glass

The whole window uses the real Windows Acrylic backdrop, which blurs the desktop and any windows behind the app.

- The reading panel stays solid `--surface`, so text is never read over moving blur.
- The sidebar sits on the glass with the `--glass` tint, and its labels use full-strength `--text` so they stay readable over any wallpaper.
- With Windows transparency effects off (`prefers-reduced-transparency: reduce`), the background becomes solid `--canvas`.
- Windows may show a solid backdrop while the window is inactive. This is normal system behavior.

Two checks happen in the real app:

1. **Performance.** If Acrylic lags while dragging or resizing on this PC, the effect changes to Mica, which is a one-word configuration change.
2. **Title bar.** It should pick up the same backdrop. If it doesn't, it gets tinted to match through the Windows caption color attribute.

### Color

Red appears once at most in any view: an 8 px `--accent` dot on the current heading in Outline or the current file in Files. With the sidebar hidden, there's no red in the view.

Selected sidebar rows use a soft translucent fill. Find highlights use periwinkle. Syntax highlighting uses the Soft Order tag inks and `--text-2`, and it never uses red.

### Typography

- **Interface:** Inter, bundled with the app so it works offline.
- **Document body:** 16 px Inter with a line height of about 1.65. This adds a `--fs-read` token, because 15 px is too small for long reading.
- **Headings:** H1 uses `--fs-display` at weight 700, H2 uses `--fs-xl` at weight 700, H3 uses `--fs-lg` at weight 600, and H4 to H6 use `--fs-md` at weight 600.
- **Code:** `"Cascadia Mono", Consolas, monospace`, through a new `--font-mono` token.
- **Times and counts:** tabular numbers.

## Architecture

### Stack

- **Shell:** Tauri 2, using the WebView2 runtime already on Windows
- **Interface:** TypeScript and plain DOM, with no UI framework
- **Tooling:** Vite and Vitest
- **Markdown:** `marked`, with `highlight.js` (common languages) and `DOMPurify`
- **Rust plugins:** single instance, opener, dialog and window state
- **File watching:** the `notify` crate

### Units

Each unit has one job and can be understood without reading the others.

| File | Job | Depends on |
| --- | --- | --- |
| `src/bridge.ts` | The only module that calls Tauri. It also serves fixtures when running in a plain browser for development | Tauri APIs |
| `src/render.ts` | Turns Markdown text into sanitized HTML | `marked`, `highlight.js`, `DOMPurify` |
| `src/outline.ts` | Assigns heading ids, builds the outline and tracks the current heading | DOM |
| `src/links.ts` | Classifies links and resolves relative paths | Nothing |
| `src/find.ts` | Finds and highlights matches with the CSS Custom Highlight API | DOM |
| `src/sidebar.ts` | Renders the Files and Outline views and handles their keyboard use | DOM |
| `src/main.ts` | Holds app state and wires the units together | All of the above |
| `src/styles/` | `tokens.css`, `app.css`, `prose.css` and `code.css` | Nothing |
| `src-tauri/src/lib.rs` | Commands, the watcher and plugin setup | Tauri, `notify` |

### Rust interface

| Command | Result |
| --- | --- |
| `initial_path()` | The file path passed at launch, if any |
| `read_document(path)` | Name, path and text, with any BOM removed and invalid UTF-8 decoded lossily |
| `list_folder(path)` | Markdown files in that folder, not recursive, in natural order |
| `watch_folder(path)` | Replaces the previous watcher with one on this folder |
| `allow_images(paths)` | Adds resolved local image files to the asset scope, restricted to image extensions |

| Event | Meaning |
| --- | --- |
| `open-path` | A second launch passed a file to the running app |
| `folder-changed` | Debounced changes in the watched folder, with the affected paths |

### Data flow

1. A path arrives through launch, a second launch, the picker, a dropped file, a link or a sidebar click.
2. `main.ts` calls `read_document`, `list_folder` and `watch_folder`.
3. `render.ts` produces sanitized HTML, which is placed in the reading panel.
4. Local images are resolved, passed to `allow_images` and shown through the Tauri asset protocol.
5. `outline.ts` assigns heading ids, and `sidebar.ts` updates both views.
6. A `folder-changed` event that includes the current path repeats steps 3 to 5 and keeps the scroll position. One that adds or removes files refreshes the Files view.

### Security

A downloaded document is untrusted input.

- `DOMPurify` removes scripts, event handlers, iframes, objects, embeds and forms. Other raw HTML, such as `<details>` and `<img>`, is kept.
- The content security policy allows only the app's own scripts.
- Images may load from the app, the asset protocol, `data:` and `https:`. Web images are allowed so README badges work, which means opening a document can contact those image hosts.
- Link rules are enforced by `links.ts`, so a document can't launch local programs.
- All Rust commands are read-only.

## Packaging

- Per-user NSIS installer, so installing needs no admin prompt
- File associations for `.md` and `.markdown`
- Windows 11 x64
- Not code-signed, because it's built and used locally

## Setup

Building needs a one-time install of Rust and the Microsoft C++ Build Tools. Node, npm, Git and WebView2 are already on this PC. The Build Tools install shows an admin prompt, which the user approves.

## Testing

**Automated**

- `render.ts`: tables, task lists, code highlighting, hidden front matter, and removal of scripts and event handlers
- `outline.ts`: heading levels, unique ids and duplicate headings
- `links.ts`: every row of the link table, including Windows paths and fragments
- Rust: `list_folder` filtering and order, and `read_document` handling of BOMs and invalid UTF-8

**In a browser, using the fixtures in `bridge.ts`**

- Layout at 1440, 1024, 768 and 480 px, in light and dark
- Find behavior, focus rings, keyboard use and reduced motion

**In the installed app**

- Opening from Explorer, with the app closed and running
- Live refresh from an editor that saves by renaming
- Acrylic while dragging and resizing, and over light and dark wallpaper
- Title bar appearance
- Behavior with Windows transparency effects off
- Launch time against the 1 second target
