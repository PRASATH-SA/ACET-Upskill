/**
 * Vercel entry (the `api` service in the root vercel.json). Exports the Express app instead of
 * listening, and connects to MongoDB once per function instance. Local and Docker runs keep
 * using server.js.
 */
import { loadEnv } from './config/env.js';
import { connectMongo } from './db/connect.js';
import { createApp } from './app.js';

// Web and API share one Vercel domain, so the deployment's own URL is the allowed origin
// unless CORS_ORIGIN / WEB_ORIGIN are set explicitly.
if (!process.env.CORS_ORIGIN && !process.env.WEB_ORIGIN) {
  process.env.WEB_ORIGIN = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`)
    .join(',');
}

const cfg = loadEnv();
const app = createApp();
let ready;

export default async function handler(req, res) {
  ready ??= connectMongo(cfg.MONGO_URI).catch((err) => {
    ready = undefined; // retry on the next request
    throw err;
  });
  await ready;
  return app(req, res);
}
