/**
 * Vercel entry (the `api` service in the root vercel.json). Exports the Express app instead of
 * listening, and connects to MongoDB once per function instance. Local and Docker runs keep
 * using server.js.
 */
import { loadEnv } from './config/env.js';
import { connectMongo } from './db/connect.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

// Web and API share one Vercel domain, so the deployment's own URL is the allowed origin
// unless CORS_ORIGIN / WEB_ORIGIN are set explicitly.
if (!process.env.CORS_ORIGIN && !process.env.WEB_ORIGIN) {
  process.env.WEB_ORIGIN = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`)
    .join(',');
}

let app;
let startupError;
try {
  loadEnv();
  app = createApp();
} catch (err) {
  // Missing or invalid env vars: say so in the runtime logs instead of crashing the function.
  startupError = err;
  logger.fatal({ err: err.message }, 'api failed to start');
}
let ready;

function unavailable(res, message) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message } }));
}

export default async function handler(req, res) {
  if (startupError) {
    return unavailable(res, 'The server is not configured yet. See the deployment runtime logs.');
  }
  // Few retries: a function has seconds, not minutes, to answer.
  ready ??= connectMongo(loadEnv().MONGO_URI, { retries: 2 }).catch((err) => {
    ready = undefined; // retry on the next request
    throw err;
  });
  try {
    await ready;
  } catch (err) {
    logger.error({ err: err.message }, 'mongo connection failed');
    return unavailable(res, 'The database is unreachable. See the deployment runtime logs.');
  }
  return app(req, res);
}
