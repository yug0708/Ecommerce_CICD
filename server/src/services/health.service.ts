import { prisma } from '../prisma/client.js';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  checks: {
    database: 'up' | 'down';
  };
};

export async function getHealthStatus(): Promise<HealthStatus> {
  let database: 'up' | 'down' = 'down';

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'up';
  } catch {
    database = 'down';
  }

  return {
    status: database === 'up' ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: { database },
  };
}
