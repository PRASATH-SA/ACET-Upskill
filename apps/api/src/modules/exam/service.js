import { isAdminRole, STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { oid, sameId } from '../../db/mongoose.js';
import { loadSubject } from '../../lib/access.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { Material } from '../content/model.js';
import { STUDENT_MAP_STATUSES, Topic, Unit } from '../syllabus/model.js';
import { Pyq } from './model.js';

/** Topic ids must be topics of this subject. */
async function assertTopicsInSubject(subjectId, topicIds) {
  if (!topicIds?.length) return;
  const count = await Topic.countDocuments({ _id: { $in: topicIds }, subjectId });
  if (count !== new Set(topicIds).size)
    throw badRequest('Every topicId must be a topic of this subject');
}

export async function createPyqs(user, subjectId, items, materialId) {
  await loadSubject(user, subjectId, 'write');
  for (const it of items) await assertTopicsInSubject(subjectId, it.topicIds);
  if (materialId) {
    const m = await Material.findById(materialId).lean();
    if (!m || !sameId(m.subjectId, subjectId) || m.kind !== 'pyqPaper')
      throw badRequest('materialId must be a question paper of this subject');
  }
  const docs = await Pyq.insertMany(
    items.map((it) => ({
      ...it,
      subjectId,
      materialId: materialId ?? null,
      status: 'draft',
      source: 'faculty',
      createdBy: user.id,
    })),
  );
  await audit({
    actorId: user.id,
    action: 'pyq.create',
    target: { type: 'subject', id: subjectId },
    meta: { count: docs.length },
  });
  return docs;
}

export async function listPyqs(user, subjectId) {
  await loadSubject(user, subjectId, 'read');
  const staff = user.role === 'faculty' || isAdminRole(user.role);
  return Pyq.find({ subjectId, ...(staff ? {} : { status: STUDENT_VISIBLE_STATUS }) }).sort({
    examDate: -1,
  });
}

export async function updatePyq(user, id, input) {
  const pyq = await Pyq.findById(id);
  if (!pyq) throw notFound('PYQ');
  await loadSubject(user, String(pyq.subjectId), 'write');
  if (input.topicIds) await assertTopicsInSubject(String(pyq.subjectId), input.topicIds);
  pyq.set(input);
  if (pyq.source === 'ai') pyq.editedAfterAi = true;
  await pyq.save();
  await audit({
    actorId: user.id,
    action: 'pyq.update',
    target: { type: 'pyq', id },
    meta: { fields: Object.keys(input) },
  });
  return pyq;
}

export async function deletePyq(user, id) {
  const pyq = await Pyq.findById(id);
  if (!pyq) throw notFound('PYQ');
  await loadSubject(user, String(pyq.subjectId), 'write');
  await pyq.deleteOne();
  await audit({ actorId: user.id, action: 'pyq.delete', target: { type: 'pyq', id } });
}

/**
 * GET /subjects/:id/exam-prep — published PYQs per topic over the last N years, ranked by how
 * often each topic was asked ("most asked" first). Filters: unit, marks, minimum frequency.
 */
export async function examPrep(
  user,
  subjectId,
  { unitId, marks, minFrequency, years },
  now = new Date(),
) {
  await loadSubject(user, subjectId, 'read');
  const since = new Date(now);
  since.setFullYear(since.getFullYear() - years);

  const topicFilter = {
    subjectId,
    status: { $in: [...STUDENT_MAP_STATUSES] },
    ...(unitId ? { unitId } : {}),
  };
  const [topics, units] = await Promise.all([
    Topic.find(topicFilter).select('title unitId order').lean(),
    Unit.find({ subjectId }).lean(),
  ]);
  const unitOf = new Map(
    units.map((u) => [String(u._id), { id: String(u._id), number: u.number, title: u.title }]),
  );
  const topicIds = topics.map((t) => t._id);

  const pyqMatch = {
    subjectId: oid(subjectId),
    status: STUDENT_VISIBLE_STATUS,
    examDate: { $gte: since },
    ...(marks ? { marks } : {}),
  };
  const [perTopic, untagged] = await Promise.all([
    Pyq.aggregate([
      { $match: { ...pyqMatch, topicIds: { $in: topicIds } } },
      { $sort: { examDate: -1 } },
      { $unwind: '$topicIds' },
      { $match: { topicIds: { $in: topicIds } } },
      {
        $group: {
          _id: '$topicIds',
          frequency: { $sum: 1 },
          lastAsked: { $max: '$examDate' },
          marks: { $push: '$marks' },
          pyqs: {
            $push: {
              id: { $toString: '$_id' },
              text: '$text',
              marks: '$marks',
              examDate: '$examDate',
            },
          },
        },
      },
    ]),
    Pyq.countDocuments({ ...pyqMatch, topicIds: { $size: 0 } }),
  ]);

  const byTopic = new Map(perTopic.map((p) => [String(p._id), p]));
  const rows = topics
    .map((t) => {
      const p = byTopic.get(String(t._id));
      const marksBreakdown = {};
      for (const m of p?.marks ?? []) marksBreakdown[m] = (marksBreakdown[m] ?? 0) + 1;
      return {
        topicId: String(t._id),
        title: t.title,
        unit: unitOf.get(String(t.unitId)),
        frequency: p?.frequency ?? 0,
        lastAsked: p?.lastAsked ?? null,
        marksBreakdown,
        pyqs: p?.pyqs ?? [],
      };
    })
    .filter((r) => (minFrequency ? r.frequency >= minFrequency : true))
    .sort(
      (a, b) =>
        b.frequency - a.frequency ||
        (b.lastAsked?.getTime?.() ?? 0) - (a.lastAsked?.getTime?.() ?? 0) ||
        a.title.localeCompare(b.title),
    );

  return { subjectId, years, since, topics: rows, untaggedCount: untagged };
}
