import { ok, created, pageMeta } from '../../lib/http.js';
import { requireFile } from '../../lib/upload.js';
import { UploadMaterialSchema } from '@acet/shared';
import { currentUser } from '../../middleware/auth.js';
import * as s from './service.js';
import { changeStatus, reviewAction } from './status.js';

const id = (req) => req.params.id;

/** Builds list/create/update/delete handlers for one content type. */
export function itemHandlers(type) {
  return {
    list: async (req, res) => {
      const filter = {};
      if (type === 'resource' && req.query.kind) filter.kind = req.query.kind;
      if (type === 'question' && req.query.type) filter.type = req.query.type;
      if (req.query.status) filter.status = req.query.status;
      ok(res, await s.listTopicItems(currentUser(req), type, id(req), filter));
    },
    create: async (req, res) =>
      created(res, await s.createTopicItem(currentUser(req), type, id(req), req.body)),
    get: async (req, res) => ok(res, await s.loadItem(currentUser(req), type, id(req), 'write')),
    update: async (req, res) =>
      ok(res, await s.updateItem(currentUser(req), type, id(req), req.body)),
    remove: async (req, res) => {
      await s.deleteItem(currentUser(req), type, id(req));
      ok(res, { deleted: true });
    },
    setStatus: async (req, res) =>
      ok(
        res,
        await changeStatus(currentUser(req), [{ type, id: id(req) }], { to: req.body.status }),
      ),
  };
}

function sendFile(res, { stream, size, mimeType, fileName }) {
  res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');
  res.setHeader('Content-Length', String(size));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(fileName ?? 'file')}"`,
  );
  stream.pipe(res);
}

export const uploadResourceFile = async (req, res) =>
  ok(res, await s.attachResourceFile(currentUser(req), id(req), requireFile(req.file)));
export const getResourceFile = async (req, res) =>
  sendFile(res, await s.openResourceFile(currentUser(req), id(req)));

export async function uploadMaterial(req, res) {
  const file = requireFile(req.file);
  const input = UploadMaterialSchema.parse({
    kind: req.body.kind,
    topicId: req.body.topicId || undefined,
    subjectId: req.body.subjectId || undefined,
  });
  const material = await s.uploadMaterial(currentUser(req), input, file);
  const data = material.toJSON();
  delete data.extractedText;
  data.extractedChars = material.extractedText.length;
  created(res, data);
}
export const listMaterials = async (req, res) =>
  ok(res, await s.listMaterials(currentUser(req), req.query));
export const getMaterial = async (req, res) =>
  ok(res, await s.getMaterial(currentUser(req), id(req)));
export const reingestMaterial = async (req, res) =>
  ok(res, await s.reingestMaterial(currentUser(req), id(req)));
export const getMaterialFile = async (req, res) =>
  sendFile(res, await s.openMaterialFile(currentUser(req), id(req)));
export const deleteMaterial = async (req, res) => {
  await s.deleteMaterial(currentUser(req), id(req));
  ok(res, { deleted: true });
};

export async function reviewQueue(req, res) {
  const { items, total } = await s.reviewQueue(currentUser(req), req.query);
  ok(res, items, pageMeta(req.query.page, req.query.limit, total));
}
export const bulkReview = async (req, res) =>
  ok(res, await reviewAction(currentUser(req), req.body));

export const topicPage = async (req, res) => ok(res, await s.topicPage(currentUser(req), id(req)));
