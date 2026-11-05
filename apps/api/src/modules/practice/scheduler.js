import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';

/**
 * SchedulerService (B4.2): decides when a revision item is due next.
 * FsrsScheduler wraps ts-fsrs; another algorithm can implement the same two methods.
 *
 * @typedef {object} CardState
 * @property {Date} due
 * @property {number} stability
 * @property {number} difficulty
 * @property {number} elapsedDays
 * @property {number} scheduledDays
 * @property {number} reps
 * @property {number} lapses
 * @property {number} state
 * @property {Date|null} lastReview
 *
 * @typedef {object} SchedulerService
 * @property {(now: Date) => CardState} newCard
 * @property {(card: CardState, rating: 'again'|'hard'|'good'|'easy', now: Date) => CardState} rate
 */

const RATINGS = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

const toCamel = (c) => ({
  due: c.due,
  stability: c.stability,
  difficulty: c.difficulty,
  elapsedDays: c.elapsed_days,
  scheduledDays: c.scheduled_days,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  lastReview: c.last_review ?? null,
});

const toFsrs = (c) => ({
  due: new Date(c.due),
  stability: c.stability,
  difficulty: c.difficulty,
  elapsed_days: c.elapsedDays,
  scheduled_days: c.scheduledDays,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  ...(c.lastReview ? { last_review: new Date(c.lastReview) } : {}),
});

/** @implements {SchedulerService} */
export class FsrsScheduler {
  constructor({ requestRetention = 0.9, maximumInterval = 365 } = {}) {
    // Fuzz off keeps schedules deterministic and testable.
    this.f = fsrs(
      generatorParameters({
        request_retention: requestRetention,
        maximum_interval: maximumInterval,
        enable_fuzz: false,
      }),
    );
  }

  newCard(now) {
    return toCamel(createEmptyCard(now));
  }

  rate(card, rating, now) {
    const grade = RATINGS[rating];
    if (grade === undefined) throw new Error(`Unknown rating: ${rating}`);
    return toCamel(this.f.repeat(toFsrs(card), now)[grade].card);
  }
}

let instance = new FsrsScheduler();
export const scheduler = () => instance;
export const setScheduler = (s) => {
  instance = s;
};
