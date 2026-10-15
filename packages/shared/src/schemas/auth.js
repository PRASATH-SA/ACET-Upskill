import { z } from 'zod';
import { RoleSchema } from '../enums.js';
import { ObjectIdSchema } from './common.js';

export const EmailSchema = z.string().trim().toLowerCase().email().max(200);
export const PasswordSchema = z
  .string()
  .min(8, 'must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'must contain a letter')
  .regex(/\d/, 'must contain a number');

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

export const RegisterUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: EmailSchema,
  password: PasswordSchema,
  role: RoleSchema,
  departmentId: ObjectIdSchema.optional(),
  batch: z.string().trim().max(40).optional(),
  syllabusVersionId: ObjectIdSchema.optional(),
  mentorId: ObjectIdSchema.optional(),
});

/** Form fields that accompany a student CSV upload. Each CSV row may override batch. */
export const ImportStudentsSchema = z.object({
  departmentId: ObjectIdSchema.optional(),
  syllabusVersionId: ObjectIdSchema.optional(),
  batch: z.string().trim().max(40).optional(),
  mentorId: ObjectIdSchema.optional(),
});

/** One CSV row: name,email[,password][,batch] */
export const StudentCsvRowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: EmailSchema,
  password: PasswordSchema.optional(),
  batch: z.string().trim().max(40).optional(),
});

export const PublicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: RoleSchema,
  departmentId: z.string().nullable(),
  batch: z.string().nullable(),
  syllabusVersionId: z.string().nullable(),
  mentorId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
});

export const AuthTokenResponseSchema = z.object({
  data: z.object({ accessToken: z.string(), expiresIn: z.number(), user: PublicUserSchema }),
});
