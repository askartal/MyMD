import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import { Marked } from 'marked';

const FRONT_MATTER = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;
const YAML_KEY = /^(?:[\p{L}\p{N}_.-]+|"[^"]*"|'[^']*')\s*:(?:\s|$)/u;
const YAML_DETAIL = /^(?:\s|#|-(?:\s|$))/;

const SANITIZE = {
  FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'button', 'select', 'textarea'],
  FORBID_ATTR: ['style'],
  // DOMPurify's default list, plus drive paths and file URLs. classifyLink decides what they do.
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|file:\/\/\/|[a-z]:(?:[\\/]|%5c)|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
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

// A block must look like YAML throughout, because a leading rule can pair with a later one.
function looksLikeYaml(block: string): boolean {
  const lines = block.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return true;
  const hasKey = lines.some((line) => YAML_KEY.test(line));
  return hasKey && lines.every((line) => YAML_KEY.test(line) || YAML_DETAIL.test(line));
}

export function stripFrontMatter(text: string): string {
  const match = FRONT_MATTER.exec(text);
  return match && looksLikeYaml(match[1] ?? '') ? text.slice(match[0].length) : text;
}

export function renderMarkdown(text: string): string {
  const html = parser.parse(stripFrontMatter(text), { async: false });
  return DOMPurify.sanitize(html, SANITIZE);
}
