# TODO

Task detail lives in the [implementation plan](docs/superpowers/plans/2026-10-31-mymd-markdown-viewer.md). This file tracks status.

## Now

- [x] Maintainer: review the plan and choose how it gets built (Native)
- [x] Maintainer: say when to start building
- [x] Maintainer: confirm the MIT license

## Build v0.1.0

- [x] Task 1: Toolchain, scaffold and glass check
- [x] Task 2: Markdown rendering
- [x] Task 3: Paths and links
- [x] Task 4: Outline
- [x] Task 5: Rust backend
- [x] Task 6: Bridge, fixtures and async helpers
- [x] Task 7: Shell, styles and opening documents
- [x] Task 8: Sidebar
- [x] Task 9: Find in page
- [x] Task 10: Live refresh and error states
- [x] Task 11: Packaging, public repository files and final verification

## Publish

Each of these waits for the maintainer's go-ahead.

- [x] Push `main` to GitHub
- [x] Confirm the CI workflow passes
- [x] Tag `v0.1.0`
- [x] Review the draft Release and publish it

## Cloud agents

- [x] Document Linux commands, the one Windows-only Rust test, and `windows-latest` CI in `AGENTS.md`

## Next

The reading-session plan is written and not started: [Reading session fixes](docs/superpowers/plans/2026-11-01-reading-session-fixes.md).

- [ ] Task 1: Reset the remembered scroll position
- [ ] Task 2: Close the drawer on outside opens
- [ ] Task 3: Restart find on a different document
- [ ] Task 4: Scroll to named anchors
- [ ] Task 5: Record the fixes

## Later

Out of scope for v0.1.0. Each needs a decision before work starts.

- Back and forward history
- Subfolders in the Files view
- Recent files
- Mermaid diagrams and math
- Export and printing
- Automatic updates
- Code signing
- Windows 10 support

## Deferred from the v0.1.0 review

Small issues the final review found. None blocks a release.

- Move Markdown rendering to a worker with a timeout, because a pathological document can freeze the window
- Run `allow_images` and `watch_folder` as async commands
- Keep document ids away from shell styles, for example with DOMPurify's `SANITIZE_NAMED_PROPS`
- Run tests in `release.yml`, check the tag against the version, and pin actions to commit hashes
- Add `base-uri`, `form-action` and `object-src` to the content security policy, and a Rust navigation guard
- Remove `serde_json` from `Cargo.toml` if nothing needs it
