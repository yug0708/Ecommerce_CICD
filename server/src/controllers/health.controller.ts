import type { Request, Response } from 'express';
import { getHealthStatus } from '../services/health.service.js';
import { success } from '../utils/apiResponse.js';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const data = await getHealthStatus();
  const statusCode = data.status === 'ok' ? 200 : 503;

  res.status(statusCode).json(success(data, 'Health check completed'));
}
