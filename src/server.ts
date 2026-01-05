import app from './app';
import { config } from './config';
import { initializeCronJobs } from './cron';
import { connectRedis } from './utils/redis.client';
import { CacheService } from './services/cache.service';
import logger from './utils/logger';

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Warm cache with latest prices from NSE/Yahoo APIs
    logger.info('Warming cache on server startup...');
    const cache = new CacheService();
    await cache.warmCache();
    logger.info('Cache warmup complete - server ready to serve requests');

    // Initialize cron jobs
    await initializeCronJobs();

    // Start Express server
    const port = config.app.port;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`, {
        environment: config.app.nodeEnv,
        marketHours: `${config.market.openHour}:${config.market.openMinute} - ${config.market.closeHour}:${config.market.closeMinute} IST`,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();

