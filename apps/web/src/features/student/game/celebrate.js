import { create } from 'zustand';

let nextId = 1;

/**
 * Confetti bursts (UI state only). Call `celebrate()` from anywhere: a correct answer, an
 * accepted solution, a level up. <CelebrationLayer /> in the app shell draws them.
 */
export const useCelebrations = create((set) => ({
  bursts: [],
  fire: (burst) => {
    const id = nextId++;
    set((s) => ({ bursts: [...s.bursts.slice(-3), { id, size: 'md', ...burst }] }));
    setTimeout(() => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })), 1800);
    return id;
  },
}));

/** @param {{ size?: 'sm'|'md'|'lg', x?: number, y?: number }} [burst] x/y are viewport fractions (0–1). */
export const celebrate = (burst) => useCelebrations.getState().fire(burst ?? {});
