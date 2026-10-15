/**
 * JobService (A1.6): create, progress, log, finish, fail, cancel. Pipelines report through
 * the context object built in runner.js; the SSE endpoint reads the same document.
 */
import { loadSubject } from '../../lib/access.js';
import { forbidden, notFound, unprocessable } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { AiJob, TERMINAL_STATUSES } from './model.js';
import { queue } from './queue.js';

const MAX_LOGS = 300;

/** Public shape of a job (no internal fields). */
export function jobView(j) {
  return {
    id: String(j._id),
    type: j.type,
    status: j.status,
    progress: j.progress,
    step: j.step,
    result: j.result,
    output: j.output ?? {},
    error: j.error?.message ? j.error : null,
    model: j.model ?? null,
    promptVersions: j.promptVersions ?? {},
    subjectId: j.subjectId ? String(j.subjectId) : null,
    topicId: j.topicId ? String(j.topicId) : null,
    logs: (j.logs ?? []).map((l) => ({ at: l.at, level: l.level, message: l.message })),
    createdAt: j.createdAt,
    startedAt: j.startedAt ?? null,
    finishedAt: j.finishedAt ?? null,
  };
}

/** Creates a queued job and hands it to the queue. Returns the job document. */
export async function createJob({ type, input = {}, createdBy, subjectId, topicId }) {
  const job = await AiJob.create({ type, input, createdBy, subjectId, topicId });
  await audit({
    actorId: createdBy,
    action: 'ai.job.create',
    target: { type: 'aiJob', id: String(job._id) },
    meta: { type },
  });
  await queue().enqueue(String(job._id));
  return job;
}

/** Owner, admin, or faculty of the job's subject may read and cancel it. */
export async function loadJobFor(user, jobId) {
  const job = await AiJob.findById(jobId).lean();
  if (!job) throw notFound('Job');
  if (user.role === 'admin' || String(job.createdBy) === user.id) return job;
  if (user.role === 'faculty' && job.subjectId) {
    await loadSubject(user, String(job.subjectId), 'write');
    return job;
  }
  throw forbidden();
}

export async function listJobs(user, { subjectId, limit = 20 } = {}) {
  const filter = {};
  if (subjectId) {
    await loadSubject(user, subjectId, user.role === 'admin' ? 'read' : 'write');
    filter.subjectId = subjectId;
  } else if (user.role !== 'admin') filter.createdBy = user.id;
  const jobs = await AiJob.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return jobs.map(jobView);
}

export async function markRunning(jobId) {
  return AiJob.findOneAndUpdate(
    { _id: jobId, status: 'queued' },
    { $set: { status: 'running', startedAt: new Date(), progress: 1 } },
    { new: true },
  ).lean();
}

export async function setProgress(jobId, progress, step) {
  await AiJob.updateOne(
    { _id: jobId },
    {
      $set: {
        progress: Math.max(0, Math.min(99, Math.round(progress))),
        ...(step ? { step } : {}),
      },
    },
  );
}

export async function appendLog(jobId, message, level = 'info') {
  await AiJob.updateOne(
    { _id: jobId },
    {
      $push: {
        logs: {
          $each: [{ at: new Date(), level, message: String(message).slice(0, 2000) }],
          $slice: -MAX_LOGS,
        },
      },
    },
  );
}

export async function recordPrompt(jobId, task, version, model) {
  await AiJob.updateOne(
    { _id: jobId },
    {
      $set: {
        [`promptVersions.${task.replace(/\./g, '_')}`]: version,
        ...(model ? { model } : {}),
      },
    },
  );
}

export async function finishJob(jobId, { result = 'created', output = {} } = {}) {
  await AiJob.updateOne(
    { _id: jobId, status: 'running' },
    {
      $set: {
        status: 'succeeded',
        progress: 100,
        result,
        output,
        finishedAt: new Date(),
        step: 'Done',
      },
    },
  );
}

export async function failJob(jobId, err) {
  await AiJob.updateOne(
    { _id: jobId, status: { $nin: TERMINAL_STATUSES } },
    {
      $set: {
        status: 'failed',
        finishedAt: new Date(),
        error: { code: err.code ?? 'INTERNAL', message: err.message ?? 'Job failed' },
        // Pipelines that saved some items before failing report them here.
        ...(err.output ? { output: err.output } : {}),
      },
    },
  );
}

/** POST /ai/jobs/:id/cancel. Queued jobs stop at once; running jobs stop at the next step. */
export async function cancelJob(user, jobId) {
  const job = await loadJobFor(user, jobId);
  if (TERMINAL_STATUSES.includes(job.status)) throw unprocessable(`Job already ${job.status}`);
  await AiJob.updateOne(
    { _id: jobId, status: { $nin: TERMINAL_STATUSES } },
    {
      $set: {
        cancelRequested: true,
        ...(job.status === 'queued' ? { status: 'cancelled', finishedAt: new Date() } : {}),
      },
    },
  );
  await appendLog(jobId, 'Cancel requested', 'warn');
  await audit({
    actorId: user.id,
    action: 'ai.job.cancel',
    target: { type: 'aiJob', id: String(jobId) },
  });
  return jobView(await AiJob.findById(jobId).lean());
}

export async function markCancelled(jobId) {
  await AiJob.updateOne(
    { _id: jobId, status: { $nin: TERMINAL_STATUSES } },
    { $set: { status: 'cancelled', finishedAt: new Date(), step: 'Cancelled' } },
  );
}

export async function isCancelRequested(jobId) {
  const j = await AiJob.findById(jobId).select('cancelRequested status').lean();
  return !j || j.cancelRequested || j.status === 'cancelled';
}
