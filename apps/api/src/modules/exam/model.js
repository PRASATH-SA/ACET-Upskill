import { mongoose, ObjectId, ref, reviewFields, Schema } from '../../db/mongoose.js';

const pyqSchema = new Schema(
  {
    subjectId: ref('Subject'),
    topicIds: [{ type: ObjectId, ref: 'Topic', index: true }],
    materialId: { type: ObjectId, ref: 'Material', default: null },
    examDate: { type: Date, required: true, index: true },
    marks: { type: Number, required: true },
    text: { type: String, required: true },
    /** A3 AI tagging stores a confidence per topic here. */
    tagConfidence: { type: Map, of: Number, default: undefined },
    ...reviewFields,
  },
  { timestamps: true },
);
pyqSchema.index({ subjectId: 1, status: 1, examDate: -1 });
export const Pyq = mongoose.model('Pyq', pyqSchema);
