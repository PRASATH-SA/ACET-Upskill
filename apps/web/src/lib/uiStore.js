import { create } from 'zustand';

/** Reads a per-browser preference; storage may be blocked, so failures fall back to the default. */
function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(`acet:${key}`);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(`acet:${key}`, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the preference just isn't remembered.
  }
}

/** UI-only state (A.3: Zustand for UI state, TanStack Query for server state). */
export const useUi = create((set) => ({
  sidebarCollapsed: readPref('sidebarCollapsed', false),
  lowData: readPref('lowData', false),
  toggleSidebar: () =>
    set((s) => {
      writePref('sidebarCollapsed', !s.sidebarCollapsed);
      return { sidebarCollapsed: !s.sidebarCollapsed };
    }),
  setLowData: (lowData) => {
    writePref('lowData', lowData);
    set({ lowData });
  },
}));
