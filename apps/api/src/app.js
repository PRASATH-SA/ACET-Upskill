import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { API_BASE_PATH, corsOrigins } from '@acet/shared';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { ipLimiter } from './middleware/rateLimit.js';
import { apiRouter } from './routes/index.js';

/** Builds the Express app. No listening or DB connection here, so tests can use supertest. */
export function createApp() {
  const cfg = env();
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins(cfg), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  if (cfg.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url?.endsWith('/health') ?? false },
        // Signed media links carry a token in the path: keep it out of the logs.
        serializers: {
          req: (req) => ({ ...req, url: req.url?.replace(/\/media\/[^/?]+/, '/media/[token]') }),
        },
      }),
    );
  }
  app.use(API_BASE_PATH, ipLimiter(cfg.API_IP_RATE_LIMIT_PER_MIN), apiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
