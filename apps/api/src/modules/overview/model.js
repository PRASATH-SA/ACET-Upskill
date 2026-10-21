import { COLLECTIONS } from '@acet/shared';
import { mongoose, ObjectId, reviewFields, Schema } from '../../db/mongoose.js';

const unitSchema = new Schema(
  {
    unitId: { type: ObjectId, ref: 'Unit', required: true },
    summary: { type: String, default: '' },
    youWillBeAbleTo: { type: String, default: '' },
    leadsTo: { type: String, default: '' },
  },
  { _id: false },
);

/**
 * The written part of a subject's root page (one per subject). Content review applies:
 * students only see it once published.
 */
const subjectOverviewSchema = new Schema(
  {
    subjectId: { type: ObjectId, ref: 'Subject', required: true, unique: true },
    tagline: { type: String, default: '' },
    why: { type: String, default: '' },
    prerequisites: { type: [{ _id: false, title: String, why: String }], default: [] },
    outcomes: { type: [String], default: [] },
    applications: { type: [{ _id: false, title: String, description: String }], default: [] },
    careers: { type: [String], default: [] },
    units: { type: [unitSchema], default: [] },
    ...reviewFields,
  },
  { timestamps: true, collection: COLLECTIONS.subjectOverviews },
);
export const SubjectOverview = mongoose.model('SubjectOverview', subjectOverviewSchema);
