import type { NextFunction, Request, Response } from 'express';

const SCRIPTISH = /<\s*\/?\s*script\b[^>]*>/gi;
const ON_EVENT = /\son\w+\s*=/gi;

/** Strip obvious HTML/script payloads from string inputs (defense in depth; Prisma already parameterizes SQL). */
export function sanitizeString(value: string): string {
  return value.replace(SCRIPTISH, '').replace(ON_EVENT, ' ').trim();
}

function walk(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = walk(nested);
    }
    return out;
  }
  return value;
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = walk(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = walk(req.query) as typeof req.query;
  }
  next();
}
