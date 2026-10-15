import { z } from 'zod';

/** A MongoDB ObjectId as a 24-character hex string. */
export const ObjectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');

export const IdParamsSchema = z.object({ id: ObjectIdSchema });

/** Accepts "true"/"false" query strings as booleans. */
export const QueryBoolSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((v) => v === true || v === 'true');

export const PositionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
