import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { REFRESH_COOKIE_NAME, clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils/cookies.js';
import { success } from '../utils/apiResponse.js';

function requestMeta(req: Request) {
  return {
    userAgent: req.get('user-agent') ?? undefined,
    ipAddress: req.ip,
  };
}

function sendAuthSuccess(res: Response, result: authService.AuthTokensResult, message: string, status = 200) {
  setRefreshTokenCookie(res, result.refreshToken);
  const csrfToken = issueCsrfToken(res);
  return res.status(status).json(
    success(
      {
        user: result.user,
        accessToken: result.accessToken,
        csrfToken,
      },
      message,
    ),
  );
}

export async function csrfToken(_req: Request, res: Response): Promise<void> {
  const token = issueCsrfToken(res);
  res.status(200).json(success({ csrfToken: token }, 'CSRF token issued'));
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.registerUser(req.body, requestMeta(req));
  sendAuthSuccess(res, result, 'Registration successful', 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.loginUser(req.body, requestMeta(req));
  sendAuthSuccess(res, result, 'Login successful');
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const result = await authService.refreshSession(raw, requestMeta(req));
  sendAuthSuccess(res, result, 'Token refreshed');
}

export async function logout(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logoutUser(raw);
  clearRefreshTokenCookie(res);
  res.status(200).json(success(null, 'Logged out successfully'));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.requestPasswordReset(req.body);
  res.status(200).json(
    success(
      null,
      'If an account exists for that email, password reset instructions have been sent',
    ),
  );
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body);
  clearRefreshTokenCookie(res);
  res.status(200).json(success(null, 'Password has been reset successfully'));
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getUserById(req.user!.id);
  res.status(200).json(success({ user }, 'Current user'));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = await authService.updateUserProfile(req.user!.id, req.body);
  res.status(200).json(success({ user }, 'Profile updated'));
}
