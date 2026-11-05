import { z } from 'zod';

/** A MongoDB ObjectId as a 24-character hex string. */
export const ObjectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');

export const IdParamsSchema = z.object({ id: ObjectIdSchema });

/** Accepts "true"/"false" query strings as booleans. */
export const QueryBoolSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((v) => v === true || v === 'true');

export const PositionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });

/** Year of study (I–IV) and semester (1–8) of a student. Year y spans semesters 2y−1 and 2y. */
export const YearOfStudySchema = z.coerce.number().int().min(1).max(4);
export const SemesterSchema = z.coerce.number().int().min(1).max(8);

/** Refinement: when both are set, the semester must belong to the year. */
export function termMatchesYear(v) {
  if (v.yearOfStudy == null || v.semester == null) return true;
  return Math.ceil(v.semester / 2) === v.yearOfStudy;
}
export const TERM_MISMATCH = {
  message: 'semester must belong to the year of study (year y → semester 2y−1 or 2y)',
  path: ['semester'],
};
