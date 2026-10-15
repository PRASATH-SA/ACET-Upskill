/**
 * Where AI jobs run (A.3: Agenda in apps/worker). The API only enqueues; the worker executes.
 * `inline` runs jobs in this process instead, for tests and e2e runs without a worker.
 */
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export const AI_RUN_JOB = 'ai.run';

class InlineQueue {
  constructor() {
    this.running = new Set();
  }

  async enqueue(jobId) {
    // Imported lazily: the runner pulls in every pipeline.
    const { runAiJob } = await import('./runner.js');
    const p = new Promise((resolve) => setImmediate(resolve))
      .then(() => runAiJob(jobId))
      .catch((err) => logger.error({ err, jobId }, 'inline ai job crashed'))
      .finally(() => this.running.delete(p));
    this.running.add(p);
  }

  /** Test helper: wait until every queued job has finished. */
  async drain() {
    while (this.running.size) await Promise.all([...this.running]);
  }
}

class AgendaQueue {
  constructor(mongoUri) {
    this.mongoUri = mongoUri;
    this.agenda = null;
  }

  async #client() {
    if (!this.agenda) {
      const { Agenda } = await import('agenda');
      // No processing in the API: this instance only writes job records for the worker.
      this.agenda = new Agenda({ db: { address: this.mongoUri, collection: 'agendaJobs' } });
    }
    await this.agenda._ready;
    return this.agenda;
  }

  async enqueue(jobId) {
    const agenda = await this.#client();
    await agenda.now(AI_RUN_JOB, { jobId: String(jobId) });
  }

  async close() {
    await this.agenda?.close({ force: false });
  }
}

let current;

export function queue() {
  if (!current) {
    const cfg = env();
    current = cfg.AI_JOB_RUNNER === 'inline' ? new InlineQueue() : new AgendaQueue(cfg.MONGO_URI);
  }
  return current;
}

export function setQueue(q) {
  current = q;
}
