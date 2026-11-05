import { Router } from 'express';
import { IdParamsSchema, TutorAskSchema } from '@acet/shared';
import { env } from '../../config/env.js';
import { AIOfflineError } from '../../ai/gateway/errors.js';
import { gateway } from '../../ai/gateway/index.js';
import { answer, commonQuestions, tutorQuota } from '../../ai/tutor.js';
import { loadSubject, loadTopic } from '../../lib/access.js';
import { AppError, badRequest } from '../../lib/errors.js';
import { asyncHandler as h, ok, validate } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { openSse } from '../../lib/sse.js';
import { currentUser, requireRole } from '../../middleware/auth.js';

/** A4 tutor. Mounted at /api/v1. */
export function tutorRoutes() {
  const r = Router();

  /**
   * POST /ai/tutor/ask → SSE: `token` events with text, then `done` with
   * { grounded, refused, citations }. Errors before streaming use the normal JSON envelope.
   */
  r.post(
    '/ai/tutor/ask',
    validate({ body: TutorAskSchema }),
    h(async (req, res) => {
      const user = currentUser(req);
      const { topicId, question, history } = req.body;
      const max = env().TUTOR_MAX_QUESTION_CHARS;
      if (question.length > max) throw badRequest(`Questions can be at most ${max} characters`);
      // Students only reach topics of their syllabus version that are approved (B2).
      const { topic } = await loadTopic(user, topicId, 'read');
      if (user.role === 'student') {
        const quota = await tutorQuota(user.id);
        if (!quota.allowed) {
          throw new AppError(
            'RATE_LIMITED',
            `You have asked ${env().TUTOR_RATE_LIMIT_PER_HOUR} questions this hour. Try again in about ${quota.retryInMinutes} minutes.`,
            { retryInMinutes: quota.retryInMinutes },
          );
        }
      }
      if (gateway().breaker.isOpen) throw new AIOfflineError();

      const ctrl = new AbortController();
      // res 'close' = the client went away (req 'close' can fire once a POST body is read).
      res.on('close', () => ctrl.abort());
      const sse = openSse(req, res);
      try {
        await answer({ user, topic, question, history, send: sse.send, signal: ctrl.signal });
      } catch (err) {
        if (!ctrl.signal.aborted) {
          logger.warn({ err: err.message, code: err.code, topicId }, 'tutor answer failed');
          sse.send('error', {
            code:
              err.code === 'AI_OFFLINE' || err.name === 'TimeoutError' ? 'AI_OFFLINE' : 'INTERNAL',
            message:
              err.code === 'AI_OFFLINE'
                ? 'The AI tutor is offline right now.'
                : 'The tutor could not answer. Try again.',
          });
        }
      } finally {
        sse.close();
      }
    }),
  );

  r.get(
    '/subjects/:id/tutor/common-questions',
    requireRole('faculty', 'admin'),
    validate({ params: IdParamsSchema }),
    h(async (req, res) => {
      await loadSubject(currentUser(req), req.params.id, 'write');
      ok(res, await commonQuestions(req.params.id));
    }),
  );

  return r;
}
