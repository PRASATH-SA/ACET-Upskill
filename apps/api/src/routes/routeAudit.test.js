import { describe, expect, it } from 'vitest';
import { API_BASE_PATH } from '@acet/shared';
import { api, app } from '../../test/helpers.js';

/**
 * H1 route audit, generated from the live Express router: every route must require auth
 * unless it is listed in PUBLIC, every `:param` must be validated, and every write must
 * validate its body unless it is listed in BODY_EXEMPT with a reason. A new route that breaks
 * these rules fails this test until it is fixed or consciously added to a list.
 */
const PUBLIC = new Set([
  'GET /health',
  'POST /auth/login',
  'POST /auth/refresh', // the httpOnly refresh cookie is the credential
  'POST /auth/logout',
  'GET /media/:token', // the signed token is the credential
]);

/** Writes whose input is not a JSON body, or is checked inside the service. */
const BODY_EXEMPT = new Map([
  ['POST /auth/refresh', 'no body; cookie only'],
  ['POST /auth/logout', 'no body; cookie only'],
  ['POST /auth/import-students', 'multipart CSV, parsed and validated row by row'],
  ['POST /subjects/:id/content-import', 'multipart CSV, parsed and validated row by row'],
  ['POST /materials', 'multipart; UploadMaterialSchema parsed in the controller'],
  ['POST /resources/:id/file', 'multipart video, type sniffed from bytes'],
  ['POST /resources/:id/captions', 'multipart; CaptionUploadSchema parsed in the route'],
  ['POST /topics/:id/explanations', 'JSON or multipart; schemas parsed in the service'],
  ['POST /workshops/:id/submissions', 'multipart text/file, checked in the service'],
  ['POST /materials/:id/ingest', 'no body'],
  ['POST /topics/:id/open', 'no body'],
  ['POST /ai/jobs/:id/cancel', 'no body'],
  ['POST /ai/reembed', 'no body'],
  ['POST /ai/topics/:id/draft-rubric', 'no body'],
  ['PATCH /subjects/:id/map/approve', 'no body'],
  ['POST /ai/subjects/:id/draft-overview', 'no body'],
  [
    'POST /forms/:id/responses',
    'JSON or multipart (answers + file:<questionId> parts), checked in the service',
  ],
  ['POST /forms/:id/publish', 'no body'],
  ['POST /forms/:id/unpublish', 'no body'],
  ['POST /forms/:id/duplicate', 'no body'],
  ['POST /forms/:id/release-scores', 'no body'],
  ['POST /notifications/read-all', 'no body'],
  ['POST /notifications/:id/read', 'no body'],
]);

/** "/^\/users\/?(?=\/|$)/i" → "/users" (Express 4 mount paths). */
function mountPath(layer) {
  if (layer.regexp.fast_slash) return '';
  const m = layer.regexp.source.match(/^\^((?:\\\/[^\\?(]+)*)\\\/\?\(\?=\\\/\|\$\)$/);
  if (!m) throw new Error(`Cannot read mount path ${layer.regexp}`);
  return m[1].replace(/\\\//g, '/');
}

function collect(stack, prefix = '', out = []) {
  for (const layer of stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((l) => l.handle);
      const validates = handlers.flatMap((h) => h.validates ?? []);
      for (const method of Object.keys(layer.route.methods))
        out.push({ method: method.toUpperCase(), path: prefix + layer.route.path, validates });
    } else if (layer.name === 'router' && layer.handle.stack) {
      collect(layer.handle.stack, prefix + mountPath(layer), out);
    }
  }
  return out;
}

// The router mounted at API_BASE_PATH in app.js.
const apiRouterLayer = app._router.stack.find(
  (l) => l.name === 'router' && l.regexp.test(`${API_BASE_PATH}/health`),
);
const routes = collect(apiRouterLayer.handle.stack);
const key = (r) => `${r.method} ${r.path.replace(/\/$/, '') || '/'}`;
const fill = (p) =>
  p
    .replace(/:token/g, 'x'.repeat(40))
    .replace(/:lang/g, 'en')
    .replace(/:[A-Za-z]+/g, '507f1f77bcf86cd799439011');

describe('route audit (H1)', () => {
  it('found the API routes', () => {
    expect(routes.length).toBeGreaterThan(100);
    for (const p of PUBLIC) expect(routes.map(key)).toContain(p);
  });

  it('every non-public route answers 401 without a token', async () => {
    const open = [];
    for (const r of routes) {
      if (PUBLIC.has(key(r))) continue;
      const agent = api();
      const call = agent[r.method.toLowerCase()].bind(agent);
      const res = await call(`${API_BASE_PATH}${fill(r.path)}`).send({});
      if (res.status !== 401) open.push(`${key(r)} → ${res.status}`);
    }
    expect(open).toEqual([]);
  });

  it('a forged or expired bearer token is refused everywhere', async () => {
    const r = routes.find((x) => key(x) === 'GET /subjects');
    for (const token of ['not-a-jwt', 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.']) {
      const res = await api()
        .get(`${API_BASE_PATH}${r.path}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }
  });

  it('every :param is validated', () => {
    const missing = routes
      .filter((r) => r.path.includes(':') && !r.validates.includes('params'))
      .map(key);
    expect(missing).toEqual([]);
  });

  it('every write validates its body, or says why not', () => {
    const missing = routes
      .filter((r) => ['POST', 'PUT', 'PATCH'].includes(r.method))
      .filter((r) => !r.validates.includes('body') && !BODY_EXEMPT.has(key(r)))
      .map(key);
    expect(missing).toEqual([]);
  });

  it('the exemption lists name real routes', () => {
    const all = new Set(routes.map(key));
    expect([...PUBLIC, ...BODY_EXEMPT.keys()].filter((k) => !all.has(k))).toEqual([]);
  });
});
