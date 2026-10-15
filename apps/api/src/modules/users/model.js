import { ROLES } from '@acet/shared';
import { mongoose, ObjectId, Schema } from '../../db/mongoose.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    departmentId: { type: ObjectId, ref: 'Department', index: true, default: null },
    batch: { type: String, default: null, index: true },
    syllabusVersionId: { type: ObjectId, ref: 'SyllabusVersion', index: true, default: null },
    mentorId: { type: ObjectId, ref: 'User', index: true, default: null },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: Date,
    lastActiveAt: { type: Date, index: true },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);

/** The only user shape that leaves the API. Never includes the password hash. */
export function toPublicUser(u) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    departmentId: u.departmentId ? String(u.departmentId) : null,
    batch: u.batch ?? null,
    syllabusVersionId: u.syllabusVersionId ? String(u.syllabusVersionId) : null,
    mentorId: u.mentorId ? String(u.mentorId) : null,
    isActive: u.isActive ?? true,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
  };
}
