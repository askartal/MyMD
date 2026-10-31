# Decisions

Why MyMD is the way it is. Add new decisions at the end. To reverse one, add a new entry and mark the old one as replaced.

## 001: Tauri 2 rather than Electron

**Accepted, 2026-10-31.** The installer should be around 10 MB, and it uses the WebView2 runtime that Windows keeps patched, so the app doesn't ship its own browser. The cost is a one-time Rust and C++ Build Tools install for anyone building from source.

## 002: No UI framework

**Accepted, 2026-10-31.** The interface is small, and plain TypeScript keeps dependencies and upgrades to a minimum.

## 003: Read-only

**Accepted, 2026-10-31.** MyMD is a viewer. Editing stays in the user's editor, and live refresh connects the two.

## 004: One window, with no tabs

**Accepted, 2026-10-31.** A second launch switches the existing window to the new file. This keeps the app simple and matches a viewer's job.

## 005: Soft Order for the design, with Hallmark's rules on top

**Accepted, 2026-10-31.** Soft Order supplies the tokens and components, and its hex values are kept. Hallmark supplies the discipline: locked tokens, honest content and no italic headings.

## 006: Light sidebar on glass, not a dark sidebar

**Accepted, 2026-10-31.** This replaces Soft Order's dark sidebar variant at the maintainer's request. The sidebar has no panel of its own, so it follows the window's light or dark mode.

## 007: Acrylic for the glass, with Mica as the fallback

**Accepted, 2026-10-31.** Acrylic gives real frosted glass by blurring what's behind the window. It can lag on some Windows builds, so Task 1 tests it. Mica is a one-word configuration change. On the development PC (Windows 11 build 26300), Acrylic renders correctly and the title bar shows the same glass. Smoothness while dragging and resizing needs a person to judge, so it stays open until they confirm it.

## 008: Solid reading panel

**Accepted, 2026-10-31.** Text is never read over moving blur.

## 009: Native title bar

**Accepted, 2026-10-31.** It keeps Snap Layouts and normal window behavior, which a custom title bar would have to rebuild.

## 010: Theme follows Windows, with no in-app switch

**Accepted, 2026-10-31.** One less control, and the glass stays consistent with the system theme.

## 011: Web images are allowed

**Accepted, 2026-10-31.** README badges and hosted images are common. The trade-off is that opening a document can contact those hosts, so the README discloses it.

## 012: Links can't launch programs

**Accepted, 2026-10-31.** Only anchors, `http`, `https`, `mailto` and Markdown files do anything. Every other link does nothing, because documents are untrusted.

## 013: MIT license

**Accepted, 2026-10-31.** It's simple and widely understood. Confirmed by the maintainer.

## 014: Unsigned releases, published from drafts

**Accepted, 2026-10-31.** Code signing costs money and adds process for a new project, so SmartScreen will warn and the README explains why. Release builds stop at a draft so a person reviews each one.

## 015: `src` split into core, ui and platform

**Accepted, 2026-10-31.** Logic stays testable without Tauri, and the Tauri boundary stays in one place.

## 016: Project notes are committed

**Accepted, 2026-10-31.** Agents and contributors share the same context. Because the repository is public, these notes must contain nothing private. `.hallmark/` holds local tool records, so it's ignored.

## 017: Documents can't reach network paths

**Accepted, 2026-10-31.** Images load as soon as a document opens, and Windows answers a network path by contacting that host with the user's identity. So a path written in a document, such as `//host/a.png`, is refused for both images and links. Relative paths still work when the document itself is on a network share.
