export type LinkAction =
  | { kind: 'anchor'; fragment: string }
  | { kind: 'external'; url: string }
  | { kind: 'document'; path: string; fragment: string | null }
  | { kind: 'ignore' };

const IGNORE: LinkAction = { kind: 'ignore' };
const EXTERNAL = /^(?:https?:\/\/|mailto:)/i;
// Two or more letters, because a one-letter scheme is a drive letter.
const SCHEME = /^([a-z][a-z0-9+.-]+):/i;
const FILE_URL = /^file:\/\/\//i;
const MARKDOWN = /\.(?:md|markdown)$/i;
const NETWORK_PATH = /^[\\/]{2}/;

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

// Network paths are refused so a document can't make Windows contact another host.
function parseTarget(link: string): { path: string; fragment: string | null } | null {
  const scheme = SCHEME.exec(link)?.[1].toLowerCase();
  if (scheme && (scheme !== 'file' || !FILE_URL.test(link))) return null;
  const [beforeFragment, ...rest] = link.replace(FILE_URL, '').split('#');
  const path = decode(beforeFragment.split('?')[0]);
  if (path === '' || NETWORK_PATH.test(path)) return null;
  return { path, fragment: decode(rest.join('#')) || null };
}

export function classifyLink(href: string, currentPath: string): LinkAction {
  const link = href.trim();
  if (link.startsWith('#')) return { kind: 'anchor', fragment: decode(link.slice(1)) };
  if (EXTERNAL.test(link)) return { kind: 'external', url: link };
  const target = parseTarget(link);
  if (!target) return IGNORE;
  const path = resolvePath(target.path, currentPath);
  return isMarkdownPath(path) ? { kind: 'document', path, fragment: target.fragment } : IGNORE;
}

export function resolvePath(target: string, currentPath: string): string {
  const slashed = target.replace(/\//g, '\\');
  const isAbsolute = /^[a-z]:\\/i.test(slashed) || NETWORK_PATH.test(slashed);
  const base = slashed.startsWith('\\') ? currentPath.slice(0, 2) : folderOf(currentPath);
  const full = isAbsolute ? slashed : `${base}\\${slashed}`;
  const prefix = NETWORK_PATH.test(full) ? '\\\\' : '';
  const parts: string[] = [];
  for (const part of full.slice(prefix.length).split('\\')) {
    if (part === '..') {
      if (parts.length > 1) parts.pop();
    } else if (part !== '' && part !== '.') {
      parts.push(part);
    }
  }
  return prefix + parts.join('\\');
}

export function localImagePath(src: string, currentPath: string): string | null {
  const target = parseTarget(src.trim());
  return target && resolvePath(target.path, currentPath);
}

export function folderOf(path: string): string {
  const folder = path.slice(0, Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')));
  return /^[a-z]:$/i.test(folder) ? `${folder}\\` : folder;
}

export function samePath(a: string, b: string): boolean {
  const normalize = (path: string) => path.replace(/\//g, '\\').toLowerCase();
  return normalize(a) === normalize(b);
}

export function isMarkdownPath(path: string): boolean {
  return MARKDOWN.test(path);
}
