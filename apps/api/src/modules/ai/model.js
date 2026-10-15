import { COLLECTIONS, JOB_STATUSES } from '@acet/shared';
import { mongoose, ObjectId, Schema } from '../../db/mongoose.js';

const LogSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    message: { type: String, maxlength: 2000 },
  },
  { _id: false },
);

/**
 * A.5 aiJobs: one document per long-running AI task. Progress, logs and the outcome live here
 * so the SSE endpoint can stream them and a page refresh can resume (F6).
 */
const AiJobSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    status: { type: String, enum: JOB_STATUSES, default: 'queued', index: true },
    input: { type: Schema.Types.Mixed, default: {} },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    step: { type: String, default: '' },
    logs: { type: [LogSchema], default: [] },
    /** Business outcome, e.g. "created" or "needsMaterial" (A3: a job can succeed with no content). */
    result: { type: String, default: null },
    /** Refs to what the job created: { topics: [...ids], resources: [...], ... } */
    output: { type: Schema.Types.Mixed, default: {} },
    model: String,
    /** promptVersion per task used, e.g. { "topic.easy": 1 } (A.7.6) */
    promptVersions: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: ObjectId, ref: 'User', index: true },
    subjectId: { type: ObjectId, ref: 'Subject', index: true },
    topicId: { type: ObjectId, ref: 'Topic', index: true },
    error: { code: String, message: String },
    cancelRequested: { type: Boolean, default: false },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true, collection: COLLECTIONS.aiJobs },
);
AiJobSchema.index({ status: 1, createdAt: -1 });

export const AiJob = mongoose.models.AiJob ?? mongoose.model('AiJob', AiJobSchema);

export const TERMINAL_STATUSES = ['succeeded', 'failed', 'cancelled'];
