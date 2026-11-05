import { AppError } from '../../lib/errors.js';

/** The model server is unreachable, timed out, or the circuit breaker is open (A.7.8). */
export class AIOfflineError extends AppError {
  constructor(message = 'AI service offline', details) {
    super('AI_OFFLINE', message, details);
    this.name = 'AIOfflineError';
  }
}

/** The model returned output that failed schema validation, even after the repair retry (A.7.3). */
export class AIValidationError extends AppError {
  /**
   * @param {string} task
   * @param {unknown} issues  zod issues or a parse error message
   * @param {string} [raw]    the last raw model output (kept for logs, never returned to clients)
   */
  constructor(task, issues, raw) {
    super('AI_VALIDATION_FAILED', `The model's output for "${task}" did not match the schema`, {
      task,
      issues,
    });
    this.name = 'AIValidationError';
    this.raw = raw;
  }
}

/** A provider answered with an HTTP error that is not a connection problem (e.g. unknown model). */
export class AIProviderError extends AppError {
  constructor(status, message) {
    super('AI_OFFLINE', message, { providerStatus: status });
    this.name = 'AIProviderError';
    this.providerStatus = status;
  }
}

/** True for failures worth retrying: connection refused/reset, DNS, or a timeout. */
export function isNetworkError(err) {
  if (!err) return false;
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return err.name === 'TimeoutError';
  if (err instanceof TypeError) return true; // fetch() network failure
  const code = err.code ?? err.cause?.code;
  return [
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'UND_ERR_SOCKET',
  ].includes(code);
}
