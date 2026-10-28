import {
  FORM_CHOICE_TYPES,
  FORM_FILE_EXTS,
  FORM_FILE_KINDS,
  FORM_GRID_TYPES,
  FormAnswersSchema,
  FormSettingsSchema,
  allQuestions,
  audienceMatches,
  blankQuestion,
  blankSection,
  formOpenState,
  isBlank,
  isInputItem,
  newFormId,
  roleAllows,
  scoreResponse,
  validateAnswers,
  visibleQuestions,
} from '@acet/shared';
import { oid, sameId } from '../../db/mongoose.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { storage } from '../../lib/storage.js';
import { sniffFile } from '../../lib/upload.js';
import { audit } from '../audit/service.js';
import { csvCell } from '../contentcsv/csv.js';
import { notifyUsers, removeNotificationsFor, renotifyUsers } from '../notifications/service.js';
import { User } from '../users/model.js';
import { hodDepartment } from '../users/service.js';
import { Form, FormResponse } from './model.js';

/** Form Studio (ADR 0015): faculty and HODs build forms, students in the audience fill them. */

const isCoordinator = (user) => user.role === 'coordinator';
const isHod = (user) => user.role === 'admin';
const isStaff = (user) => roleAllows(user.role, ['faculty', 'admin']);

/** Whether `user` may edit the form and see its responses. */
function canManage(user, form) {
  if (!isStaff(user)) return false;
  if (isCoordinator(user)) return true;
  if (sameId(form.createdBy, user.id)) return true;
  if ((form.collaboratorIds ?? []).some((c) => sameId(c, user.id))) return true;
  return isHod(user) && user.departmentId != null && sameId(form.departmentId, user.departmentId);
}

async function loadManaged(user, id) {
  const form = await Form.findById(id);
  if (!form) throw notFound('Form');
  if (!canManage(user, form)) throw forbidden('You cannot edit this form');
  return form;
}

/** Plain JSON for a stored form (dates and ids as the client expects them). */
const plain = (doc) => JSON.parse(JSON.stringify(doc.toObject ? doc.toObject() : doc));

/**
 * A HOD's audience is always their department; others pick freely (empty = every student).
 * Returns the audience to store.
 */
function scopedAudience(user, audience) {
  if (!isHod(user)) return audience;
  const dept = hodDepartment(user);
  if (audience.departmentIds.some((d) => !sameId(d, dept))) {
    throw forbidden('A HOD can send forms only to their own department');
  }
  return { ...audience, departmentIds: [dept] };
}

/** Mongo filter for the active students in an audience. */
function audienceUserFilter(audience) {
  const f = { role: 'student', isActive: true };
  if (audience.departmentIds?.length) f.departmentId = { $in: audience.departmentIds.map(oid) };
  if (audience.yearsOfStudy?.length) f.yearOfStudy = { $in: audience.yearsOfStudy };
  if (audience.semesters?.length) f.semester = { $in: audience.semesters };
  if (audience.batches?.length) f.batch = { $in: audience.batches };
  return f;
}

/** Mongo filter for the published forms whose audience includes `student`. */
function studentFormFilter(student) {
  const anyOr = (field, value) => ({
    $or: [{ [field]: { $size: 0 } }, ...(value != null ? [{ [field]: value }] : [])],
  });
  return {
    status: 'published',
    $and: [
      anyOr('audience.departmentIds', student.departmentId ? oid(student.departmentId) : null),
      anyOr('audience.yearsOfStudy', student.yearOfStudy),
      anyOr('audience.semesters', student.semester),
      anyOr('audience.batches', student.batch),
    ],
  };
}

async function notifyAudience(form) {
  const students = await User.find(audienceUserFilter(form.audience)).select('_id').lean();
  const closes = form.settings?.closesAt
    ? ` Due ${new Date(form.settings.closesAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}.`
    : '';
  return notifyUsers(
    students.map((s) => s._id),
    {
      type: 'form.published',
      title: `New form: ${form.title}`,
      body: `${form.description ? `${form.description.slice(0, 140)} ` : ''}${closes}`.trim(),
      link: `/forms/${form._id}`,
      refId: form._id,
    },
  );
}

/* ------------------------------------------------------------- staff side */

async function responseCounts(formIds) {
  const rows = await FormResponse.aggregate([
    { $match: { formId: { $in: formIds } } },
    { $group: { _id: '$formId', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

/** The editor's view of a form. */
async function editorView(user, form, responseCount) {
  const f = plain(form);
  const collaborators = await User.find({ _id: { $in: form.collaboratorIds } })
    .select('name email role')
    .lean();
  const owner = await User.findById(form.createdBy).select('name email').lean();
  return {
    ...f,
    createdBy: String(form.createdBy),
    owner: owner ? { id: String(owner._id), name: owner.name, email: owner.email } : null,
    collaborators: collaborators.map((c) => ({ id: String(c._id), name: c.name, email: c.email })),
    responseCount: responseCount ?? (await FormResponse.countDocuments({ formId: form._id })),
    open: formOpenState(f, { responseCount: responseCount ?? 0 }),
    isOwner: sameId(form.createdBy, user.id),
  };
}

/** GET /forms — forms the user created, collaborates on, or (HOD) their department's. */
export async function listForms(user) {
  const filter = isCoordinator(user)
    ? {}
    : {
        $or: [
          { createdBy: oid(user.id) },
          { collaboratorIds: oid(user.id) },
          ...(isHod(user) && user.departmentId ? [{ departmentId: oid(user.departmentId) }] : []),
        ],
      };
  const forms = await Form.find(filter).sort({ updatedAt: -1 }).lean();
  const counts = await responseCounts(forms.map((f) => f._id));
  const owners = new Map(
    (
      await User.find({ _id: { $in: forms.map((f) => f.createdBy) } })
        .select('name')
        .lean()
    ).map((u) => [String(u._id), u.name]),
  );
  return forms.map((f) => {
    const n = counts.get(String(f._id)) ?? 0;
    return {
      id: String(f._id),
      title: f.title,
      description: f.description,
      headerColor: f.headerColor,
      status: f.status,
      isQuiz: Boolean(f.settings?.isQuiz),
      questionCount: allQuestions(f).filter(isInputItem).length,
      responseCount: n,
      open: formOpenState(f, { responseCount: n }),
      closesAt: f.settings?.closesAt ?? null,
      ownerName: owners.get(String(f.createdBy)) ?? '',
      isOwner: sameId(f.createdBy, user.id),
      updatedAt: f.updatedAt,
      publishedAt: f.publishedAt ?? null,
    };
  });
}

/** POST /forms — a new draft with one section and one multiple-choice question. */
export async function createForm(user, { title, description }) {
  const section = blankSection();
  section.questions = [{ ...blankQuestion('multipleChoice'), title: 'Untitled question' }];
  const departmentId = isHod(user) ? hodDepartment(user) : user.departmentId;
  const form = await Form.create({
    title,
    description,
    sections: [section],
    settings: FormSettingsSchema.parse({}),
    audience: { departmentIds: departmentId ? [departmentId] : [] },
    createdBy: user.id,
    departmentId: departmentId ?? null,
  });
  await audit({
    actorId: user.id,
    action: 'form.create',
    target: { type: 'form', id: String(form._id) },
  });
  return editorView(user, form, 0);
}

export async function getForm(user, id) {
  return editorView(user, await loadManaged(user, id));
}

/** PUT /forms/:id — saves the whole form (the editor autosaves). */
export async function updateForm(user, id, input) {
  const form = await loadManaged(user, id);
  const audience = scopedAudience(user, input.audience);
  const before = JSON.stringify(plain(form).audience);
  form.set({ ...input, audience });
  form.markModified('sections');
  form.markModified('settings');
  await form.save();
  let notified = 0;
  // Widening a published form's audience notifies the newly added students only.
  if (form.status === 'published' && JSON.stringify(plain(form).audience) !== before) {
    notified = await notifyAudience(form);
  }
  return { ...(await editorView(user, form)), notified };
}

/** POST /forms/:id/publish — opens the form and notifies every student in its audience. */
export async function publishForm(user, id) {
  const form = await loadManaged(user, id);
  if (!allQuestions(form).some(isInputItem)) {
    throw badRequest('Add at least one question before publishing');
  }
  const untitled = allQuestions(form).find((q) => isInputItem(q) && !q.title?.trim());
  if (untitled) throw badRequest('Every question needs a title before publishing');
  form.status = 'published';
  form.publishedAt = form.publishedAt ?? new Date();
  await form.save();
  const notified = await notifyAudience(form);
  await audit({
    actorId: user.id,
    action: 'form.publish',
    target: { type: 'form', id },
    meta: { notified },
  });
  return { ...(await editorView(user, form)), notified };
}

/** POST /forms/:id/unpublish — back to draft: students no longer see it. */
export async function unpublishForm(user, id) {
  const form = await loadManaged(user, id);
  form.status = 'draft';
  await form.save();
  return editorView(user, form);
}

export async function duplicateForm(user, id) {
  const src = plain(await loadManaged(user, id));
  const departmentId = isHod(user) ? hodDepartment(user) : user.departmentId;
  const form = await Form.create({
    title: `Copy of ${src.title}`.slice(0, 300),
    description: src.description,
    headerColor: src.headerColor,
    sections: src.sections,
    settings: src.settings,
    audience: src.audience,
    createdBy: user.id,
    departmentId: departmentId ?? null,
  });
  return editorView(user, form, 0);
}

async function removeFiles(responses) {
  for (const r of responses) for (const f of r.files ?? []) await storage().remove(f.key);
}

export async function deleteForm(user, id) {
  const form = await loadManaged(user, id);
  const hodOfDept = isHod(user) && sameId(form.departmentId, user.departmentId);
  if (!sameId(form.createdBy, user.id) && !isCoordinator(user) && !hodOfDept) {
    throw forbidden('Only the owner can delete this form');
  }
  await removeFiles(await FormResponse.find({ formId: id }).select('files').lean());
  await FormResponse.deleteMany({ formId: id });
  await removeNotificationsFor(id);
  await form.deleteOne();
  await audit({ actorId: user.id, action: 'form.delete', target: { type: 'form', id } });
}

export async function addCollaborator(user, id, { email }) {
  const form = await loadManaged(user, id);
  const other = await User.findOne({ email: email.toLowerCase(), isActive: true }).lean();
  if (!other || !roleAllows(other.role, ['faculty', 'admin'])) {
    throw badRequest('No faculty or HOD account has this email');
  }
  if (
    !sameId(other._id, form.createdBy) &&
    !form.collaboratorIds.some((c) => sameId(c, other._id))
  ) {
    form.collaboratorIds.push(other._id);
    await form.save();
  }
  return editorView(user, form);
}

export async function removeCollaborator(user, id, userId) {
  const form = await loadManaged(user, id);
  form.collaboratorIds = form.collaboratorIds.filter((c) => !sameId(c, userId));
  await form.save();
  return editorView(user, form);
}

/* -------------------------------------------------------------- responses */

const studentLabel = (u) =>
  u ? { id: String(u._id), name: u.name, email: u.email, batch: u.batch ?? null } : null;

/** Aggregate view per question (Google Forms "Summary" tab). */
export function summarize(form, responses) {
  const out = {};
  for (const q of allQuestions(form).filter(isInputItem)) {
    const values = responses.map((r) => r.answers?.[q.id]).filter((v) => !isBlank(q, v));
    const s = { questionId: q.id, type: q.type, answered: values.length };
    if (FORM_CHOICE_TYPES.includes(q.type)) {
      const labels = q.options.map((o) => o.label);
      const counts = Object.fromEntries(labels.map((l) => [l, 0]));
      let other = 0;
      for (const v of values) {
        for (const x of Array.isArray(v) ? v : [v]) {
          if (x in counts) counts[x] += 1;
          else other += 1;
        }
      }
      s.counts = labels.map((label) => ({ label, count: counts[label] }));
      if (q.hasOther || other) s.counts.push({ label: 'Other', count: other, other: true });
      s.otherAnswers = values
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .filter((x) => !labels.includes(x))
        .slice(0, 50);
    } else if (q.type === 'linearScale' || q.type === 'rating') {
      const min = q.type === 'rating' ? 1 : (q.scale?.min ?? 1);
      const max = q.type === 'rating' ? q.ratingMax : (q.scale?.max ?? 5);
      s.counts = [];
      for (let v = min; v <= max; v += 1) {
        s.counts.push({ label: String(v), count: values.filter((x) => x === v).length });
      }
      s.average = values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
        : null;
    } else if (FORM_GRID_TYPES.includes(q.type)) {
      s.grid = q.rows.map((row) => ({
        row,
        counts: q.columns.map((col) => ({
          label: col,
          count: values.filter((v) => [v[row]].flat().includes(col)).length,
        })),
      }));
    } else if (q.type === 'fileUpload') {
      s.files = responses.reduce(
        (n, r) => n + (r.files ?? []).filter((f) => f.questionId === q.id).length,
        0,
      );
    } else {
      s.texts = values.slice(-100).reverse().map(String);
    }
    out[q.id] = s;
  }
  return out;
}

function quizStats(form, responses) {
  if (!form.settings?.isQuiz) return null;
  const scores = responses.map((r) => r.score ?? 0);
  const maxScore = scoreResponse(form, {}).maxScore;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const correctByQuestion = {};
  for (const r of responses) {
    const { results } = scoreResponse(form, r.answers, r.manualGrades);
    for (const [qid, res] of Object.entries(results)) {
      correctByQuestion[qid] = (correctByQuestion[qid] ?? 0) + (res.earned === res.points ? 1 : 0);
    }
  }
  return {
    maxScore,
    average: scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : null,
    median: scores.length
      ? sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2
      : null,
    correctByQuestion,
  };
}

/** GET /forms/:id/responses — summary, quiz stats and every response. */
export async function listResponses(user, id) {
  const form = plain(await loadManaged(user, id));
  const responses = await FormResponse.find({ formId: id }).sort({ submittedAt: 1 }).lean();
  const anonymous = Boolean(form.settings?.anonymous);
  const students = anonymous
    ? new Map()
    : new Map(
        (
          await User.find({ _id: { $in: responses.map((r) => r.userId) } })
            .select('name email batch')
            .lean()
        ).map((u) => [String(u._id), u]),
      );
  return {
    total: responses.length,
    anonymous,
    summary: summarize(form, responses),
    quiz: quizStats(form, responses),
    responses: responses.map((r) => ({
      id: String(r._id),
      student: anonymous ? null : studentLabel(students.get(String(r.userId))),
      answers: r.answers,
      files: (r.files ?? []).map(({ key: _k, ...f }) => f),
      score: r.score,
      maxScore: r.maxScore,
      results: form.settings?.isQuiz
        ? scoreResponse(form, r.answers, r.manualGrades).results
        : null,
      manualGrades: r.manualGrades ?? {},
      feedback: r.feedback ?? '',
      scoreReleased: r.scoreReleased,
      submittedAt: r.submittedAt,
      updatedAt: r.updatedAt,
    })),
  };
}

const answerText = (q, value) => {
  if (isBlank(q, value)) return '';
  if (Array.isArray(value)) return value.join('; ');
  return String(value);
};

/** GET /forms/:id/export — responses as CSV, one column per question (and per grid row). */
export async function exportResponses(user, id) {
  const form = plain(await loadManaged(user, id));
  const { responses, anonymous } = await listResponses(user, id);
  const questions = allQuestions(form).filter(isInputItem);
  const header = ['Timestamp'];
  if (!anonymous) header.push('Name', 'Email', 'Batch');
  if (form.settings?.isQuiz) header.push('Score');
  for (const q of questions) {
    if (FORM_GRID_TYPES.includes(q.type))
      for (const row of q.rows) header.push(`${q.title} [${row}]`);
    else header.push(q.title);
  }
  const lines = [header.map(csvCell).join(',')];
  for (const r of responses) {
    const row = [new Date(r.submittedAt).toISOString()];
    if (!anonymous) row.push(r.student?.name ?? '', r.student?.email ?? '', r.student?.batch ?? '');
    if (form.settings?.isQuiz) row.push(`${r.score ?? 0} / ${r.maxScore ?? 0}`);
    for (const q of questions) {
      const v = r.answers?.[q.id];
      if (FORM_GRID_TYPES.includes(q.type)) {
        for (const gr of q.rows) row.push(answerText(q, v?.[gr]));
      } else if (q.type === 'fileUpload') {
        row.push(
          r.files
            .filter((f) => f.questionId === q.id)
            .map((f) => f.name)
            .join('; '),
        );
      } else row.push(answerText(q, v));
    }
    lines.push(row.map(csvCell).join(','));
  }
  const BOM = String.fromCharCode(0xfeff);
  const name =
    form.title
      .replace(/[^\w -]+/g, '')
      .trim()
      .slice(0, 60) || 'form';
  return { csv: `${BOM}${lines.join('\r\n')}\r\n`, fileName: `${name} (Responses).csv` };
}

export async function deleteResponse(user, id, responseId) {
  await loadManaged(user, id);
  const r = await FormResponse.findOne({ _id: responseId, formId: id });
  if (!r) throw notFound('Response');
  await removeFiles([r]);
  await r.deleteOne();
}

export async function deleteAllResponses(user, id) {
  await loadManaged(user, id);
  await removeFiles(await FormResponse.find({ formId: id }).select('files').lean());
  const res = await FormResponse.deleteMany({ formId: id });
  await audit({
    actorId: user.id,
    action: 'form.responses.deleteAll',
    target: { type: 'form', id },
    meta: { deleted: res.deletedCount },
  });
  return { deleted: res.deletedCount };
}

/** PATCH /forms/:id/responses/:responseId/grade — manual points per question and feedback. */
export async function gradeResponse(user, id, responseId, { grades, feedback }) {
  const form = plain(await loadManaged(user, id));
  const r = await FormResponse.findOne({ _id: responseId, formId: id });
  if (!r) throw notFound('Response');
  const known = new Map(allQuestions(form).map((q) => [q.id, q]));
  const manual = { ...(r.manualGrades ?? {}) };
  for (const [qid, pts] of Object.entries(grades)) {
    const q = known.get(qid);
    if (!q) throw badRequest(`Unknown question ${qid}`);
    if (pts == null) delete manual[qid];
    else manual[qid] = Math.min(pts, q.points);
  }
  const { score, maxScore } = scoreResponse(form, r.answers, manual);
  r.set({ manualGrades: manual, score, maxScore, ...(feedback !== undefined ? { feedback } : {}) });
  r.markModified('manualGrades');
  await r.save();
  return { id: String(r._id), score, maxScore, manualGrades: manual, feedback: r.feedback };
}

/** POST /forms/:id/release-scores — students see their marks, and get a notification. */
export async function releaseScores(user, id) {
  const form = await loadManaged(user, id);
  if (!form.settings?.isQuiz) throw badRequest('This form is not a quiz');
  await FormResponse.updateMany({ formId: id }, { $set: { scoreReleased: true } });
  const userIds = await FormResponse.distinct('userId', { formId: id });
  const notified = await renotifyUsers(userIds, {
    type: 'form.scoreReleased',
    title: `Scores released: ${form.title}`,
    body: 'Open the form to see your score.',
    link: `/forms/${id}`,
    refId: form._id,
  });
  return { released: userIds.length, notified };
}

/* ------------------------------------------------------------ respondents */

/** The form as a respondent sees it: no answer key or feedback. */
function publicForm(form) {
  const { isQuiz, showPointValues } = form.settings ?? {};
  return {
    id: String(form._id ?? form.id),
    title: form.title,
    description: form.description,
    headerColor: form.headerColor,
    status: form.status,
    settings: {
      showProgressBar: form.settings?.showProgressBar ?? true,
      shuffleQuestions: Boolean(form.settings?.shuffleQuestions),
      limitOneResponse: form.settings?.limitOneResponse ?? true,
      allowEdit: Boolean(form.settings?.allowEdit),
      isQuiz: Boolean(isQuiz),
      showPointValues: Boolean(showPointValues),
      showSummaryToRespondents: Boolean(form.settings?.showSummaryToRespondents),
      anonymous: Boolean(form.settings?.anonymous),
      opensAt: form.settings?.opensAt ?? null,
      closesAt: form.settings?.closesAt ?? null,
    },
    sections: form.sections.map((s) => ({
      ...s,
      questions: s.questions.map(
        ({ answerKey: _k, feedbackCorrect: _c, feedbackIncorrect: _i, points, ...q }) => ({
          ...q,
          points: isQuiz && showPointValues ? points : 0,
        }),
      ),
    })),
  };
}

/** A respondent's own response, with marks once they are released. */
function myResponseView(form, r) {
  const st = form.settings ?? {};
  const view = {
    id: String(r._id),
    answers: r.answers,
    files: (r.files ?? []).map(({ key: _k, ...f }) => f),
    submittedAt: r.submittedAt,
    updatedAt: r.updatedAt,
    scoreReleased: Boolean(st.isQuiz && r.scoreReleased),
  };
  if (!view.scoreReleased) return view;
  const { score, maxScore, results } = scoreResponse(form, r.answers, r.manualGrades);
  const byId = new Map(allQuestions(form).map((q) => [q.id, q]));
  view.score = score;
  view.maxScore = maxScore;
  view.feedback = r.feedback ?? '';
  view.results = Object.fromEntries(
    Object.entries(results).map(([qid, res]) => {
      const q = byId.get(qid);
      const right = res.earned === res.points;
      return [
        qid,
        {
          earned: res.earned,
          points: res.points,
          pending: res.pending,
          ...(st.showMissedQuestions ? { correct: right } : {}),
          ...(st.showCorrectAnswers && q.answerKey?.length ? { correctAnswers: q.answerKey } : {}),
          feedback: res.pending ? '' : right ? q.feedbackCorrect : q.feedbackIncorrect,
        },
      ];
    }),
  );
  return view;
}

/** Loads a form a respondent may open: published, and (students) in the audience. */
async function loadForRespondent(user, id) {
  const form = await Form.findById(id).lean();
  if (!form) throw notFound('Form');
  if (canManage(user, form)) return { form, editor: true };
  if (form.status !== 'published') throw notFound('Form');
  if (user.role !== 'student' || !audienceMatches(form.audience, user)) {
    throw forbidden('This form is not shared with you');
  }
  return { form, editor: false };
}

/** GET /forms/:id/view — the fill page: form, open state and the student's own responses. */
export async function viewForm(user, id) {
  const { form, editor } = await loadForRespondent(user, id);
  const responseCount = await FormResponse.countDocuments({ formId: id });
  const open = formOpenState(form, { responseCount });
  const mine = editor
    ? []
    : await FormResponse.find({ formId: id, userId: user.id }).sort({ submittedAt: -1 }).lean();
  const st = form.settings ?? {};
  const latest = mine[0] ?? null;
  return {
    form: publicForm(form),
    open,
    preview: editor,
    myResponse: latest ? myResponseView(form, latest) : null,
    responseCount: mine.length,
    canRespond: !editor && open.open && (!latest || !st.limitOneResponse || st.allowEdit),
    canEdit: !editor && open.open && Boolean(latest && st.allowEdit),
    confirmationMessage: st.confirmationMessage,
  };
}

/** Upload parts are named `file:<questionId>`. */
function filesByQuestion(files = []) {
  const map = new Map();
  for (const f of files) {
    const m = /^file:([A-Za-z0-9_-]{1,40})$/.exec(f.fieldname);
    if (!m) throw badRequest(`Unexpected upload field ${f.fieldname}`);
    map.set(m[1], [...(map.get(m[1]) ?? []), f]);
  }
  return map;
}

/**
 * POST /forms/:id/responses — a student submits (or, with "allow edit", changes) a response.
 * Only answers on the student's section path are kept; everything is re-checked here.
 */
export async function submitResponse(user, id, rawAnswers, uploads) {
  const { form, editor } = await loadForRespondent(user, id);
  if (editor || user.role !== 'student') throw forbidden('Only students can submit this form');
  const st = form.settings ?? {};
  const responseCount = await FormResponse.countDocuments({ formId: id });
  const existing = await FormResponse.findOne({ formId: id, userId: user.id }).sort({
    submittedAt: -1,
  });
  const editing = Boolean(existing && st.allowEdit);
  // Editing your own response does not count against the response limit.
  const open = formOpenState(form, { responseCount: editing ? 0 : responseCount });
  if (!open.open) throw forbidden('This form is not accepting responses');
  if (existing && st.limitOneResponse && !st.allowEdit) {
    throw conflict('You have already responded to this form');
  }

  const answers = FormAnswersSchema.parse(rawAnswers ?? {});
  const uploadMap = filesByQuestion(uploads);
  const visible = visibleQuestions(form, answers);
  const visibleIds = new Set(visible.map((q) => q.id));
  for (const qid of uploadMap.keys()) {
    const q = visible.find((x) => x.id === qid);
    if (!q || q.type !== 'fileUpload')
      throw badRequest('A file was sent for a question that takes no file');
  }

  // Keep only answers to questions on the path; file answers become the list of file names.
  const kept = {};
  const keptFiles = [];
  for (const q of visible) {
    if (q.type === 'fileUpload') {
      const fresh = uploadMap.get(q.id) ?? [];
      const previous = editing ? existing.files.filter((f) => f.questionId === q.id) : [];
      const names = fresh.length ? fresh.map((f) => f.originalname) : previous.map((f) => f.name);
      if (fresh.length > q.maxFiles)
        throw badRequest(`Upload at most ${q.maxFiles} file(s)`, {
          errors: { [q.id]: `At most ${q.maxFiles} file(s)` },
        });
      if (!fresh.length) keptFiles.push(...previous.map((f) => (f.toObject ? f.toObject() : f)));
      if (names.length) kept[q.id] = names;
    } else if (answers[q.id] !== undefined && answers[q.id] !== null) {
      kept[q.id] = answers[q.id];
    }
  }
  const errors = validateAnswers(form, kept);
  if (Object.keys(errors).length) throw badRequest('Some answers need attention', { errors });

  // Store the new files (types sniffed from the bytes), then drop replaced ones.
  const saved = [];
  const kinds = (q) => (q.fileKinds?.length ? q.fileKinds : FORM_FILE_KINDS);
  try {
    for (const [qid, files] of uploadMap) {
      const q = visible.find((x) => x.id === qid);
      const allowed = kinds(q).flatMap((k) => FORM_FILE_EXTS[k]);
      for (const f of files) {
        const { ext, mime } = await sniffFile(f.buffer, allowed);
        const key = await storage().save(f.buffer, { folder: 'form-uploads', ext });
        saved.push({
          id: newFormId('f'),
          questionId: qid,
          key,
          name: f.originalname,
          mimeType: mime,
          size: f.size,
        });
      }
    }
  } catch (err) {
    for (const f of saved) await storage().remove(f.key);
    throw err;
  }
  const files = [...keptFiles.filter((f) => visibleIds.has(f.questionId)), ...saved];
  const { score, maxScore } = scoreResponse(form, kept, {});
  const fields = {
    answers: kept,
    files,
    score: st.isQuiz ? score : null,
    maxScore: st.isQuiz ? maxScore : null,
    manualGrades: {},
    scoreReleased: Boolean(st.isQuiz && st.releaseScore === 'immediately'),
    submittedAt: new Date(),
  };

  let doc;
  if (editing) {
    const keepKeys = new Set(files.map((f) => f.key));
    const dropped = existing.files.filter((f) => !keepKeys.has(f.key));
    existing.set(fields);
    existing.markModified('answers');
    existing.markModified('manualGrades');
    doc = await existing.save();
    for (const f of dropped) await storage().remove(f.key);
  } else {
    doc = await FormResponse.create({ formId: id, userId: user.id, ...fields });
  }
  return {
    response: myResponseView(form, doc.toObject()),
    confirmationMessage: st.confirmationMessage,
    edited: editing,
  };
}

/** GET /forms/:id/summary — the summary charts, for respondents when the form allows it. */
export async function respondentSummary(user, id) {
  const { form, editor } = await loadForRespondent(user, id);
  if (!editor) {
    if (!form.settings?.showSummaryToRespondents)
      throw forbidden('This form does not share results');
    if (!(await FormResponse.exists({ formId: id, userId: user.id }))) {
      throw forbidden('Submit the form to see its results');
    }
  }
  const responses = await FormResponse.find({ formId: id }).select('answers files').lean();
  return { total: responses.length, summary: summarize(form, responses) };
}

/** GET /me/forms — the forms shared with a student, open ones first. */
export async function myForms(user) {
  const forms = await Form.find(studentFormFilter(user)).sort({ publishedAt: -1 }).lean();
  const ids = forms.map((f) => f._id);
  const [counts, mine] = await Promise.all([
    responseCounts(ids),
    FormResponse.find({ formId: { $in: ids }, userId: user.id })
      .sort({ submittedAt: -1 })
      .select('formId submittedAt score maxScore scoreReleased')
      .lean(),
  ]);
  const latest = new Map();
  for (const r of mine) if (!latest.has(String(r.formId))) latest.set(String(r.formId), r);
  return forms.map((f) => {
    const r = latest.get(String(f._id));
    const open = formOpenState(f, { responseCount: counts.get(String(f._id)) ?? 0 });
    const released = Boolean(f.settings?.isQuiz && r?.scoreReleased);
    return {
      id: String(f._id),
      title: f.title,
      description: f.description,
      headerColor: f.headerColor,
      isQuiz: Boolean(f.settings?.isQuiz),
      publishedAt: f.publishedAt,
      opensAt: f.settings?.opensAt ?? null,
      closesAt: f.settings?.closesAt ?? null,
      open,
      responded: Boolean(r),
      submittedAt: r?.submittedAt ?? null,
      canEdit: Boolean(r && open.open && f.settings?.allowEdit),
      ...(released ? { score: r.score, maxScore: r.maxScore } : {}),
    };
  });
}

/** GET /forms/:id/responses/:responseId/files/:fileId — for form editors and the respondent. */
export async function openResponseFile(user, id, responseId, fileId) {
  const r = await FormResponse.findOne({ _id: responseId, formId: id }).lean();
  if (!r) throw notFound('Response');
  if (!sameId(r.userId, user.id)) await loadManaged(user, id);
  const f = (r.files ?? []).find((x) => x.id === fileId);
  if (!f) throw notFound('File');
  const { stream, size } = await storage().read(f.key);
  return { stream, size, mimeType: f.mimeType, fileName: f.name };
}
