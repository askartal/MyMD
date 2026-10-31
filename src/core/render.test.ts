import { describe, expect, it } from 'vitest';
import { renderMarkdown, stripFrontMatter } from './render';

describe('stripFrontMatter', () => {
  it('removes a YAML block', () => expect(stripFrontMatter('---\ntitle: A\n---\n# B')).toBe('# B'));
  it('handles CRLF', () => expect(stripFrontMatter('---\r\ntitle: A\r\n---\r\n# B')).toBe('# B'));
  it('keeps unclosed front matter', () => expect(stripFrontMatter('---\ntitle: A\n# B')).toBe('---\ntitle: A\n# B'));
  it('keeps a leading horizontal rule', () => {
    const text = '---\n\nHello\n\n---\n\nWorld';
    expect(stripFrontMatter(text)).toBe(text);
  });
});

describe('renderMarkdown', () => {
  it('renders tables', () => expect(renderMarkdown('|a|\n|-|\n|b|')).toContain('<table>'));
  it('renders task lists', () => expect(renderMarkdown('- [x] done')).toContain('type="checkbox"'));
  it('renders strikethrough', () => expect(renderMarkdown('~~a~~')).toContain('<del>'));
  it('highlights known languages', () => expect(renderMarkdown('```js\nconst a = 1\n```')).toContain('hljs-keyword'));
  it('escapes unknown languages', () => expect(renderMarkdown('```nope\n<b>\n```')).toContain('&lt;b&gt;'));
  it('removes scripts and event handlers', () => {
    const html = renderMarkdown('<script>x()</script><img src="a.png" onerror="x()">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });
  it('removes embedded content and styling', () => {
    const html = renderMarkdown('<iframe></iframe><object></object><embed><form></form><style>a{}</style><p style="color:red">t</p>');
    for (const bad of ['<iframe', '<object', '<embed', '<form', '<style', 'style=']) expect(html).not.toContain(bad);
  });
  it('keeps details and images', () => {
    const html = renderMarkdown('<details><summary>s</summary>t</details>\n\n![a](b.png)');
    expect(html).toContain('<details>');
    expect(html).toContain('<img');
  });
  it('survives an unclosed fence', () => expect(renderMarkdown('```js\nconst a')).toContain('<code'));
  it('returns nothing for an empty file', () => expect(renderMarkdown('')).toBe(''));
});
