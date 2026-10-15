import { COLLECTIONS } from '@acet/shared';
import { mongoose, ObjectId, Schema } from '../../db/mongoose.js';

/**
 * A.5 chunks: a slice of faculty material with its embedding. `model` records which embedding
 * model produced the vector, so searches never mix vectors from different models (A2.2).
 */
const ChunkSchema = new Schema(
  {
    materialId: { type: ObjectId, ref: 'Material', required: true, index: true },
    topicId: { type: ObjectId, ref: 'Topic', default: null, index: true },
    subjectId: { type: ObjectId, ref: 'Subject', required: true, index: true },
    index: { type: Number, required: true },
    heading: { type: String, default: '' },
    text: { type: String, required: true },
    embedding: { type: [Number], default: undefined },
    model: { type: String, index: true },
    tokenCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: COLLECTIONS.chunks },
);
ChunkSchema.index({ topicId: 1, model: 1 });
ChunkSchema.index({ subjectId: 1, model: 1 });
ChunkSchema.index({ materialId: 1, index: 1 }, { unique: true });

export const Chunk = mongoose.models.Chunk ?? mongoose.model('Chunk', ChunkSchema);
