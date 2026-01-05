import { setupPriceMonitorCron, setupHistoricalCacheWarmingCron } from './price-monitor.cron';
import { setupRecoveryMonitorCron } from './recovery-monitor.cron';
import { connectRedis } from '../utils/redis.client';
import logger from '../utils/logger';

/**
 * Initialize all cron jobs
 */
export async function initializeCronJobs(): Promise<void> {
  try {
    // Connect to Redis first
    await connectRedis();

    // Setup cron jobs
    setupPriceMonitorCron();             // Every minute - alert detection
    setupHistoricalCacheWarmingCron();   // Daily at 3:35 PM IST - warm Redis cache with historical prices
    setupRecoveryMonitorCron();          // Every 5 minutes - recovery tracking

    logger.info('All cron jobs initialized successfully');
  } catch (error) {
    logger.error('Error initializing cron jobs', { error });
    throw error;
  }
}

