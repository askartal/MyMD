import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import { Marked } from 'marked';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const SANITIZE = {
  FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'button', 'select', 'textarea'],
  FORBID_ATTR: ['style'],
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderCode(text: string, info: string | undefined): string {
  const language = info?.trim().split(/\s+/)[0];
  if (language && hljs.getLanguage(language)) {
    const { value } = hljs.highlight(text, { language, ignoreIllegals: true });
    return `<pre><code class="hljs">${value}</code></pre>\n`;
  }
  return `<pre><code>${escapeHtml(text)}</code></pre>\n`;
}

const parser = new Marked({
  gfm: true,
  async: false,
  renderer: {
    code: ({ text, lang }) => renderCode(text, lang),
  },
});

export function stripFrontMatter(text: string): string {
  const match = FRONT_MATTER.exec(text);
  if (!match) return text;
  const firstLine = match[1].split(/\r?\n/).find((line) => line.trim() !== '');
  return firstLine && /^[\w-]+:/.test(firstLine) ? text.slice(match[0].length) : text;
}

export function renderMarkdown(text: string): string {
  const html = parser.parse(stripFrontMatter(text), { async: false });
  return DOMPurify.sanitize(html, SANITIZE);
}
