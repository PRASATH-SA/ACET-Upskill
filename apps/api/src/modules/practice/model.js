import { MASTERY_STATES, REVIEW_ITEM_TYPES, REVIEW_RATINGS } from '@acet/shared';
import { mongoose, ObjectId, ref, Schema } from '../../db/mongoose.js';

const attemptSchema = new Schema(
  {
    userId: ref('User'),
    questionId: ref('Question'),
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    quizId: { type: String, index: true },
    selectedIndex: { type: Number, required: true },
    correct: { type: Boolean, required: true },
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
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);
reviewLogSchema.index({ userId: 1, at: -1 });
export const ReviewLog = mongoose.model('ReviewLog', reviewLogSchema);
