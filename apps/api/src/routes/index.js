import { Router } from 'express';
import { env } from '../config/env.js';
import { userLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { authRoutes } from '../modules/auth/routes.js';
import { contentRoutes } from '../modules/content/routes.js';
import { contentCsvRoutes } from '../modules/contentcsv/routes.js';
import { labRoutes } from '../modules/labs/routes.js';
import { examRoutes } from '../modules/exam/routes.js';
import { insightRoutes } from '../modules/insights/routes.js';
import { mentorRoutes } from '../modules/mentor/routes.js';
import { orgRoutes } from '../modules/org/routes.js';
import { outcomeRoutes } from '../modules/outcomes/routes.js';
import { practiceRoutes } from '../modules/practice/routes.js';
import { syllabusRoutes } from '../modules/syllabus/routes.js';
import { userRoutes } from '../modules/users/routes.js';
import { workshopRoutes } from '../modules/workshops/routes.js';
import { aiRoutes } from '../modules/ai/routes.js';
import { settingsRoutes } from '../modules/settings/routes.js';
import { tutorRoutes } from '../modules/tutor/routes.js';
import { explainRoutes } from '../modules/explain/routes.js';
import { videoRoutes } from '../modules/video/routes.js';
import { codeLabRoutes } from '../modules/codelab/routes.js';
import { overviewRoutes } from '../modules/overview/routes.js';
import { leaderboardRoutes } from '../modules/leaderboard/routes.js';
import { healthRoutes } from './health.js';
import { mediaRoutes } from './media.js';

/**
 * Mounts every module under /api/v1.
 * Only /health and /auth are public. Everything after the requireAuth gate needs a valid
 * access token, so a new route can never be accidentally public.
 */
export function apiRouter() {
  const r = Router();
  r.use('/health', healthRoutes());
  r.use('/auth', authRoutes());
  // Signed, short-lived file links for <video>/<track>/<audio> (the token is the permission).
  r.use('/media', mediaRoutes());

  r.use(requireAuth);
  r.use(userLimiter(env().API_RATE_LIMIT_PER_MIN));
  r.use('/users', userRoutes());
  r.use('/mentor', mentorRoutes());
  r.use('/', orgRoutes());
  r.use('/', syllabusRoutes());
  r.use('/', contentRoutes());
  r.use('/', contentCsvRoutes());
  r.use('/', labRoutes());
  r.use('/', practiceRoutes());
  r.use('/', examRoutes());
  r.use('/', workshopRoutes());
  r.use('/', outcomeRoutes());
  r.use('/', insightRoutes());
  r.use('/', tutorRoutes());
  r.use('/', settingsRoutes());
  r.use('/', videoRoutes());
  r.use('/', explainRoutes());
  r.use('/', codeLabRoutes());
  r.use('/', overviewRoutes());
  r.use('/', leaderboardRoutes());
  r.use('/ai', aiRoutes());
  return r;
}
