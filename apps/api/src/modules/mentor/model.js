import { mongoose, ref, Schema } from '../../db/mongoose.js';

const mentorNoteSchema = new Schema(
  {
    mentorId: ref('User'),
    studentId: ref('User'),
    note: { type: String, required: true },
    followUpAt: { type: Date, default: null },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
);
mentorNoteSchema.index({ mentorId: 1, followUpAt: 1 });
export const MentorNote = mongoose.model('MentorNote', mentorNoteSchema);
