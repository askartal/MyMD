# Handoff

**Last updated:** 2026-10-31

Rewrite this file at the end of every session so the next one can start cold.

## Current state

- All 11 plan tasks are built and committed on branch `build/v0.1.0`. `main` hasn't changed, and nothing has been pushed.
- 107 TypeScript tests and 14 Rust tests pass, and `npm run build` and `npm run tauri build` both finish.
- The installer is `MyMD_0.1.0_x64-setup.exe`, 2.4 MiB, and it's installed on the development PC.
- `origin` is https://github.com/askartal/MyMD. The GitHub repository is public and empty.

## Next step

1. Run the final whole-branch review, then one fix pass. The local ledger at `.superpowers/sdd/2026-10-31-mymd-markdown-viewer/progress.md` has every ruling. If it's gone, use `git log` and `docs/DECISIONS.md`.
2. Use `superpowers:finishing-a-development-branch`.

## Waiting on the maintainer

- Judge the items in "Checks only a person can make" below
- Go-ahead to merge `build/v0.1.0` into `main`
- Go-ahead for the first push, then the `v0.1.0` tag and publishing the draft Release

## Checks only a person can make

- Acrylic stays smooth while dragging and resizing. If it lags, change `acrylic` to `mica` in `tauri.conf.json` and record it in `docs/DECISIONS.md`.
- The title bar looks right in Windows light mode. See "Known risks".
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

In a Bash shell, add `/c/Users/Ali/.cargo/bin` to `PATH` if `cargo` isn't found. On Windows, run `npx` as `npx.cmd` from PowerShell.

The browser pane doesn't paint reliably while it's hidden, so layout captures are easier through headless Edge and the DevTools protocol.

## Known risks

- **Acrylic may lag** while dragging or resizing, and this Windows build is one where that's known to happen.
- **The title bar has no tint.** It shows the Acrylic backdrop but not the app's `--glass` tint, so with a forced light theme over a dark wallpaper it reads darker than the window below it. If that looks wrong in real light mode, set `DWMWA_CAPTION_COLOR` from Rust, as the spec allows.
- **SmartScreen warns on downloaded installers** because releases aren't code-signed. The README explains this.
- **Images can shift a refreshed page.** Images without a set size load after the page swaps, so a save can briefly move the text below them.
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
