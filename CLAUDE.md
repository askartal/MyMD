# MyMD

An open-source, read-only Markdown viewer for Windows 11, built with Tauri 2 and plain TypeScript. Public repository: https://github.com/askartal/MyMD

## Start here

1. Read `HANDOFF.md` for the current state and the next step.
2. Check `TODO.md` for what's open.
3. For build work, follow the [implementation plan](docs/superpowers/plans/2026-10-31-mymd-markdown-viewer.md) and its [spec](docs/superpowers/specs/2026-10-31-mymd-markdown-viewer-design.md).

## Project notes

| File | What it holds | When to update it |
| --- | --- | --- |
| `HANDOFF.md` | Current state, next step and known risks | End of every session |
| `TODO.md` | Status of all work | When a task starts or finishes |
| `CHANGELOG.md` | User-visible changes | With each user-visible change |
| `docs/ARCHITECTURE.md` | File layout, layers and where to change things | When structure changes |
| `docs/DECISIONS.md` | Why things are the way they are | When a decision is made or reversed |
| `docs/DESIGN.md` | Visual and interaction rules | When the design changes |
| `docs/superpowers/` | Dated specs and plans | New work only; don't rewrite finished plans |

## Commands

These work once plan Task 1 is done.

```bash
npm run dev
```

Runs the interface in a browser with fixtures, on port 1420.

```bash
npm run tauri dev
```

Runs the real app.

```bash
npm test
```

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

```bash
npm run build
```

Type-checks and builds the interface.

```bash
npm run tauri build
```

Builds the installer.

## Rules

**Architecture**

- No UI framework.
- Only `src/platform/bridge.ts` imports from `@tauri-apps/*`.
- `src/core` imports nothing from `src/ui` or `src/platform`.
- All Rust commands are read-only.
- Treat every opened document as untrusted. Output goes through `DOMPurify`, and links go through `classifyLink`.

**Design**

- Read `docs/DESIGN.md` before changing the interface.
- Every color, font, size and spacing value comes from `src/styles/tokens.css`.
- Red appears at most once in a view: one 8 px `--accent` dot.
- Interface copy is sentence case. Errors say what happened and what to do, with no raw exception text.
- No italic headings.

**Code**

- Work test-first. Tests sit beside the code as `*.test.ts`.
- Keep files small and single-purpose.
- Keep the app's scope in check: the spec's out-of-scope list stands until a decision changes it.

**Public repository**

- Commits, notes, fixtures and tests contain no secrets, real local paths or private details.
- Fixtures and documentation use true statements with no invented figures.
- Do not push, tag or create a release until the maintainer explicitly says to.

## End of every session

1. Update `TODO.md`.
2. Rewrite `HANDOFF.md` so the next session can start cold.
3. Add new decisions to `docs/DECISIONS.md`.
