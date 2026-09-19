import type { NextFunction, Request, Response } from 'express';
import { isProd } from '../config/env.js';

/** Redirect HTTP → HTTPS in production (honors reverse-proxy proto headers). */
export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (!isProd) {
    next();
    return;
  }

  const proto = (req.get('x-forwarded-proto') ?? req.protocol).split(',')[0]?.trim();
  if (proto === 'https' || req.secure) {
    next();
    return;
  }

  const host = req.get('host');
  if (!host) {
    next();
    return;
  }

  res.redirect(301, `https://${host}${req.originalUrl}`);
}
