import { COLLECTIONS, EXPLANATION_MODES, EXPLANATION_STATUSES } from '@acet/shared';
import { mongoose, ObjectId, ref, reviewFields, Schema } from '../../db/mongoose.js';

const criterionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    points: { type: Number, required: true },
    keyIdeas: { type: [String], default: [] },
  },
  { _id: false },
);

/**
 * A teacher's rubric for explain-it-back on one topic. Goes through the normal content review
 * (draft → published); students use the latest published one.
 */
const rubricSchema = new Schema(
  {
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    prompt: { type: String, required: true },
    criteria: { type: [criterionSchema], required: true },
    maxScore: { type: Number, default: 0 },
    passScore: { type: Number, required: true },
    ...reviewFields,
  },
  { timestamps: true, collection: COLLECTIONS.rubrics },
);
rubricSchema.index({ topicId: 1, status: 1, publishedAt: -1 });
rubricSchema.pre('validate', function setMax(next) {
  this.maxScore = (this.criteria ?? []).reduce((n, c) => n + (c.points ?? 0), 0);
  next();
});
export const Rubric = mongoose.model('Rubric', rubricSchema);

const perCriterionSchema = new Schema(
  {
    criterionId: String,
    score: Number,
    /** A quote from the answer that supports the score ('' when the model's quote was not found). */
    evidence: { type: String, default: '' },
    missing: { type: String, default: '' },
  },
  { _id: false },
);

/**
 * One explain-it-back attempt: what the student said or wrote, the AI score against the rubric
 * (a provisional estimate), and the teacher's spot-check, which overrides it.
 */
const explanationSchema = new Schema(
  {
    userId: ref('User'),
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    rubricId: ref('Rubric'),
    /** Criteria as they were when the student answered, so later rubric edits don't change old scores. */
    rubricSnapshot: {
      prompt: String,
      criteria: [criterionSchema],
      maxScore: Number,
      passScore: Number,
    },
    mode: { type: String, enum: EXPLANATION_MODES, required: true },
    text: { type: String, default: '' },
    audioKey: { type: String, default: null },
    audioMime: String,
    audioDeletedAt: Date,
    durationSec: Number,
    transcript: { type: String, default: '' },
    status: { type: String, enum: EXPLANATION_STATUSES, default: 'scoring', index: true },
    error: String,
    jobId: { type: ObjectId, ref: 'AiJob', default: null },
    ai: {
      type: new Schema(
        {
          total: Number,
          passed: Boolean,
          perCriterion: [perCriterionSchema],
          feedback: String,
          model: String,
          promptVersion: String,
          sttModel: String,
        },
        { _id: false },
      ),
      default: undefined,
    },
    spotCheck: {
      flagged: { type: Boolean, default: false },
      reasons: { type: [String], default: [] },
      checkedBy: { type: ObjectId, ref: 'User', default: null },
      checkedAt: Date,
      agree: Boolean,
      perCriterion: [{ _id: false, criterionId: String, score: Number }],
      score: Number,
      note: String,
    },
  },
  { timestamps: true, collection: COLLECTIONS.explanations },
);
explanationSchema.index({ userId: 1, topicId: 1, createdAt: -1 });
explanationSchema.index({ subjectId: 1, 'spotCheck.flagged': 1, createdAt: -1 });
explanationSchema.index({ topicId: 1, status: 1 });
explanationSchema.index({ audioKey: 1, createdAt: 1 });
export const Explanation = mongoose.model('Explanation', explanationSchema);
