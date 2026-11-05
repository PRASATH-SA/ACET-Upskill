import { ERROR_HTTP_STATUS } from '@acet/shared';

/** An error that maps directly to the A.6 error envelope. */
export class AppError extends Error {
  /**
   * @param {import('@acet/shared').ErrorCode} code stable machine-readable code
   * @param {string} message human-readable message
   * @param {unknown} [details] optional structured details
   * @param {number} [status] HTTP status; defaults to the code's standard status
   */
  constructor(code, message, details, status) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.status = status ?? ERROR_HTTP_STATUS[code];
  }
}

export const badRequest = (message, details) => new AppError('VALIDATION_ERROR', message, details);
export const unauthorized = (message = 'Authentication required') =>
  new AppError('UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError('FORBIDDEN', message);
export const notFound = (what = 'Resource') => new AppError('NOT_FOUND', `${what} not found`);
export const conflict = (message, details) => new AppError('CONFLICT', message, details);
export const unprocessable = (message, details) => new AppError('UNPROCESSABLE', message, details);
