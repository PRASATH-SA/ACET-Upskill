import { z } from 'zod';
import { ObjectIdSchema } from './schemas/common.js';

/**
 * Form Studio (ADR 0015): Google-Forms-style forms that faculty and HODs build and students fill.
 * The schemas are the API contract; the functions below (branching, answer checks, quiz scoring)
 * run in the browser for instant feedback and again in the API, which is the authority.
 */

/** Question types students answer. */
export const FORM_INPUT_TYPES = [
  'shortText',
  'paragraph',
  'multipleChoice',
  'checkboxes',
  'dropdown',
  'linearScale',
  'rating',
  'date',
  'time',
  'multipleChoiceGrid',
  'checkboxGrid',
  'fileUpload',
];
/** Items that only show something: a title and text, an image, a YouTube video. */
export const FORM_DISPLAY_TYPES = ['textBlock', 'image', 'video'];
export const FORM_ITEM_TYPES = [...FORM_INPUT_TYPES, ...FORM_DISPLAY_TYPES];

export const FORM_CHOICE_TYPES = ['multipleChoice', 'checkboxes', 'dropdown'];
export const FORM_GRID_TYPES = ['multipleChoiceGrid', 'checkboxGrid'];
/** Types that can carry an answer key and be auto-graded in quiz mode. */
export const FORM_AUTO_GRADED_TYPES = ['shortText', 'multipleChoice', 'checkboxes', 'dropdown'];
/** Types faculty grade by hand in quiz mode. */
export const FORM_MANUAL_GRADED_TYPES = ['paragraph', 'fileUpload'];
/** Types whose options can send the student to another section. */
export const FORM_BRANCHING_TYPES = ['multipleChoice', 'dropdown'];

export const FORM_STATUSES = ['draft', 'published'];
export const FORM_HEADER_COLORS = ['brand', 'navy', 'orange', 'green', 'gold'];
export const FORM_FILE_KINDS = ['pdf', 'image', 'document', 'presentation'];
/** Upload types per file kind, as sniffFile() names them. */
export const FORM_FILE_EXTS = {
  pdf: ['pdf'],
  image: ['png', 'jpg', 'webp'],
  document: ['docx'],
  presentation: ['pptx'],
};
export const FORM_VALIDATION_KINDS = [
  'none',
  'email',
  'url',
  'number',
  'integer',
  'length',
  'regex',
  'selectAtLeast',
  'selectAtMost',
  'selectExactly',
];
/** Where a section (or a branching option) leads: the next section, submit, or a section id. */
export const FORM_NEXT = { next: 'next', submit: 'submit' };

const id = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,40}$/, 'must be 1–40 letters, digits, _ or -');
const text = (max) => z.string().trim().max(max).default('');

export const FormOptionSchema = z.object({
  id,
  label: z.string().trim().min(1).max(500),
  /** Branching (multipleChoice/dropdown with `branching`): 'next', 'submit' or a section id. */
  goTo: z.string().trim().max(40).default(FORM_NEXT.next),
});

export const FormValidationSchema = z.object({
  kind: z.enum(FORM_VALIDATION_KINDS).default('none'),
  min: z.number().finite().nullable().default(null),
  max: z.number().finite().nullable().default(null),
  pattern: z.string().max(300).default(''),
  message: text(200),
});

export const FormQuestionSchema = z.object({
  id,
  type: z.enum(FORM_ITEM_TYPES),
  title: text(1000),
  description: text(4000),
  required: z.boolean().default(false),
  options: z.array(FormOptionSchema).max(100).default([]),
  /** Adds an "Other:" choice with a text box (multipleChoice, checkboxes). */
  hasOther: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  /** Go to a section based on the answer (multipleChoice, dropdown). */
  branching: z.boolean().default(false),
  rows: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  columns: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  scale: z
    .object({
      min: z.number().int().min(0).max(1).default(1),
      max: z.number().int().min(2).max(10).default(5),
      minLabel: text(100),
      maxLabel: text(100),
    })
    .default({}),
  ratingMax: z.number().int().min(3).max(10).default(5),
  includeYear: z.boolean().default(true),
  validation: FormValidationSchema.default({}),
  fileKinds: z.array(z.enum(FORM_FILE_KINDS)).max(4).default([]),
  maxFiles: z.number().int().min(1).max(5).default(1),
  /** image: https URL of the picture; video: a YouTube link. */
  mediaUrl: z.union([z.literal(''), z.string().trim().url().max(1000)]).default(''),
  /** Quiz mode. */
  points: z.number().int().min(0).max(1000).default(0),
  /** Accepted answers: option labels for choices, accepted texts for short answers. */
  answerKey: z.array(z.string().trim().max(1000)).max(100).default([]),
  feedbackCorrect: text(2000),
  feedbackIncorrect: text(2000),
});

export const FormSectionSchema = z.object({
  id,
  title: text(500),
  description: text(4000),
  /** After this section: 'next', 'submit' or a section id. */
  next: z.string().trim().max(40).default(FORM_NEXT.next),
  questions: z.array(FormQuestionSchema).max(200).default([]),
});

export const FormSettingsSchema = z.object({
  acceptingResponses: z.boolean().default(true),
  opensAt: z.coerce.date().nullable().default(null),
  closesAt: z.coerce.date().nullable().default(null),
  maxResponses: z.number().int().min(1).max(100_000).nullable().default(null),
  limitOneResponse: z.boolean().default(true),
  /** Students may change their answers after submitting (until the form closes). */
  allowEdit: z.boolean().default(false),
  /** Staff see answers without names (course feedback). One response per student still holds. */
  anonymous: z.boolean().default(false),
  showProgressBar: z.boolean().default(true),
  shuffleQuestions: z.boolean().default(false),
  confirmationMessage: z.string().trim().max(2000).default('Your response has been recorded.'),
  showSummaryToRespondents: z.boolean().default(false),
  isQuiz: z.boolean().default(false),
  releaseScore: z.enum(['immediately', 'later']).default('immediately'),
  showMissedQuestions: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(true),
  showPointValues: z.boolean().default(true),
});

/** Which students get the form. Empty lists mean "any". A HOD's form stays in their department. */
export const FormAudienceSchema = z.object({
  departmentIds: z.array(ObjectIdSchema).max(50).default([]),
  yearsOfStudy: z.array(z.number().int().min(1).max(4)).max(4).default([]),
  semesters: z.array(z.number().int().min(1).max(8)).max(8).default([]),
  batches: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const CreateFormSchema = z.object({
  title: z.string().trim().min(1).max(300).default('Untitled form'),
  description: text(4000),
});

export const UpdateFormSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: text(4000),
    headerColor: z.enum(FORM_HEADER_COLORS).default('brand'),
    sections: z.array(FormSectionSchema).min(1).max(50),
    settings: FormSettingsSchema.default({}),
    audience: FormAudienceSchema.default({}),
  })
  .superRefine((form, ctx) => {
    const sectionIds = new Set();
    const itemIds = new Set();
    form.sections.forEach((s, si) => {
      if (sectionIds.has(s.id)) {
        ctx.addIssue({ code: 'custom', message: 'duplicate section id', path: ['sections', si] });
      }
      sectionIds.add(s.id);
      s.questions.forEach((q, qi) => {
        if (itemIds.has(q.id)) {
          ctx.addIssue({
            code: 'custom',
            message: 'duplicate question id',
            path: ['sections', si, 'questions', qi],
          });
        }
        itemIds.add(q.id);
      });
    });
    const okTarget = (t) => t === FORM_NEXT.next || t === FORM_NEXT.submit || sectionIds.has(t);
    form.sections.forEach((s, si) => {
      if (!okTarget(s.next)) {
        ctx.addIssue({
          code: 'custom',
          message: 'unknown section',
          path: ['sections', si, 'next'],
        });
      }
      s.questions.forEach((q, qi) =>
        q.options.forEach((o, oi) => {
          if (!okTarget(o.goTo)) {
            ctx.addIssue({
              code: 'custom',
              message: 'unknown section',
              path: ['sections', si, 'questions', qi, 'options', oi, 'goTo'],
            });
          }
        }),
      );
    });
    const { opensAt, closesAt } = form.settings;
    if (opensAt && closesAt && closesAt <= opensAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'the closing time must be after the opening time',
        path: ['settings', 'closesAt'],
      });
    }
  });

/** Answers keyed by question id. Files are sent as multipart parts named `file:<questionId>`. */
export const FormAnswersSchema = z.record(
  id,
  z.union([
    z.string().max(20_000),
    z.number().finite(),
    z.array(z.string().max(1000)).max(100),
    z.record(z.string().max(300), z.union([z.string().max(300), z.array(z.string().max(300))])),
    z.null(),
  ]),
);

export const GradeFormResponseSchema = z.object({
  /** Points per question id; overrides the automatic mark. `null` removes an override. */
  grades: z.record(id, z.number().min(0).max(1000).nullable()).default({}),
  feedback: z.string().trim().max(5000).optional(),
});

export const AddCollaboratorSchema = z.object({ email: z.string().trim().email().max(200) });
export const FormResponseParamsSchema = z.object({
  id: ObjectIdSchema,
  responseId: ObjectIdSchema,
});
export const FormCollaboratorParamsSchema = z.object({
  id: ObjectIdSchema,
  userId: ObjectIdSchema,
});
export const FormFileParamsSchema = z.object({
  id: ObjectIdSchema,
  responseId: ObjectIdSchema,
  fileId: id,
});

/* ------------------------------------------------------------------ logic */

export const isInputItem = (q) => FORM_INPUT_TYPES.includes(q.type);
export const allQuestions = (form) => form.sections.flatMap((s) => s.questions);

/** True when a value counts as "not answered" for the question type. */
export function isBlank(q, value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/** Where a section leads given the answers: its branching question decides, else `next`. */
export function nextTarget(section, answers) {
  let target = section.next || FORM_NEXT.next;
  for (const q of section.questions) {
    if (!q.branching || !FORM_BRANCHING_TYPES.includes(q.type)) continue;
    const option = q.options.find((o) => o.label === answers?.[q.id]);
    if (option && option.goTo && option.goTo !== FORM_NEXT.next) target = option.goTo;
  }
  return target;
}

/**
 * The sections a respondent passes through, in order, following "go to section" rules.
 * A jump back to a section already visited ends the form (no loops).
 * @returns {number[]} section indexes
 */
export function formPath(form, answers = {}) {
  const path = [];
  const seen = new Set();
  let i = 0;
  while (i >= 0 && i < form.sections.length && !seen.has(i)) {
    seen.add(i);
    path.push(i);
    const target = nextTarget(form.sections[i], answers);
    if (target === FORM_NEXT.submit) break;
    i = target === FORM_NEXT.next ? i + 1 : form.sections.findIndex((s) => s.id === target);
  }
  return path;
}

/** The answerable questions on the respondent's path. */
export function visibleQuestions(form, answers = {}) {
  return formPath(form, answers).flatMap((i) => form.sections[i].questions.filter(isInputItem));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function checkRule(q, value) {
  const { kind, min, max, pattern, message } = q.validation ?? {};
  const fail = (fallback) => message || fallback;
  if (!kind || kind === 'none') return null;
  if (q.type === 'checkboxes') {
    const n = Array.isArray(value) ? value.length : 0;
    if (kind === 'selectAtLeast' && min != null && n < min) return fail(`Select at least ${min}`);
    if (kind === 'selectAtMost' && max != null && n > max) return fail(`Select at most ${max}`);
    if (kind === 'selectExactly' && min != null && n !== min) return fail(`Select exactly ${min}`);
    return null;
  }
  const s = String(value);
  if (kind === 'email' && !EMAIL.test(s)) return fail('Enter a valid email address');
  if (kind === 'url' && !URL_RE.test(s)) return fail('Enter a valid link (https://…)');
  if (kind === 'number' || kind === 'integer') {
    const n = Number(s);
    if (s.trim() === '' || !Number.isFinite(n)) return fail('Enter a number');
    if (kind === 'integer' && !Number.isInteger(n)) return fail('Enter a whole number');
    if (min != null && n < min) return fail(`Enter a number ≥ ${min}`);
    if (max != null && n > max) return fail(`Enter a number ≤ ${max}`);
  }
  if (kind === 'length') {
    if (min != null && s.length < min) return fail(`Use at least ${min} characters`);
    if (max != null && s.length > max) return fail(`Use at most ${max} characters`);
  }
  if (kind === 'regex' && pattern) {
    let re;
    try {
      re = new RegExp(pattern);
    } catch {
      return null;
    }
    if (!re.test(s)) return fail('The answer is not in the expected format');
  }
  return null;
}

/**
 * Checks one answer. Returns an error message, or null when the answer is fine.
 * File answers are checked by the API (they arrive as uploads); here only "required" applies.
 */
export function validateAnswer(q, value) {
  if (!isInputItem(q)) return null;
  if (isBlank(q, value)) return q.required ? 'This question is required' : null;
  const labels = q.options.map((o) => o.label);
  switch (q.type) {
    case 'shortText':
    case 'paragraph':
      if (typeof value !== 'string') return 'Enter text';
      return checkRule(q, value);
    case 'multipleChoice':
    case 'dropdown':
      if (typeof value !== 'string') return 'Choose an option';
      if (!labels.includes(value) && !(q.type === 'multipleChoice' && q.hasOther)) {
        return 'Choose one of the options';
      }
      return null;
    case 'checkboxes':
      if (!Array.isArray(value)) return 'Choose options';
      if (new Set(value).size !== value.length) return 'An option is chosen twice';
      if (value.filter((v) => !labels.includes(v)).length > (q.hasOther ? 1 : 0)) {
        return 'Choose from the options';
      }
      return checkRule(q, value);
    case 'linearScale': {
      const { min = 1, max = 5 } = q.scale ?? {};
      if (!Number.isInteger(value) || value < min || value > max) return `Pick ${min}–${max}`;
      return null;
    }
    case 'rating':
      if (!Number.isInteger(value) || value < 1 || value > q.ratingMax) {
        return `Pick 1–${q.ratingMax}`;
      }
      return null;
    case 'date':
      if (typeof value !== 'string') return 'Enter a date';
      if (!(q.includeYear === false ? MONTH_DAY_RE : DATE_RE).test(value)) return 'Enter a date';
      return null;
    case 'time':
      if (typeof value !== 'string' || !TIME_RE.test(value)) return 'Enter a time (HH:MM)';
      return null;
    case 'multipleChoiceGrid':
    case 'checkboxGrid': {
      if (typeof value !== 'object' || Array.isArray(value)) return 'Answer the grid';
      for (const [row, cell] of Object.entries(value)) {
        if (!q.rows.includes(row)) return 'Unknown row';
        const cells = Array.isArray(cell) ? cell : [cell];
        if (q.type === 'multipleChoiceGrid' && Array.isArray(cell)) return 'One choice per row';
        if (cells.some((c) => !q.columns.includes(c))) return 'Unknown column';
      }
      if (q.required) {
        const missing = q.rows.filter((r) => isBlank(q, value[r]));
        if (missing.length) return 'This question requires one response per row';
      }
      return null;
    }
    case 'fileUpload':
      return null;
    default:
      return null;
  }
}

/** Errors per question id for the answerable questions on the path (empty object when valid). */
export function validateAnswers(form, answers = {}) {
  const errors = {};
  for (const q of visibleQuestions(form, answers)) {
    const err = validateAnswer(q, answers[q.id]);
    if (err) errors[q.id] = err;
  }
  return errors;
}

const norm = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase();

/** Whether an auto-graded answer matches the key (null when the question is not auto-graded). */
export function isCorrect(q, value) {
  if (!FORM_AUTO_GRADED_TYPES.includes(q.type) || !q.points || !q.answerKey?.length) return null;
  if (isBlank(q, value)) return false;
  if (q.type === 'checkboxes') {
    const got = new Set((Array.isArray(value) ? value : []).map(norm));
    const want = new Set(q.answerKey.map(norm));
    return got.size === want.size && [...want].every((v) => got.has(v));
  }
  return q.answerKey.map(norm).includes(norm(value));
}

/** Whether a question counts towards the quiz total. */
export const isGraded = (q) =>
  q.points > 0 &&
  ((FORM_AUTO_GRADED_TYPES.includes(q.type) && q.answerKey?.length > 0) ||
    FORM_MANUAL_GRADED_TYPES.includes(q.type));

/**
 * Quiz score. Auto-graded questions are marked against the key; paragraph and file questions
 * score 0 until faculty grade them (`manual`, points per question id, overrides anything).
 * @returns {{ score: number, maxScore: number, results: Record<string, { correct: boolean|null, earned: number, points: number, pending: boolean }> }}
 */
export function scoreResponse(form, answers = {}, manual = {}) {
  let score = 0;
  let maxScore = 0;
  const results = {};
  for (const q of allQuestions(form)) {
    if (!isGraded(q)) continue;
    maxScore += q.points;
    const override = manual?.[q.id];
    const correct = isCorrect(q, answers[q.id]);
    let earned = correct ? q.points : 0;
    let pending = correct === null && !isBlank(q, answers[q.id]);
    if (override != null) {
      earned = Math.min(override, q.points);
      pending = false;
    }
    score += earned;
    results[q.id] = { correct, earned, points: q.points, pending };
  }
  return { score, maxScore, results };
}

/** Whether a student fits the audience (empty lists match anyone). */
export function audienceMatches(audience = {}, student = {}) {
  const fits = (list, v) => !list?.length || (v != null && list.map(String).includes(String(v)));
  return (
    fits(audience.departmentIds, student.departmentId) &&
    fits(audience.yearsOfStudy, student.yearOfStudy) &&
    fits(audience.semesters, student.semester) &&
    fits(audience.batches, student.batch)
  );
}

/**
 * Whether a published form takes responses now, with a reason when it does not.
 * @returns {{ open: boolean, reason: null|'draft'|'notYetOpen'|'closed'|'full' }}
 */
export function formOpenState(form, { now = new Date(), responseCount = 0 } = {}) {
  const st = form.settings ?? {};
  if (form.status !== 'published') return { open: false, reason: 'draft' };
  if (st.opensAt && new Date(st.opensAt) > now) return { open: false, reason: 'notYetOpen' };
  if (!st.acceptingResponses) return { open: false, reason: 'closed' };
  if (st.closesAt && new Date(st.closesAt) <= now) return { open: false, reason: 'closed' };
  if (st.maxResponses && responseCount >= st.maxResponses) return { open: false, reason: 'full' };
  return { open: true, reason: null };
}

/** YouTube video id from a watch, share or embed link (null if it is not one). */
export function youtubeId(url) {
  const m = String(url ?? '').match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

/** A short random id for new sections, questions and options. */
export function newFormId(prefix = 'q') {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

/** A blank question of a type, with sensible defaults (used by the editor and by new forms). */
export function blankQuestion(type = 'multipleChoice') {
  const q = FormQuestionSchema.parse({ id: newFormId('q'), type });
  if (FORM_CHOICE_TYPES.includes(type))
    q.options = [{ id: newFormId('o'), label: 'Option 1', goTo: 'next' }];
  if (FORM_GRID_TYPES.includes(type)) {
    q.rows = ['Row 1'];
    q.columns = ['Column 1'];
  }
  return q;
}

export function blankSection(title = '') {
  return FormSectionSchema.parse({ id: newFormId('s'), title });
}
