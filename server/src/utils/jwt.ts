import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './AppError.js';

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  typ: 'refresh';
  jti: string;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    role,
    typ: 'access',
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    typ: 'refresh',
    jti,
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    if (decoded.typ !== 'access' || !decoded.sub || !decoded.role) {
      throw new UnauthorizedError('Invalid access token');
    }
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.typ !== 'refresh' || !decoded.sub || !decoded.jti) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
