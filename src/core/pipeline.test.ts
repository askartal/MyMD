import { describe, expect, it } from 'vitest';
import { applyLocalImages } from './images';
import { classifyLink } from './links';
import { renderMarkdown } from './render';

const current = 'C:\\notes\\guide.md';

function rendered(markdown: string) {
  const root = document.createElement('div');
  root.innerHTML = renderMarkdown(markdown);
  return root;
}

function linkAction(markdown: string) {
  const href = rendered(markdown).querySelector('a')?.getAttribute('href') ?? '';
  return classifyLink(href, current);
}

function imagePaths(markdown: string) {
  return applyLocalImages(rendered(markdown), current, (path) => path);
}

describe('links from Markdown to an action', () => {
  it.each([
    ['[a](C:/docs/a.md)', 'C:\\docs\\a.md'],
    ['[a](C:\\docs\\a.md)', 'C:\\docs\\a.md'],
    ['[a](file:///C:/docs/a.md)', 'C:\\docs\\a.md'],
    ['[a](other.md)', 'C:\\notes\\other.md'],
    ['[a](<my notes/İş planı.md>)', 'C:\\notes\\my notes\\İş planı.md'],
    ['[a](<100% done.md>)', 'C:\\notes\\100% done.md'],
  ])('%s opens as a document', (markdown, path) => {
    expect(linkAction(markdown)).toEqual({ kind: 'document', path, fragment: null });
  });
  it.each([
    '[a](javascript:alert(1))',
    '<a href="vbscript:x">a</a>',
    '<a href="data:text/html,x">a</a>',
    '[a](C:/tools/run.exe)',
    '[a](//host/share/a.md)',
    '[a](file://host/share/a.md)',
  ])('%s does nothing', (markdown) => {
    expect(linkAction(markdown)).toEqual({ kind: 'ignore' });
  });
});

describe('images from Markdown to a local path', () => {
  it.each([
    ['![a](C:/pics/a.png)', 'C:\\pics\\a.png'],
    ['![a](C:\\pics\\a.png)', 'C:\\pics\\a.png'],
    ['![a](file:///C:/pics/a.png)', 'C:\\pics\\a.png'],
    ['![a](my%20picture.png)', 'C:\\notes\\my picture.png'],
    ['![a](<50% off.png>)', 'C:\\notes\\50% off.png'],
  ])('%s is local', (markdown, path) => {
    expect(imagePaths(markdown)).toEqual([path]);
  });
  it.each(['![a](//host/a.png)', '![a](file://host/a.png)', '![a](https://a.io/b.png)'])('%s is not local', (markdown) => {
    expect(imagePaths(markdown)).toEqual([]);
  });
  it('keeps embedded data images', () => {
    expect(rendered('![a](data:image/png;base64,AA)').querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AA');
  });
});
