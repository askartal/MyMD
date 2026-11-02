# Handoff

**Last updated:** 2026-11-02

Rewrite this file at the end of every session so the next one can start cold.

## Current state

- `v0.1.0` is published: https://github.com/askartal/MyMD/releases/tag/v0.1.0
- `main` holds unreleased work since `v0.1.0`, listed under "Unreleased" in `CHANGELOG.md`:
  - The window is undecorated, and the toolbar is its top edge. It holds the sidebar toggle, the file name, find, and minimize, maximize and close. See decision 022.
  - The four [reading-session fixes](docs/superpowers/plans/2026-11-01-reading-session-fixes.md) are built and tested.
  - Interface polish: glass and panel contrast, the outline's heading levels, borders on prose and code blocks, the empty state and the app icon.
  - Even toolbar spacing, from 2026-11-02. The controls have 8 px above and below, find is centered on the window, and the toggle, the sidebar and the panel all start at the same 8 px gutter. It was checked in headless Edge in light and dark mode at 1280, 900 and 700 px. It hasn't been seen in the real window yet.
- The maintainer has confirmed every check that needs a person. See "Maintainer checks" below.
- On Windows, 164 TypeScript tests, 14 Rust tests and `npm run build` pass, checked on 2026-11-02.
- The local installer, `src-tauri/target/release/bundle/nsis/MyMD_0.1.0_x64-setup.exe`, was rebuilt on 2026-11-01 after the toolbar change, so it doesn't have the spacing fix. Its version is still 0.1.0.
- Cloud agents start from `AGENTS.md`. On Linux, `npm test` and `npm run build` pass. `cargo test` needs rustc 1.90 or later and the WebKitGTK packages, and 13 of its 14 tests pass there. `args_give_first_markdown_as_absolute_path` needs Windows path joins, which CI covers on `windows-latest`. Acrylic, WebView2 and the NSIS installer are Windows-only.
- `origin` is https://github.com/askartal/MyMD, and the repository is public. The `cursor/*` branches on GitHub are all merged into `main`.

## Next step

Start the "Documents are untrusted" batch under "Not in this plan" at the end of the [reading-session plan](docs/superpowers/plans/2026-11-01-reading-session-fixes.md). It comes before another release:

- Render Markdown off the interface thread, with a timeout
- Turn on DOMPurify's `SANITIZE_NAMED_PROPS`
- Add `base-uri`, `form-action` and `object-src` to the content security policy, and a Rust navigation guard
- Run `allow_images` and `watch_folder` as async commands

"The next tag" batch follows: harden `release.yml` and remove `serde_json`. Each batch gets its own plan.

## Waiting on the maintainer

- Nothing blocks the next batch. The features under "Later" in `TODO.md` each need a decision before work starts.

## Maintainer checks

The maintainer confirmed these on 2026-11-02, on the development PC:

- Acrylic stays smooth while dragging and resizing, so it stays (decision 007).
- The undecorated window: the toolbar drags, a double-click on an empty part maximizes, minimize, close and resize work, and Acrylic and the rounded corners look right, in light and dark mode.
- The sidebar stays readable over light and dark wallpaper.
- Turning off Windows transparency effects gives the solid canvas.
- Light and dark follow the Windows setting when it changes.
- Double-clicking a `.md` file after choosing **Open with → Always** opens it in MyMD.

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
| Python | Not installed |

In a Bash shell, add `~/.cargo/bin` to `PATH` if `cargo` isn't found. On Windows, run `npx` as `npx.cmd` from PowerShell.

The browser pane doesn't paint reliably while it's hidden, so layout captures are easier through headless Edge and the DevTools protocol.

## Known risks

- **Snap Layouts don't appear on the maximize button.** The window is undecorated so the toolbar can be its top edge (decision 022). Dragging to a screen edge may still snap.
- **Acrylic can lag on some Windows builds.** It's smooth on the development PC. If users report lag, Mica is a one-word change in `tauri.conf.json` (decision 007).
- **SmartScreen warns on downloaded installers** because releases aren't code-signed. The README explains this.
- **A live refresh waits for any load in flight.** A read that hangs, such as on a dead network share, holds back refreshes until it fails.
- **A pathological document can freeze the window.** Rendering runs on the interface thread, and thousands of repeated `_a ` take many seconds. This is the first item in the next batch.
- **Don't run `create-tauri-app` in this folder.** It can clear a non-empty folder.

## Task results

**Task 1 (glass check, in dark mode).** Acrylic renders: the desktop is blurred behind the window. The native title bar shows the same glass.

**Task 10 (real app).** Against sample files, a save kept the scroll position and showed "Updated just now". Deleting the file showed the notice with the sidebar still working, restoring it returned to the same place, a new file appeared in the list, and a rename-style save refreshed the page.

**Task 11 (installed app).**

| Check | Result |
| --- | --- |
| Install | No admin prompt, per-user |
| Launch with a file, closed app | 500 to 610 ms to a rendered document, against a 1 second target |
| Second launch | One process, switches file, restores from minimized, comes forward |
| Path with a space and Unicode | Opens, with its relative image and link working |
| UTF-16 file | Reads correctly, including Turkish letters |
| Zoom | `Ctrl+Plus`, `Ctrl+Minus` and `Ctrl+0` work |
| Window size and position | Return after a restart |
| Web link | Reaches the default browser |
| Link to a program | Does nothing |
