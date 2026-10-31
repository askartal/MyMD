# Handoff

**Last updated:** 2026-10-31

Rewrite this file at the end of every session so the next one can start cold.

## Current state

- The maintainer chose Native execution: one session builds every task, then one fresh reviewer checks the whole branch.
- Plan Tasks 1 to 6 are finished and committed on branch `build/v0.1.0`. `main` hasn't changed, and nothing has been pushed.
- 62 TypeScript tests and 14 Rust tests pass.
- These parts exist: Markdown rendering, links and paths, the outline, the async helpers, the Tauri bridge, the fixtures and the Rust backend.
- The app opens a window with real glass, but it has no interface yet. That starts with Task 7.
- `origin` is https://github.com/askartal/MyMD. The GitHub repository is public and empty.

## Next step

Use `superpowers:executing-plans` and resume at plan Task 7. The ledger at `.superpowers/sdd/2026-10-31-mymd-markdown-viewer/progress.md` is local. It lists finished tasks and every ruling made so far, and those rulings must reach the maintainer in the final message. If it's gone, use `TODO.md`, `git log` and `docs/DECISIONS.md`.

Before writing CSS, load `anthropic-skills:soft-order-ui` and `modern-web-guidance:modern-web-guidance`, and read `docs/DESIGN.md`. On Windows, run the guidance tool from PowerShell with `npx.cmd`. These guides looked relevant, but none has been read yet:

- `navigation-drawer` for the Task 8 drawer
- `highlight-text-ranges` for Task 9
- `dark-mode` for the theme tokens

Notes for Task 7:

- `bridge.setTitle(title)` exists on top of the plan's interface, because `document.title` doesn't reach the native title bar.
- Read link targets with `getAttribute('href')`, because `a.href` returns a resolved URL.
- In a browser, `http://localhost:1420/?empty` shows the empty state.
- In a Bash shell, add `/c/Users/Ali/.cargo/bin` to `PATH` if `cargo` isn't found.

## Waiting on the maintainer

- Judge Acrylic smoothness while dragging and resizing, once Task 7 puts the real interface in the window
- Go-ahead to merge `build/v0.1.0` into `main`
- Go-ahead for the first push

## Development environment

| Tool | State |
| --- | --- |
| Windows | 11 Pro, build 26300, dark mode |
| Node | 26.12.1 |
| npm | 11.20.0 |
| Git | 2.56.0 |
| WebView2 | 156.0.4314.50 |
| GitHub CLI | Signed in as `askartal` |
| Rust | 1.99.1, stable MSVC |
| C++ Build Tools | Visual Studio Build Tools 2022 |

## Known risks

- **Acrylic may lag** while dragging or resizing, and this Windows build is one where that's known to happen. If it lags, change `acrylic` to `mica` in `tauri.conf.json` and record it in `docs/DECISIONS.md`.
- **Light mode's title bar is unchecked.** The title bar matched the glass in dark mode. Task 11 checks it again and tints it if needed.
- **Don't run `create-tauri-app` in this folder.** It can clear a non-empty folder.
- **SmartScreen warns on downloaded installers** because releases aren't code-signed. The README has to explain this.

## Task results

**Task 1 (glass check, in dark mode).** Acrylic renders: the desktop is blurred behind the window. The native title bar shows the same glass, with no seam. Smoothness while dragging and resizing hasn't been confirmed by a person yet.
