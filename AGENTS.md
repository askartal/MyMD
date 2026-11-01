# Agent instructions

Read [CLAUDE.md](CLAUDE.md) first. It holds the product rules, which notes to update, and what is out of scope. This file is how to run the repo.

## Stack

Tauri 2 app for Windows 11. The interface is plain TypeScript with no UI framework, bundled by Vite and tested with Vitest in jsdom. Rust in `src-tauri` only reads files and watches folders. The window is WebView2 with an Acrylic effect (`windowEffects` in `src-tauri/tauri.conf.json`). npm and `package-lock.json` manage JavaScript. Rust edition is 2024 and `rust-version` is 1.90.

## Folder map

| Path | Role |
| --- | --- |
| `src/core` | Markdown, links, outline. No imports from `src/ui` or `src/platform`. |
| `src/ui` | Sidebar and find. |
| `src/platform/bridge.ts` | The only file that imports `@tauri-apps/*`. |
| `src/platform/fixtures.ts` | Sample documents for `npm run dev`. |
| `src/styles/tokens.css` | Every color, font, size and spacing value. |
| `src-tauri` | Commands, watcher, capabilities, icons, `tauri.conf.json`. |
| `docs/` | Architecture, decisions, design, and the dated spec and plan. |

## Commands

```bash
npm ci
npm test
npm run build
npm run dev
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri dev
npm run tauri build
```

`npm run build` is `tsc --noEmit && vite build`. There is no separate lint script. `npm run dev` serves the interface with fixtures at `http://localhost:1420/` (IPv6 `::1` only, so `127.0.0.1` does not connect). `npm run tauri dev` and `npm run tauri build` are the real window and the NSIS installer.

## Verify a change

1. Run `npm test` and `npm run build`.
2. Run `cargo test --manifest-path src-tauri/Cargo.toml` when Rust is available.
3. For interface work, open `npm run dev` and read a fixture: the sidebar lists `guide.md`, and the page shows "Reading with MyMD".
4. Pull requests run [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on `windows-latest`: `npm ci`, `npm test`, `npm run build`, then `cargo test`. That job is where the Windows path test is expected to pass. It does not open a window, so Acrylic, the title bar and the installer still need a Windows 11 machine. See "Checks only a person can make" in `HANDOFF.md`.

## Windows-only

- Acrylic (and the Mica fallback), WebView2, the native title bar and light/dark following Windows.
- The installer. `bundle.targets` is `nsis`, per-user. Linux does not produce `MyMD_*_x64-setup.exe`.
- `.md` / `.markdown` file associations and "Open with".
- `src/core/links.ts` resolves Windows paths and refuses UNC paths. Leave that behavior as it is.
- One Rust test, `args_give_first_markdown_as_absolute_path`, joins with the host separator. On Linux it gets `C:\work/notes\a.md` and fails. The other 13 pass. Do not change the test to hide that; `windows-latest` CI is the check.

## Conventions

- Tests sit beside the code as `*.test.ts`. Work test-first.
- Rust commands stay read-only. Treat every document as untrusted: output goes through DOMPurify, and links go through `classifyLink`.
- Sentence case. No italic headings. Red appears at most once in a view: one 8 px `--accent` dot.
- Do not push, tag or publish a release unless the maintainer says so.
- Do not run `create-tauri-app` in this folder.

## Cloud agents

The TypeScript checks need Node and `npm ci`. Rust tests need rustc 1.90 or newer (stable 1.99 works) plus the Tauri Linux packages: `libwebkit2gtk-4.1-dev`, `build-essential`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf` and `pkg-config`. The image's older rustc 1.83 cannot compile `edition = "2024"`. The saved Cloud Agent environment is expected to carry the newer toolchain and those libraries; its install command is `npm ci`.
