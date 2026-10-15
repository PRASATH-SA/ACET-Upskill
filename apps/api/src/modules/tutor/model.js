import { mongoose, ObjectId, Schema } from '../../db/mongoose.js';

/**
 * A4.4: one row per tutor question, for the faculty "common doubts" view. No student name,
 * email or id is stored (A.7.9); `askerHash` is a salted hash used only for the hourly limit.
 */
const TutorQuestionSchema = new Schema(
  {
    topicId: { type: ObjectId, ref: 'Topic', required: true, index: true },
    subjectId: { type: ObjectId, ref: 'Subject', required: true, index: true },
    question: { type: String, required: true, maxlength: 2000 },
    grounded: { type: Boolean, default: false },
    refused: { type: Boolean, default: false },
    refusalReason: { type: String, default: null },
    latencyMs: Number,
    model: String,
    promptVersion: String,
    citationCount: { type: Number, default: 0 },
    embedding: { type: [Number], default: undefined },
    embedModel: String,
    askerHash: { type: String, index: true },
  },
  { timestamps: true },
);
TutorQuestionSchema.index({ askerHash: 1, createdAt: -1 });
TutorQuestionSchema.index({ subjectId: 1, createdAt: -1 });

export const TutorQuestion =
  mongoose.models.TutorQuestion ?? mongoose.model('TutorQuestion', TutorQuestionSchema);
