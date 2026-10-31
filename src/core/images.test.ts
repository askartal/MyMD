import { expect, it } from 'vitest';
import { applyLocalImages } from './images';

const current = 'C:\\notes\\guide.md';
const toUrl = (path: string) => `asset://${path}`;

function rooted(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

it('rewrites local images and returns their paths', () => {
  const root = rooted('<img src="my%20image.png"><img src="https://a.io/b.png">');
  const paths = applyLocalImages(root, current, toUrl);
  expect(paths).toEqual(['C:\\notes\\my image.png']);
  const [local, web] = root.querySelectorAll('img');
  expect(local.getAttribute('src')).toBe('asset://C:\\notes\\my image.png');
  expect(web.getAttribute('src')).toBe('https://a.io/b.png');
});

it('keeps a network image out of the local paths', () => {
  const root = rooted('<img src="//host/share/a.png">');
  expect(applyLocalImages(root, current, toUrl)).toEqual([]);
  expect(root.querySelector('img')?.getAttribute('src')).toBe('//host/share/a.png');
});
