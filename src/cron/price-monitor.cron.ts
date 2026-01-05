import cron from 'node-cron';
import { AlertDetectionService } from '../services/alert-detection.service';
import { NotificationService } from '../services/notification.service';
import { RecoveryTrackingService } from '../services/recovery-tracking.service';
import { CacheService } from '../services/cache.service';
import { HistoricalPriceService } from '../services/historical-price.service';
import { getPriceUpdaterInstance } from '../services/price-updater.service';
import { isMarketOpen } from '../utils/market-hours.util';
import { connectRedis, redisClient } from '../utils/redis.client';
import { db } from '../db';
import { watchlist, watchlists, userAlerts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../utils/logger';

// Cache for symbol-to-users mapping (TTL: 5 minutes)
const SYMBOL_USERS_CACHE_TTL = 5 * 60; // 5 minutes
const SYMBOL_USERS_CACHE_PREFIX = 'symbol:users:';

/**
 * Get all users watching a specific symbol in a market (with caching)
 * @param symbol - Symbol to check
 * @param market - Market type
 * @returns Array of user IDs watching this symbol
 */
async function getUsersWatchingSymbol(symbol: string, market: 'INDIA' | 'USA'): Promise<string[]> {
  const cacheKey = `${SYMBOL_USERS_CACHE_PREFIX}${market}:${symbol}`;
  
  try {
    // Try to get from cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as string[];
    }
  } catch (error) {
    logger.debug('Cache miss or error for symbol users', { symbol, market, error });
  }

  // Cache miss - query database
  const users = await db
    .selectDistinct({ userId: watchlists.userId })
    .from(watchlist)
    .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
    .where(and(
      eq(watchlist.symbol, symbol),
      eq(watchlist.market, market),
      eq(watchlist.active, true)
    ));

  const userIds = users.map(u => u.userId);

  // Cache the result
  try {
    await redisClient.setEx(cacheKey, SYMBOL_USERS_CACHE_TTL, JSON.stringify(userIds));
  } catch (error) {
    logger.debug('Error caching symbol users', { symbol, market, error });
  }

  return userIds;
}

/**
 * Link users to an alert by creating user_alerts entries
 * @param alertId - Alert ID
 * @param userIds - Array of user IDs to link
 */
async function linkUsersToAlert(alertId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  // Create user_alerts entries (ignore duplicates due to unique constraint)
  const values = userIds.map(userId => ({
    userId,
    alertId,
    notified: false,
    read: false,
    dismissed: false,
  }));

  try {
    await db.insert(userAlerts).values(values).onConflictDoNothing();
  } catch (error) {
    logger.error('Error linking users to alert', { alertId, userIdCount: userIds.length, error });
    throw error;
  }
}

/**
 * Process alerts for all symbols in a market (symbol-first architecture)
 * Detects alerts once per symbol and fans out to all users watching each symbol
 */
async function processMarketAlerts(
  cachedPrices: Map<string, any> | null | undefined,
  market: 'INDIA' | 'USA',
  alertDetection: AlertDetectionService,
  notificationService: NotificationService,
  recoveryTracking: RecoveryTrackingService
): Promise<void> {
  try {
    // Step 1: Get ALL unique symbols across ALL users for this market
    const allSymbols = await db
      .selectDistinct({ symbol: watchlist.symbol })
      .from(watchlist)
      .where(and(
        eq(watchlist.active, true),
        eq(watchlist.market, market)
      ));

    if (allSymbols.length === 0) {
      logger.debug('No active symbols found for market', { market });
      return;
    }

    // Step 2: Build price map for all symbols
    const priceMap = new Map<string, number>();
    for (const { symbol } of allSymbols) {
      const priceData = cachedPrices?.get(symbol);
      if (priceData && priceData.price) {
        priceMap.set(symbol, priceData.price);
      }
    }

    if (priceMap.size === 0) {
      logger.debug('No prices available for alert detection', { market });
      return;
    }

    logger.debug(`Processing alerts for ${priceMap.size} symbols`, { market });

    // Step 3: Detect alerts ONCE per symbol (no userId)
    const triggers = await alertDetection.processAlerts(priceMap, market);
    
    logger.info(`Detected ${triggers.length} alert triggers for ${market} market`, {
      market,
      triggerCount: triggers.length,
    });

    // Step 4: For each triggered alert, store symbol-level alert and fan-out to users
    for (const trigger of triggers) {
      try {
        // Store symbol-level alert (no userId)
        const alertId = await alertDetection.storeAlert(trigger);

        // Find all users watching this symbol
        const userIds = await getUsersWatchingSymbol(trigger.symbol, market);

        if (userIds.length === 0) {
          logger.warn(`No users watching symbol ${trigger.symbol}`, { symbol: trigger.symbol, market });
          continue;
        }

        // Create user_alerts links
        await linkUsersToAlert(alertId, userIds);

        logger.info(`Linked ${userIds.length} users to alert for ${trigger.symbol}`, {
          symbol: trigger.symbol,
          alertId,
          userIdCount: userIds.length,
        });

        // Send notifications to all users watching this symbol (pass alertId directly)
        await notificationService.sendAlerts([{ ...trigger, alertId }], userIds);

        // Initialize recovery tracking (once per alert, not per user)
        await recoveryTracking.initializeRecoveryTracking(
          alertId,
          trigger.symbol,
          trigger.currentPrice,
          market
        );
      } catch (error) {
        logger.error(`Error processing alert for ${trigger.symbol}`, {
          symbol: trigger.symbol,
          market,
          error,
        });
      }
    }
  } catch (error) {
    logger.error(`Error processing market alerts`, { market, error });
  }
}

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

        // Process alerts for all symbols (symbol-first architecture)
        await processMarketAlerts(cachedPrices, market, alertDetection, notificationService, recoveryTracking);

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


