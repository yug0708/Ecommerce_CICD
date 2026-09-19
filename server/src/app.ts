import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { env, isProd } from './config/env.js';
import { stripeWebhook } from './controllers/payment.controller.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { enforceHttps } from './middleware/https.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { sanitizeRequest } from './middleware/sanitize.js';
import { UPLOADS_ROOT } from './middleware/upload.js';
import { apiRouter } from './routes/index.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(enforceHttps);
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Guest-Id'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(compression());

  /**
   * Stripe webhooks require the raw request body for signature verification.
   * This route is registered BEFORE express.json().
   */
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    asyncHandler(stripeWebhook),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      next();
    },
    express.static(path.resolve(UPLOADS_ROOT), { index: false }),
  );

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          req.url === '/api/health' || req.url === '/api/payments/webhook',
      },
      customLogLevel(_req: IncomingMessage, res: ServerResponse, err?: Error) {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req(req: IncomingMessage & { id?: string }) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
          };
        },
      },
    }),
  );

  app.use('/api', apiRateLimiter);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  if (isProd) {
    app.set('env', 'production');
  }

  return app;
}
