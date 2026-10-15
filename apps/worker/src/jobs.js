/**
 * Job definitions for Agenda (A.3). Each job receives its dependencies so it can be tested
 * without MongoDB. AI jobs (A2, A3) are added here in the AI phases.
 */
export const JOB_NAMES = Object.freeze({
  noop: 'noop',
  masteryOverdueSweep: 'mastery.overdueSweep',
});

/**
 * @param {{ define: Function }} agenda
 * @param {{ sweepOverdue: (opts?: object) => Promise<number>, logger: { info: Function } }} deps
 */
export function defineJobs(agenda, { sweepOverdue, logger }) {
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
