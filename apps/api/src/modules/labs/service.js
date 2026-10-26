import { STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { sameId } from '../../db/mongoose.js';
import { canWriteSubject, isStaff, loadSubject } from '../../lib/access.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { CodeChallenge, CodeSubmission } from '../codelab/model.js';
import { STUDENT_MAP_STATUSES, Subject, Topic, Unit } from '../syllabus/model.js';
import { LabCompletion, LabExperiment } from './model.js';

/**
 * Practical (lab) subjects, ADR 0012. A lab has no topics of its own: its experiments sit on the
 * topics of the linked theory subject, so students follow the same roadmap. An experiment is done
 * when every linked code-lab problem is solved, or when the student marks it done.
 */

const PUBLISHED = STUDENT_VISIBLE_STATUS;

/** Loads a practical subject and its theory subject; 400 for a theory subject. */
async function loadLab(user, subjectId, mode) {
  const lab = await loadSubject(user, subjectId, mode);
  if (lab.kind !== 'practical') throw badRequest('This is not a practical (lab) subject');
  const theory = await Subject.findById(lab.theorySubjectId).lean();
  if (!theory) throw notFound('Theory subject');
  return { lab, theory };
}

async function canWrite(user, subject) {
  return isStaff(user) && canWriteSubject(user, subject);
}

/** Checks that the topic is on the theory roadmap and the problems belong to that topic. */
async function checkPlacement(theory, topicId, challengeIds = []) {
  const topic = await Topic.findById(topicId).select('subjectId').lean();
  if (!topic || !sameId(topic.subjectId, theory._id))
    throw badRequest('topicId must be a topic of the linked theory subject');
  if (challengeIds.length) {
    const n = await CodeChallenge.countDocuments({ _id: { $in: challengeIds }, topicId });
    if (n !== new Set(challengeIds.map(String)).size)
      throw badRequest('challengeIds must be code-lab problems of the same topic');
  }
}

const brief = (c, solved) => ({
  id: String(c._id),
  title: c.title,
  difficulty: c.difficulty,
  language: c.language,
  status: c.status,
  ...(solved ? { solved: solved.has(String(c._id)) } : {}),
});

/**
 * GET /subjects/:id/lab. Students get published experiments with their progress; staff who can
 * edit the lab get every experiment plus, per topic, the theory topic's published problems they
 * can link (lab faculty may not teach the theory subject, so they cannot list them otherwise).
 */
export async function getLab(user, subjectId) {
  const { lab, theory } = await loadLab(user, subjectId, 'read');
  const staffView = await canWrite(user, lab);
  const experiments = await LabExperiment.find({
    subjectId: lab._id,
    ...(staffView ? {} : { status: PUBLISHED }),
  })
    .sort({ number: 1 })
    .lean();

  const challengeIds = experiments.flatMap((e) => e.challengeIds);
  const challenges = await CodeChallenge.find({
    _id: { $in: challengeIds },
    ...(staffView ? {} : { status: PUBLISHED }),
  })
    .select('title difficulty language status topicId order')
    .lean();
  const byId = new Map(challenges.map((c) => [String(c._id), c]));

  let solved = null;
  let marked = new Set();
  if (user.role === 'student') {
    solved = new Set(
      (
        await CodeSubmission.distinct('challengeId', {
          userId: user.id,
          challengeId: { $in: challengeIds },
          passed: true,
        })
      ).map(String),
    );
    marked = new Set(
      (await LabCompletion.distinct('experimentId', { userId: user.id, subjectId: lab._id })).map(
        String,
      ),
    );
  }

  const allItems = experiments.map((e) => {
    const linked = e.challengeIds.map((id) => byId.get(String(id))).filter(Boolean);
    const solvedAll =
      Boolean(solved) && linked.length > 0 && linked.every((c) => solved.has(String(c._id)));
    const markedDone = marked.has(String(e._id));
    return {
      id: String(e._id),
      number: e.number,
      title: e.title,
      aim: e.aim,
      procedure: e.procedure,
      topicId: String(e.topicId),
      challenges: linked.map((c) => brief(c, solved)),
      ...(staffView ? { status: e.status } : {}),
      ...(user.role === 'student' ? { markedDone, done: markedDone || solvedAll } : {}),
    };
  });

  // The theory roadmap, embedded so lab faculty who do not teach the theory subject can see it.
  const [units, topics] = await Promise.all([
    Unit.find({ subjectId: theory._id }).sort({ number: 1 }).lean(),
    Topic.find({
      subjectId: theory._id,
      ...(isStaff(user) ? {} : { status: { $in: [...STUDENT_MAP_STATUSES] } }),
    })
      .sort({ order: 1 })
      .lean(),
  ]);
  // Students only see experiments on roadmap topics they can see.
  const visible = new Set(topics.map((t) => String(t._id)));
  const items = allItems.filter((e) => visible.has(e.topicId));
  const result = {
    subject: { id: String(lab._id), code: lab.code, name: lab.name, semester: lab.semester },
    theorySubject: { id: String(theory._id), code: theory.code, name: theory.name },
    roadmap: {
      units: units.map((u) => ({ id: String(u._id), number: u.number, title: u.title })),
      topics: topics.map((t) => ({
        id: String(t._id),
        unitId: String(t.unitId),
        title: t.title,
        summary: t.summary ?? '',
        order: t.order ?? 0,
      })),
    },
    experiments: items,
    summary: {
      total: items.length,
      ...(user.role === 'student' ? { done: items.filter((e) => e.done).length } : {}),
    },
  };
  if (staffView) {
    const available = await CodeChallenge.find({ subjectId: theory._id, status: PUBLISHED })
      .sort({ order: 1, createdAt: 1 })
      .select('title difficulty language status topicId')
      .lean();
    const perTopic = {};
    for (const c of available) (perTopic[String(c.topicId)] ??= []).push(brief(c));
    result.availableChallenges = perTopic;
  }
  return result;
}

/** POST /subjects/:id/experiments — created as a draft; numbered after the last one if no number. */
export async function createExperiment(user, subjectId, input) {
  const { lab, theory } = await loadLab(user, subjectId, 'write');
  await checkPlacement(theory, input.topicId, input.challengeIds);
  const number =
    input.number ??
    ((await LabExperiment.findOne({ subjectId: lab._id }).sort({ number: -1 }).lean())?.number ??
      0) + 1;
  if (await LabExperiment.exists({ subjectId: lab._id, number }))
    throw conflict(`Experiment ${number} already exists in this lab`);
  const doc = await LabExperiment.create({
    ...input,
    number,
    subjectId: lab._id,
    status: 'draft',
    source: 'faculty',
    createdBy: user.id,
  });
  await audit({
    actorId: user.id,
    action: 'experiment.create',
    target: { type: 'experiment', id: String(doc._id) },
  });
  return doc;
}

async function loadExperiment(user, id, mode) {
  const doc = await LabExperiment.findById(id);
  if (!doc) throw notFound('Experiment');
  const { lab, theory } = await loadLab(user, String(doc.subjectId), mode);
  return { doc, lab, theory };
}

export async function updateExperiment(user, id, input) {
  const { doc, lab, theory } = await loadExperiment(user, id, 'write');
  const topicId = input.topicId ?? String(doc.topicId);
  const challengeIds = input.challengeIds ?? (input.topicId ? [] : doc.challengeIds.map(String));
  await checkPlacement(theory, topicId, challengeIds);
  if (
    input.number !== undefined &&
    input.number !== doc.number &&
    (await LabExperiment.exists({ subjectId: lab._id, number: input.number }))
  )
    throw conflict(`Experiment ${input.number} already exists in this lab`);
  doc.set({ ...input, challengeIds });
  await doc.save();
  await audit({
    actorId: user.id,
    action: 'experiment.update',
    target: { type: 'experiment', id },
    meta: { fields: Object.keys(input) },
  });
  return doc;
}

export async function deleteExperiment(user, id) {
  const { doc } = await loadExperiment(user, id, 'write');
  await LabCompletion.deleteMany({ experimentId: doc._id });
  await doc.deleteOne();
  await audit({
    actorId: user.id,
    action: 'experiment.delete',
    target: { type: 'experiment', id },
  });
}

/** POST /experiments/:id/status — only faculty assigned to the lab publish (A.7.5). */
export async function setExperimentStatus(user, id, { status }) {
  const { doc, lab } = await loadExperiment(user, id, 'write');
  if (status === 'published' && !(user.role === 'faculty' && canWriteSubject(user, lab)))
    throw forbidden('Only faculty assigned to this lab can publish experiments');
  const now = new Date();
  doc.set(
    status === 'published'
      ? { status, publishedAt: now, approvedBy: user.id, approvedAt: now }
      : { status },
  );
  await doc.save();
  await audit({
    actorId: user.id,
    action: 'experiment.status',
    target: { type: 'experiment', id },
    meta: { to: status },
  });
  return doc;
}

/** POST /experiments/:id/done — a student marks a published experiment done or not done. */
export async function markExperimentDone(user, id, { done }) {
  if (user.role !== 'student') throw forbidden('Only students mark experiments done');
  const { doc } = await loadExperiment(user, id, 'read');
  if (doc.status !== PUBLISHED) throw notFound('Experiment');
  const key = { userId: user.id, experimentId: doc._id };
  if (done)
    await LabCompletion.updateOne(
      key,
      { $setOnInsert: { ...key, subjectId: doc.subjectId } },
      { upsert: true },
    );
  else await LabCompletion.deleteOne(key);
  return { id, markedDone: done };
}
