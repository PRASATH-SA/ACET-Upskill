import { mongoose, ref, Schema } from '../../db/mongoose.js';

const courseOutcomeSchema = new Schema(
  {
    subjectId: ref('Subject'),
    code: { type: String, required: true, uppercase: true },
    text: { type: String, required: true },
    poMappings: [
      new Schema({ po: String, level: { type: Number, min: 1, max: 3 } }, { _id: false }),
    ],
  },
  { timestamps: true },
);
courseOutcomeSchema.index({ subjectId: 1, code: 1 }, { unique: true });
export const CourseOutcome = mongoose.model('CourseOutcome', courseOutcomeSchema);

const topicCoSchema = new Schema(
  { topicId: ref('Topic'), coId: ref('CourseOutcome') },
  { timestamps: true },
);
topicCoSchema.index({ topicId: 1, coId: 1 }, { unique: true });
export const TopicCO = mongoose.model('TopicCO', topicCoSchema, 'topicCOs');
