import type { Role, User } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../prisma/client.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../utils/AppError.js';
import { parseDurationToMs } from '../utils/duration.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import {
  generateOpaqueToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from '../validators/auth.validators.js';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  createdAt: Date;
};

export type AuthTokensResult = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

async function issueTokenPair(
  user: User,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokensResult> {
  const refreshRecordId = generateOpaqueToken(16);
  const refreshToken = signRefreshToken(user.id, refreshRecordId);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      id: refreshRecordId,
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  const accessToken = signAccessToken(user.id, user.role);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function registerUser(
  input: RegisterInput,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokensResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: 'CUSTOMER',
      cart: { create: {} },
    },
  });

  return issueTokenPair(user, meta);
}

export async function loginUser(
  input: LoginInput,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokensResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return issueTokenPair(user, meta);
}

export async function refreshSession(
  rawRefreshToken: string | undefined,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokensResult> {
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token missing');
  }

  const payload = verifyRefreshToken(rawRefreshToken);
  const tokenHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.id !== payload.jti || stored.userId !== payload.sub) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError('Refresh token expired or revoked');
  }

  if (!stored.user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  // Rotate refresh token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(stored.user, meta);
}

export async function logoutUser(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always succeed to avoid account enumeration
  if (!user || !user.isActive) {
    return;
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await sendPasswordResetEmail(user.email, rawToken);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashToken(input.token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getUserById(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }
  return toPublicUser(user);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const phone =
    input.phone === undefined || input.phone === '' ? null : input.phone;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone,
    },
  });

  return toPublicUser(updated);
}
