import { defineConfig } from 'vitest/config';

export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  // The content security policy blocks data: fonts, so nothing gets inlined.
  build: { assetsInlineLimit: 0 },
  test: { environment: 'jsdom' },
});
