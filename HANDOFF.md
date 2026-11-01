# Handoff

**Last updated:** 2026-11-01

Rewrite this file at the end of every session so the next one can start cold.

## Current state

- The window is undecorated. The toolbar is the top edge and holds the file name, find, and minimize, maximize and close. This is not committed. Tauri cannot overlay the page under the native Windows caption.
- All 11 plan tasks are built and merged into `main`, which is pushed to GitHub, and CI passes.
- `v0.1.0` is published: https://github.com/askartal/MyMD/releases/tag/v0.1.0
- 150 TypeScript tests pass, and `npm run build` passes. Rust sources are untouched. The window is undecorated, which still needs a look in the real window.
- The whole-branch review is done, and its Critical and Important findings are fixed and tested. Deferred minors are under "Later" in `TODO.md`.
- The installer is `MyMD_0.1.0_x64-setup.exe`, 2.4 MiB, and it's installed on the development PC.
- `origin` is https://github.com/askartal/MyMD, and the repository is public.
- Cloud agents start from `AGENTS.md`. On Linux, `npm test` (149) and `npm run build` pass. `cargo test` compiles with rustc ≥ 1.90 and the WebKitGTK packages, and 13 of 14 tests pass. `args_give_first_markdown_as_absolute_path` needs Windows path joins, which `.github/workflows/ci.yml` covers on `windows-latest`. Acrylic, WebView2 and the NSIS installer stay Windows-only.

## Next step

The toolbar is in the working tree. The maintainer should look at it in the real window, then say if it should be committed.

## Waiting on the maintainer

- Judge the items in "Checks only a person can make" below

## Checks only a person can make

- Acrylic stays smooth while dragging and resizing. If it lags, change `acrylic` to `mica` in `tauri.conf.json` and record it in `docs/DECISIONS.md`.
- The undecorated window: the toolbar drags, a double-click on an empty part maximizes, minimize and close work, resize still works, and Acrylic and the rounded corners still look right. The Snap Layouts flyout will not appear on the maximize button. Check light mode as well as dark.
- The sidebar stays readable over light and dark wallpaper.
- Turning off Windows transparency effects gives the solid canvas.
- Light and dark follow the Windows setting when it changes.
- Double-clicking a `.md` file after choosing **Open with → Always**. The launch itself was tested by passing the file path, which is what Explorer does.

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

- **Acrylic may lag** while dragging or resizing, and this Windows build is one where that's known to happen.
- **Snap Layouts do not appear on the maximize button.** The window is undecorated so the toolbar can be the top edge. Dragging to a screen edge may still snap. An undecorated window with `shadow: true` can also show a 1 px border; if that looks wrong, set `shadow` to `false` in `tauri.conf.json` and record it here.
- **SmartScreen warns on downloaded installers** because releases aren't code-signed. The README explains this.
- **A live refresh waits for any load in flight.** A read that hangs, such as on a dead network share, holds back refreshes until it fails.
- **A pathological document can freeze the window.** Rendering runs on the interface thread, and thousands of repeated `_a ` take many seconds. See "Later" in `TODO.md`.
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
