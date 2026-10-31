export function noticeFor(error: unknown, name: string): { title: string; body: string } {
  if (error === 'missing') {
    return {
      title: 'This file was moved or deleted.',
      body: 'Pick another file, or press Ctrl O to open one.',
    };
  }
  return {
    title: `${name} couldn't be opened.`,
    body: 'Check that it is a readable Markdown file, then try again.',
  };
}
