import { describe, expect, it, vi } from 'vitest';
import { defineJobs, JOB_NAMES, scheduleRecurring } from './jobs.js';

function fakeAgenda() {
  const jobs = new Map();
  return {
    jobs,
    every: vi.fn(async () => {}),
    define: (name, optsOrFn, maybeFn) =>
      jobs.set(name, typeof optsOrFn === 'function' ? optsOrFn : maybeFn),
  };
}

describe('worker jobs', () => {
  it('registers the noop and mastery sweep jobs', () => {
    const agenda = fakeAgenda();
    defineJobs(agenda, { sweepOverdue: vi.fn(), logger: { info: vi.fn() } });
    expect([...agenda.jobs.keys()]).toEqual([JOB_NAMES.noop, JOB_NAMES.masteryOverdueSweep]);
  });

  it('the sweep job calls the mastery service and logs the result', async () => {
    const agenda = fakeAgenda();
    const sweepOverdue = vi.fn(async () => 4);
    const logger = { info: vi.fn() };
    defineJobs(agenda, { sweepOverdue, logger });
    await agenda.jobs.get(JOB_NAMES.masteryOverdueSweep)({ attrs: {} });
    expect(sweepOverdue).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ flagged: 4 }),
      expect.any(String),
    );
  });

  it('registers ai.run, which runs the aiJobs document named in the job data', async () => {
    const agenda = fakeAgenda();
    const runAiJob = vi.fn(async () => {});
    defineJobs(agenda, { sweepOverdue: vi.fn(), runAiJob, logger: { info: vi.fn() } });
    await agenda.jobs.get(JOB_NAMES.aiRun)({ attrs: { data: { jobId: 'job-123' } } });
    expect(runAiJob).toHaveBeenCalledWith('job-123');
  });

  it('schedules the sweep and the voice-recording purge daily', async () => {
    const agenda = fakeAgenda();
    await scheduleRecurring(agenda);
    expect(agenda.every).toHaveBeenCalledWith('0 2 * * *', JOB_NAMES.masteryOverdueSweep);
    expect(agenda.every).toHaveBeenCalledWith('30 2 * * *', JOB_NAMES.audioPurge);
  });

  it('the purge job removes old recordings through the explain service', async () => {
    const agenda = fakeAgenda();
    const purgeOldAudio = vi.fn(async () => 2);
    const logger = { info: vi.fn() };
    defineJobs(agenda, { sweepOverdue: vi.fn(), purgeOldAudio, logger });
    await agenda.jobs.get(JOB_NAMES.audioPurge)({ attrs: {} });
    expect(purgeOldAudio).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ removed: 2 }),
      expect.any(String),
    );
  });
});
