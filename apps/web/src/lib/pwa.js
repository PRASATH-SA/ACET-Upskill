import { create } from 'zustand';

/** The browser's deferred install prompt (F7), if it offered one. */
export const useInstall = create((set, get) => ({
  prompt: null,
  installed: false,
  install: async () => {
    const p = get().prompt;
    if (!p) return false;
    p.prompt();
    const choice = await p.userChoice;
    set({ prompt: null, installed: choice.outcome === 'accepted' });
    return choice.outcome === 'accepted';
  },
}));

/** Registers the service worker in production builds and listens for the install prompt. */
export function setupPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ prompt: e });
  });
  window.addEventListener('appinstalled', () =>
    useInstall.setState({ prompt: null, installed: true }),
  );
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // The app still works without offline support.
      });
    });
  }
}

/** Removes cached API responses (called on sign-out, for shared computers). */
export function clearOfflineData() {
  try {
    navigator.serviceWorker?.controller?.postMessage('clear-api-cache');
  } catch {
    // No service worker: nothing cached.
  }
}
