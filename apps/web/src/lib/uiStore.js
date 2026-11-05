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

const prefersDark = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);

/** "light" or "dark": the saved choice, else the device setting (ADR 0014). */
export const initialTheme = () => readPref('theme', null) ?? (prefersDark() ? 'dark' : 'light');

/** Switches the page palette: Tailwind's `dark` class on <html> flips the theme variables. */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/** UI-only state (A.3: Zustand for UI state, TanStack Query for server state). */
export const useUi = create((set) => ({
  sidebarCollapsed: readPref('sidebarCollapsed', false),
  lowData: readPref('lowData', false),
  theme: initialTheme(),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark';
      writePref('theme', theme);
      applyTheme(theme);
      return { theme };
    }),
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
