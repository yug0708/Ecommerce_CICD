import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../utils/AppError.js';

type RequestValidationTarget = 'body' | 'query' | 'params';

type ValidationSchemas = Partial<Record<RequestValidationTarget, ZodSchema>>;

/**
 * Validates request body / query / params with Zod and replaces them with parsed values.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Request['query'];
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request['params'];
      }
      next();
    } catch (error) {
      next(error instanceof Error ? error : new ValidationError('Validation failed'));
    }
  };
}
