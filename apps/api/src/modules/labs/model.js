import { COLLECTIONS } from '@acet/shared';
import { mongoose, ObjectId, ref, reviewFields, Schema } from '../../db/mongoose.js';

/**
 * One lab experiment (ADR 0012): it belongs to a practical subject and sits on a topic of the
 * linked theory subject's roadmap. `challengeIds` are code-lab problems of that topic that the
 * student solves as the experiment's graded work. Drafted by staff, published by lab faculty.
 */
const labExperimentSchema = new Schema(
  {
    subjectId: ref('Subject'),
    topicId: ref('Topic'),
    number: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    aim: { type: String, default: '' },
    procedure: { type: String, default: '' },
    challengeIds: [{ type: ObjectId, ref: 'CodeChallenge' }],
    ...reviewFields,
  },
  { timestamps: true, collection: COLLECTIONS.labExperiments },
);
labExperimentSchema.index({ subjectId: 1, number: 1 }, { unique: true });
labExperimentSchema.index({ subjectId: 1, status: 1, topicId: 1 });
export const LabExperiment = mongoose.model('LabExperiment', labExperimentSchema);

/** A student marking an experiment done (work done in the lab, outside the code lab). */
const labCompletionSchema = new Schema(
  {
    userId: ref('User'),
    experimentId: ref('LabExperiment'),
    subjectId: ref('Subject'),
  },
  { timestamps: true, collection: COLLECTIONS.labCompletions },
);
labCompletionSchema.index({ userId: 1, experimentId: 1 }, { unique: true });
labCompletionSchema.index({ userId: 1, subjectId: 1 });
export const LabCompletion = mongoose.model('LabCompletion', labCompletionSchema);
