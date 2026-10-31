# Handoff

**Last updated:** 2026-10-31

Rewrite this file at the end of every session so the next one can start cold.

## Current state

- The design, spec and implementation plan are finished. The plan is waiting for the maintainer's review.
- There's no application code yet.
- Project notes and repository config are in place.
- Git is initialized on `main`, with `origin` set to https://github.com/askartal/MyMD.
- The GitHub repository is public and empty. Nothing has been pushed.

## Next step

Once the maintainer has reviewed the plan and chosen how to build it, start at plan Task 1.

Task 1 needs the maintainer present to approve an admin prompt for the C++ Build Tools.

## Waiting on the maintainer

- Plan review and choice of execution approach
- Confirmation of the MIT license
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
