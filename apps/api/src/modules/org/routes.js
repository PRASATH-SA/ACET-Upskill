import { Router } from 'express';
import { DepartmentSchema, IdParamsSchema, SyllabusVersionSchema } from '@acet/shared';
import { requireRole, currentUser } from '../../middleware/auth.js';
import { asyncHandler, created, ok, validate } from '../../lib/http.js';
import { conflict, notFound } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { Subject } from '../syllabus/model.js';
import { User } from '../users/model.js';
import { Department, SyllabusVersion } from './model.js';

/**
 * Departments and syllabus versions: everyone signed in can read. Only the Academic Coordinator
 * creates, renames or deletes departments; HODs and the coordinator manage syllabus versions.
 */
export function orgRoutes() {
  const r = Router();

  r.get(
    '/departments',
    asyncHandler(async (_req, res) => {
      ok(res, await Department.find().sort({ name: 1 }));
    }),
  );
  r.post(
    '/departments',
    requireRole('coordinator'),
    validate({ body: DepartmentSchema }),
    asyncHandler(async (req, res) => {
      const d = await Department.create(req.body);
      await audit({
        actorId: currentUser(req).id,
        action: 'department.create',
        target: { type: 'department', id: String(d._id) },
      });
      created(res, d);
    }),
  );
  r.patch(
    '/departments/:id',
    requireRole('coordinator'),
    validate({ params: IdParamsSchema, body: DepartmentSchema.partial() }),
    asyncHandler(async (req, res) => {
      const d = await Department.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true },
      );
      if (!d) throw notFound('Department');
      ok(res, d);
    }),
  );
  r.delete(
    '/departments/:id',
    requireRole('coordinator'),
    validate({ params: IdParamsSchema }),
    asyncHandler(async (req, res) => {
      if (await User.exists({ departmentId: req.params.id }))
        throw conflict('Department still has users');
      const d = await Department.findByIdAndDelete(req.params.id);
      if (!d) throw notFound('Department');
      ok(res, { deleted: true });
    }),
  );

  r.get(
    '/syllabus-versions',
    asyncHandler(async (_req, res) => {
      ok(res, await SyllabusVersion.find().sort({ academicYear: -1, branch: 1 }));
    }),
  );
  r.post(
    '/syllabus-versions',
    requireRole('admin'),
    validate({ body: SyllabusVersionSchema }),
    asyncHandler(async (req, res) => {
      const v = await SyllabusVersion.create(req.body);
      await audit({
        actorId: currentUser(req).id,
        action: 'syllabusVersion.create',
        target: { type: 'syllabusVersion', id: String(v._id) },
      });
      created(res, v);
    }),
  );
  r.patch(
    '/syllabus-versions/:id',
    requireRole('admin'),
    validate({ params: IdParamsSchema, body: SyllabusVersionSchema.partial() }),
    asyncHandler(async (req, res) => {
      const v = await SyllabusVersion.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true },
      );
      if (!v) throw notFound('Syllabus version');
      ok(res, v);
    }),
  );
  r.delete(
    '/syllabus-versions/:id',
    requireRole('admin'),
    validate({ params: IdParamsSchema }),
    asyncHandler(async (req, res) => {
      if (
        (await Subject.exists({ syllabusVersionId: req.params.id })) ||
        (await User.exists({ syllabusVersionId: req.params.id }))
      ) {
        throw conflict('Syllabus version is in use by subjects or users');
      }
      const v = await SyllabusVersion.findByIdAndDelete(req.params.id);
      if (!v) throw notFound('Syllabus version');
      ok(res, { deleted: true });
    }),
  );
  return r;
}
