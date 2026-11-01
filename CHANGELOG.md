# Changelog

User-visible changes to MyMD. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The top of the window is the toolbar: the file name, find, and the window buttons sit there, and the page starts below them
- Refined the reading panel elevation, glass tint contrast, sidebar/topbar alignment, outline heading hierarchy, prose/code block borders, empty state card and app icon

### Fixed

- A different file opens at the top, including after the previous file was missing or empty
- The sidebar drawer closes for Ctrl+O, a dropped file and a second launch
- Find starts at the first match when a different file opens, and keeps its place across a save
- A link to a named anchor or any element id scrolls to it

## [0.1.0] - 2026-10-31

### Added

- Read-only rendering of `.md` and `.markdown` files, with GitHub-style tables, task lists, strikethrough, autolinks and highlighted code
- Local and web images, with a missing image's description shown in its place
- Hidden YAML front matter
- A sidebar with Files and Outline views, which becomes a drawer in a narrow window
- Live refresh that keeps your reading position
- Find on the page, and zoom
- Opening from Explorer, `Ctrl+O` or drag and drop, with one window that switches to each new file
- Light and dark modes that follow Windows, and a frosted glass window
- A per-user installer with `.md` and `.markdown` file associations
