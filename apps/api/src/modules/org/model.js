import { mongoose, Schema } from '../../db/mongoose.js';

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  },
  { timestamps: true },
);
export const Department = mongoose.model('Department', departmentSchema);

const syllabusVersionSchema = new Schema(
  {
    university: { type: String, required: true },
    regulation: { type: String, required: true },
    branch: { type: String, required: true },
    academicYear: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
syllabusVersionSchema.index(
  { university: 1, regulation: 1, branch: 1, academicYear: 1 },
  { unique: true },
);
export const SyllabusVersion = mongoose.model('SyllabusVersion', syllabusVersionSchema);
