import {
  COLLECTIONS,
  MASTERY_STATES,
  REVIEW_ITEM_TYPES,
  REVIEW_RATINGS,
  REVIEW_SOURCES,
} from '@acet/shared';
import { mongoose, ObjectId, ref, Schema } from '../../db/mongoose.js';

const attemptSchema = new Schema(
  {
    userId: ref('User'),
    questionId: ref('Question'),
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    quizId: { type: String, index: true },
    /** The quiz session that served this question (null for the legacy quiz endpoint). */
    sessionId: { type: ObjectId, ref: 'QuizSession', default: null },
    /** Canonical option index (the order faculty wrote), whatever order the student saw. */
    selectedIndex: { type: Number, required: true },
    /** Position of the picked option on the student's screen (options are shuffled). */
    displayedIndex: { type: Number, default: null },
    correct: { type: Boolean, required: true },
    /** Reserved for the confidence rating feature (#15). */
    confidence: { type: Number, default: null },
    answeredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);
attemptSchema.index({ topicId: 1, userId: 1, answeredAt: -1 });
attemptSchema.index({ subjectId: 1, userId: 1 });
attemptSchema.index({ userId: 1, answeredAt: -1 });
export const Attempt = mongoose.model('Attempt', attemptSchema);

/** FSRS card state per student per item (B4). */
const reviewSchema = new Schema(
  {
    userId: ref('User'),
    itemType: { type: String, enum: REVIEW_ITEM_TYPES, required: true },
    itemId: { type: ObjectId, required: true, index: true },
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    due: { type: Date, required: true },
    stability: { type: Number, default: 0 },
    difficulty: { type: Number, default: 0 },
    elapsedDays: { type: Number, default: 0 },
    scheduledDays: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
    state: { type: Number, default: 0 },
    lastReview: { type: Date, default: null },
    lastRating: { type: String, enum: [...REVIEW_RATINGS, null], default: null },
  },
  { timestamps: true },
);
reviewSchema.index({ userId: 1, due: 1 });
reviewSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
reviewSchema.index({ userId: 1, lastReview: -1 });
export const Review = mongoose.model('Review', reviewSchema);

const masterySchema = new Schema(
  {
    userId: ref('User'),
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    state: { type: String, enum: MASTERY_STATES, default: 'notStarted', index: true },
    /** Latest quiz score, 0–100. */
    score: { type: Number, default: null },
    /** Revisions passed since the topic last entered needsRevision (or ever). */
    revisionsPassed: { type: Number, default: 0 },
    openedAt: Date,
  },
  { timestamps: true },
);
masterySchema.index({ userId: 1, topicId: 1 }, { unique: true });
masterySchema.index({ subjectId: 1, state: 1 });
masterySchema.index({ subjectId: 1, topicId: 1 });
export const Mastery = mongoose.model('Mastery', masterySchema);

export { ObjectId };

/** One row per revision rating: powers streaks, weekly activity and audits of the scheduler. */
const reviewLogSchema = new Schema(
  {
    userId: ref('User'),
    reviewId: ref('Review'),
    topicId: ref('Topic'),
    rating: { type: String, enum: REVIEW_RATINGS, required: true },
    /** topicPage = the inline deck on a topic; revision = the daily revision session. */
    source: { type: String, enum: REVIEW_SOURCES, default: 'revision' },
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);
reviewLogSchema.index({ userId: 1, at: -1 });
export const ReviewLog = mongoose.model('ReviewLog', reviewLogSchema);

/**
 * One quiz as served to one student: which question was picked from each concept pool and
 * the option order they saw, so grading maps their picks back to the canonical answer.
 */
const quizSessionSchema = new Schema(
  {
    userId: ref('User'),
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    mode: { type: String, enum: ['practice'], default: 'practice' },
    items: {
      type: [
        new Schema(
          {
            questionId: { type: ObjectId, ref: 'Question', required: true },
            /** optionOrder[displayed] = canonical option index. */
            optionOrder: { type: [Number], required: true },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    startedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    score: { type: Number, default: null },
  },
  { timestamps: true, collection: COLLECTIONS.quizSessions },
);
quizSessionSchema.index({ userId: 1, topicId: 1, startedAt: -1 });
export const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
