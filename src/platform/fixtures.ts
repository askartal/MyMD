import type { DocumentData } from './bridge';

const fence = '```';

const guide = `---
title: Sample document
---

# Reading with MyMD

MyMD is a read-only Markdown viewer for Windows 11. It opens a file, shows it in a calm window, and keeps it up to date while another program writes to it. This sample exists so the interface can be checked in a browser, and it exercises the pieces a typical document uses.

See the [keyboard shortcuts](shortcuts.md) for everything the app responds to.

## Opening a file

There are four ways to open a document, and each one ends in the same place.

- Double-click a Markdown file in Explorer.
- Press \`Ctrl+O\` and pick a file.
- Drag a file onto the window.
- Follow a link from one Markdown file to another.

If the app is already running, the existing window switches to the new file. There are no tabs and no second windows.

### File types

MyMD opens files ending in \`.md\` or \`.markdown\`, in any letter case. Other files dropped on the window are ignored.

### Where the sidebar fits

The Files view lists Markdown files beside the current document, and the Outline view lists its headings. When a folder holds only one Markdown file, the sidebar stays out of the way until you ask for it.

#### Hidden front matter

A YAML block at the very top of a file is left out of the rendered page. This document starts with one, and you can't see it here.

## What the document supports

| Feature | Written as | Notes |
| --- | --- | --- |
| Tables | Pipes and dashes | Wide tables scroll inside the page |
| Task lists | \`- [x]\` | Shown as read-only checkboxes |
| Strikethrough | \`~~text~~\` | Follows GitHub's rules |
| Code | Fenced blocks | Common languages are highlighted |

### Task lists

- [x] Render the document
- [x] Keep the reading position across a refresh
- [ ] Edit the document, which MyMD leaves to your editor

### Code

${fence}ts
export function greet(name: string): string {
  // Comments stay quiet, and strings and keywords stay readable.
  return \`Hello, \${name}\`;
}
${fence}

${fence}json
{ "name": "mymd", "private": true }
${fence}

${fence}text
Text with no known language is shown exactly as written.
${fence}

### Quotes

> A viewer's job is to get out of the way. Editing stays in your editor, and live refresh connects the two.

### Images

A local image that can't be found shows its description instead:

![A picture that isn't in this folder](pictures/missing.png)

## Live refresh

MyMD watches the document's folder rather than the file, because many editors save by writing a temporary file and renaming it over the original. When the document changes, the page updates and stays where you were reading. The top bar says "Updated just now" for a few seconds, then goes quiet.

## Staying safe

A downloaded document is treated as untrusted. Scripts, embedded pages and forms are removed before anything is shown. A link can open a web page, a mail message or another Markdown file, and every other kind of link does nothing. That way a document can't start a program on your computer.

Web images load from their own hosts, which means opening a document can contact those hosts. MyMD itself sends no telemetry.

## Long documents

The Outline view follows along as you scroll, and the current heading gets the one red dot in the window. Press \`Ctrl+F\` to find text on the page, \`Enter\` to move to the next match, and \`Esc\` to close the control.

Reading comfortably depends on line length as much as on type size, so the text column stays narrow even when the window is wide. Make the window narrower and the column follows it, and the sidebar turns into a drawer that slides over the page.

The rest of this section is plain text, so there's enough here to scroll through. The reading panel stays solid, because text should never sit on moving blur. The frosted glass belongs to the window around it, where the sidebar sits directly on the backdrop.

When Windows transparency effects are turned off, the glass gives way to a plain background. Light and dark follow the Windows setting, so there's no theme switch to look after.

### Closing the window

The window remembers its size and position, so the next launch opens where you left it. The sidebar remembers whether it was open and which view you chose.
`;

const shortcuts = `# Keyboard shortcuts

| Keys | Action |
| --- | --- |
| \`Ctrl+O\` | Open a file |
| \`Ctrl+B\` | Toggle the sidebar |
| \`Ctrl+F\` | Find |
| \`Esc\` | Close find or the sidebar drawer |
| \`Up\`, \`Down\`, \`J\`, \`K\`, \`Enter\` | Move through and open sidebar items |
| \`Ctrl+Plus\`, \`Ctrl+Minus\`, \`Ctrl+0\` | Zoom in, zoom out and reset |

Back to the [guide](guide.md#live-refresh).
`;

const empty = `---
title: A file with only front matter
---
`;

export const fixtures: DocumentData[] = [
  { name: 'guide.md', path: 'C:\\Fixtures\\guide.md', text: guide },
  { name: 'shortcuts.md', path: 'C:\\Fixtures\\shortcuts.md', text: shortcuts },
  { name: 'empty.md', path: 'C:\\Fixtures\\empty.md', text: empty },
];
