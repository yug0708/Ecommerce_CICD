import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const envDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadDotenv({ path: path.join(envDir, '.env'), override: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    /** @deprecated Prefer JWT_ACCESS_EXPIRES_IN — kept for backward compatibility */
    JWT_EXPIRES_IN: z.string().optional(),
    CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().positive().default(60),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    TAX_RATE: z.coerce.number().min(0).max(1).default(0.08),
    SHIPPING_FLAT_RATE: z.coerce.number().min(0).default(5.99),
    FREE_SHIPPING_THRESHOLD: z.coerce.number().min(0).default(75),
    STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
    STRIPE_CURRENCY: z.string().length(3).default('usd'),
    REDIS_URL: z.string().optional(),
    /** Public API origin — used to detect cross-site cookies vs the SPA */
    PUBLIC_API_URL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (data.JWT_SECRET === 'change-me-to-a-long-random-secret') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be changed in production',
        });
      }
      if (data.JWT_REFRESH_SECRET === 'change-me-to-a-long-random-refresh-secret') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET must be changed in production',
        });
      }
      if (!data.STRIPE_SECRET_KEY.startsWith('sk_live_') && !data.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_SECRET_KEY'],
          message: 'STRIPE_SECRET_KEY must be a valid Stripe secret key',
        });
      }
      if (!data.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_WEBHOOK_SECRET'],
          message: 'STRIPE_WEBHOOK_SECRET must start with whsec_',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  JWT_ACCESS_EXPIRES_IN: data.JWT_ACCESS_EXPIRES_IN || data.JWT_EXPIRES_IN || '15m',
  REDIS_URL: data.REDIS_URL?.trim() || undefined,
  PUBLIC_API_URL: data.PUBLIC_API_URL?.trim() || undefined,
};

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
