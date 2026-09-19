import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env.js';
import { parseDurationToMs } from './duration.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';

export function isCrossOriginClient(): boolean {
  if (!env.PUBLIC_API_URL) return false;
  try {
    return new URL(env.CLIENT_URL).origin !== new URL(env.PUBLIC_API_URL).origin;
  } catch {
    return false;
  }
}

export function getCookieSameSite(): CookieOptions['sameSite'] {
  if (isProd && isCrossOriginClient()) return 'none';
  return isProd ? 'strict' : 'lax';
}

export function getSharedCookieOptions(): Pick<CookieOptions, 'secure' | 'sameSite'> {
  const sameSite = getCookieSameSite();
  return {
    secure: isProd || sameSite === 'none',
    sameSite,
  };
}

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    ...getSharedCookieOptions(),
    path: '/api/auth',
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
  };
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    ...getSharedCookieOptions(),
    path: '/api/auth',
  });
}
