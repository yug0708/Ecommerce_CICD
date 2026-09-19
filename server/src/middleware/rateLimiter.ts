import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { failure } from '../utils/apiResponse.js';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json(failure('Too many requests, please try again later.', 'RATE_LIMIT_EXCEEDED'));
  },
});
