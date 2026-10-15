import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authRoutes } from '../modules/auth/routes.js';
import { contentRoutes } from '../modules/content/routes.js';
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
import { tutorRoutes } from '../modules/tutor/routes.js';
import { healthRoutes } from './health.js';

/**
 * Mounts every module under /api/v1.
 * Only /health and /auth are public. Everything after the requireAuth gate needs a valid
 * access token, so a new route can never be accidentally public.
 */
export function apiRouter() {
  const r = Router();
  r.use('/health', healthRoutes());
  r.use('/auth', authRoutes());

  r.use(requireAuth);
  r.use('/users', userRoutes());
  r.use('/mentor', mentorRoutes());
  r.use('/', orgRoutes());
  r.use('/', syllabusRoutes());
  r.use('/', contentRoutes());
  r.use('/', practiceRoutes());
  r.use('/', examRoutes());
  r.use('/', workshopRoutes());
  r.use('/', outcomeRoutes());
  r.use('/', insightRoutes());
  r.use('/', tutorRoutes());
  r.use('/ai', aiRoutes());
  return r;
}
