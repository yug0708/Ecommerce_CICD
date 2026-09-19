import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getSharedCookieOptions } from '../utils/cookies.js';
import { ForbiddenError } from '../utils/AppError.js';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function issueCsrfToken(res: Response): string {
  const token = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...getSharedCookieOptions(),
    httpOnly: false,
    path: '/',
  });
  return token;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function verifyCsrf(req: Request): boolean {
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];
  const header = req.get(CSRF_HEADER_NAME);
  if (typeof cookie !== 'string' || typeof header !== 'string') return false;
  if (!cookie || !header) return false;

  const a = digest(cookie);
  const b = digest(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Protects cookie-authenticated state-changing routes (refresh / logout). */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (!verifyCsrf(req)) {
    next(new ForbiddenError('Invalid CSRF token'));
    return;
  }
  next();
}
