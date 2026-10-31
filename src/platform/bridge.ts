import { getCurrentWindow } from '@tauri-apps/api/window';

const isBrowser = !('__TAURI_INTERNALS__' in window);

export const bridge = {
  async showWindow(): Promise<void> {
    if (!isBrowser) await getCurrentWindow().show();
  },
};
