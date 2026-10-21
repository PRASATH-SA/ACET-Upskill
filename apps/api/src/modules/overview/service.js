/**
 * Subject root page: the faculty-written overview (why, prerequisites, uses, careers) plus a
 * unit journey computed from the syllabus graph and, for students, their own progress.
 * Students only receive a published overview and approved topics and links (A.5).
 */
import { STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { canWriteSubject, loadSubject } from '../../lib/access.js';
import { badRequest } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { CourseOutcome } from '../outcomes/model.js';
import { Mastery } from '../practice/model.js';
import { STUDENT_MAP_STATUSES, Topic, TopicLink, Unit } from '../syllabus/model.js';
import { SubjectOverview } from './model.js';

const MASTERED = ['confident', 'needsRevision'];
const STARTED = ['learning', 'practicing'];
const REASONS_PER_LINK = 3;

const overviewView = (o, staff) => ({
  id: String(o._id),
  tagline: o.tagline,
  why: o.why,
  prerequisites: o.prerequisites ?? [],
  outcomes: o.outcomes ?? [],
  applications: o.applications ?? [],
  careers: o.careers ?? [],
  ...(staff
    ? {
        status: o.status,
        source: o.source,
        editedAfterAi: o.editedAfterAi,
        updatedAt: o.updatedAt,
        units: (o.units ?? []).map((u) => ({ ...u, unitId: String(u.unitId) })),
      }
    : {}),
});

/**
 * Unit-to-unit links: every unit leads to the next one; topic links that cross units add the
 * reasons (and non-adjacent links show up as their own edges).
 * @param {{ id: string, number: number }[]} units  sorted by number
 * @param {{ fromUnit: string, toUnit: string, type: string, from: string, to: string, reason: string }[]} cross
 */
export function unitJourneyLinks(units, cross) {
  const edges = new Map();
  const key = (a, b) => `${a}>${b}`;
  units.slice(0, -1).forEach((u, i) => {
    edges.set(key(u.id, units[i + 1].id), {
      fromUnitId: u.id,
      toUnitId: units[i + 1].id,
      type: 'next',
      reasons: [],
    });
  });
  for (const c of cross) {
    const k = key(c.fromUnit, c.toUnit);
    if (!edges.has(k))
      edges.set(k, { fromUnitId: c.fromUnit, toUnitId: c.toUnit, type: c.type, reasons: [] });
    const e = edges.get(k);
    if (e.type !== 'next' && c.type === 'prerequisite') e.type = 'prerequisite';
    if (e.reasons.length < REASONS_PER_LINK)
      e.reasons.push({ fromTopic: c.from, toTopic: c.to, type: c.type, reason: c.reason });
  }
  return [...edges.values()];
}

/** GET /subjects/:id/overview */
export async function getOverview(user, subjectId) {
  const subject = await loadSubject(user, subjectId, 'read');
  const staff = canWriteSubject(user, subject);
  const statusFilter = staff ? {} : { status: { $in: STUDENT_MAP_STATUSES } };

  const [overview, units, topics, links, cos, mastery] = await Promise.all([
    SubjectOverview.findOne({
      subjectId,
      ...(staff ? {} : { status: STUDENT_VISIBLE_STATUS }),
    }).lean(),
    Unit.find({ subjectId }).sort({ number: 1 }).lean(),
    Topic.find({ subjectId, ...statusFilter })
      .select('unitId title order parentTopicId')
      .sort({ order: 1, createdAt: 1 })
      .lean(),
    TopicLink.find({ subjectId, ...statusFilter })
      .select('fromTopicId toTopicId type reason')
      .lean(),
    CourseOutcome.find({ subjectId }).sort({ code: 1 }).select('code text').lean(),
    user.role === 'student'
      ? Mastery.find({ userId: user.id, subjectId }).select('topicId state').lean()
      : [],
  ]);

  const topicById = new Map(topics.map((t) => [String(t._id), t]));
  const stateOf = new Map(mastery.map((m) => [String(m.topicId), m.state]));
  const written = new Map((overview?.units ?? []).map((u) => [String(u.unitId), u]));

  const unitViews = units.map((u) => {
    const id = String(u._id);
    // Subtopics live inside their parent topic's page, so the journey counts main topics.
    const mine = topics.filter((t) => String(t.unitId) === id && !t.parentTopicId);
    const w = written.get(id) ?? {};
    const mastered = mine.filter((t) => MASTERED.includes(stateOf.get(String(t._id)))).length;
    const started = mine.filter((t) => STARTED.includes(stateOf.get(String(t._id)))).length;
    return {
      id,
      number: u.number,
      title: u.title,
      topics: mine.map((t) => ({ id: String(t._id), title: t.title })),
      topicCount: mine.length,
      summary: w.summary ?? '',
      youWillBeAbleTo: w.youWillBeAbleTo ?? '',
      leadsTo: w.leadsTo ?? '',
      ...(user.role === 'student' ? { progress: { mastered, started, total: mine.length } } : {}),
    };
  });

  const cross = [];
  for (const l of links) {
    const a = topicById.get(String(l.fromTopicId));
    const b = topicById.get(String(l.toTopicId));
    if (!a || !b || String(a.unitId) === String(b.unitId)) continue;
    cross.push({
      fromUnit: String(a.unitId),
      toUnit: String(b.unitId),
      type: l.type,
      from: a.title,
      to: b.title,
      reason: l.reason ?? '',
    });
  }
  // Show units with topics (students) or all units (staff building the map).
  const shown = staff ? unitViews : unitViews.filter((u) => u.topicCount > 0);

  const all = shown.flatMap((u) => u.topics);
  return {
    subject: {
      id: String(subject._id),
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
    },
    overview: overview ? overviewView(overview, staff) : null,
    units: shown,
    unitLinks: unitJourneyLinks(shown, cross),
    courseOutcomes: cos.map((c) => ({ code: c.code, text: c.text })),
    ...(user.role === 'student'
      ? {
          progress: {
            total: all.length,
            mastered: shown.reduce((n, u) => n + u.progress.mastered, 0),
            started: shown.reduce((n, u) => n + u.progress.started, 0),
          },
        }
      : {}),
    canEdit: staff,
  };
}

/** PUT /subjects/:id/overview — create or replace the written overview (stays in its status). */
export async function saveOverview(user, subjectId, input) {
  await loadSubject(user, subjectId, 'write');
  const unitIds = new Set(
    (await Unit.find({ subjectId }).select('_id').lean()).map((u) => String(u._id)),
  );
  for (const u of input.units) {
    if (!unitIds.has(u.unitId)) throw badRequest(`Unit ${u.unitId} is not part of this subject`);
  }
  const existing = await SubjectOverview.findOne({ subjectId });
  let doc;
  if (existing) {
    existing.set(input);
    if (existing.source === 'ai') existing.editedAfterAi = true;
    existing.rejectedAt = undefined;
    existing.rejectedBy = undefined;
    existing.rejectReason = undefined;
    doc = await existing.save();
  } else {
    doc = await SubjectOverview.create({
      ...input,
      subjectId,
      status: 'draft',
      source: 'faculty',
      createdBy: user.id,
    });
  }
  await audit({
    actorId: user.id,
    action: existing ? 'overview.update' : 'overview.create',
    target: { type: 'overview', id: String(doc._id) },
  });
  return overviewView(doc.toObject(), true);
}
