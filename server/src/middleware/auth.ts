import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function extractBearerToken(authorization?: string): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function attachUserFromToken(req: Request, token: string): Promise<void> {
  const payload = verifyAccessToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  if (user.role !== payload.role) {
    throw new UnauthorizedError('Token role mismatch');
  }

  req.user = { id: user.id, role: user.role };
}

/**
 * Verifies the Bearer access JWT and attaches `req.user`.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.get('authorization') ?? undefined);
  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  await attachUserFromToken(req, token);
  next();
});

/**
 * Attaches `req.user` when a valid Bearer token is present; otherwise continues as guest.
 */
export const optionalAuthenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.get('authorization') ?? undefined);
    if (!token) {
      next();
      return;
    }

    try {
      await attachUserFromToken(req, token);
    } catch {
      // Invalid/expired token → treat as guest for cart sync flows
    }
    next();
  },
);

/**
 * Restricts access to the given roles. Must run after `authenticate`.
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}

export const GUEST_ID_HEADER = 'x-guest-id';

export function getGuestId(req: Request): string | undefined {
  const header = req.get(GUEST_ID_HEADER)?.trim();
  return header || undefined;
}
