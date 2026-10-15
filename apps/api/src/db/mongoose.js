import mongoose, { Schema, Types } from 'mongoose';
import { CONTENT_SOURCES, CONTENT_STATUSES } from '@acet/shared';

/** Serialize documents as `{ id, ...fields }` with no `_id` or `__v`. */
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
};
mongoose.set('toJSON', toJSON);
mongoose.set('toObject', { virtuals: true, versionKey: false });

export { mongoose, Schema, Types };
export const { ObjectId } = Schema.Types;

export const ref = (model, required = true) => ({
  type: ObjectId,
  ref: model,
  required,
  index: true,
});

/** Fields shared by every faculty-reviewed content item (A.5, A.7.5). */
export const reviewFields = {
  status: { type: String, enum: CONTENT_STATUSES, default: 'draft', index: true },
  source: { type: String, enum: CONTENT_SOURCES, default: 'faculty', index: true },
  createdBy: { type: ObjectId, ref: 'User' },
  approvedBy: { type: ObjectId, ref: 'User' },
  approvedAt: Date,
  publishedAt: Date,
  rejectedAt: Date,
  rejectedBy: { type: ObjectId, ref: 'User' },
  rejectReason: String,
  /** Set when faculty edited an AI draft (A5 feedback signal). */
  editedAfterAi: { type: Boolean, default: false },
  /** Set by the AI self-check (A3) when the model disagrees with the stored answer. */
  needsAttention: { type: Boolean, default: false },
  aiMeta: {
    type: new Schema(
      {
        model: String,
        promptVersion: String,
        jobId: { type: ObjectId, ref: 'AiJob' },
        sourceChunkIds: [{ type: ObjectId, ref: 'Chunk' }],
      },
      { _id: false },
    ),
    default: undefined,
  },
};

/** Converts a lean document (or array) to the API shape: `_id` → `id`, no `__v`. */
export function clean(doc) {
  if (!doc) return null;
  const { _id, __v: _v, ...rest } = doc;
  return { id: String(_id), ...rest };
}

export const oid = (id) => (typeof id === 'string' ? new Types.ObjectId(id) : id);

export const sameId = (a, b) => a != null && b != null && String(a) === String(b);
