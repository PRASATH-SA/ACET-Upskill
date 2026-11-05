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
    /** Uploaded videos: length in seconds, WebVTT caption tracks and chapter marks. */
    durationSec: { type: Number, default: null },
    captions: {
      type: [new Schema({ lang: String, label: String, fileKey: String }, { _id: false })],
      default: undefined,
    },
    chapters: {
      type: [new Schema({ startSec: Number, title: String }, { _id: false })],
      default: undefined,
    },
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
    /**
     * Questions sharing a concept key are variants of one idea (a question pool). A quiz
     * uses one variant per concept. No key means the question is its own pool.
     */
    conceptKey: { type: String, default: null },
    /** The question an AI variant was drafted from. */
    variantOf: { type: ObjectId, ref: 'Question', default: null },
    /** Off when option order matters (e.g. "both A and B"). */
    shuffleOptions: { type: Boolean, default: true },
    ...reviewFields,
  },
  { timestamps: true },
);
questionSchema.index({ topicId: 1, type: 1, status: 1 });
questionSchema.index({ topicId: 1, conceptKey: 1 });
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
      // skipped = nothing to embed (no extractable text, or a PYQ paper).
      enum: ['notStarted', 'queued', 'running', 'done', 'failed', 'skipped'],
      default: 'notStarted',
    },
    ingestJobId: { type: ObjectId, ref: 'AiJob', default: null },
    chunkCount: { type: Number, default: 0 },
    ingestError: String,
    uploadedBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
export const Material = mongoose.model('Material', materialSchema);
