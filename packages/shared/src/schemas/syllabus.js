import { z } from 'zod';
import {
  ContentStatusSchema,
  LinkTypeSchema,
  MapNodeStateSchema,
  MasteryStateSchema,
} from '../enums.js';
import { ObjectIdSchema, PositionSchema } from './common.js';

export const CreateSubjectSchema = z.object({
  syllabusVersionId: ObjectIdSchema,
  semester: z.number().int().min(1).max(10),
  code: z.string().trim().toUpperCase().min(2).max(20),
  name: z.string().trim().min(2).max(160),
  facultyIds: z.array(ObjectIdSchema).max(20).default([]),
});
export const UpdateSubjectSchema = CreateSubjectSchema.partial();

export const ListSubjectsQuerySchema = z.object({
  syllabusVersionId: ObjectIdSchema.optional(),
  semester: z.coerce.number().int().min(1).max(10).optional(),
});

export const CreateUnitSchema = z.object({
  number: z.number().int().min(1).max(20),
  title: z.string().trim().min(2).max(160),
});
export const UpdateUnitSchema = CreateUnitSchema.partial();

export const CreateTopicSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(600).default(''),
  parentTopicId: ObjectIdSchema.nullable().optional(),
  order: z.number().int().min(0).optional(),
  position: PositionSchema.optional(),
});
export const UpdateTopicSchema = CreateTopicSchema.partial().extend({
  unitId: ObjectIdSchema.optional(),
});

export const CreateLinkSchema = z.object({
  fromTopicId: ObjectIdSchema,
  toTopicId: ObjectIdSchema,
  type: LinkTypeSchema,
  reason: z.string().trim().min(3).max(240),
});
export const UpdateLinkSchema = z
  .object({ type: LinkTypeSchema, reason: z.string().trim().min(3).max(240) })
  .partial();

/** Bulk map save from the editor: positions/order for nodes plus edge upserts and deletes. */
export const SaveMapSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: ObjectIdSchema,
        position: PositionSchema.optional(),
        order: z.number().int().min(0).optional(),
        unitId: ObjectIdSchema.optional(),
        title: z.string().trim().min(1).max(160).optional(),
      }),
    )
    .max(500)
    .default([]),
  edges: z
    .object({
      upsert: z
        .array(CreateLinkSchema.extend({ id: ObjectIdSchema.optional() }))
        .max(1000)
        .default([]),
      delete: z.array(ObjectIdSchema).max(1000).default([]),
    })
    .default({}),
});

export const MapUnitSchema = z.object({ id: z.string(), number: z.number(), title: z.string() });
export const MapTopicSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  parentTopicId: z.string().nullable(),
  title: z.string(),
  summary: z.string(),
  order: z.number(),
  position: PositionSchema,
  status: ContentStatusSchema,
});
export const MapLinkSchema = z.object({
  id: z.string(),
  fromTopicId: z.string(),
  toTopicId: z.string(),
  type: LinkTypeSchema,
  reason: z.string(),
  status: ContentStatusSchema,
  source: z.enum(['ai', 'faculty']),
  crossUnit: z.boolean(),
});
export const SubjectMapSchema = z.object({
  subject: z.object({ id: z.string(), code: z.string(), name: z.string(), semester: z.number() }),
  units: z.array(MapUnitSchema),
  topics: z.array(MapTopicSchema),
  links: z.array(MapLinkSchema),
});

export const MyMapNodeSchema = z.object({
  topicId: z.string(),
  state: MapNodeStateSchema,
  mastery: MasteryStateSchema,
  score: z.number().nullable(),
  missingPrerequisites: z.array(z.string()),
});

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
