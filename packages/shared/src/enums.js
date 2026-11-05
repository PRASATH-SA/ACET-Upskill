/**
 * Enums from Part A (A.2 roles, A.5 data model, A.8 map states).
 * Each enum is a const tuple, a zod schema and a TS type, so web, api and worker share one source.
 */
import { z } from 'zod';

/**
 * A.2 — user roles. `admin` is the HOD of one department. `coordinator` is the Academic
 * Coordinator: a super admin over every department, its HODs and students.
 */
export const ROLES = ['student', 'faculty', 'mentor', 'admin', 'coordinator'];
export const RoleSchema = z.enum(ROLES);

/** Roles only the coordinator may hand out or edit. */
export const SUPER_ROLES = ['admin', 'coordinator'];

/**
 * Whether `role` passes a check for `allowed` roles. The coordinator passes every check
 * that lets the HOD (`admin`) through, so routes only ever list `admin`.
 */
export function roleAllows(role, allowed) {
  return allowed.includes(role) || (role === 'coordinator' && allowed.includes('admin'));
}

/** HOD or coordinator. */
export const isAdminRole = (role) => role === 'admin' || role === 'coordinator';

/** Years of study (I–IV) and the two semesters each year spans: year y → 2y−1, 2y. */
export const YEARS_OF_STUDY = [1, 2, 3, 4];
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
export const semestersOfYear = (year) => [2 * year - 1, 2 * year];
export const yearOfSemester = (semester) => Math.ceil(semester / 2);

/**
 * Year of study from a batch like "2023-27", for students whose HOD has not set a year or
 * semester. The academic year starts in June, so batch 2023-27 is in year IV from June 2026.
 * Null when the batch does not start with a year or the result is outside I–IV.
 */
export function yearOfBatch(batch, now = new Date()) {
  const m = /^(\d{4})/.exec(String(batch ?? '').trim());
  if (!m) return null;
  const academicYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const year = academicYear - Number(m[1]) + 1;
  return YEARS_OF_STUDY.includes(year) ? year : null;
}

/** A.5 — content status lifecycle: draft → inReview → approved → published. */
export const CONTENT_STATUSES = ['draft', 'inReview', 'approved', 'published'];
export const ContentStatusSchema = z.enum(CONTENT_STATUSES);

/**
 * Allowed status moves. Every status may go back to draft.
 * Only faculty owning the subject may approve or publish; services enforce that.
 */
export const CONTENT_STATUS_TRANSITIONS = {
  draft: ['inReview', 'approved'],
  inReview: ['approved', 'draft'],
  approved: ['published', 'draft'],
  published: ['draft'],
};

export function canTransition(from, to) {
  return CONTENT_STATUS_TRANSITIONS[from].includes(to);
}

/** The only status students may ever see. Filter on it in the service layer, never in the UI. */
export const STUDENT_VISIBLE_STATUS = 'published';

/** Who created a piece of content. AI content always starts as draft. */
export const CONTENT_SOURCES = ['ai', 'faculty'];
export const ContentSourceSchema = z.enum(CONTENT_SOURCES);

/** A.5 topicLinks.type — prerequisite edges are solid and acyclic; related edges are dashed. */
export const LINK_TYPES = ['prerequisite', 'related'];
export const LinkTypeSchema = z.enum(LINK_TYPES);

/** A.5 mastery.state */
export const MASTERY_STATES = [
  'notStarted',
  'learning',
  'practicing',
  'confident',
  'needsRevision',
];
export const MasteryStateSchema = z.enum(MASTERY_STATES);

/** A.5 resources.kind */
export const RESOURCE_KINDS = ['video', 'easy', 'tenMark', 'realWorld', 'workshop', 'curiosity'];
export const ResourceKindSchema = z.enum(RESOURCE_KINDS);

/**
 * Subject kinds (ADR 0012). A practical (lab) subject has no topics of its own: it reuses the
 * roadmap of the theory subject it is linked to, and attaches experiments to its topics.
 */
export const SUBJECT_KINDS = ['theory', 'practical'];
export const SubjectKindSchema = z.enum(SUBJECT_KINDS);

/** A.5 questions.type */
export const QUESTION_TYPES = ['mcq', 'curiosity'];
export const QuestionTypeSchema = z.enum(QUESTION_TYPES);

/** A.5 materials.kind */
export const MATERIAL_KINDS = ['syllabusPdf', 'notes', 'slides', 'pyqPaper'];
export const MaterialKindSchema = z.enum(MATERIAL_KINDS);

/** A.5 reviews.itemType */
export const REVIEW_ITEM_TYPES = ['flashcard', 'question'];
export const ReviewItemTypeSchema = z.enum(REVIEW_ITEM_TYPES);

/** FSRS ratings used by spaced revision. */
export const REVIEW_RATINGS = ['again', 'hard', 'good', 'easy'];
export const ReviewRatingSchema = z.enum(REVIEW_RATINGS);

/**
 * The two-button flashcard rating ("knew it" / "didn't") and the FSRS rating each maps to.
 * Students see two buttons; the scheduler keeps its four levels.
 */
export const FLASHCARD_RESULTS = ['knew', 'didnt'];
export const FlashcardResultSchema = z.enum(FLASHCARD_RESULTS);
export const SIMPLE_RATINGS = { knew: 'good', didnt: 'again' };

/** Where a revision rating came from (reviewLogs.source). */
export const REVIEW_SOURCES = ['topicPage', 'revision'];

/** Explain-it-back: how the student answered, and where scoring is. */
export const EXPLANATION_MODES = ['text', 'voice'];
export const ExplanationModeSchema = z.enum(EXPLANATION_MODES);
export const EXPLANATION_STATUSES = ['scoring', 'scored', 'failed'];

/**
 * Local speech-to-text for voice answers. `none` turns voice off (text answers still work);
 * `openai-compatible` is any local Whisper server with /v1/audio/transcriptions;
 * `mock` is for tests and is refused in production.
 */
export const STT_PROVIDERS = ['none', 'openai-compatible', 'mock'];
export const SttProviderSchema = z.enum(STT_PROVIDERS);

/** A.5 aiJobs.status */
export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'];
export const JobStatusSchema = z.enum(JOB_STATUSES);

/** A.8 — node state on a student's concept map. */
export const MAP_NODE_STATES = ['mastered', 'current', 'unlocked', 'locked', 'needsRevision'];
export const MapNodeStateSchema = z.enum(MAP_NODE_STATES);

/** A.1 — the six steps of a topic learning page, in order. */
export const LEARNING_STEPS = [
  'curiosity',
  'understand',
  'prepare',
  'remember',
  'practice',
  'apply',
];
export const LearningStepSchema = z.enum(LEARNING_STEPS);

/**
 * A.3 / A.7 — supported local LLM providers. `mock` is a deterministic fake for tests, CI and
 * e2e runs without a model; the API refuses it when NODE_ENV=production.
 */
export const LLM_PROVIDERS = ['ollama', 'openai-compatible', 'mock'];
export const LLMProviderSchema = z.enum(LLM_PROVIDERS);
