import { Router } from 'express';
import {
  ContentCsvExportQuerySchema,
  ContentCsvImportQuerySchema,
  IdParamsSchema,
} from '@acet/shared';
import { currentUser, requireRole } from '../../middleware/auth.js';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { badRequest } from '../../lib/errors.js';
import { memoryUpload } from '../../lib/upload.js';
import { exportContentCsv, importContentCsv } from './service.js';

const staff = requireRole('faculty', 'admin');

/** Content & quiz CSV: one file per subject (or unit) out, one unit (or subject) in. */
export function contentCsvRoutes() {
  const r = Router();

  r.get(
    '/subjects/:id/content.csv',
    staff,
    validate({ params: IdParamsSchema, query: ContentCsvExportQuerySchema }),
    h(async (req, res) => {
      const { filename, csv } = await exportContentCsv(currentUser(req), req.params.id, req.query);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    }),
  );

  r.post(
    '/subjects/:id/content-import',
    staff,
    validate({ params: IdParamsSchema, query: ContentCsvImportQuerySchema }),
    memoryUpload(5).single('file'),
    h(async (req, res) => {
      const text = req.file
        ? req.file.buffer.toString('utf8')
        : typeof req.body?.csv === 'string'
          ? req.body.csv
          : '';
      if (!text.trim()) throw badRequest('Upload a CSV file in the "file" field');
      ok(res, await importContentCsv(currentUser(req), req.params.id, text, req.query));
    }),
  );
  return r;
}
