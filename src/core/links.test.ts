import { describe, expect, it } from 'vitest';
import { classifyLink, folderOf, isMarkdownPath, localImagePath, resolvePath, samePath } from './links';

const current = 'C:\\Users\\Test User\\notes\\guide.md';

describe('classifyLink', () => {
  it('anchors', () => expect(classifyLink('#setup', current)).toEqual({ kind: 'anchor', fragment: 'setup' }));
  it('decodes anchors', () => expect(classifyLink('#%C4%B0%C5%9F', current)).toEqual({ kind: 'anchor', fragment: 'İş' }));
  it.each(['https://a.io', 'http://a.io', 'mailto:a@b.io'])('external %s', (url) =>
    expect(classifyLink(url, current)).toEqual({ kind: 'external', url }));
  it('relative documents', () => expect(classifyLink('other.md', current)).toEqual({
    kind: 'document', path: 'C:\\Users\\Test User\\notes\\other.md', fragment: null }));
  it('documents with fragments, spaces and Unicode', () => expect(classifyLink('../my%20notes/İş%20planı.MD#giriş', current)).toEqual({
    kind: 'document', path: 'C:\\Users\\Test User\\my notes\\İş planı.MD', fragment: 'giriş' }));
  it('absolute documents', () => expect(classifyLink('D:/docs/a.markdown', current)).toEqual({
    kind: 'document', path: 'D:\\docs\\a.markdown', fragment: null }));
  it('file URLs', () => expect(classifyLink('file:///D:/docs/a.md', current)).toEqual({
    kind: 'document', path: 'D:\\docs\\a.md', fragment: null }));
  it.each(['setup.exe', 'run.bat', 'javascript:x()', 'ms-settings:privacy', 'file:///C:/a.exe', ''])('ignores %s', (href) =>
    expect(classifyLink(href, current)).toEqual({ kind: 'ignore' }));
  it.each(['//host.example/share/a.md', '\\\\host.example\\share\\a.md', 'file://host.example/share/a.md', '%5C%5Chost.example%5Ca.md'])(
    'ignores network paths written in a document: %s', (href) =>
      expect(classifyLink(href, current)).toEqual({ kind: 'ignore' }));
});

describe('paths', () => {
  it('resolves parent segments', () => expect(resolvePath('../img/a.png', current)).toBe('C:\\Users\\Test User\\img\\a.png'));
  it('finds the folder', () => expect(folderOf(current)).toBe('C:\\Users\\Test User\\notes'));
  it('keeps the drive root usable as a folder', () => expect(folderOf('C:\\a.md')).toBe('C:\\'));
  it('stops at the drive root', () => expect(resolvePath('..\\..\\a.md', 'C:\\n\\b.md')).toBe('C:\\a.md'));
  it('matches case and slash variants', () => expect(samePath('C:\\Notes\\A.md', 'c:/notes/a.md')).toBe(true));
  it('tells different files apart', () => expect(samePath('C:\\Notes\\A.md', 'C:\\Notes\\B.md')).toBe(false));
  it('recognizes Markdown in any case', () => {
    expect(isMarkdownPath('A.MD')).toBe(true);
    expect(isMarkdownPath('a.markdown')).toBe(true);
    expect(isMarkdownPath('a.txt')).toBe(false);
  });
});

describe('localImagePath', () => {
  it('resolves encoded names', () => expect(localImagePath('my%20image.png', current)).toBe('C:\\Users\\Test User\\notes\\my image.png'));
  it('ignores query strings', () => expect(localImagePath('a.png?raw=true', current)).toBe('C:\\Users\\Test User\\notes\\a.png'));
  it.each(['https://a.io/b.png', 'data:image/png;base64,AA'])('leaves %s alone', (src) =>
    expect(localImagePath(src, current)).toBeNull());
  it.each(['//host.example/a.png', '\\\\host.example\\share\\a.png', 'file://host.example/a.png', '%5C%5Chost.example%5Ca.png'])(
    'never reaches network paths written in a document: %s', (src) =>
      expect(localImagePath(src, current)).toBeNull());
  it('resolves images beside a document on a network share', () =>
    expect(localImagePath('a.png', '\\\\nas\\notes\\guide.md')).toBe('\\\\nas\\notes\\a.png'));
});

describe('documents on a network share', () => {
  const shared = '\\\\nas\\notes\\guide.md';

  it.each(['/evil/share/a.png', '\\evil\\share\\a.png'])('keeps the root-relative image %s on the same share', (src) => {
    expect(localImagePath(src, shared)).toBe('\\\\nas\\notes\\evil\\share\\a.png');
  });
  it('keeps a root-relative link on the same share', () => {
    expect(classifyLink('/evil/share/a.md', shared)).toEqual({
      kind: 'document', path: '\\\\nas\\notes\\evil\\share\\a.md', fragment: null });
  });
  it('still reaches the root of the drive from a local document', () => {
    expect(localImagePath('/pics/a.png', current)).toBe('C:\\pics\\a.png');
  });
});

describe('a literal percent sign in a name', () => {
  it('survives in a link', () => expect(classifyLink('100%%20done.md', current)).toEqual({
    kind: 'document', path: 'C:\\Users\\Test User\\notes\\100% done.md', fragment: null }));
  it('survives in an image', () => {
    expect(localImagePath('50%%20off.png', current)).toBe('C:\\Users\\Test User\\notes\\50% off.png');
  });
  it('leaves a stray percent alone', () => {
    expect(localImagePath('50%.png', current)).toBe('C:\\Users\\Test User\\notes\\50%.png');
  });
});
