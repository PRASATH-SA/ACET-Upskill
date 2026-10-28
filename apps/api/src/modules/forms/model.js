import { FORM_HEADER_COLORS, FORM_STATUSES } from '@acet/shared';
import { mongoose, ObjectId, ref, Schema } from '../../db/mongoose.js';

/**
 * A Form Studio form (ADR 0015). `sections` and `settings` are validated by UpdateFormSchema
 * before they are saved, so they are stored as plain objects. The audience is typed because the
 * student "my forms" query filters on it.
 */
const formSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    headerColor: { type: String, enum: FORM_HEADER_COLORS, default: 'brand' },
    status: { type: String, enum: FORM_STATUSES, default: 'draft', index: true },
    sections: { type: [Schema.Types.Mixed], default: [] },
    settings: { type: Schema.Types.Mixed, default: {} },
    audience: {
      type: new Schema(
        {
          departmentIds: { type: [ObjectId], default: [] },
          yearsOfStudy: { type: [Number], default: [] },
          semesters: { type: [Number], default: [] },
          batches: { type: [String], default: [] },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    createdBy: ref('User'),
    /** The creator's department; a HOD manages the forms of their department. */
    departmentId: { type: ObjectId, ref: 'Department', default: null, index: true },
    collaboratorIds: { type: [ObjectId], ref: 'User', default: [], index: true },
    publishedAt: Date,
  },
  { timestamps: true, minimize: false },
);
formSchema.index({ status: 1, 'audience.departmentIds': 1 });
export const Form = mongoose.model('Form', formSchema);

const formResponseSchema = new Schema(
  {
    formId: ref('Form'),
    userId: ref('User'),
    /** Answers keyed by question id (only questions on the respondent's section path). */
    answers: { type: Schema.Types.Mixed, default: {} },
    files: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            questionId: { type: String, required: true },
            key: { type: String, required: true },
            name: String,
            mimeType: String,
            size: Number,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    /** Points faculty gave by hand, per question id (paragraph/file questions, overrides). */
    manualGrades: { type: Schema.Types.Mixed, default: {} },
    feedback: { type: String, default: '' },
    scoreReleased: { type: Boolean, default: false },
    submittedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, minimize: false },
);
formResponseSchema.index({ formId: 1, userId: 1, submittedAt: -1 });
export const FormResponse = mongoose.model('FormResponse', formResponseSchema);
