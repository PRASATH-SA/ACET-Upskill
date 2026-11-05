import { create } from 'zustand';
import { ApiError, post } from '../../../api/client';

/**
 * Revision ratings waiting to reach the API (F5: a session keeps working offline once its
 * items are loaded). Held in memory; flushed in order when the browser comes back online.
 */
export const useOutbox = create((set, get) => ({
  pending: [],
  flushing: false,
  add: (item) => set((s) => ({ pending: [...s.pending, item] })),
  flush: async () => {
    if (get().flushing || get().pending.length === 0) return;
    set({ flushing: true });
    try {
      while (get().pending.length) {
        const [next] = get().pending;
        try {
          await post(next.path, next.body);
        } catch (err) {
          // A 4xx means the item is gone or invalid: drop it. Network errors stop the flush.
          if (!(err instanceof ApiError) || err.status >= 500) break;
        }
        set((s) => ({ pending: s.pending.slice(1) }));
      }
    } finally {
      set({ flushing: false });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useOutbox.getState().flush());
}

/** True for failures caused by the network rather than the server's answer. */
export function isNetworkError(err) {
  return !(err instanceof ApiError) || err.status >= 500;
}

/**
 * Sends a rating now, or queues it when offline or the network fails.
 * @returns {Promise<{ queued: boolean, data?: unknown }>}
 */
export async function sendRating(path, body) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    useOutbox.getState().add({ path, body });
    return { queued: true };
  }
  try {
    return { queued: false, data: await post(path, body) };
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    useOutbox.getState().add({ path, body });
    return { queued: true };
  }
}
