import { describe, expect, it } from 'vitest';
import { gamify, levelFor, quizStars, xpForLevel } from './gamification.js';

const progress = (counts, extra = {}) => ({
  subjects: [{ totalTopics: Object.values(counts).reduce((a, b) => a + b, 0), counts }],
  revision: { dueNow: 0, streakDays: 0, ...extra },
});

describe('gamification', () => {
  it('uses a triangular level curve', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelFor(0)).toMatchObject({ level: 1, title: 'Explorer', pct: 0 });
    expect(levelFor(150)).toMatchObject({ level: 2, xpIntoLevel: 50, xpForNext: 200, pct: 25 });
    expect(levelFor(300).level).toBe(3);
  });

  it('derives XP from mastery states only', () => {
    const g = gamify(progress({ notStarted: 3, learning: 1, practicing: 1, confident: 2 }));
    expect(g.xp).toBe(10 + 25 + 100);
    expect(g.stats).toMatchObject({ started: 4, mastered: 2, subjectsComplete: 0 });
  });

  it('unlocks achievements from real numbers', () => {
    const g = gamify(progress({ confident: 5 }, { streakDays: 4 }));
    const unlocked = g.achievements.filter((a) => a.unlocked).map((a) => a.id);
    expect(unlocked).toEqual([
      'first-steps',
      'first-mastery',
      'five-mastered',
      'subject-complete',
      'streak-3',
      'all-caught-up',
    ]);
    expect(g.achievements.find((a) => a.id === 'streak-7')).toMatchObject({
      current: 4,
      target: 7,
      unlocked: false,
    });
  });

  it('handles no progress', () => {
    const g = gamify(undefined);
    expect(g).toMatchObject({ xp: 0, level: 1, unlockedCount: 0 });
  });

  it('gives quiz stars by score', () => {
    expect([0, 40, 69, 70, 89, 90, 100].map(quizStars)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
});
