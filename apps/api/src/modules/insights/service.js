import { env } from '../../config/env.js';
import { oid } from '../../db/mongoose.js';
import { loadSubject } from '../../lib/access.js';
import { forbidden } from '../../lib/errors.js';
import { Flashcard, Question, Resource } from '../content/model.js';
import { Pyq } from '../exam/model.js';
import { Attempt, Mastery, Review, ReviewLog } from '../practice/model.js';
import { STUDENT_MAP_STATUSES, Topic } from '../syllabus/model.js';
import { User } from '../users/model.js';

/**
 * GET /subjects/:id/insights (B5.3) — per-topic average latest quiz score, share of students
 * not started, students needing revision, and the five weakest topics.
 * Built on the mastery collection (one row per student-topic), indexed by subjectId.
 */
export async function subjectInsights(user, subjectId) {
  const subject = await loadSubject(user, subjectId, 'write');
  const [topics, studentCount, perTopic, needsRevision] = await Promise.all([
    Topic.find({ subjectId, status: { $in: [...STUDENT_MAP_STATUSES] } })
      .select('title order unitId')
      .sort({ order: 1 })
      .lean(),
    User.countDocuments({
      role: 'student',
      isActive: true,
      syllabusVersionId: subject.syllabusVersionId,
    }),
    Mastery.aggregate([
      { $match: { subjectId: oid(subjectId) } },
      {
        $group: {
          _id: '$topicId',
          started: { $sum: { $cond: [{ $eq: ['$state', 'notStarted'] }, 0, 1] } },
          avgScore: { $avg: '$score' },
          scored: { $sum: { $cond: [{ $eq: ['$score', null] }, 0, 1] } },
          needsRevision: { $sum: { $cond: [{ $eq: ['$state', 'needsRevision'] }, 1, 0] } },
          confident: { $sum: { $cond: [{ $eq: ['$state', 'confident'] }, 1, 0] } },
        },
      },
    ]),
    Mastery.aggregate([
      { $match: { subjectId: oid(subjectId), state: 'needsRevision' } },
      { $group: { _id: '$userId', topics: { $push: '$topicId' } } },
      { $sort: { _id: 1 } },
      { $limit: 200 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'u',
          pipeline: [{ $project: { name: 1, batch: 1 } }],
        },
      },
    ]),
  ]);

  const stats = new Map(perTopic.map((p) => [String(p._id), p]));
  const titles = new Map(topics.map((t) => [String(t._id), t.title]));
  const rows = topics.map((t) => {
    const s = stats.get(String(t._id));
    const started = s?.started ?? 0;
    return {
      topicId: String(t._id),
      title: t.title,
      averageScore: s?.scored ? Math.round(s.avgScore * 10) / 10 : null,
      studentsScored: s?.scored ?? 0,
      notStartedPercent: studentCount
        ? Math.round(((studentCount - started) / studentCount) * 1000) / 10
        : 0,
      needsRevision: s?.needsRevision ?? 0,
      confident: s?.confident ?? 0,
    };
  });
  const weakest = rows
    .filter((r) => r.averageScore !== null)
    .sort((a, b) => a.averageScore - b.averageScore || b.notStartedPercent - a.notStartedPercent)
    .slice(0, 5);

  return {
    subjectId,
    studentCount,
    topics: rows,
    weakestTopics: weakest,
    studentsNeedingRevision: needsRevision.map((n) => ({
      studentId: String(n._id),
      name: n.u[0]?.name ?? 'Unknown',
      batch: n.u[0]?.batch ?? null,
      topics: n.topics
        .map((id) => ({ topicId: String(id), title: titles.get(String(id)) }))
        .filter((x) => x.title),
    })),
  };
}

// ---------- mentor ----------

/** Risk signal for one student (B5.4): many topics needing revision, or no activity for N days. */
export function riskFor(
  { needsRevision, lastActiveAt },
  now = new Date(),
  cfg = { inactiveDays: 7, needsRevision: 3 },
) {
  const reasons = [];
  const inactiveDays = lastActiveAt
    ? Math.floor((now - new Date(lastActiveAt)) / 86_400_000)
    : null;
  if (needsRevision >= cfg.needsRevision) reasons.push(`${needsRevision} topics need revision`);
  if (inactiveDays === null) reasons.push('Has never been active');
  else if (inactiveDays >= cfg.inactiveDays) reasons.push(`No activity for ${inactiveDays} days`);
  return {
    level: reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'none',
    reasons,
  };
}

/** GET /mentor/students — the mentor's assigned students with risk signals, riskiest first. */
export async function mentorStudents(user, mentorId = user.id, now = new Date()) {
  if (user.role === 'mentor' && mentorId !== user.id) throw forbidden();
  const students = await User.find({ role: 'student', mentorId, isActive: true })
    .select('name email batch lastActiveAt syllabusVersionId')
    .sort({ name: 1 })
    .lean();
  const ids = students.map((s) => s._id);
  const [nr, due, lastReview, lastAttempt] = await Promise.all([
    Mastery.aggregate([
      { $match: { userId: { $in: ids }, state: 'needsRevision' } },
      { $group: { _id: '$userId', n: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { userId: { $in: ids }, due: { $lte: now } } },
      { $group: { _id: '$userId', n: { $sum: 1 } } },
    ]),
    ReviewLog.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', at: { $max: '$at' } } },
    ]),
    Attempt.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', at: { $max: '$answeredAt' } } },
    ]),
  ]);
  const toMap = (rows, f) => new Map(rows.map((r) => [String(r._id), r[f]]));
  const nrMap = toMap(nr, 'n'),
    dueMap = toMap(due, 'n'),
    revMap = toMap(lastReview, 'at'),
    attMap = toMap(lastAttempt, 'at');
  const e = env();
  const cfg = { inactiveDays: e.MENTOR_INACTIVE_DAYS, needsRevision: e.MENTOR_RISK_NEEDS_REVISION };
  const order = { high: 0, medium: 1, none: 2 };
  return students
    .map((s) => {
      const id = String(s._id);
      const lastActiveAt =
        [s.lastActiveAt, revMap.get(id), attMap.get(id)]
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] ?? null;
      const needsRevision = nrMap.get(id) ?? 0;
      return {
        id,
        name: s.name,
        email: s.email,
        batch: s.batch,
        lastActiveAt,
        needsRevision,
        dueRevisions: dueMap.get(id) ?? 0,
        risk: riskFor({ needsRevision, lastActiveAt }, now, cfg),
      };
    })
    .sort((a, b) => order[a.risk.level] - order[b.risk.level] || a.name.localeCompare(b.name));
}

// ---------- admin usage ----------

const WEEK = 7 * 86_400_000;

/** GET /admin/usage (B5.6, A5.4) — activity, publishing and AI draft review signals. */
export async function adminUsage(now = new Date()) {
  const since = new Date(now - 8 * WEEK);
  const weekly = async (Model, dateField) =>
    Model.aggregate([
      { $match: { [dateField]: { $gte: since } } },
      {
        $project: {
          userId: 1,
          week: { $floor: { $divide: [{ $subtract: [now, `$${dateField}`] }, WEEK] } },
        },
      },
      { $group: { _id: '$week', users: { $addToSet: '$userId' } } },
    ]);
  const [att, rev, usersByRole, activeTopics, publishedTopicIds] = await Promise.all([
    weekly(Attempt, 'answeredAt'),
    weekly(ReviewLog, 'at'),
    User.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$role', n: { $sum: 1 } } }]),
    Topic.countDocuments({ status: { $in: [...STUDENT_MAP_STATUSES] } }),
    Resource.distinct('topicId', { status: 'published' }),
  ]);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const users = new Set();
    for (const r of [...att, ...rev])
      if (r._id === i) for (const u of r.users) users.add(String(u));
    const start = new Date(now - (i + 1) * WEEK);
    return { weekStarting: start.toISOString().slice(0, 10), activeStudents: users.size };
  }).reverse();

  const aiStats = async (Model, type) => {
    const rows = await Model.aggregate([
      { $match: { source: 'ai' } },
      {
        $group: {
          _id: { $ifNull: ['$aiMeta.promptVersion', 'unknown'] },
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $in: ['$status', ['approved', 'published']] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $ifNull: ['$rejectedAt', false] }, 1, 0] } },
          edited: { $sum: { $cond: ['$editedAfterAi', 1, 0] } },
        },
      },
    ]);
    return rows.map((r) => ({
      type,
      promptVersion: r._id,
      total: r.total,
      approved: r.approved,
      rejected: r.rejected,
      edited: r.edited,
      pending: r.total - r.approved - r.rejected,
    }));
  };
  const ai = (
    await Promise.all([
      aiStats(Resource, 'resource'),
      aiStats(Flashcard, 'flashcard'),
      aiStats(Question, 'question'),
      aiStats(Pyq, 'pyq'),
    ])
  ).flat();
  const sum = (f) => ai.reduce((n, r) => n + r[f], 0);

  return {
    users: Object.fromEntries(usersByRole.map((u) => [u._id, u.n])),
    weeklyActiveStudents: weeks[weeks.length - 1].activeStudents,
    weeklyActivity: weeks,
    topics: { approvedOrPublished: activeTopics, withPublishedContent: publishedTopicIds.length },
    aiDrafts: {
      total: sum('total'),
      approved: sum('approved'),
      rejected: sum('rejected'),
      edited: sum('edited'),
      pending: sum('pending'),
      byPromptVersion: ai,
    },
  };
}
