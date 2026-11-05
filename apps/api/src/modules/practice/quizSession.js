/**
 * Quiz sessions (feature 1): each student gets one question per concept pool, preferring
 * variants they have not seen recently, with options shuffled per student. The session stores
 * what was served, so grading maps the student's on-screen picks back to the real answer and a
 * student cannot submit questions they were never given.
 */
import { STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { oid } from '../../db/mongoose.js';
import { loadTopic } from '../../lib/access.js';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../../lib/errors.js';
import { Question } from '../content/model.js';
import { Attempt, QuizSession } from './model.js';
import { recordQuiz } from './service.js';

const PUBLISHED = STUDENT_VISIBLE_STATUS;
const SESSION_TTL_MS = 3 * 60 * 60 * 1000;
/** A variant seen within this window counts as "seen" when picking from a pool. */
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

/** Fisher–Yates; `rand` is injectable for tests. */
export function shuffle(arr, rand = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The pool a question belongs to: its concept key, or itself when it has none. */
export const poolKey = (q) => q.conceptKey || String(q._id);

/**
 * Picks one question per pool, preferring ones not in `seen`, then shuffles the pools and
 * keeps `limit`. Pure, so it can be unit-tested.
 * @param {{ _id: unknown, conceptKey?: string|null }[]} questions
 * @param {Set<string>} seen  question ids the student answered recently
 * @param {number} limit
 */
export function pickFromPools(questions, seen, limit, rand = Math.random) {
  const pools = new Map();
  for (const q of questions) {
    const k = poolKey(q);
    if (!pools.has(k)) pools.set(k, []);
    pools.get(k).push(q);
  }
  const picks = [];
  for (const variants of pools.values()) {
    const fresh = variants.filter((v) => !seen.has(String(v._id)));
    const from = fresh.length ? fresh : variants;
    picks.push(from[Math.floor(rand() * from.length)]);
  }
  return shuffle(picks, rand).slice(0, limit);
}

const view = (q, optionOrder) => ({
  id: String(q._id),
  stem: q.stem,
  options: optionOrder.map((i) => q.options[i]),
  difficulty: q.difficulty,
});

/** POST /topics/:id/quiz-sessions — never includes answers or explanations. */
export async function createQuizSession(user, topicId, { limit }, now = new Date()) {
  const { topic } = await loadTopic(user, topicId, 'read');
  const pool = await Question.find({ topicId: topic._id, type: 'mcq', status: PUBLISHED })
    .select('_id conceptKey')
    .lean();
  if (!pool.length) {
    return { sessionId: null, topicId, questions: [] };
  }
  const seen = new Set(
    (
      await Attempt.distinct('questionId', {
        userId: oid(user.id),
        topicId: topic._id,
        answeredAt: { $gte: new Date(now.getTime() - RECENT_MS) },
      })
    ).map(String),
  );
  const picked = pickFromPools(pool, seen, limit);
  const full = await Question.find({ _id: { $in: picked.map((p) => p._id) } }).lean();
  const byId = new Map(full.map((q) => [String(q._id), q]));
  const items = picked
    .map((p) => byId.get(String(p._id)))
    .filter(Boolean)
    .map((q) => {
      const identity = q.options.map((_, i) => i);
      return { q, optionOrder: q.shuffleOptions === false ? identity : shuffle(identity) };
    });

  const session = await QuizSession.create({
    userId: user.id,
    topicId: topic._id,
    subjectId: topic.subjectId,
    items: items.map((it) => ({ questionId: it.q._id, optionOrder: it.optionOrder })),
    startedAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });
  return {
    sessionId: String(session._id),
    topicId,
    expiresAt: session.expiresAt,
    questions: items.map((it) => view(it.q, it.optionOrder)),
  };
}

async function loadOwnSession(user, sessionId) {
  const session = await QuizSession.findById(sessionId);
  if (!session || String(session.userId) !== user.id) throw notFound('Quiz session');
  return session;
}

/** POST /quiz-sessions/:id/submit — `selectedIndex` is the on-screen option position. */
export async function submitQuizSession(user, sessionId, { answers }, now = new Date()) {
  if (user.role !== 'student') throw forbidden('Only students can submit quizzes');
  const session = await loadOwnSession(user, sessionId);
  if (session.submittedAt) throw conflict('This quiz was already submitted');
  if (session.expiresAt < now) throw unprocessable('This quiz has expired. Start a new one.');
  const { topic } = await loadTopic(user, String(session.topicId), 'read');

  const ids = answers.map((a) => a.questionId);
  if (new Set(ids).size !== ids.length) throw badRequest('Each question may be answered once');
  const itemById = new Map(session.items.map((it) => [String(it.questionId), it]));
  if (ids.length !== session.items.length || ids.some((id) => !itemById.has(id)))
    throw badRequest('Answer every question in this quiz, and only those');

  const questions = await Question.find({ _id: { $in: ids }, status: PUBLISHED }).lean();
  if (questions.length !== ids.length)
    throw unprocessable('A question was withdrawn while you answered. Start a new quiz.');
  const byId = new Map(questions.map((q) => [String(q._id), q]));

  const graded = answers.map((a) => {
    const { optionOrder } = itemById.get(a.questionId);
    if (a.selectedIndex >= optionOrder.length)
      throw badRequest(`selectedIndex out of range for question ${a.questionId}`);
    return {
      question: byId.get(a.questionId),
      selectedIndex: optionOrder[a.selectedIndex],
      optionOrder: [...optionOrder],
    };
  });

  // Claim the session first, so a double submit cannot record twice.
  const claimed = await QuizSession.updateOne(
    { _id: session._id, submittedAt: null },
    { $set: { submittedAt: now } },
  );
  if (!claimed.modifiedCount) throw conflict('This quiz was already submitted');

  const out = await recordQuiz(user, topic, graded, { sessionId: session._id, now });
  await QuizSession.updateOne({ _id: session._id }, { $set: { score: out.score } });
  return { sessionId: String(session._id), ...out };
}

/** GET /quiz-sessions/:id — the questions as served (to resume), plus results once submitted. */
export async function getQuizSession(user, sessionId) {
  const session = await loadOwnSession(user, sessionId);
  const questions = await Question.find({
    _id: { $in: session.items.map((it) => it.questionId) },
  }).lean();
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  const out = {
    sessionId: String(session._id),
    topicId: String(session.topicId),
    expiresAt: session.expiresAt,
    submittedAt: session.submittedAt,
    score: session.score,
    questions: session.items
      .filter((it) => byId.has(String(it.questionId)))
      .map((it) => view(byId.get(String(it.questionId)), it.optionOrder)),
  };
  if (!session.submittedAt) return out;
  const attempts = await Attempt.find({ sessionId: session._id }).lean();
  const att = new Map(attempts.map((a) => [String(a.questionId), a]));
  out.results = session.items
    .filter((it) => byId.has(String(it.questionId)) && att.has(String(it.questionId)))
    .map((it) => {
      const q = byId.get(String(it.questionId));
      const a = att.get(String(it.questionId));
      const order = it.optionOrder;
      return {
        questionId: String(q._id),
        selectedIndex: order.indexOf(a.selectedIndex),
        correctIndex: order.indexOf(q.correctIndex),
        correct: a.correct,
        explanation: q.explanation,
        optionExplanations: q.optionExplanations?.length
          ? order.map((i) => q.optionExplanations[i] ?? '')
          : [],
      };
    });
  return out;
}
