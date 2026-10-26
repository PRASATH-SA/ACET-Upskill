/**
 * Gamification (ADR 0009). XP, levels and achievements are derived from the student's real
 * progress (GET /me/progress): mastery state counts per subject plus the revision streak.
 * Nothing is stored or invented, so the numbers always agree with the mastery data.
 */

/** XP a topic is worth in each mastery state. A topic that decays to needsRevision loses some. */
export const XP_PER_STATE = {
  notStarted: 0,
  learning: 10,
  practicing: 25,
  needsRevision: 30,
  confident: 50,
};

/** XP for a set of mastery state counts, e.g. `{ confident: 2, learning: 1 }` → 110. */
export function xpForCounts(counts = {}) {
  let xp = 0;
  for (const [state, n] of Object.entries(counts)) xp += (XP_PER_STATE[state] ?? 0) * (n ?? 0);
  return xp;
}

/** Level titles, from level 1 upwards. Past the last title the level number keeps climbing. */
export const LEVEL_TITLES = [
  'Explorer',
  'Apprentice',
  'Learner',
  'Scholar',
  'Achiever',
  'Expert',
  'Master',
  'Grandmaster',
  'Legend',
];

/** Total XP needed to reach `level` (1-based): 0, 100, 300, 600, 1000, … (triangular × 100). */
export function xpForLevel(level) {
  const n = Math.max(1, Math.floor(level)) - 1;
  return (100 * n * (n + 1)) / 2;
}

/** Level details for a total XP. */
export function levelFor(xp) {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= total) level += 1;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
    xp: total,
    levelStartXp: floor,
    nextLevelXp: next,
    xpIntoLevel: total - floor,
    xpForNext: next - floor,
    pct: Math.round(((total - floor) / (next - floor)) * 100),
  };
}

/**
 * Achievements: `metric(stats)` is the current value, `target` unlocks it. `icon` is a
 * lucide-react icon name the web app maps to a component.
 */
export const ACHIEVEMENTS = [
  {
    id: 'first-steps',
    title: 'First steps',
    description: 'Start your first topic',
    icon: 'Footprints',
    target: 1,
    metric: (s) => s.started,
  },
  {
    id: 'first-mastery',
    title: 'Got it!',
    description: 'Master your first topic',
    icon: 'Star',
    target: 1,
    metric: (s) => s.mastered,
  },
  {
    id: 'five-mastered',
    title: 'High five',
    description: 'Master 5 topics',
    icon: 'Hand',
    target: 5,
    metric: (s) => s.mastered,
  },
  {
    id: 'ten-mastered',
    title: 'Perfect ten',
    description: 'Master 10 topics',
    icon: 'Medal',
    target: 10,
    metric: (s) => s.mastered,
  },
  {
    id: 'subject-complete',
    title: 'Subject conqueror',
    description: 'Master every topic in a subject',
    icon: 'Crown',
    target: 1,
    metric: (s) => s.subjectsComplete,
  },
  {
    id: 'streak-3',
    title: 'On fire',
    description: 'Revise 3 days in a row',
    icon: 'Flame',
    target: 3,
    metric: (s) => s.streak,
  },
  {
    id: 'streak-7',
    title: 'Week warrior',
    description: 'Revise 7 days in a row',
    icon: 'CalendarCheck',
    target: 7,
    metric: (s) => s.streak,
  },
  {
    id: 'streak-30',
    title: 'Unstoppable',
    description: 'Revise 30 days in a row',
    icon: 'Rocket',
    target: 30,
    metric: (s) => s.streak,
  },
  {
    id: 'all-caught-up',
    title: 'Inbox zero',
    description: 'Clear every due revision card',
    icon: 'CheckCheck',
    target: 1,
    metric: (s) => (s.started > 0 && s.dueNow === 0 ? 1 : 0),
  },
];

/**
 * Everything the game layer shows, from a /me/progress payload.
 * @param {{ subjects?: Array<{ totalTopics: number, counts: Record<string, number> }>,
 *   revision?: { dueNow: number, streakDays: number } } | undefined} progress
 */
export function gamify(progress) {
  const subjects = progress?.subjects ?? [];
  let xp = 0;
  let started = 0;
  let mastered = 0;
  let subjectsComplete = 0;
  for (const s of subjects) {
    const c = s.counts ?? {};
    xp += xpForCounts(c);
    started += (s.totalTopics ?? 0) - (c.notStarted ?? 0);
    mastered += c.confident ?? 0;
    if (s.totalTopics > 0 && (c.confident ?? 0) === s.totalTopics) subjectsComplete += 1;
  }
  const stats = {
    started: Math.max(0, started),
    mastered,
    subjectsComplete,
    streak: progress?.revision?.streakDays ?? 0,
    dueNow: progress?.revision?.dueNow ?? 0,
  };
  const achievements = ACHIEVEMENTS.map(({ metric, ...a }) => {
    const current = Math.min(metric(stats), a.target);
    return { ...a, current, unlocked: current >= a.target };
  });
  return {
    ...levelFor(xp),
    stats,
    achievements,
    unlockedCount: achievements.filter((a) => a.unlocked).length,
  };
}

/** Stars for a quiz score (0–100): 1 star from 40%, 2 from 70%, 3 from 90%. */
export function quizStars(score) {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score >= 40) return 1;
  return 0;
}
