import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler as h, validate } from '../lib/http.js';
import { sendStoredFile, verifyMediaToken } from '../lib/media.js';

/**
 * GET /media/:token — public route; the signed token is the permission (see lib/media.js).
 * Mounted before requireAuth because media elements cannot send a Bearer header.
 */
export function mediaRoutes() {
  const r = Router();
  r.get(
    '/:token',
    validate({ params: z.object({ token: z.string().min(20).max(2000) }) }),
    h(async (req, res) => {
      const { key, mimeType } = verifyMediaToken(req.params.token);
      await sendStoredFile(req, res, { key, mimeType });
    }),
  );
  return r;
}
