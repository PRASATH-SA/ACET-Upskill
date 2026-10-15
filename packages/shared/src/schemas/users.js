import { z } from 'zod';
import { RoleSchema } from '../enums.js';
import { PaginationQuerySchema } from '../api.js';
import { ObjectIdSchema } from './common.js';
import { PasswordSchema } from './auth.js';

export const ListUsersQuerySchema = PaginationQuerySchema.extend({
  role: RoleSchema.optional(),
  departmentId: ObjectIdSchema.optional(),
  syllabusVersionId: ObjectIdSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

export const AdminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    role: RoleSchema,
    departmentId: ObjectIdSchema.nullable(),
    batch: z.string().trim().max(40).nullable(),
    syllabusVersionId: ObjectIdSchema.nullable(),
    mentorId: ObjectIdSchema.nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'at least one field is required');

export const UpdateProfileSchema = z.object({ name: z.string().trim().min(2).max(120) });

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: PasswordSchema,
});

export const DepartmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().min(2).max(12),
});

export const SyllabusVersionSchema = z.object({
  university: z.string().trim().min(2).max(160),
  regulation: z.string().trim().min(1).max(40),
  branch: z.string().trim().min(1).max(80),
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2,4}$/, 'use a format like 2025-26'),
  isActive: z.boolean().default(true),
});
