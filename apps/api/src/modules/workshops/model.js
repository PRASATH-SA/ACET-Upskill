import { mongoose, ObjectId, ref, Schema } from '../../db/mongoose.js';

const workshopSchema = new Schema(
  {
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    brief: { type: String, required: true },
    dueAt: { type: Date, required: true },
    createdBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
export const Workshop = mongoose.model('Workshop', workshopSchema);

const submissionSchema = new Schema(
  {
    workshopId: ref('Workshop'),
    userId: ref('User'),
    text: { type: String, default: '' },
    fileKey: { type: String, default: null },
    fileName: String,
    mimeType: String,
    submittedAt: { type: Date, default: () => new Date() },
    late: { type: Boolean, default: false },
    score: { type: Number, default: null },
    feedback: { type: String, default: '' },
    gradedBy: { type: ObjectId, ref: 'User', default: null },
    gradedAt: Date,
  },
  { timestamps: true },
);
submissionSchema.index({ workshopId: 1, userId: 1 }, { unique: true });
export const Submission = mongoose.model('Submission', submissionSchema);
