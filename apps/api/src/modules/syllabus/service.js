import { withTransaction } from '../../db/connect.js';
import { oid, sameId } from '../../db/mongoose.js';
import { loadSubject, loadTopic } from '../../lib/access.js';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.js';

import { audit } from '../audit/service.js';
import { Flashcard, Question, Resource } from '../content/model.js';
import { Mastery } from '../practice/model.js';
import { User } from '../users/model.js';
import { findCycle, topologicalSort } from './graph.js';
import { STUDENT_MAP_STATUSES, Subject, Topic, TopicLink, Unit } from './model.js';

// ---------- subjects ----------

export async function listSubjects(user, query) {
  const filter = {};
  if (query.semester) filter.semester = query.semester;
  if (user.role === 'student') {
    // B2.6: a student only sees subjects of their syllabus version.
    if (!user.syllabusVersionId) return [];
    filter.syllabusVersionId = user.syllabusVersionId;
  } else {
    if (query.syllabusVersionId) filter.syllabusVersionId = query.syllabusVersionId;
    if (user.role === 'faculty') filter.facultyIds = user.id;
    if (user.role === 'mentor') {
      const versions = await User.distinct('syllabusVersionId', {
        mentorId: user.id,
        role: 'student',
      });
      filter.syllabusVersionId =
        query.syllabusVersionId && versions.some((v) => sameId(v, query.syllabusVersionId))
          ? query.syllabusVersionId
          : { $in: versions };
    }
  }
  return Subject.find(filter).sort({ semester: 1, code: 1 });
}

async function assertFaculty(ids) {
  if (!ids?.length) return;
  const count = await User.countDocuments({ _id: { $in: ids }, role: 'faculty', isActive: true });
  if (count !== new Set(ids).size) throw badRequest('facultyIds must be active faculty users');
}

export async function createSubject(input, actor) {
  await assertFaculty(input.facultyIds);
  const s = await Subject.create(input);
  await audit({
    actorId: actor.id,
    action: 'subject.create',
    target: { type: 'subject', id: String(s._id) },
  });
  return s;
}

export async function updateSubject(id, input, actor) {
  await assertFaculty(input.facultyIds);
  const s = await Subject.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!s) throw notFound('Subject');
  await audit({
    actorId: actor.id,
    action: 'subject.update',
    target: { type: 'subject', id },
    meta: { fields: Object.keys(input) },
  });
  return s;
}

export async function deleteSubject(id, actor) {
  if (await Topic.exists({ subjectId: id })) throw conflict('Delete the subject topics first');
  await Unit.deleteMany({ subjectId: id });
  const s = await Subject.findByIdAndDelete(id);
  if (!s) throw notFound('Subject');
  await audit({ actorId: actor.id, action: 'subject.delete', target: { type: 'subject', id } });
}

// ---------- units ----------

export async function listUnits(user, subjectId) {
  await loadSubject(user, subjectId, 'read');
  return Unit.find({ subjectId }).sort({ number: 1 });
}

export async function createUnit(user, subjectId, input) {
  await loadSubject(user, subjectId, 'write');
  return Unit.create({ ...input, subjectId });
}

async function loadUnit(user, unitId, mode) {
  const unit = await Unit.findById(unitId);
  if (!unit) throw notFound('Unit');
  await loadSubject(user, String(unit.subjectId), mode);
  return unit;
}

export async function updateUnit(user, unitId, input) {
  const unit = await loadUnit(user, unitId, 'write');
  unit.set(input);
  return unit.save();
}

export async function deleteUnit(user, unitId) {
  const unit = await loadUnit(user, unitId, 'write');
  if (await Topic.exists({ unitId })) throw conflict('Move or delete the unit topics first');
  await unit.deleteOne();
}

// ---------- topics ----------

async function assertParentInSubject(parentTopicId, subjectId, selfId) {
  if (!parentTopicId) return;
  if (selfId && parentTopicId === selfId) throw badRequest('A topic cannot be its own parent');
  const parent = await Topic.findById(parentTopicId).select('subjectId');
  if (!parent || !sameId(parent.subjectId, subjectId))
    throw badRequest('parentTopicId must be a topic in the same subject');
}

export async function createTopic(user, unitId, input) {
  const unit = await loadUnit(user, unitId, 'write');
  await assertParentInSubject(input.parentTopicId, String(unit.subjectId));
  const order = input.order ?? (await Topic.countDocuments({ unitId }));
  return Topic.create({
    ...input,
    order,
    unitId,
    subjectId: unit.subjectId,
    status: 'draft',
    source: 'faculty',
    createdBy: user.id,
  });
}

export async function updateTopic(user, topicId, input) {
  const { topic } = await loadTopic(user, topicId, 'write');
  if (input.unitId) {
    const unit = await Unit.findById(input.unitId);
    if (!unit || !sameId(unit.subjectId, topic.subjectId))
      throw badRequest('unitId must be a unit in the same subject');
  }
  await assertParentInSubject(input.parentTopicId, String(topic.subjectId), topicId);
  topic.set(input);
  return topic.save();
}

/** Refuses to delete topics with content or student progress, so no learning data is lost. */
export async function deleteTopic(user, topicId) {
  const { topic } = await loadTopic(user, topicId, 'write');
  const [res, fc, qs, ms] = await Promise.all([
    Resource.exists({ topicId }),
    Flashcard.exists({ topicId }),
    Question.exists({ topicId }),
    Mastery.exists({ topicId }),
  ]);
  if (res || fc || qs || ms)
    throw conflict('This topic has content or student progress; remove the content first');
  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    await TopicLink.deleteMany({ $or: [{ fromTopicId: topicId }, { toTopicId: topicId }] }, opts);
    await Topic.updateMany({ parentTopicId: topicId }, { $set: { parentTopicId: null } }, opts);
    await topic.deleteOne(opts);
  });
  await audit({ actorId: user.id, action: 'topic.delete', target: { type: 'topic', id: topicId } });
}

// ---------- link validation ----------

function linkKey(l) {
  if (l.type === 'related') {
    const [a, b] = [l.fromTopicId, l.toTopicId].sort();
    return `related:${a}:${b}`;
  }
  return `prerequisite:${l.fromTopicId}:${l.toTopicId}`;
}

/**
 * Validates a complete set of links for one subject (B2.4): both ends in the subject,
 * no self-links, no duplicates (related links are undirected), no prerequisite cycles.
 */
async function validateLinkSet(subjectId, links) {
  const topics = await Topic.find({ subjectId }).select('title').lean();
  const titles = new Map(topics.map((t) => [String(t._id), t.title]));
  const seen = new Set();
  for (const l of links) {
    if (!titles.has(l.fromTopicId) || !titles.has(l.toTopicId))
      throw badRequest('Both topics of a link must belong to this subject');
    if (l.fromTopicId === l.toTopicId)
      throw unprocessable('A topic cannot link to itself', { topicId: l.fromTopicId });
    const key = linkKey(l);
    if (seen.has(key)) {
      throw conflict(
        `Duplicate ${l.type} link between "${titles.get(l.fromTopicId)}" and "${titles.get(l.toTopicId)}"`,
      );
    }
    seen.add(key);
  }
  const prereq = links
    .filter((l) => l.type === 'prerequisite')
    .map((l) => ({ from: l.fromTopicId, to: l.toTopicId }));
  const cycle = findCycle(titles.keys(), prereq);
  if (cycle) {
    const named = cycle.map((id) => titles.get(id) ?? id);
    throw unprocessable(`Prerequisite links would form a cycle: ${named.join(' → ')}`, {
      cycle: cycle.map((id) => ({ id, title: titles.get(id) })),
    });
  }
}

async function currentLinks(subjectId) {
  const links = await TopicLink.find({ subjectId }).select('fromTopicId toTopicId type').lean();
  return links.map((l) => ({
    id: String(l._id),
    fromTopicId: String(l.fromTopicId),
    toTopicId: String(l.toTopicId),
    type: l.type,
  }));
}

export async function createLink(user, subjectId, input) {
  await loadSubject(user, subjectId, 'write');
  const existing = await currentLinks(subjectId);
  await validateLinkSet(subjectId, [...existing, input]);
  return TopicLink.create({
    ...input,
    subjectId,
    status: 'draft',
    source: 'faculty',
    createdBy: user.id,
  });
}

async function loadLink(user, linkId) {
  const link = await TopicLink.findById(linkId);
  if (!link) throw notFound('Link');
  await loadSubject(user, String(link.subjectId), 'write');
  return link;
}

export async function updateLink(user, linkId, input) {
  const link = await loadLink(user, linkId);
  if (input.type && input.type !== link.type) {
    const existing = (await currentLinks(String(link.subjectId))).map((l) =>
      l.id === linkId ? { ...l, type: input.type } : l,
    );
    await validateLinkSet(String(link.subjectId), existing);
  }
  link.set(input);
  return link.save();
}

export async function deleteLink(user, linkId) {
  const link = await loadLink(user, linkId);
  await link.deleteOne();
}

// ---------- map ----------

/** GET /subjects/:id/map — React Flow ready. Students get approved topics and links only. */
export async function getMap(user, subjectId) {
  const subject = await loadSubject(user, subjectId, 'read');
  const studentView = user.role === 'student';
  const statusFilter = studentView ? { status: { $in: STUDENT_MAP_STATUSES } } : {};
  const [units, topics, links] = await Promise.all([
    Unit.find({ subjectId }).sort({ number: 1 }).lean(),
    Topic.find({ subjectId, ...statusFilter })
      .sort({ order: 1 })
      .lean(),
    TopicLink.find({ subjectId, ...statusFilter }).lean(),
  ]);
  const unitOf = new Map(topics.map((t) => [String(t._id), String(t.unitId)]));
  return {
    subject: {
      id: String(subject._id),
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
    },
    units: units.map((u) => ({ id: String(u._id), number: u.number, title: u.title })),
    topics: topics.map((t) => ({
      id: String(t._id),
      unitId: String(t.unitId),
      parentTopicId: t.parentTopicId ? String(t.parentTopicId) : null,
      title: t.title,
      summary: t.summary ?? '',
      order: t.order ?? 0,
      position: { x: t.position?.x ?? 0, y: t.position?.y ?? 0 },
      status: t.status,
    })),
    // A link is shown only when both of its topics are visible to this user.
    links: links
      .filter((l) => unitOf.has(String(l.fromTopicId)) && unitOf.has(String(l.toTopicId)))
      .map((l) => ({
        id: String(l._id),
        fromTopicId: String(l.fromTopicId),
        toTopicId: String(l.toTopicId),
        type: l.type,
        reason: l.reason,
        status: l.status,
        source: l.source ?? 'faculty',
        crossUnit: unitOf.get(String(l.fromTopicId)) !== unitOf.get(String(l.toTopicId)),
      })),
  };
}

/** PATCH /subjects/:id/map — positions, order and edges in one transaction. */
export async function saveMap(user, subjectId, input) {
  await loadSubject(user, subjectId, 'write');
  const topicIds = new Set(
    (await Topic.find({ subjectId }).select('_id').lean()).map((t) => String(t._id)),
  );
  for (const n of input.nodes)
    if (!topicIds.has(n.id)) throw badRequest(`Topic ${n.id} is not in this subject`);
  const unitIds = new Set(
    (await Unit.find({ subjectId }).select('_id').lean()).map((u) => String(u._id)),
  );
  for (const n of input.nodes)
    if (n.unitId && !unitIds.has(n.unitId))
      throw badRequest(`Unit ${n.unitId} is not in this subject`);

  // Build the final link set and validate it as a whole before writing anything.
  const deleted = new Set(input.edges.delete);
  const existing = (await currentLinks(subjectId)).filter((l) => !deleted.has(l.id));
  const byId = new Map(existing.map((l) => [l.id, l]));
  const inserts = [];
  for (const e of input.edges.upsert) {
    if (e.id) {
      if (!byId.has(e.id)) throw badRequest(`Link ${e.id} is not in this subject`);
      byId.set(e.id, {
        id: e.id,
        fromTopicId: e.fromTopicId,
        toTopicId: e.toTopicId,
        type: e.type,
      });
    } else inserts.push(e);
  }
  await validateLinkSet(subjectId, [...byId.values(), ...inserts]);

  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    if (input.nodes.length) {
      await Topic.bulkWrite(
        input.nodes.map((n) => ({
          updateOne: {
            filter: { _id: oid(n.id), subjectId: oid(subjectId) },
            update: {
              $set: {
                ...(n.position ? { position: n.position } : {}),
                ...(n.order !== undefined ? { order: n.order } : {}),
                ...(n.unitId ? { unitId: oid(n.unitId) } : {}),
                ...(n.title ? { title: n.title } : {}),
              },
            },
          },
        })),
        opts,
      );
    }
    if (deleted.size) await TopicLink.deleteMany({ _id: { $in: [...deleted] }, subjectId }, opts);
    for (const e of input.edges.upsert.filter((x) => x.id)) {
      await TopicLink.updateOne(
        { _id: e.id, subjectId },
        {
          $set: {
            fromTopicId: e.fromTopicId,
            toTopicId: e.toTopicId,
            type: e.type,
            reason: e.reason,
          },
        },
        opts,
      );
    }
    if (inserts.length) {
      await TopicLink.insertMany(
        inserts.map((e) => ({
          ...e,
          subjectId,
          status: 'draft',
          source: 'faculty',
          createdBy: user.id,
        })),
        opts,
      );
    }
  });
  await audit({
    actorId: user.id,
    action: 'map.save',
    target: { type: 'subject', id: subjectId },
    meta: { nodes: input.nodes.length, upserts: input.edges.upsert.length, deletes: deleted.size },
  });
  return getMap(user, subjectId);
}

/** PATCH /subjects/:id/map/approve — every draft topic and link becomes approved. */
export async function approveMap(user, subjectId) {
  await loadSubject(user, subjectId, 'write');
  const set = { $set: { status: 'approved', approvedBy: user.id, approvedAt: new Date() } };
  const pending = { subjectId, status: { $in: ['draft', 'inReview'] } };
  const result = await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    const t = await Topic.updateMany(pending, set, opts);
    const l = await TopicLink.updateMany(pending, set, opts);
    return { topicsApproved: t.modifiedCount, linksApproved: l.modifiedCount };
  });
  await audit({
    actorId: user.id,
    action: 'map.approve',
    target: { type: 'subject', id: subjectId },
    meta: result,
  });
  return result;
}

// ---------- graph queries ----------

/** Visible topics and prerequisite edges for this user, plus a rank for stable ordering. */
async function graphFor(user, subjectId) {
  const map = await getMap(user, subjectId);
  const unitNumber = new Map(map.units.map((u) => [u.id, u.number]));
  const topics = map.topics;
  const rankOf = new Map(topics.map((t) => [t.id, [unitNumber.get(t.unitId) ?? 0, t.order]]));
  const prereq = map.links
    .filter((l) => l.type === 'prerequisite')
    .map((l) => ({ from: l.fromTopicId, to: l.toTopicId }));
  return { map, topics, prereq, rank: (id) => rankOf.get(id) ?? [] };
}

export async function learningOrder(user, subjectId) {
  const { topics, prereq, rank } = await graphFor(user, subjectId);
  const titles = new Map(topics.map((t) => [t.id, t.title]));
  return topologicalSort(
    topics.map((t) => t.id),
    prereq,
    rank,
  ).map((id, i) => ({ position: i + 1, topicId: id, title: titles.get(id) }));
}

export async function prerequisitesOf(user, topicId) {
  const { topic } = await loadTopic(user, topicId, 'read');
  return neighbours(user, topic, 'in');
}

export async function unlocks(user, topicId) {
  const { topic } = await loadTopic(user, topicId, 'read');
  return neighbours(user, topic, 'out');
}

async function neighbours(user, topic, dir) {
  const visible = user.role === 'student' ? { status: { $in: STUDENT_MAP_STATUSES } } : {};
  const filter = dir === 'in' ? { toTopicId: topic._id } : { fromTopicId: topic._id };
  const links = await TopicLink.find({ ...filter, type: 'prerequisite', ...visible }).lean();
  const ids = links.map((l) => (dir === 'in' ? l.fromTopicId : l.toTopicId));
  const topics = await Topic.find({ _id: { $in: ids }, ...visible })
    .select('title summary')
    .lean();
  const reasons = new Map(
    links.map((l) => [String(dir === 'in' ? l.fromTopicId : l.toTopicId), l.reason]),
  );
  return topics.map((t) => ({
    id: String(t._id),
    title: t.title,
    reason: reasons.get(String(t._id)) ?? '',
  }));
}

export async function crossUnitLinks(user, subjectId) {
  const { map } = await graphFor(user, subjectId);
  return map.links.filter((l) => l.crossUnit);
}

// ---------- search ----------

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /search?q= — topics and subjects the user may open, matched on title/code.
 * Uses listSubjects for scoping, so students only ever get approved topics of their version.
 */
export async function search(user, q, limit = 20) {
  const subjects = await listSubjects(user, {});
  if (!subjects.length) return { subjects: [], topics: [] };
  const re = new RegExp(escapeRegex(q), 'i');
  const byId = new Map(subjects.map((s) => [String(s._id), s]));
  const topics = await Topic.find({
    subjectId: { $in: subjects.map((s) => s._id) },
    title: re,
    ...(user.role === 'student' ? { status: { $in: STUDENT_MAP_STATUSES } } : {}),
  })
    .select('title summary subjectId unitId')
    .sort({ title: 1 })
    .limit(limit)
    .lean();
  return {
    subjects: subjects
      .filter((s) => re.test(s.name) || re.test(s.code))
      .map((s) => ({ id: String(s._id), code: s.code, name: s.name, semester: s.semester })),
    topics: topics.map((t) => {
      const s = byId.get(String(t.subjectId));
      return {
        id: String(t._id),
        title: t.title,
        summary: t.summary ?? '',
        subjectId: String(t.subjectId),
        subjectCode: s?.code,
        subjectName: s?.name,
      };
    }),
  };
}
