import { pino } from 'pino';

/**
 * App logger. Redacts credentials and personal fields so they never reach logs (A.7.10).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.currentPassword',
      '*.newPassword',
      '*.accessToken',
    ],
    remove: true,
  },
});
