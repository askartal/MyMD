import { expect, it } from 'vitest';
import { wrapTables } from './tables';

it('puts each table inside its own scrolling wrapper', () => {
  const root = document.createElement('div');
  root.innerHTML = '<p>a</p><table id="one"></table><table id="two"></table>';
  wrapTables(root);
  const wrappers = root.querySelectorAll('.table-wrap');
  expect([...wrappers].map((wrap) => wrap.firstElementChild?.id)).toEqual(['one', 'two']);
  expect(root.firstElementChild?.tagName).toBe('P');
  expect(root.lastElementChild?.className).toBe('table-wrap');
});

it('lets the keyboard reach the scrolling wrapper', () => {
  const root = document.createElement('div');
  root.innerHTML = '<table></table>';
  wrapTables(root);
  const wrap = root.querySelector<HTMLElement>('.table-wrap');
  expect(wrap?.tabIndex).toBe(0);
  expect(wrap?.getAttribute('role')).toBe('region');
  expect(wrap?.getAttribute('aria-label')).toBe('Table');
});
