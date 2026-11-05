import { create } from 'zustand';

/**
 * First-run experience (UI state only): the welcome splash and the "explore every page" quest.
 * Progress is per user and per browser (localStorage), so a shared lab PC still greets each
 * student. Storage may be blocked; then the splash simply shows once per page load.
 */
const key = (userId) => `acet:onboarding:${userId}`;

function read(userId) {
  try {
    return JSON.parse(localStorage.getItem(key(userId))) ?? {};
  } catch {
    return {};
  }
}

function write(userId, value) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: progress lasts for this visit only.
  }
}

/**
 * Off under Vitest and in automated browsers (Playwright sets navigator.webdriver), so tests
 * and e2e runs are not blocked by the full-screen splash.
 */
export const onboardingEnabled = () =>
  import.meta.env.MODE !== 'test' && !(typeof navigator !== 'undefined' && navigator.webdriver);

/** Whether `pathname` is the page of a nav item (exact for `end` items, else prefix). */
export const matchesNav = (item, pathname) =>
  item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

export const useOnboarding = create((set, get) => ({
  userId: null,
  /** { splashSeen?: boolean, explored?: string[], questDone?: boolean, questHidden?: boolean } */
  state: {},
  load: (userId) => {
    if (get().userId !== userId) set({ userId, state: read(userId) });
  },
  update: (patch) => {
    const { userId, state } = get();
    const next = { ...state, ...patch };
    write(userId, next);
    set({ state: next });
  },
  finishSplash: () => get().update({ splashSeen: true }),
  /** Marks a nav page explored; returns true when it was new. */
  explore: (to) => {
    const explored = get().state.explored ?? [];
    if (explored.includes(to)) return false;
    get().update({ explored: [...explored, to] });
    return true;
  },
}));
