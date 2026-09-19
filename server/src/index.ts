import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectCache, initCache } from './lib/cache.js';
import { disconnectPrisma } from './prisma/client.js';
import { logger } from './utils/logger.js';

const app = createApp();

await initCache();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      clientUrl: env.CLIENT_URL,
    },
    'API server started',
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');

  server.close(async (closeError) => {
    if (closeError) {
      logger.error({ err: closeError }, 'Error while closing HTTP server');
      process.exit(1);
    }

    try {
      await disconnectCache();
      await disconnectPrisma();
      logger.info('Prisma disconnected');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error while disconnecting Prisma');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
