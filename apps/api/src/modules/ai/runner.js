/**
 * Runs one aiJobs document: looks up the pipeline for its type and gives it a context for
 * progress, logs, cancellation and prompt-version recording. Used by the worker's "ai.run"
 * Agenda job and by the inline queue.
 */
import { logger } from '../../lib/logger.js';
import {
  appendLog,
  failJob,
  finishJob,
  isCancelRequested,
  markCancelled,
  markRunning,
  recordPrompt,
  setProgress,
} from './jobs.js';
import { AiJob } from './model.js';

const pipelines = new Map();

/**
 * @param {string} type
 * @param {(ctx: JobContext) => Promise<{ result?: string, output?: object } | void>} handler
 */
export function registerPipeline(type, handler) {
  pipelines.set(type, handler);
}

export class JobCancelledError extends Error {
  constructor() {
    super('Job cancelled');
    this.name = 'JobCancelledError';
  }
}

/**
 * @typedef {object} JobContext
 * @property {object} job
 * @property {object} input
 * @property {(pct: number, step?: string) => Promise<void>} progress
 * @property {(msg: string, level?: string) => Promise<void>} log
 * @property {() => Promise<void>} checkCancelled  throws JobCancelledError when cancelled
 * @property {(meta: { task: string, promptVersion: number, model: string }) => Promise<void>} recordPrompt
 */

export async function runAiJob(jobId) {
  // Pipelines register themselves on import.
  await import('../../ai/pipelines/index.js');
  const job = await markRunning(jobId);
  if (!job) {
    logger.info({ jobId }, 'ai job not queued (cancelled or already taken)');
    return;
  }
  const handler = pipelines.get(job.type);
  if (!handler) {
    await failJob(jobId, { code: 'INTERNAL', message: `No pipeline for job type "${job.type}"` });
    return;
  }
  const ctx = {
    job,
    input: job.input ?? {},
    progress: (pct, step) => setProgress(jobId, pct, step),
    log: (msg, level) => appendLog(jobId, msg, level),
    checkCancelled: async () => {
      if (await isCancelRequested(jobId)) throw new JobCancelledError();
    },
    recordPrompt: ({ task, promptVersion, model }) =>
      recordPrompt(jobId, task, promptVersion, model),
  };
  const started = Date.now();
  try {
    const out = (await handler(ctx)) ?? {};
    if (await isCancelRequested(jobId)) {
      await markCancelled(jobId);
      return;
    }
    await finishJob(jobId, out);
    logger.info(
      { jobId, type: job.type, result: out.result, ms: Date.now() - started },
      'ai job succeeded',
    );
  } catch (err) {
    if (err instanceof JobCancelledError) {
      await appendLog(jobId, 'Stopped: cancelled by user', 'warn');
      await markCancelled(jobId);
      return;
    }
    logger.warn({ jobId, type: job.type, err: err.message, code: err.code }, 'ai job failed');
    await appendLog(jobId, err.message, 'error');
    await failJob(jobId, err);
  }
}

/** Test helper. */
export async function jobById(id) {
  return AiJob.findById(id).lean();
}
