import cron from 'node-cron';
import { AlertDetectionService } from '../services/alert-detection.service';
import { NotificationService } from '../services/notification.service';
import { RecoveryTrackingService } from '../services/recovery-tracking.service';
import { CacheService } from '../services/cache.service';
import { HistoricalPriceService } from '../services/historical-price.service';
import { getPriceUpdaterInstance } from '../services/price-updater.service';
import { isMarketOpen } from '../utils/market-hours.util';
import { connectRedis } from '../utils/redis.client';
import { db } from '../db';
import { alerts, watchlist } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import logger from '../utils/logger';

/**
 * Main price monitoring cron job
 * Runs every 5 minutes during market hours
 * Monitors INDIA market only
 *
 * Optimized Architecture:
 * - Background updater fetches prices (non-blocking, 2+ minutes)
 * - Alert detection uses cached prices (instant)
 * - APIs always serve from cache (no waiting for fetch)
 */
export function setupPriceMonitorCron(): void {
  const priceUpdater = getPriceUpdaterInstance();
  const alertDetection = new AlertDetectionService();
  const notificationService = new NotificationService();
  const recoveryTracking = new RecoveryTrackingService();
  const cache = new CacheService();

  // Run every 5 minutes (cost optimization: 80% reduction in API calls)
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Check INDIA market status
      const indiaMarketOpen = isMarketOpen('INDIA');

      if (!indiaMarketOpen) {
        logger.debug('INDIA market is closed, skipping price check');
        return;
      }

      logger.info('Starting price monitoring cycle for INDIA market', {
        indiaMarketOpen,
      });

      // Ensure Redis is connected
      await connectRedis();

      const market: 'INDIA' = 'INDIA';

      try {
        // Start background price update for INDIA market (non-blocking)
        // This runs in background - takes 2+ minutes but doesn't block alert detection
        priceUpdater.updatePrices(market).catch((error) => {
          logger.error(`Background price update failed for ${market}`, { market, error });
        });

        // Get current prices from cache for alert detection
        // This is instant - we use prices from previous update
        const cachedPrices = await cache.getCurrentPrices(market);

        if (!cachedPrices || cachedPrices.size === 0) {
          logger.debug(`No cached prices available for ${market} alert detection`, { market });
          return;
        }

        logger.debug(`Using cached prices for ${market} alert detection`, {
          market,
          symbolCount: cachedPrices.size,
        });

        // Convert prices map to number map for alert detection
        const priceMap = new Map<string, number>();
        for (const [symbol, priceData] of cachedPrices) {
          priceMap.set(symbol, priceData.price);
        }

        // Detect crash alerts for INDIA market
        const triggers = await alertDetection.processAlerts(priceMap, market);
        logger.info(`Detected crash alert triggers for ${market}`, {
          market,
          triggerCount: triggers.length,
        });

        // DISABLED: Recovery alerts processing
        // const recoveries = await alertDetection.processRecoveryAlerts(priceMap, market);
        // logger.info(`Detected recovery alerts for ${market}`, {
        //   market,
        //   recoveryCount: recoveries.length,
        // });

        // Send crash notifications
        if (triggers.length > 0) {
          await notificationService.sendAlerts(triggers);

          // Initialize recovery tracking for new alerts (old recovery system)
          for (const trigger of triggers) {
            // Get alert ID (most recent for this symbol and market)
            const alertRecords = await db
              .select()
              .from(alerts)
              .where(and(eq(alerts.symbol, trigger.symbol), eq(alerts.market, market)))
              .orderBy(desc(alerts.timestamp))
              .limit(1);

            if (alertRecords.length > 0) {
              await recoveryTracking.initializeRecoveryTracking(
                alertRecords[0].id,
                trigger.symbol,
                trigger.currentPrice,
                market
              );
            }
          }
        }

        // DISABLED: Send recovery notifications
        // if (recoveries.length > 0) {
        //   await notificationService.sendRecoveryAlerts(recoveries);
        // }
      } catch (error) {
        logger.error(`Error processing ${market} market`, { market, error });
      }

      logger.info('Price monitoring cycle completed');
    } catch (error) {
      logger.error('Error in price monitoring cron', { error });
    }
  });

  logger.info('Price monitor cron job scheduled', {
    schedule: 'every 5 minutes during market hours',
    markets: ['INDIA'],
  });
}

/**
 * Daily historical price cache warming cron job
 * Runs at 3:35 PM IST (5 minutes after market close)
 * Fetches and caches historical prices from NSE/Yahoo APIs
 */
export function setupHistoricalCacheWarmingCron(): void {
  const historicalPriceService = new HistoricalPriceService();

  // Run at 3:35 PM IST (Mon-Fri)
  // Format: minute hour * * dayOfWeek
  cron.schedule(
    '35 15 * * 1-5',
    async () => {
      try {
        logger.info('Starting historical price cache warming');

        await connectRedis();

        // Process INDIA market only
        const market: 'INDIA' = 'INDIA';
        // Get all active symbols for INDIA market
        const symbols = await db
          .select()
          .from(watchlist)
          .where(and(eq(watchlist.active, true), eq(watchlist.market, market)));

        if (symbols.length === 0) {
          logger.debug(`No active symbols in watchlist for ${market}`, { market });
        } else {
          // Prepare symbol list with types
          const symbolList = symbols.map((s) => ({
            symbol: s.symbol,
            isIndex: s.type === 'INDEX',
          }));

          // Warm cache by fetching historical data from APIs for INDIA market
          await historicalPriceService.warmCache(symbolList, market);
        }

        logger.info('Historical cache warming completed');
      } catch (error) {
        logger.error('Error in historical cache warming cron', { error });
      }
    },
    {
      timezone: 'Asia/Kolkata', // Ensure it runs in IST
    }
  );

  logger.info('Historical cache warming cron job scheduled', {
    schedule: '3:35 PM IST, Mon-Fri',
  });
}

/**
 * Weekly cleanup cron job (REMOVED - no longer needed)
 * Redis TTL handles cache expiration automatically
 * No database cleanup required with Redis-only approach
 */
// export function setupCleanupCron(): void {
//   // No longer needed - Redis handles cleanup via TTL
// }


