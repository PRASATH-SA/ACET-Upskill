import { loadSubject, loadTopic } from '../../lib/access.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { storage } from '../../lib/storage.js';
import { sniffFile } from '../../lib/upload.js';
import { audit } from '../audit/service.js';
import { User } from '../users/model.js';
import { Topic } from '../syllabus/model.js';
import { Submission, Workshop } from './model.js';

const SUBMISSION_TYPES = ['pdf', 'docx', 'pptx', 'png', 'jpg', 'webp'];

export async function createWorkshop(user, topicId, input) {
  const { topic } = await loadTopic(user, topicId, 'write');
  const w = await Workshop.create({
    ...input,
    topicId: topic._id,
    subjectId: topic.subjectId,
    createdBy: user.id,
  });
  await audit({
    actorId: user.id,
    action: 'workshop.create',
    target: { type: 'workshop', id: String(w._id) },
  });
  return w;
}

/** GET /subjects/:id/workshops — every workshop of a subject with submission counts (F6). */
export async function subjectWorkshops(user, subjectId) {
  await loadSubject(user, subjectId, 'write');
  const workshops = await Workshop.find({ subjectId }).sort({ dueAt: -1 }).lean();
  const ids = workshops.map((w) => w._id);
  const [counts, topics] = await Promise.all([
    Submission.aggregate([
      { $match: { workshopId: { $in: ids } } },
      {
        $group: {
          _id: '$workshopId',
          submitted: { $sum: 1 },
          graded: { $sum: { $cond: [{ $ifNull: ['$gradedAt', false] }, 1, 0] } },
        },
      },
    ]),
    Topic.find({ _id: { $in: workshops.map((w) => w.topicId) } })
      .select('title')
      .lean(),
  ]);
  const countOf = new Map(counts.map((c) => [String(c._id), c]));
  const titleOf = new Map(topics.map((t) => [String(t._id), t.title]));
  return workshops.map((w) => ({
    id: String(w._id),
    topicId: String(w.topicId),
    topicTitle: titleOf.get(String(w.topicId)) ?? '',
    brief: w.brief,
    dueAt: w.dueAt,
    submitted: countOf.get(String(w._id))?.submitted ?? 0,
    graded: countOf.get(String(w._id))?.graded ?? 0,
  }));
}

export async function listWorkshops(user, topicId) {
  await loadTopic(user, topicId, 'read');
  return Workshop.find({ topicId }).sort({ dueAt: 1 });
}

async function loadWorkshop(user, id, mode) {
  const w = await Workshop.findById(id);
  if (!w) throw notFound('Workshop');
  if (mode === 'write') await loadSubject(user, String(w.subjectId), 'write');
  else await loadTopic(user, String(w.topicId), 'read');
  return w;
}

export async function updateWorkshop(user, id, input) {
  const w = await loadWorkshop(user, id, 'write');
  w.set(input);
  return w.save();
}

export async function deleteWorkshop(user, id) {
  const w = await loadWorkshop(user, id, 'write');
  if (await Submission.exists({ workshopId: id }))
    throw badRequest('This workshop has submissions and cannot be deleted');
  await w.deleteOne();
}

/** A student submits text and/or one file. Resubmitting replaces the submission until it is graded. */
export async function submit(user, workshopId, { text }, file) {
  const w = await loadWorkshop(user, workshopId, 'read');
  if (!text?.trim() && !file) throw badRequest('Submit some text or a file');
  const existing = await Submission.findOne({ workshopId, userId: user.id });
  if (existing?.gradedAt) throw forbidden('This submission has already been graded');

  let fileFields = {};
  if (file) {
    const { ext, mime } = await sniffFile(file.buffer, SUBMISSION_TYPES);
    const fileKey = await storage().save(file.buffer, { folder: 'submissions', ext });
    if (existing?.fileKey) await storage().remove(existing.fileKey);
    fileFields = { fileKey, fileName: file.originalname, mimeType: mime };
  }
  const now = new Date();
  const doc = await Submission.findOneAndUpdate(
    { workshopId, userId: user.id },
    {
      $set: {
        text: text?.trim() ?? existing?.text ?? '',
        ...fileFields,
        submittedAt: now,
        late: now > w.dueAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  // Never expose the storage key (H1): the file is fetched through /submissions/:id/file.
  const { _id, __v: _v, fileKey: storedKey, ...rest } = doc;
  return { id: String(_id), ...rest, hasFile: Boolean(storedKey) };
}

export async function listSubmissions(user, workshopId) {
  await loadWorkshop(user, workshopId, 'write');
  const subs = await Submission.find({ workshopId }).sort({ submittedAt: 1 }).lean();
  const students = new Map(
    (
      await User.find({ _id: { $in: subs.map((s) => s.userId) } })
        .select('name email batch')
        .lean()
    ).map((u) => [String(u._id), u]),
  );
  return subs.map(({ _id, __v: _v, fileKey, ...s }) => ({
    id: String(_id),
    ...s,
    hasFile: Boolean(fileKey),
    student: students.has(String(s.userId))
      ? {
          id: String(s.userId),
          name: students.get(String(s.userId)).name,
          email: students.get(String(s.userId)).email,
          batch: students.get(String(s.userId)).batch,
        }
      : null,
  }));
}

export async function mySubmissions(user) {
  const subs = await Submission.find({ userId: user.id }).sort({ submittedAt: -1 }).lean();
  return subs.map(({ _id, __v: _v, fileKey, ...s }) => ({
    id: String(_id),
    ...s,
    hasFile: Boolean(fileKey),
  }));
}

async function loadSubmission(user, id) {
  const sub = await Submission.findById(id);
  if (!sub) throw notFound('Submission');
  const w = await Workshop.findById(sub.workshopId).lean();
  if (String(sub.userId) === user.id) return { sub, w, owner: true };
  await loadSubject(user, String(w.subjectId), 'write');
  return { sub, w, owner: false };
}

export async function openSubmissionFile(user, id) {
  const { sub } = await loadSubmission(user, id);
  if (!sub.fileKey) throw notFound('File');
  const { stream, size } = await storage().read(sub.fileKey);
  return { stream, size, mimeType: sub.mimeType, fileName: sub.fileName };
}

export async function grade(user, id, { score, feedback }) {
  const { sub, owner } = await loadSubmission(user, id);
  if (owner && user.role === 'student') throw forbidden('Students cannot grade submissions');
  sub.set({ score, feedback, gradedBy: user.id, gradedAt: new Date() });
  await sub.save();
  await audit({
    actorId: user.id,
    action: 'submission.grade',
    target: { type: 'submission', id },
    meta: { score },
  });
  return sub;
}
