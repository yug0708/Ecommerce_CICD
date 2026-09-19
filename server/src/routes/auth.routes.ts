import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  csrfToken,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resetPassword,
  updateMe,
} from '../controllers/auth.controller.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { failure } from '../utils/apiResponse.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/auth.validators.js';

const loginRateLimiter = rateLimit({
  windowMs: env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    res
      .status(429)
      .json(failure('Too many login attempts. Please try again later.', 'LOGIN_RATE_LIMIT_EXCEEDED'));
  },
});

const authRouter = Router();

authRouter.get('/csrf', asyncHandler(csrfToken));
authRouter.post('/register', validate({ body: registerSchema }), asyncHandler(register));
authRouter.post('/login', loginRateLimiter, validate({ body: loginSchema }), asyncHandler(login));
authRouter.post('/refresh', requireCsrf, asyncHandler(refresh));
authRouter.post('/logout', requireCsrf, asyncHandler(logout));
authRouter.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  asyncHandler(forgotPassword),
);
authRouter.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  asyncHandler(resetPassword),
);
authRouter.get('/me', authenticate, asyncHandler(me));
authRouter.patch(
  '/me',
  authenticate,
  validate({ body: updateProfileSchema }),
  asyncHandler(updateMe),
);

export { authRouter };
