/** A.6 — API conventions: base path, response envelopes, error codes and pagination. */
import { z } from 'zod';

export const API_BASE_PATH = '/api/v1';

export const PAGINATION = { defaultPage: 1, defaultLimit: 20, maxLimit: 100 };

/** Parses `?page=&limit=` from a query string. Limit is capped at 100. */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(PAGINATION.maxLimit),
  total: z.number().int().min(0),
});

/** Stable machine-readable error codes. Add new codes here, never inline. */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'AI_OFFLINE',
  'AI_VALIDATION_FAILED',
  'NEEDS_MATERIAL',
  'INTERNAL',
];
export const ErrorCodeSchema = z.enum(ERROR_CODES);

/** Default HTTP status for each error code. */
export const ERROR_HTTP_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE: 422,
  NEEDS_MATERIAL: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  AI_VALIDATION_FAILED: 502,
  AI_OFFLINE: 503,
};

/** Error envelope: `{ error: { code, message, details? } }`. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

/** Success envelope: `{ data, meta? }`. Without a meta schema, `meta` must be absent. */
export function apiSuccessSchema(data, meta) {
  return z.object({ data, meta: (meta ?? z.never()).optional() });
}

/** Paginated list envelope: `{ data: T[], meta: { page, limit, total } }`. */
export function paginatedSchema(item) {
  return z.object({ data: z.array(item), meta: PaginationMetaSchema });
}

/** Body of a `202 Accepted` response for long-running AI work. */
export const JobAcceptedSchema = z.object({ data: z.object({ jobId: z.string().min(1) }) });
