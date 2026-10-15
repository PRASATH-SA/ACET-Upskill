import { RESOURCE_KINDS, STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { oid } from '../../db/mongoose.js';
import { facultySubjectIds, isStaff, loadSubject, loadTopic } from '../../lib/access.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { storage } from '../../lib/storage.js';
import { sniffFile } from '../../lib/upload.js';
import { audit } from '../audit/service.js';
import { Pyq } from '../exam/model.js';
import { Unit } from '../syllabus/model.js';
import { prerequisitesOf, unlocks } from '../syllabus/service.js';
import { Workshop } from '../workshops/model.js';
import { Flashcard, Material, Question, Resource } from './model.js';
import { extractPdfText } from './pdf.js';
import { CONTENT_MODELS } from './status.js';

const PUBLISHED = STUDENT_VISIBLE_STATUS;

// ---------- generic per-topic content CRUD ----------

/**
 * Lists a topic's items of one type. Staff with write access see everything; anyone else
 * (students, mentors) sees published items only. Questions are staff-only because they
 * carry answers; students get questions through the quiz endpoint.
 */
export async function listTopicItems(user, type, topicId, filter = {}) {
  const { subject } = await loadTopic(user, topicId, 'read');
  const Model = CONTENT_MODELS[type];
  const staffView = isStaff(user) && (await canWrite(user, subject));
  if (type === 'question' && !staffView)
    throw forbidden('Questions are available through the quiz');
  const query = { topicId, ...filter, ...(staffView ? {} : { status: PUBLISHED }) };
  return Model.find(query).sort({ createdAt: 1 });
}

async function canWrite(user, subject) {
  try {
    await loadSubject(user, String(subject._id), 'write');
    return true;
  } catch {
    return false;
  }
}

export async function createTopicItem(user, type, topicId, input) {
  const { topic } = await loadTopic(user, topicId, 'write');
  const doc = await CONTENT_MODELS[type].create({
    ...input,
    topicId: topic._id,
    subjectId: topic.subjectId,
    status: 'draft',
    source: 'faculty',
    createdBy: user.id,
  });
  await audit({
    actorId: user.id,
    action: `${type}.create`,
    target: { type, id: String(doc._id) },
  });
  return doc;
}

/** Loads one item and checks write access through its subject. */
export async function loadItem(user, type, id, mode = 'write') {
  const doc = await CONTENT_MODELS[type].findById(id);
  if (!doc) throw notFound(type[0].toUpperCase() + type.slice(1));
  await loadSubject(user, String(doc.subjectId), mode);
  return doc;
}

/**
 * Edits an item. Editing clears a rejection; editing an AI draft records the A5 "edited" signal.
 * Editing does not change status: the owning faculty is the reviewer.
 */
export async function updateItem(user, type, id, input) {
  const doc = await loadItem(user, type, id);
  if (type === 'question') {
    const options = input.options ?? doc.options;
    const correctIndex = input.correctIndex ?? doc.correctIndex;
    const optionExplanations = input.optionExplanations ?? doc.optionExplanations;
    if (correctIndex >= options.length) throw badRequest('correctIndex must point to an option');
    if (optionExplanations.length && optionExplanations.length !== options.length) {
      throw badRequest('optionExplanations must match options');
    }
  }
  doc.set(input);
  if (doc.source === 'ai') doc.editedAfterAi = true;
  doc.rejectedAt = undefined;
  doc.rejectedBy = undefined;
  doc.rejectReason = undefined;
  await doc.save();
  await audit({
    actorId: user.id,
    action: `${type}.update`,
    target: { type, id },
    meta: { fields: Object.keys(input) },
  });
  return doc;
}

export async function deleteItem(user, type, id) {
  const doc = await loadItem(user, type, id);
  if (doc.fileKey) await storage().remove(doc.fileKey);
  await doc.deleteOne();
  await audit({ actorId: user.id, action: `${type}.delete`, target: { type, id } });
}

// ---------- resource files (uploaded videos) ----------

export async function attachResourceFile(user, id, file) {
  const doc = await loadItem(user, 'resource', id);
  if (doc.kind !== 'video') throw badRequest('Only video resources accept an uploaded file');
  const { ext, mime } = await sniffFile(file.buffer, ['mp4', 'webm']);
  if (doc.fileKey) await storage().remove(doc.fileKey);
  doc.fileKey = await storage().save(file.buffer, { folder: 'videos', ext });
  doc.fileName = file.originalname;
  doc.mimeType = mime;
  doc.size = file.size;
  await doc.save();
  return doc;
}

/** Streams a resource file. Students may only fetch published resources of visible topics. */
export async function openResourceFile(user, id) {
  const doc = await Resource.findById(id).lean();
  if (!doc || !doc.fileKey) throw notFound('File');
  await loadTopic(user, String(doc.topicId), 'read');
  if (!isStaff(user) && doc.status !== PUBLISHED) throw notFound('File');
  if (isStaff(user)) await loadSubject(user, String(doc.subjectId), 'write');
  const { stream, size } = await storage().read(doc.fileKey);
  return { stream, size, mimeType: doc.mimeType, fileName: doc.fileName };
}

// ---------- materials ----------

const MATERIAL_TYPES = {
  syllabusPdf: ['pdf'],
  notes: ['pdf', 'pptx', 'docx', 'png', 'jpg', 'webp'],
  slides: ['pdf', 'pptx'],
  pyqPaper: ['pdf', 'png', 'jpg', 'webp'],
};

/**
 * Stores an uploaded material and extracts PDF text on upload (B3.2).
 * Scanned PDFs are stored but flagged with a clear warning.
 */
export async function uploadMaterial(user, input, file) {
  let subjectId = input.subjectId;
  if (input.topicId) {
    const { topic } = await loadTopic(user, input.topicId, 'write');
    if (subjectId && subjectId !== String(topic.subjectId))
      throw badRequest('topicId does not belong to subjectId');
    subjectId = String(topic.subjectId);
  } else {
    await loadSubject(user, subjectId, 'write');
  }
  const { ext, mime } = await sniffFile(file.buffer, MATERIAL_TYPES[input.kind]);
  const fileKey = await storage().save(file.buffer, { folder: 'materials', ext });

  let extracted = { text: '', pageCount: undefined, scanned: false, warning: undefined };
  if (ext === 'pdf') extracted = await extractPdfText(file.buffer);
  else if (ext !== 'pptx' && ext !== 'docx')
    extracted.warning = 'Images are stored but not read; text extraction supports PDFs only.';
  else
    extracted.warning = `${ext.toUpperCase()} text extraction is not supported yet; upload a PDF export for AI drafting.`;

  const material = await Material.create({
    topicId: input.topicId ?? null,
    subjectId,
    kind: input.kind,
    fileKey,
    fileName: file.originalname,
    mimeType: mime,
    size: file.size,
    extractedText: extracted.text,
    pageCount: extracted.pageCount,
    scanned: extracted.scanned,
    warning: extracted.warning,
    uploadedBy: user.id,
  });
  await audit({
    actorId: user.id,
    action: 'material.upload',
    target: { type: 'material', id: String(material._id) },
    meta: { kind: input.kind, scanned: extracted.scanned },
  });
  return material;
}

/** Material list without the (large) extracted text. */
export async function listMaterials(user, { topicId, subjectId }) {
  let filter;
  if (topicId) {
    await loadTopic(user, topicId, 'write');
    filter = { topicId };
  } else {
    await loadSubject(user, subjectId, 'write');
    filter = { subjectId };
  }
  const items = await Material.find(filter).select('-extractedText').sort({ createdAt: -1 }).lean();
  return items.map(({ _id, __v: _v, ...rest }) => ({ id: String(_id), ...rest }));
}

export async function getMaterial(user, id) {
  const m = await Material.findById(id);
  if (!m) throw notFound('Material');
  await loadSubject(user, String(m.subjectId), 'write');
  return m;
}

export async function openMaterialFile(user, id) {
  const m = await getMaterial(user, id);
  const { stream, size } = await storage().read(m.fileKey);
  return { stream, size, mimeType: m.mimeType, fileName: m.fileName };
}

export async function deleteMaterial(user, id) {
  const m = await getMaterial(user, id);
  await storage().remove(m.fileKey);
  await m.deleteOne();
  await audit({ actorId: user.id, action: 'material.delete', target: { type: 'material', id } });
}

// ---------- review queue ----------

const PREVIEW = {
  resource: {
    $ifNull: ['$title', { $substrCP: [{ $ifNull: ['$body', { $ifNull: ['$url', ''] }] }, 0, 160] }],
  },
  flashcard: '$front',
  question: '$stem',
  pyq: { $substrCP: ['$text', 0, 160] },
};

const COLLECTION = {
  resource: 'resources',
  flashcard: 'flashcards',
  question: 'questions',
  pyq: 'pyqs',
};

/**
 * GET /review-queue — drafts across resources, flashcards, questions and PYQs, newest first.
 * Faculty see only their subjects. Uses $unionWith so pagination spans all collections.
 */
export async function reviewQueue(user, query) {
  let subjectIds;
  if (user.role === 'admin') subjectIds = query.subjectId ? [query.subjectId] : null;
  else {
    const mine = await facultySubjectIds(user.id);
    if (query.subjectId && !mine.includes(query.subjectId))
      throw forbidden('You do not have access to this subject');
    subjectIds = query.subjectId ? [query.subjectId] : mine;
  }

  const match = { status: query.status ? query.status : { $in: ['draft', 'inReview'] } };
  if (subjectIds) match.subjectId = { $in: subjectIds.map(oid) };
  if (query.source) match.source = query.source;
  if (!query.includeRejected) match.rejectedAt = { $exists: false };
  if (query.needsAttention !== undefined) match.needsAttention = query.needsAttention;

  let types = ['resource', 'flashcard', 'question', 'pyq'];
  let kindMatch = {};
  if (query.kind) {
    if (RESOURCE_KINDS.includes(query.kind)) {
      types = ['resource'];
      kindMatch = { kind: query.kind };
    } else types = [query.kind];
  }

  const stage = (type) => {
    const m = { ...match, ...(type === 'resource' ? kindMatch : {}) };
    if (query.topicId) m[type === 'pyq' ? 'topicIds' : 'topicId'] = oid(query.topicId);
    return [
      { $match: m },
      {
        $project: {
          _id: 0,
          type: { $literal: type },
          id: { $toString: '$_id' },
          topicId:
            type === 'pyq' ? { $toString: { $first: '$topicIds' } } : { $toString: '$topicId' },
          subjectId: { $toString: '$subjectId' },
          kind: type === 'resource' ? '$kind' : { $literal: type },
          status: 1,
          source: 1,
          needsAttention: { $ifNull: ['$needsAttention', false] },
          rejectReason: 1,
          preview: PREVIEW[type],
          aiMeta: 1,
          createdAt: 1,
        },
      },
    ];
  };

  const [first, ...rest] = types;
  const pipeline = [
    ...stage(first),
    ...rest.map((t) => ({ $unionWith: { coll: COLLECTION[t], pipeline: stage(t) } })),
    { $sort: { createdAt: -1, id: 1 } },
    {
      $facet: {
        items: [{ $skip: (query.page - 1) * query.limit }, { $limit: query.limit }],
        total: [{ $count: 'n' }],
      },
    },
  ];
  const [res] = await CONTENT_MODELS[first].aggregate(pipeline);
  return { items: res.items, total: res.total[0]?.n ?? 0 };
}

// ---------- student topic page ----------

/** Latest published resource of each kind for a topic. */
async function publishedResources(topicId) {
  const docs = await Resource.find({ topicId, status: PUBLISHED })
    .sort({ publishedAt: -1, updatedAt: -1 })
    .lean();
  const byKind = {};
  for (const d of docs) if (!byKind[d.kind]) byKind[d.kind] = d;
  return byKind;
}

const resourceView = (d) => ({
  id: String(d._id),
  ...(d.title ? { title: d.title } : {}),
  ...(d.body ? { body: d.body } : {}),
  ...(d.url ? { url: d.url } : {}),
  ...(d.fileKey ? { fileUrl: `/api/v1/resources/${d._id}/file`, mimeType: d.mimeType } : {}),
});

/**
 * GET /topics/:id/page — everything a student needs for the six-step page, published only.
 * Missing kinds are omitted from the response, never null-filled (B3.6).
 */
export async function topicPage(user, topicId) {
  const { topic, subject } = await loadTopic(user, topicId, 'read');
  const [
    byKind,
    flashcardCount,
    questionCount,
    curiosityQ,
    pyqs,
    prerequisites,
    unlocksList,
    unit,
    workshops,
  ] = await Promise.all([
    publishedResources(topicId),
    Flashcard.countDocuments({ topicId, status: PUBLISHED }),
    Question.countDocuments({ topicId, type: 'mcq', status: PUBLISHED }),
    Question.findOne({ topicId, type: 'curiosity', status: PUBLISHED })
      .sort({ publishedAt: -1 })
      .lean(),
    Pyq.find({ topicIds: topic._id, status: PUBLISHED }).sort({ examDate: -1 }).lean(),
    prerequisitesOf(user, topicId),
    unlocks(user, topicId),
    Unit.findById(topic.unitId).lean(),
    Workshop.find({ topicId }).sort({ dueAt: 1 }).lean(),
  ]);

  const page = {
    topic: {
      id: String(topic._id),
      title: topic.title,
      summary: topic.summary,
      subject: { id: String(subject._id), code: subject.code, name: subject.name },
      unit: unit ? { id: String(unit._id), number: unit.number, title: unit.title } : undefined,
    },
    flashcardCount,
    questionCount,
    prerequisites,
    unlocks: unlocksList,
  };

  // Curiosity: an ungraded scenario, so its answer and explanation are shown on reveal.
  if (byKind.curiosity || curiosityQ) {
    page.curiosity = {
      ...(byKind.curiosity ? resourceView(byKind.curiosity) : {}),
      ...(curiosityQ
        ? {
            question: {
              id: String(curiosityQ._id),
              stem: curiosityQ.stem,
              options: curiosityQ.options,
              correctIndex: curiosityQ.correctIndex,
              explanation: curiosityQ.explanation,
              optionExplanations: curiosityQ.optionExplanations,
            },
          }
        : {}),
    };
  }
  for (const kind of ['video', 'easy', 'tenMark', 'realWorld', 'workshop']) {
    if (byKind[kind]) page[kind] = resourceView(byKind[kind]);
  }
  if (workshops.length) {
    page.workshops = workshops.map((w) => ({ id: String(w._id), brief: w.brief, dueAt: w.dueAt }));
  }
  if (pyqs.length) {
    page.pyqs = pyqs.map((p) => ({
      id: String(p._id),
      text: p.text,
      marks: p.marks,
      examDate: p.examDate,
    }));
  }
  return page;
}
