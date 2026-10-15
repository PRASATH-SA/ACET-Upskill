import { randomUUID } from 'node:crypto';
import { STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { env } from '../../config/env.js';
import { oid } from '../../db/mongoose.js';
import { loadSubject, loadTopic } from '../../lib/access.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { Flashcard, Question } from '../content/model.js';
import { STUDENT_MAP_STATUSES, Subject, Topic, TopicLink } from '../syllabus/model.js';
import { learningOrder } from '../syllabus/service.js';
import { User } from '../users/model.js';
import {
  mapNodeStates,
  onOverdueCheck,
  onQuizSubmitted,
  onRevisionRated,
  onTopicOpened,
} from './mastery.js';
import { Attempt, Mastery, Review, ReviewLog } from './model.js';
import { scheduler } from './scheduler.js';

const PUBLISHED = STUDENT_VISIBLE_STATUS;

export function masteryConfig() {
  const e = env();
  return {
    confidentScore: e.MASTERY_CONFIDENT_SCORE,
    minRevisionsPassed: e.MASTERY_MIN_REVISIONS_PASSED,
    overdueDays: e.MASTERY_OVERDUE_DAYS,
  };
}

const pickMastery = (doc) => ({
  state: doc?.state ?? 'notStarted',
  score: doc?.score ?? null,
  revisionsPassed: doc?.revisionsPassed ?? 0,
});

/** Reads, transforms and saves one mastery record. */
async function updateMastery(userId, topic, fn) {
  const existing = await Mastery.findOne({ userId, topicId: topic._id }).lean();
  const before = pickMastery(existing);
  const after = fn(before);
  if (
    after.state !== before.state ||
    after.score !== before.score ||
    after.revisionsPassed !== before.revisionsPassed ||
    !existing
  ) {
    await Mastery.updateOne(
      { userId, topicId: topic._id },
      {
        $set: { ...after, subjectId: topic.subjectId },
        $setOnInsert: { userId, topicId: topic._id },
      },
      { upsert: true },
    );
  }
  return { before, after };
}

// ---------- topic open ----------

/** POST /topics/:id/open — notStarted → learning for students. */
export async function openTopic(user, topicId) {
  const { topic } = await loadTopic(user, topicId, 'read');
  if (user.role !== 'student') return null;
  const { after } = await updateMastery(user.id, topic, onTopicOpened);
  await Mastery.updateOne(
    { userId: user.id, topicId: topic._id, openedAt: { $exists: false } },
    { $set: { openedAt: new Date() } },
  );
  return after;
}

// ---------- quiz ----------

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** GET /topics/:id/quiz — random published MCQs, never with answers or explanations. */
export async function getQuiz(user, topicId, limit) {
  await loadTopic(user, topicId, 'read');
  const questions = await Question.aggregate([
    { $match: { topicId: oid(topicId), type: 'mcq', status: PUBLISHED } },
    { $sample: { size: limit } },
    { $project: { _id: 1, stem: 1, options: 1, difficulty: 1 } },
  ]);
  return {
    topicId,
    questions: shuffle(questions).map((q) => ({
      id: String(q._id),
      stem: q.stem,
      options: q.options,
      difficulty: q.difficulty,
    })),
  };
}

/**
 * POST /quiz/submit — grades answers, stores attempts, updates mastery, and enrols the topic's
 * flashcards and the missed questions into spaced revision.
 */
export async function submitQuiz(user, { topicId, answers }) {
  const { topic } = await loadTopic(user, topicId, 'read');
  const ids = answers.map((a) => a.questionId);
  if (new Set(ids).size !== ids.length) throw badRequest('Each question may be answered once');
  const questions = await Question.find({
    _id: { $in: ids },
    topicId,
    type: 'mcq',
    status: PUBLISHED,
  }).lean();
  if (questions.length !== ids.length)
    throw badRequest('Some questions are not part of this topic quiz');
  const byId = new Map(questions.map((q) => [String(q._id), q]));

  const quizId = randomUUID();
  const now = new Date();
  const results = answers.map((a) => {
    const q = byId.get(a.questionId);
    if (a.selectedIndex >= q.options.length)
      throw badRequest(`selectedIndex out of range for question ${a.questionId}`);
    const correct = a.selectedIndex === q.correctIndex;
    return {
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
      correctIndex: q.correctIndex,
      correct,
      explanation: q.explanation,
      optionExplanations: q.optionExplanations,
      ...(correct ? {} : { whyWrong: q.optionExplanations?.[a.selectedIndex] ?? '' }),
    };
  });
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / results.length) * 100);

  await Attempt.insertMany(
    results.map((r) => ({
      userId: user.id,
      questionId: r.questionId,
      topicId: topic._id,
      subjectId: topic.subjectId,
      quizId,
      selectedIndex: r.selectedIndex,
      correct: r.correct,
      answeredAt: now,
    })),
  );

  let masteryChange = null;
  let enrolled = { flashcards: 0, questions: 0 };
  if (user.role === 'student') {
    masteryChange = await updateMastery(user.id, topic, (m) =>
      onQuizSubmitted(m, score, masteryConfig()),
    );
    const flashcards = await Flashcard.find({ topicId, status: PUBLISHED }).select('_id').lean();
    const missed = results.filter((r) => !r.correct).map((r) => r.questionId);
    enrolled = {
      flashcards: await enrol(
        user.id,
        topic,
        'flashcard',
        flashcards.map((f) => f._id),
        now,
      ),
      questions: await enrol(user.id, topic, 'question', missed, now),
    };
  }
  return {
    quizId,
    score,
    correct: correctCount,
    total: results.length,
    results,
    mastery: masteryChange,
    enrolled,
  };
}

/** Adds items to a student's revision schedule. Existing schedules are left untouched. */
async function enrol(userId, topic, itemType, itemIds, now) {
  if (!itemIds.length) return 0;
  const card = scheduler().newCard(now);
  const res = await Review.bulkWrite(
    itemIds.map((itemId) => ({
      updateOne: {
        filter: { userId: oid(userId), itemType, itemId: oid(String(itemId)) },
        update: {
          $setOnInsert: {
            ...card,
            userId: oid(userId),
            itemType,
            itemId: oid(String(itemId)),
            topicId: topic._id,
            subjectId: topic.subjectId,
            lastRating: null,
          },
        },
        upsert: true,
      },
    })),
  );
  return res.upsertedCount;
}

// ---------- revision ----------

/** GET /revision/today — due items grouped by topic, with the content needed to revise them. */
export async function revisionToday(user, now = new Date()) {
  const due = await Review.find({ userId: user.id, due: { $lte: now } })
    .sort({ due: 1 })
    .limit(500)
    .lean();
  const fcIds = due.filter((r) => r.itemType === 'flashcard').map((r) => r.itemId);
  const qIds = due.filter((r) => r.itemType === 'question').map((r) => r.itemId);
  const [cards, questions, topics] = await Promise.all([
    Flashcard.find({ _id: { $in: fcIds }, status: PUBLISHED }).lean(),
    Question.find({ _id: { $in: qIds }, status: PUBLISHED }).lean(),
    Topic.find({
      _id: { $in: [...new Set(due.map((r) => String(r.topicId)))] },
      status: { $in: STUDENT_MAP_STATUSES },
    })
      .select('title subjectId')
      .lean(),
  ]);
  const cardMap = new Map(cards.map((c) => [String(c._id), c]));
  const qMap = new Map(questions.map((q) => [String(q._id), q]));
  const topicMap = new Map(topics.map((t) => [String(t._id), t]));

  const groups = new Map();
  for (const r of due) {
    const topic = topicMap.get(String(r.topicId));
    if (!topic) continue; // topic unpublished since enrolment
    let item;
    if (r.itemType === 'flashcard') {
      const c = cardMap.get(String(r.itemId));
      if (!c) continue;
      item = {
        reviewId: String(r._id),
        itemType: 'flashcard',
        itemId: String(c._id),
        front: c.front,
        back: c.back,
        due: r.due,
      };
    } else {
      const q = qMap.get(String(r.itemId));
      if (!q) continue;
      // Revision reveals the answer on flip; graded quizzes never do before submission.
      item = {
        reviewId: String(r._id),
        itemType: 'question',
        itemId: String(q._id),
        front: q.stem,
        options: q.options,
        back: q.options[q.correctIndex],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        due: r.due,
      };
    }
    const key = String(r.topicId);
    if (!groups.has(key))
      groups.set(key, {
        topicId: key,
        title: topic.title,
        subjectId: String(topic.subjectId),
        items: [],
      });
    groups.get(key).items.push(item);
  }
  const list = [...groups.values()].map((g) => ({ ...g, count: g.items.length }));
  return { total: list.reduce((n, g) => n + g.count, 0), groups: list };
}

/** POST /revision/:itemId/rate — reschedules with FSRS and updates topic mastery. */
export async function rateReview(user, reviewId, rating, now = new Date()) {
  const review = await Review.findOne({ _id: reviewId, userId: user.id });
  if (!review) throw notFound('Revision item');
  const next = scheduler().rate(
    {
      due: review.due,
      stability: review.stability,
      difficulty: review.difficulty,
      elapsedDays: review.elapsedDays,
      scheduledDays: review.scheduledDays,
      reps: review.reps,
      lapses: review.lapses,
      state: review.state,
      lastReview: review.lastReview,
    },
    rating,
    now,
  );
  review.set({ ...next, lastRating: rating });
  await review.save();
  await ReviewLog.create({
    userId: user.id,
    reviewId: review._id,
    topicId: review.topicId,
    rating,
    at: now,
  });

  const topic = await Topic.findById(review.topicId).select('subjectId').lean();
  const { after } = topic
    ? await updateMastery(user.id, topic, (m) =>
        onRevisionRated(m, rating !== 'again', masteryConfig()),
      )
    : { after: null };
  return { reviewId: String(review._id), rating, nextDue: next.due, mastery: after };
}

// ---------- overdue sweep ----------

/**
 * confident → needsRevision for topics whose oldest due review is overdue past the threshold.
 * Runs on map reads for one student, and daily from the worker for everyone.
 * @returns {Promise<number>} topics flagged
 */
export async function sweepOverdue({ userId, now = new Date() } = {}) {
  const cfg = masteryConfig();
  const cutoff = new Date(now.getTime() - cfg.overdueDays * 24 * 60 * 60 * 1000);
  const match = { due: { $lt: cutoff }, ...(userId ? { userId: oid(userId) } : {}) };
  const overdue = await Review.aggregate([
    { $match: match },
    { $group: { _id: { userId: '$userId', topicId: '$topicId' }, oldestDue: { $min: '$due' } } },
  ]);
  if (!overdue.length) return 0;
  const confident = await Mastery.find({
    state: 'confident',
    $or: overdue.map((o) => ({ userId: o._id.userId, topicId: o._id.topicId })),
  }).lean();
  const oldest = new Map(overdue.map((o) => [`${o._id.userId}:${o._id.topicId}`, o.oldestDue]));
  const ops = [];
  for (const m of confident) {
    const next = onOverdueCheck(pickMastery(m), oldest.get(`${m.userId}:${m.topicId}`), now, cfg);
    if (next.state !== m.state)
      ops.push({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: { state: next.state, revisionsPassed: next.revisionsPassed } },
        },
      });
  }
  if (ops.length) await Mastery.bulkWrite(ops);
  return ops.length;
}

// ---------- student map ----------

/** A student's view of a subject map: node state per topic (B4.5). */
export async function studentMap(student, subjectId, now = new Date()) {
  const subject = await loadSubject(student, subjectId, 'read');
  await sweepOverdue({ userId: student.id, now });
  // Learning order and links use the student's (approved-only) view.
  const studentView = { ...student, role: 'student' };
  const order = (await learningOrder(studentView, subjectId)).map((x) => x.topicId);
  const links = await TopicLink.find({
    subjectId,
    type: 'prerequisite',
    status: { $in: STUDENT_MAP_STATUSES },
  }).lean();
  const visible = new Set(order);
  const prereqs = new Map();
  for (const l of links) {
    const to = String(l.toTopicId),
      from = String(l.fromTopicId);
    if (!visible.has(to) || !visible.has(from)) continue;
    if (!prereqs.has(to)) prereqs.set(to, []);
    prereqs.get(to).push(from);
  }
  const masteryDocs = await Mastery.find({ userId: student.id, subjectId: subject._id }).lean();
  const mastery = new Map(masteryDocs.map((m) => [String(m.topicId), m]));
  const { nodes, currentTopicId } = mapNodeStates(order, prereqs, mastery);
  const counts = {};
  for (const n of nodes) counts[n.state] = (counts[n.state] ?? 0) + 1;
  return {
    subjectId,
    currentTopicId,
    counts,
    nodes: nodes.map((n) => ({ ...n, score: mastery.get(n.topicId)?.score ?? null })),
  };
}

/** Builds the AuthUser shape for a student, for staff viewing that student's map. */
export async function studentAsAuthUser(studentId) {
  const u = await User.findById(studentId).lean();
  if (!u || u.role !== 'student') throw notFound('Student');
  return {
    id: String(u._id),
    role: 'student',
    name: u.name,
    email: u.email,
    departmentId: u.departmentId ? String(u.departmentId) : null,
    syllabusVersionId: u.syllabusVersionId ? String(u.syllabusVersionId) : null,
    mentorId: u.mentorId ? String(u.mentorId) : null,
    batch: u.batch ?? null,
  };
}

// ---------- progress ----------

/** Consecutive days (ending today or yesterday, UTC) with at least one revision rating. */
export function revisionStreak(dayKeys, now = new Date()) {
  const days = new Set(dayKeys);
  const key = (d) => d.toISOString().slice(0, 10);
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(key(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** GET /me/progress (and mentor/faculty views of a student): mastery counts per subject, streak, weakest topics. */
export async function progressFor(student, now = new Date()) {
  await sweepOverdue({ userId: student.id, now });
  const subjects = student.syllabusVersionId
    ? await Subject.find({ syllabusVersionId: student.syllabusVersionId })
        .sort({ semester: 1, code: 1 })
        .lean()
    : [];
  const subjectIds = subjects.map((s) => s._id);
  const [topicCounts, mastery, logDays, dueNow] = await Promise.all([
    Topic.aggregate([
      { $match: { subjectId: { $in: subjectIds }, status: { $in: [...STUDENT_MAP_STATUSES] } } },
      { $group: { _id: '$subjectId', n: { $sum: 1 } } },
    ]),
    Mastery.find({ userId: student.id, subjectId: { $in: subjectIds } }).lean(),
    ReviewLog.aggregate([
      {
        $match: {
          userId: oid(student.id),
          at: { $gte: new Date(now.getTime() - 400 * 24 * 3600 * 1000) },
        },
      },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } } } },
    ]),
    Review.countDocuments({ userId: student.id, due: { $lte: now } }),
  ]);
  const totals = new Map(topicCounts.map((t) => [String(t._id), t.n]));
  const visibleTopics = new Set(
    (
      await Topic.find({
        subjectId: { $in: subjectIds },
        status: { $in: [...STUDENT_MAP_STATUSES] },
      })
        .select('_id')
        .lean()
    ).map((t) => String(t._id)),
  );
  const perSubject = subjects.map((s) => {
    const mine = mastery.filter(
      (m) => String(m.subjectId) === String(s._id) && visibleTopics.has(String(m.topicId)),
    );
    const counts = { notStarted: 0, learning: 0, practicing: 0, confident: 0, needsRevision: 0 };
    for (const m of mine) counts[m.state] += 1;
    counts.notStarted += Math.max(0, (totals.get(String(s._id)) ?? 0) - mine.length);
    return {
      subjectId: String(s._id),
      code: s.code,
      name: s.name,
      semester: s.semester,
      totalTopics: totals.get(String(s._id)) ?? 0,
      counts,
    };
  });
  const scored = mastery
    .filter((m) => m.score !== null && visibleTopics.has(String(m.topicId)))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
  const titles = new Map(
    (
      await Topic.find({ _id: { $in: scored.map((m) => m.topicId) } })
        .select('title')
        .lean()
    ).map((t) => [String(t._id), t.title]),
  );
  return {
    subjects: perSubject,
    revision: {
      dueNow,
      streakDays: revisionStreak(
        logDays.map((d) => d._id),
        now,
      ),
    },
    weakestTopics: scored.map((m) => ({
      topicId: String(m.topicId),
      title: titles.get(String(m.topicId)),
      score: m.score,
      state: m.state,
    })),
  };
}
