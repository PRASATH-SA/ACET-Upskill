import { CONTENT_SOURCES, CONTENT_STATUSES, LINK_TYPES } from '@acet/shared';
import { mongoose, ObjectId, ref, Schema } from '../../db/mongoose.js';

const subjectSchema = new Schema(
  {
    syllabusVersionId: ref('SyllabusVersion'),
    semester: { type: Number, required: true, min: 1, max: 10 },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    facultyIds: [{ type: ObjectId, ref: 'User', index: true }],
  },
  { timestamps: true },
);
subjectSchema.index({ syllabusVersionId: 1, code: 1 }, { unique: true });
export const Subject = mongoose.model('Subject', subjectSchema);

const unitSchema = new Schema(
  {
    subjectId: ref('Subject'),
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);
unitSchema.index({ subjectId: 1, number: 1 }, { unique: true });
export const Unit = mongoose.model('Unit', unitSchema);

const topicSchema = new Schema(
  {
    unitId: ref('Unit'),
    subjectId: ref('Subject'),
    parentTopicId: { type: ObjectId, ref: 'Topic', default: null, index: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    order: { type: Number, default: 0 },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft', index: true },
    source: { type: String, enum: CONTENT_SOURCES, default: 'faculty' },
    createdBy: { type: ObjectId, ref: 'User' },
    approvedBy: { type: ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true },
);
topicSchema.index({ subjectId: 1, status: 1 });
export const Topic = mongoose.model('Topic', topicSchema);

const topicLinkSchema = new Schema(
  {
    subjectId: ref('Subject'),
    fromTopicId: ref('Topic'),
    toTopicId: ref('Topic'),
    type: { type: String, enum: LINK_TYPES, required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft', index: true },
    source: { type: String, enum: CONTENT_SOURCES, default: 'faculty' },
    createdBy: { type: ObjectId, ref: 'User' },
    approvedBy: { type: ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true },
);
topicLinkSchema.index({ fromTopicId: 1, toTopicId: 1, type: 1 }, { unique: true });
export const TopicLink = mongoose.model('TopicLink', topicLinkSchema);

/** Map elements students may see (B2: approved topics and links only). */
export const STUDENT_MAP_STATUSES = ['approved', 'published'];
