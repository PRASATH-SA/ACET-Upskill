/**
 * Job definitions for Agenda (A.3). Each job receives its dependencies so it can be tested
 * without MongoDB. AI jobs (A2, A3) are added here in the AI phases.
 */
export const JOB_NAMES = Object.freeze({
  noop: 'noop',
  masteryOverdueSweep: 'mastery.overdueSweep',
  /** A1–A3: runs one aiJobs document (ingestion, map drafting, content drafting, PYQ tagging). */
  aiRun: 'ai.run',
});

/**
 * @param {{ define: Function }} agenda
 * @param {{ sweepOverdue: (opts?: object) => Promise<number>, runAiJob?: (id: string) => Promise<void>, logger: { info: Function } }} deps
 */
export function defineJobs(agenda, { sweepOverdue, runAiJob, logger }) {
  // AI work is slow on CPU-only machines: allow long locks, and let LLM_MAX_CONCURRENCY in the
  // gateway limit model calls rather than limiting jobs here.
  if (runAiJob) {
    agenda.define(
      JOB_NAMES.aiRun,
      { concurrency: 4, lockLifetime: 60 * 60 * 1000 },
      async (job) => {
        await runAiJob(job.attrs.data.jobId);
      },
    );
  }

  agenda.define(JOB_NAMES.noop, async (job) => {
    logger.info({ job: JOB_NAMES.noop, data: job.attrs.data ?? null }, 'noop job ran');
  });

  // confident → needsRevision for topics with reviews overdue past the threshold (B4).
  agenda.define(
    JOB_NAMES.masteryOverdueSweep,
    { concurrency: 1, lockLifetime: 10 * 60 * 1000 },
    async () => {
      const flagged = await sweepOverdue({ now: new Date() });
      logger.info(
        { job: JOB_NAMES.masteryOverdueSweep, flagged },
        'mastery overdue sweep finished',
      );
    },
  );
}

/** Recurring schedules. Times are in the server time zone (set TZ=Asia/Kolkata in production). */
export async function scheduleRecurring(agenda) {
  await agenda.every('0 2 * * *', JOB_NAMES.masteryOverdueSweep);
}
