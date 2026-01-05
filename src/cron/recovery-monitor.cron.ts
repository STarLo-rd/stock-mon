import cron from 'node-cron';
import { RecoveryTrackingService } from '../services/recovery-tracking.service';
import { isMarketOpen } from '../utils/market-hours.util';
import { connectRedis } from '../utils/redis.client';
import logger from '../utils/logger';

/**
 * Recovery monitoring cron job
 * Runs every 5 minutes to track recovery after crashes
 */
export function setupRecoveryMonitorCron(): void {
  const recoveryTracking = new RecoveryTrackingService();

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Check if INDIA market is open
      if (!isMarketOpen('INDIA')) {
        return; // Skip recovery tracking when market is closed
      }

      logger.info('Starting recovery tracking cycle for INDIA market');

      // Ensure Redis is connected
      await connectRedis();

      // Track recoveries for all active alerts
      await recoveryTracking.trackRecoveries();

      logger.info('Recovery tracking cycle completed');
    } catch (error) {
      logger.error('Error in recovery monitoring cron', { error });
    }
  });

  logger.info('Recovery monitor cron job scheduled', { schedule: 'every 5 minutes during market hours' });
}

