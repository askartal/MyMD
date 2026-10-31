# Handoff

**Last updated:** 2026-10-31

Rewrite this file at the end of every session so the next one can start cold.

## Current state

- The design, spec and implementation plan are finished.
- The maintainer chose Native execution: one session builds every task, then one fresh reviewer checks the whole branch.
- Building has started on branch `build/v0.1.0`. `main` stays as it is until the maintainer approves a merge.
- Project notes and repository config are in place.
- Git is initialized on `main`, with `origin` set to https://github.com/askartal/MyMD.
- The GitHub repository is public and empty. Nothing has been pushed.

## Next step

Use `superpowers:executing-plans` to continue the plan. The ledger at `.superpowers/sdd/2026-10-31-mymd-markdown-viewer/progress.md` is local and shows which tasks are finished. If it's gone, use `TODO.md` and `git log`.

## Waiting on the maintainer

- Go-ahead for the first push

## Development environment

| Tool | State |
| --- | --- |
| Windows | 11 Pro |
| Node | 26.12.1 |
| npm | 11.20.0 |
| Git | 2.56.0 |
| WebView2 | 156.0.4314.50 |
| GitHub CLI | Signed in as `askartal` |
| Rust | Not installed yet (Task 1) |
| C++ Build Tools | Not installed yet (Task 1) |

## Known risks

- **Acrylic may lag** while dragging or resizing. Task 1 tests this first. If it lags, change `acrylic` to `mica` in `tauri.conf.json` and record it in `docs/DECISIONS.md`.
- **The title bar may not pick up the glass.** Task 1 checks it and Task 11 fixes it if needed. Record the Task 1 result here.
- **Don't run `create-tauri-app` in this folder.** It can clear a non-empty folder. Task 1 uses `tauri init`, which doesn't.
- **SmartScreen warns on downloaded installers** because releases aren't code-signed. The README has to explain this.

## Task results

Nothing recorded yet.
