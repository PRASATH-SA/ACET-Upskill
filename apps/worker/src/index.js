import { Agenda } from 'agenda';
import {
  WorkerEnvSchema,
  connectMongo,
  disconnectMongo,
  loadEnv,
  logger,
  sweepOverdue,
  runAiJob,
  scheduleReembedIfStale,
} from '@acet/api';
import { defineJobs, scheduleRecurring } from './jobs.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file: rely on the real environment.
}

async function main() {
  const cfg = loadEnv(process.env, WorkerEnvSchema);
  // Mongoose (for services) and Agenda (its own driver) both use MONGO_URI.
  await connectMongo(cfg.MONGO_URI);
  const agenda = new Agenda({
    db: { address: cfg.MONGO_URI, collection: 'agendaJobs' },
    processEvery: '30 seconds',
    maxConcurrency: 10,
  });
  agenda.on('error', (err) => logger.error({ err }, 'agenda error'));
  agenda.on('fail', (err, job) =>
    logger.error({ err: err.message, job: job.attrs.name }, 'job failed'),
  );

  defineJobs(agenda, { sweepOverdue, runAiJob, logger });
  await agenda.start();
  await scheduleRecurring(agenda);
  logger.info('worker started');
  // A2.2: re-embed chunks if the embedding model changed since they were made.
  const reembedJob = await scheduleReembedIfStale().catch((err) => {
    logger.warn({ err: err.message }, 're-embed check failed');
    return null;
  });
  if (reembedJob)
    logger.info({ jobId: reembedJob }, 'embedding model changed: re-embedding chunks');

  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'worker shutting down');
    await agenda.stop(); // unlocks running jobs so another worker can pick them up
    await disconnectMongo();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'worker failed to start');
  process.exit(1);
});
