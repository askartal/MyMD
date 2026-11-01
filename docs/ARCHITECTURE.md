# Architecture

MyMD is a Tauri 2 app. A small Rust layer reads files and watches folders, and a plain TypeScript interface renders them in WebView2.

## File layout

This is the current layout.

```text
MyMD/
├── .claude/launch.json        Dev server for the Claude desktop browser pane
├── .github/workflows/
│   ├── ci.yml                 Tests and builds for pushes and pull requests
│   └── release.yml            Draft GitHub Release on v* tags
├── docs/
│   ├── ARCHITECTURE.md        This file
│   ├── DECISIONS.md           Why things are the way they are
│   ├── DESIGN.md              Visual and interaction rules
│   ├── screenshot.png         Used by the README
│   └── superpowers/           Dated specs and implementation plans
├── src/
│   ├── main.ts                App state; wires everything together
│   ├── core/                  Logic with no Tauri and no app state
│   │   ├── async.ts           Latest-only runs and one-time retry
│   │   ├── images.ts          Rewrites local image sources
│   │   ├── links.ts           Link classification and Windows paths
│   │   ├── notice.ts          Error messages
│   │   ├── outline.ts         Heading ids and the outline
│   │   ├── render.ts          Markdown to sanitized HTML
│   │   └── tables.ts          Scrolling wrappers for tables
│   ├── ui/                    Interface components
│   │   ├── find.ts            Find in page
│   │   └── sidebar.ts         Files and Outline views
│   ├── platform/              The only layer that touches Tauri
│   │   ├── bridge.ts          Commands, events and plugins
│   │   └── fixtures.ts        Sample documents for browser development
│   └── styles/
│       ├── tokens.css         Every design value lives here
│       ├── app.css            Window, sidebar and controls
│       ├── prose.css          Rendered documents
│       └── code.css           Syntax highlighting
├── src-tauri/
│   ├── src/lib.rs             Commands, watcher and plugin setup
│   ├── src/main.rs            Entry point
│   ├── capabilities/          Permissions
│   ├── icons/                 Generated from app-icon.svg
│   ├── app-icon.svg           Source icon
│   └── tauri.conf.json        Window, security and installer settings
├── AGENTS.md                  How to run the repo; product rules stay in CLAUDE.md
├── CHANGELOG.md               User-visible changes
├── CLAUDE.md                  Instructions for coding agents
├── HANDOFF.md                 Current state and next step
├── LICENSE                    MIT
├── README.md                  Public project page
├── THIRD_PARTY_NOTICES.md     Bundled dependencies and their licenses
└── TODO.md                    Status of all work
```

Tests sit beside the code they cover, as `*.test.ts`. Rust tests live in `src-tauri/src/lib.rs`.

## Layers

| Layer | May use | Must not use |
| --- | --- | --- |
| `src/main.ts` | Every layer | Direct Tauri imports |
| `src/ui` | `src/core`, and types from `src/platform` | App state, direct Tauri imports |
| `src/core` | Third-party libraries and the DOM | `src/ui`, `src/platform`, app state |
| `src/platform` | Tauri | Everything else, except fixtures in dev builds |
| `src-tauri` | Tauri and `notify-debouncer-mini` | Any write to the user's files |

## How a document opens

1. A path arrives from launch, a second launch, the file picker, a dropped file, a link or the sidebar.
2. `main.ts` reads it through `bridge.ts`, ignoring any older read still in flight.
3. `render.ts` produces sanitized HTML in a detached template, and `tables.ts` wraps its tables.
4. `images.ts` rewrites local image sources, and Rust allows those files in the asset scope.
5. The HTML replaces the document, `outline.ts` assigns heading ids, and `sidebar.ts` updates.
6. `bridge.ts` starts watching the folder. A `folder-changed` event that includes the current file repeats steps 2 to 5 and keeps the scroll position.

## Where to change things

| To change | Look in |
| --- | --- |
| Markdown features or sanitizing | `src/core/render.ts` |
| What links do | `src/core/links.ts` |
| Error wording | `src/core/notice.ts` |
| Colors, sizes and spacing | `src/styles/tokens.css` |
| How documents look | `src/styles/prose.css` |
| Keyboard shortcuts | `src/main.ts` |
| File access or watching | `src-tauri/src/lib.rs`, then `src/platform/bridge.ts` |
| Window, glass or installer settings | `src-tauri/tauri.conf.json` |
