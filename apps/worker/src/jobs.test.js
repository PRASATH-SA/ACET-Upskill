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

  it('schedules the sweep daily', async () => {
    const agenda = fakeAgenda();
    await scheduleRecurring(agenda);
    expect(agenda.every).toHaveBeenCalledWith('0 2 * * *', JOB_NAMES.masteryOverdueSweep);
  });
});
