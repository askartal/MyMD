import { localImagePath } from './links';

export function applyLocalImages(root: ParentNode, currentPath: string, toUrl: (path: string) => string): string[] {
  const paths: string[] = [];
  for (const image of root.querySelectorAll('img[src]')) {
    const path = localImagePath(image.getAttribute('src') ?? '', currentPath);
    if (!path) continue;
    image.setAttribute('src', toUrl(path));
    paths.push(path);
  }
  return paths;
}
