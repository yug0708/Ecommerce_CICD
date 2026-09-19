import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { isProd } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { failure } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

function mapZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || undefined,
    message: issue.message,
    code: issue.code,
  }));
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(', ')
        : 'field';
      return new AppError(`Unique constraint failed on ${target}`, 409, 'CONFLICT', {
        prismaCode: error.code,
        target: error.meta?.target,
      });
    }
    case 'P2025':
      return new AppError('Record not found', 404, 'NOT_FOUND', { prismaCode: error.code });
    case 'P2003':
      return new AppError('Related record not found', 400, 'FOREIGN_KEY_CONSTRAINT', {
        prismaCode: error.code,
      });
    default:
      return new AppError('Database request failed', 400, 'DATABASE_ERROR', {
        prismaCode: error.code,
      });
  }
}

function mapMulterError(error: multer.MulterError): AppError {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('Image file too large (max 5MB)', 400, 'FILE_TOO_LARGE');
  }
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Too many image files (max 8)', 400, 'TOO_MANY_FILES');
  }
  return new AppError(error.message, 400, 'UPLOAD_ERROR');
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Route not found', 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof multer.MulterError) {
    appError = mapMulterError(err);
  } else if (err instanceof ZodError) {
    appError = new AppError('Validation failed', 400, 'VALIDATION_ERROR', mapZodError(err));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appError = mapPrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    appError = new AppError('Invalid database query', 400, 'DATABASE_VALIDATION_ERROR');
  } else if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    appError = new AppError('Invalid JSON payload', 400, 'INVALID_JSON');
  } else if (err instanceof Error) {
    appError = new AppError(
      isProd ? 'Internal server error' : err.message,
      500,
      'INTERNAL_ERROR',
      undefined,
      false,
    );
  } else {
    appError = new AppError('Internal server error', 500, 'INTERNAL_ERROR', undefined, false);
  }

  const logPayload = {
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
    stack: err instanceof Error ? err.stack : undefined,
  };

  if (appError.statusCode >= 500) {
    logger.error(logPayload, appError.message);
  } else {
    logger.warn(logPayload, appError.message);
  }

  const exposeDetails = !isProd && appError.isOperational;
  res.status(appError.statusCode).json(
    failure(
      appError.message,
      appError.code,
      exposeDetails ? appError.details : undefined,
    ),
  );
}
