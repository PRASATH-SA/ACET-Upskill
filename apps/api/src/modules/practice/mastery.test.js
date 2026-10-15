import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASTERY_CONFIG as cfg,
  emptyMastery,
  isUnlocked,
  mapNodeStates,
  onOverdueCheck,
  onQuizSubmitted,
  onRevisionRated,
  onTopicOpened,
} from './mastery.js';
import { FsrsScheduler } from './scheduler.js';

const m = (state, score = null, revisionsPassed = 0) => ({ state, score, revisionsPassed });
const DAY = 24 * 3600 * 1000;
const now = new Date('2026-03-10T12:00:00Z');

describe('mastery transitions', () => {
  it('notStarted → learning when the page is opened; other states unchanged', () => {
    expect(onTopicOpened(emptyMastery()).state).toBe('learning');
    for (const s of ['learning', 'practicing', 'confident', 'needsRevision'])
      expect(onTopicOpened(m(s)).state).toBe(s);
  });

  it('learning → practicing after the first quiz attempt (any score)', () => {
    expect(onQuizSubmitted(m('learning'), 20)).toEqual(m('practicing', 20, 0));
  });

  it('notStarted → practicing when a quiz is taken without opening the page', () => {
    expect(onQuizSubmitted(emptyMastery(), 50).state).toBe('practicing');
  });

  it('practicing → confident needs latest quiz ≥ 80 AND a passed revision', () => {
    expect(onQuizSubmitted(m('practicing'), 90).state).toBe('practicing'); // no revision yet
    expect(onRevisionRated(m('practicing', 70), true).state).toBe('practicing'); // score too low
    expect(onRevisionRated(m('practicing', 80), true)).toEqual(m('confident', 80, 1)); // boundary 80 counts
    expect(onQuizSubmitted(m('practicing', 50, 1), 85).state).toBe('confident'); // revision first, then quiz
    expect(onQuizSubmitted(m('practicing', 90, 1), 79).state).toBe('practicing'); // latest score matters
  });

  it('uses configurable thresholds', () => {
    const strict = { ...cfg, confidentScore: 95, minRevisionsPassed: 2 };
    expect(onRevisionRated(m('practicing', 90, 1), true, strict).state).toBe('practicing');
    expect(onRevisionRated(m('practicing', 96, 1), true, strict).state).toBe('confident');
  });

  it('confident → needsRevision when a revision is failed', () => {
    expect(onRevisionRated(m('confident', 90, 3), false)).toEqual(m('needsRevision', 90, 0));
  });

  it('a failed revision does not demote practicing', () => {
    expect(onRevisionRated(m('practicing', 90, 0), false).state).toBe('practicing');
  });

  it('confident → needsRevision when a due review is overdue by more than 3 days', () => {
    expect(onOverdueCheck(m('confident', 90, 2), new Date(now - 3 * DAY - 1000), now).state).toBe(
      'needsRevision',
    );
    expect(onOverdueCheck(m('confident', 90, 2), new Date(now - 3 * DAY + 1000), now).state).toBe(
      'confident',
    );
    expect(onOverdueCheck(m('confident', 90, 2), null, now).state).toBe('confident');
    expect(onOverdueCheck(m('practicing', 90, 2), new Date(now - 10 * DAY), now).state).toBe(
      'practicing',
    );
  });

  it('needsRevision → confident after a passed revision with a good latest quiz', () => {
    expect(onRevisionRated(m('needsRevision', 90, 0), true).state).toBe('confident');
    expect(onRevisionRated(m('needsRevision', 60, 0), true).state).toBe('needsRevision');
  });
});

describe('unlock rules and node states', () => {
  it('a topic is unlocked when all prerequisites are practicing or above', () => {
    expect(isUnlocked([])).toBe(true);
    expect(isUnlocked(['practicing', 'confident', 'needsRevision'])).toBe(true);
    expect(isUnlocked(['practicing', 'learning'])).toBe(false);
    expect(isUnlocked(['notStarted'])).toBe(false);
  });

  // a → b → c, a → d ; e has no prerequisites
  const order = ['a', 'b', 'd', 'c', 'e'];
  const prereqs = new Map([
    ['b', ['a']],
    ['c', ['b']],
    ['d', ['a']],
  ]);

  it('fresh student: first root is current, other roots unlocked, the rest locked', () => {
    const { nodes, currentTopicId } = mapNodeStates(order, prereqs, new Map());
    const st = Object.fromEntries(nodes.map((n) => [n.topicId, n.state]));
    expect(currentTopicId).toBe('a');
    expect(st).toEqual({ a: 'current', b: 'locked', d: 'locked', c: 'locked', e: 'unlocked' });
    expect(nodes.find((n) => n.topicId === 'c').missingPrerequisites).toEqual(['b']);
  });

  it('maps confident → mastered, needsRevision stays, and current moves along learning order', () => {
    const mastery = new Map([
      ['a', { state: 'confident' }],
      ['b', { state: 'learning' }],
      ['d', { state: 'needsRevision' }],
    ]);
    const { nodes, currentTopicId } = mapNodeStates(order, prereqs, mastery);
    const st = Object.fromEntries(nodes.map((n) => [n.topicId, n.state]));
    expect(st).toEqual({
      a: 'mastered',
      b: 'current',
      d: 'needsRevision',
      c: 'locked',
      e: 'unlocked',
    });
    expect(currentTopicId).toBe('b');
  });

  it('practicing a prerequisite unlocks its dependants', () => {
    const mastery = new Map([
      ['a', { state: 'confident' }],
      ['b', { state: 'practicing' }],
      ['d', { state: 'confident' }],
    ]);
    const st = Object.fromEntries(
      mapNodeStates(order, prereqs, mastery).nodes.map((n) => [n.topicId, n.state]),
    );
    expect(st).toEqual({
      a: 'mastered',
      b: 'current',
      d: 'mastered',
      c: 'unlocked',
      e: 'unlocked',
    });
  });
});

describe('FSRS scheduler', () => {
  const s = new FsrsScheduler();
  const t0 = new Date('2026-01-01T10:00:00Z');

  it('an "again" rating makes the card due sooner than "easy"', () => {
    const card = s.newCard(t0);
    const again = s.rate(card, 'again', t0);
    const easy = s.rate(card, 'easy', t0);
    expect(again.due.getTime()).toBeLessThan(easy.due.getTime());
  });

  it('holds for a mature card too, and lapses count failures', () => {
    let card = s.newCard(t0);
    let t = t0;
    for (let i = 0; i < 4; i++) {
      card = s.rate(card, 'good', t);
      t = card.due;
    }
    const again = s.rate(card, 'again', t);
    const easy = s.rate(card, 'easy', t);
    expect(again.due.getTime()).toBeLessThan(easy.due.getTime());
    expect(again.lapses).toBe(card.lapses + 1);
    expect(easy.scheduledDays).toBeGreaterThan(card.scheduledDays);
  });
});
