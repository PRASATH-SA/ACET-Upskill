/**
 * Public entry for other workspaces (the worker). The worker imports services from here
 * and never starts the HTTP server.
 */
export { ApiEnvSchema, WorkerEnvSchema, env, loadEnv } from './config/env.js';
export { connectMongo, disconnectMongo, mongoStatus } from './db/connect.js';
export { logger } from './lib/logger.js';
export { sweepOverdue } from './modules/practice/service.js';
export { runAiJob } from './modules/ai/runner.js';
export { AI_RUN_JOB } from './modules/ai/queue.js';
export { scheduleReembedIfStale } from './ai/pipelines/ingest.js';
export { purgeOldAudio } from './modules/explain/service.js';
