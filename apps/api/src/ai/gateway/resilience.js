import pLimit from 'p-limit';
import { AIOfflineError, isNetworkError } from './errors.js';

/**
 * Circuit breaker (A1.4). After `threshold` consecutive connection failures the AI is marked
 * offline and calls fail fast. Every `probeMs` one call is let through as a probe; a success
 * closes the circuit.
 */
export class CircuitBreaker {
  constructor({ threshold = 3, probeMs = 30_000, now = () => Date.now() } = {}) {
    this.threshold = threshold;
    this.probeMs = probeMs;
    this.now = now;
    this.failures = 0;
    this.openedAt = null;
    this.lastProbeAt = null;
  }

  get isOpen() {
    return this.openedAt !== null;
  }

  /** Throws when open, except for one probe per interval. */
  before() {
    if (!this.isOpen) return;
    const t = this.now();
    if (this.lastProbeAt === null || t - this.lastProbeAt >= this.probeMs) {
      this.lastProbeAt = t;
      return;
    }
    throw new AIOfflineError('AI service offline', {
      reason: 'circuit-open',
      retryInMs: this.probeMs - (t - this.lastProbeAt),
    });
  }

  success() {
    this.failures = 0;
    this.openedAt = null;
    this.lastProbeAt = null;
  }

  failure() {
    this.failures += 1;
    if (this.failures >= this.threshold && !this.isOpen) {
      this.openedAt = this.now();
      this.lastProbeAt = this.now();
    }
  }

  state() {
    return { open: this.isOpen, failures: this.failures, openedAt: this.openedAt };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wraps provider calls with the A.7.8 rules: a concurrency limit, a per-call timeout,
 * exponential backoff on network errors only, and the circuit breaker.
 */
export function createResilience({
  concurrency,
  timeoutMs,
  retries = 2,
  baseDelayMs = 400,
  breaker,
}) {
  const limit = pLimit(concurrency);
  const cb = breaker ?? new CircuitBreaker();

  /**
   * @template T
   * @param {(signal: AbortSignal) => Promise<T>} fn
   * @param {{ signal?: AbortSignal, timeoutMs?: number }} [opts]
   * @returns {Promise<T>}
   */
  async function run(fn, opts = {}) {
    cb.before();
    return limit(async () => {
      let attempt = 0;
      for (;;) {
        const timeout = AbortSignal.timeout(opts.timeoutMs ?? timeoutMs);
        const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
        try {
          const out = await fn(signal);
          cb.success();
          return out;
        } catch (err) {
          if (opts.signal?.aborted) throw err; // the caller cancelled: not an AI failure
          if (!isNetworkError(err)) throw err;
          // A timeout already waited the full budget: fail now instead of retrying.
          if (err.name === 'TimeoutError') {
            cb.failure();
            throw new AIOfflineError('The AI model took too long to answer', { reason: 'timeout' });
          }
          if (attempt >= retries) {
            cb.failure();
            throw new AIOfflineError('AI service offline', { reason: 'unreachable' });
          }
          attempt += 1;
          const jitter = Math.random() * baseDelayMs;
          await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
        }
      }
    });
  }

  return { run, breaker: cb, limit };
}
