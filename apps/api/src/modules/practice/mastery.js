/**
 * Mastery rules (B4.4). Pure functions only: no database, no clock except what is passed in.
 *
 *   notStarted → learning       when the topic page is opened
 *   learning   → practicing     after the first quiz attempt
 *   practicing → confident      latest quiz ≥ confidentScore AND ≥ minRevisionsPassed revisions passed
 *   confident  → needsRevision  a due review is overdue by > overdueDays, or a review is failed
 *   needsRevision → confident   same test as practicing → confident (revisions counted since the flag)
 *
 * A mastery record is `{ state, score, revisionsPassed }`. Functions return a new record.
 */

/** Thresholds come from config (env); these are the defaults. */
export const DEFAULT_MASTERY_CONFIG = Object.freeze({
  confidentScore: 80,
  minRevisionsPassed: 1,
  overdueDays: 3,
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** States that count as "practicing or above" for unlocking the next topics. */
export const UNLOCKING_STATES = Object.freeze(['practicing', 'confident', 'needsRevision']);

export function emptyMastery() {
  return { state: 'notStarted', score: null, revisionsPassed: 0 };
}

function promote(m, cfg) {
  if (
    (m.state === 'practicing' || m.state === 'needsRevision') &&
    m.score !== null &&
    m.score >= cfg.confidentScore &&
    m.revisionsPassed >= cfg.minRevisionsPassed
  ) {
    return { ...m, state: 'confident' };
  }
  return m;
}

/** notStarted → learning. Other states are unchanged. */
export function onTopicOpened(m) {
  return m.state === 'notStarted' ? { ...m, state: 'learning' } : { ...m };
}

/**
 * Records the latest quiz score (0–100). notStarted/learning → practicing, then checks confident.
 * @param {{state:string, score:number|null, revisionsPassed:number}} m
 * @param {number} score
 * @param {typeof DEFAULT_MASTERY_CONFIG} [cfg]
 */
export function onQuizSubmitted(m, score, cfg = DEFAULT_MASTERY_CONFIG) {
  const state = m.state === 'notStarted' || m.state === 'learning' ? 'practicing' : m.state;
  return promote({ ...m, state, score }, cfg);
}

/**
 * A revision rating for an item of this topic. "again" is a fail: confident → needsRevision.
 * Any other rating is a pass and may promote to confident.
 */
export function onRevisionRated(m, passed, cfg = DEFAULT_MASTERY_CONFIG) {
  if (!passed) {
    return m.state === 'confident'
      ? { ...m, state: 'needsRevision', revisionsPassed: 0 }
      : { ...m };
  }
  return promote({ ...m, revisionsPassed: m.revisionsPassed + 1 }, cfg);
}

/**
 * confident → needsRevision when the oldest due review of the topic is overdue by more than
 * `overdueDays` at `now`.
 * @param {Date|null} oldestDue earliest `due` among the topic's reviews, or null
 */
export function onOverdueCheck(m, oldestDue, now, cfg = DEFAULT_MASTERY_CONFIG) {
  if (m.state !== 'confident' || !oldestDue) return { ...m };
  const overdueMs = now.getTime() - new Date(oldestDue).getTime();
  return overdueMs > cfg.overdueDays * DAY_MS
    ? { ...m, state: 'needsRevision', revisionsPassed: 0 }
    : { ...m };
}

/** A topic is unlocked when every prerequisite is practicing or above. */
export function isUnlocked(prerequisiteStates) {
  return prerequisiteStates.every((s) => UNLOCKING_STATES.includes(s));
}

/**
 * Map node state per topic (B4.5) for one student.
 * mastered = confident; needsRevision = needsRevision; locked = some prerequisite below practicing;
 * current = the first unlocked topic in learning order that is not confident (or flagged);
 * everything else unlocked.
 * @param {string[]} order topic ids in learning order
 * @param {Map<string,string[]>} prerequisitesOf topic id → prerequisite topic ids
 * @param {Map<string,{state:string}>} mastery topic id → mastery (missing = notStarted)
 */
export function mapNodeStates(order, prerequisitesOf, mastery) {
  const stateOf = (id) => mastery.get(id)?.state ?? 'notStarted';
  let currentId = null;
  const nodes = order.map((id) => {
    const m = stateOf(id);
    const prereqs = prerequisitesOf.get(id) ?? [];
    const missing = prereqs.filter((p) => !UNLOCKING_STATES.includes(stateOf(p)));
    let state;
    if (m === 'confident') state = 'mastered';
    else if (m === 'needsRevision') state = 'needsRevision';
    else if (missing.length) state = 'locked';
    else if (!currentId) {
      currentId = id;
      state = 'current';
    } else state = 'unlocked';
    return { topicId: id, state, mastery: m, missingPrerequisites: missing };
  });
  return { nodes, currentTopicId: currentId };
}
