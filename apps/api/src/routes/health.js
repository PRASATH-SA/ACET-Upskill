import { Router } from 'express';
import { env } from '../config/env.js';
import { mongoStatus } from '../db/connect.js';

/** GET /api/v1/health → { status, mongo, version }. 503 when Mongo is not connected. */
export function healthRoutes() {
  const r = Router();
  r.get('/', (_req, res) => {
    const mongo = mongoStatus();
    const healthy = mongo === 'ok';
    res.status(healthy ? 200 : 503).json({
      data: { status: healthy ? 'ok' : 'degraded', mongo, version: env().APP_VERSION },
    });
  });
  return r;
}
