/**
 * SQL sandbox for the code lab: a small pool of worker threads running sql.js (sqlWorker.js).
 * Each job runs on a fresh in-memory database. A job that passes its time limit has its
 * worker terminated and replaced, so an endless recursive query cannot hold the API.
 */
import { Worker } from 'node:worker_threads';
import { CODE_LAB_LIMITS } from '@acet/shared';
import { logger } from '../../lib/logger.js';

const WORKER_URL = new URL('./sqlWorker.js', import.meta.url);

class SqlWorker {
  constructor() {
    this.busy = false;
    this.worker = new Worker(WORKER_URL, {
      // JS heap only; SQLite's own heap is capped inside the worker.
      resourceLimits: { maxOldGenerationSizeMb: 96 },
    });
    this.ready = new Promise((resolve, reject) => {
      const onMsg = (m) => {
        if (m?.ready) {
          this.worker.off('message', onMsg);
          resolve();
        }
      };
      this.worker.on('message', onMsg);
      this.worker.once('error', reject);
    });
    // A crash (e.g. out of memory) fails the job in flight; the pool replaces the worker.
    this.worker.on('error', (err) => logger.warn({ err }, 'code lab worker error'));
  }

  async run(job, timeoutMs) {
    await this.ready;
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve) => {
      const done = (result, dead = false) => {
        clearTimeout(timer);
        this.worker.off('message', onMsg);
        this.worker.off('exit', onExit);
        resolve({ result, dead });
      };
      const onMsg = (m) => m?.id === id && done(m.result);
      const onExit = () =>
        done({ ok: false, stage: 'engine', error: 'The query used too much memory.' }, true);
      const timer = setTimeout(() => {
        this.worker.terminate();
        done(
          {
            ok: false,
            stage: 'timeout',
            error: `Stopped after ${timeoutMs / 1000} s. Look for an endless loop or a huge join.`,
          },
          true,
        );
      }, timeoutMs);
      this.worker.on('message', onMsg);
      this.worker.once('exit', onExit);
      this.worker.postMessage({ id, job });
    });
  }
}

class SqlPool {
  constructor(size) {
    this.workers = Array.from({ length: size }, () => new SqlWorker());
    this.waiting = [];
  }

  async acquire() {
    const free = this.workers.find((w) => !w.busy);
    if (free) {
      free.busy = true;
      return free;
    }
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  release(w) {
    const next = this.waiting.shift();
    if (next) next(w);
    else w.busy = false;
  }

  async run(job, timeoutMs) {
    let w = await this.acquire();
    try {
      const { result, dead } = await w.run(job, timeoutMs);
      if (dead) {
        const fresh = new SqlWorker();
        this.workers[this.workers.indexOf(w)] = fresh;
        fresh.busy = true;
        w = fresh;
      }
      return result;
    } finally {
      this.release(w);
    }
  }

  async close() {
    await Promise.all(this.workers.map((w) => w.worker.terminate()));
  }
}

let pool;
const getPool = () => (pool ??= new SqlPool(CODE_LAB_LIMITS.workers));

/**
 * Runs `steps` in order on a fresh database and returns the last captured result set.
 * @param {{ sql: string, stage: string, capture?: boolean }[]} steps
 * @param {{ timeoutMs?: number, maxRows?: number }} [opts]
 * @returns {Promise<{ ok: true, columns: string[], rows: unknown[][], rowCount: number, truncated: boolean } | { ok: false, stage: string, error: string }>}
 */
export function runSql(
  steps,
  { timeoutMs = CODE_LAB_LIMITS.timeoutMs, maxRows = CODE_LAB_LIMITS.maxRows } = {},
) {
  return getPool().run({ steps, maxRows }, timeoutMs);
}

/** Stops the workers (tests and graceful shutdown). */
export async function closeSandbox() {
  if (pool) await pool.close();
  pool = undefined;
}
