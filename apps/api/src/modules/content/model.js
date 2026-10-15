import { MATERIAL_KINDS, QUESTION_TYPES, RESOURCE_KINDS } from '@acet/shared';
import { mongoose, ObjectId, ref, reviewFields, Schema } from '../../db/mongoose.js';

const fileFields = {
  fileKey: { type: String, default: null },
  fileName: String,
  mimeType: String,
  size: Number,
};

const resourceSchema = new Schema(
  {
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    kind: { type: String, enum: RESOURCE_KINDS, required: true, index: true },
    title: String,
    body: String,
    url: String,
    ...fileFields,
    ...reviewFields,
  },
  { timestamps: true },
);
resourceSchema.index({ topicId: 1, kind: 1, status: 1 });
export const Resource = mongoose.model('Resource', resourceSchema);

const flashcardSchema = new Schema(
  {
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    front: { type: String, required: true },
    back: { type: String, required: true },
    ...reviewFields,
  },
  { timestamps: true },
);
flashcardSchema.index({ topicId: 1, status: 1 });
export const Flashcard = mongoose.model('Flashcard', flashcardSchema);

const questionSchema = new Schema(
  {
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    type: { type: String, enum: QUESTION_TYPES, default: 'mcq' },
    stem: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: '' },
    optionExplanations: { type: [String], default: [] },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    ...reviewFields,
  },
  { timestamps: true },
);
questionSchema.index({ topicId: 1, type: 1, status: 1 });
export const Question = mongoose.model('Question', questionSchema);

const materialSchema = new Schema(
  {
    topicId: { type: ObjectId, ref: 'Topic', index: true, default: null },
    subjectId: ref('Subject'),
    kind: { type: String, enum: MATERIAL_KINDS, required: true },
    fileUrl: String,
    ...fileFields,
    extractedText: { type: String, default: '' },
    pageCount: Number,
    /** True for PDFs with no extractable text (scanned). OCR is out of scope for v1. */
    scanned: { type: Boolean, default: false },
    warning: String,
    /** A2 sets this when chunks and embeddings are ready. */
    ingestStatus: {
      type: String,
      enum: ['notStarted', 'queued', 'running', 'done', 'failed'],
      default: 'notStarted',
    },
    uploadedBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
export const Material = mongoose.model('Material', materialSchema);
