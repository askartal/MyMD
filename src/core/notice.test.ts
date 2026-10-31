import { expect, it } from 'vitest';
import { linkNotice, noticeFor } from './notice';

it('explains a link that leads nowhere', () => {
  expect(linkNotice('a.md')).toBe("a.md couldn't be opened. Check the link.");
});

it('explains a moved file', () => {
  expect(noticeFor('missing', 'a.md')).toEqual({
    title: 'This file was moved or deleted.',
    body: 'Pick another file, or press Ctrl O to open one.',
  });
});

it('explains an unreadable file without raw error text', () => {
  expect(noticeFor(new Error('os error 5'), 'a.md')).toEqual({
    title: "a.md couldn't be opened.",
    body: 'Check that it is a readable Markdown file, then try again.',
  });
});
