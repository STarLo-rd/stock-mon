import { Router, Request, Response } from 'express';
import { db } from '../db';
import { watchlist, alerts, watchlists, userAlerts } from '../db/schema';
import { eq, count, sql, and } from 'drizzle-orm';
import { isMarketOpen } from '../utils/market-hours.util';
import { redisClient } from '../utils/redis.client';
import { CacheService } from '../services/cache.service';
import { getPriceUpdaterInstance } from '../services/price-updater.service';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const router = Router();
const cache = new CacheService();

/**
 * GET /api/status
 * Get system health and statistics for the authenticated user
 * Query params: market (optional, defaults to INDIA)
 * Requires authentication
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { market = 'INDIA' } = req.query;

    if (market && market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';

    // Get watchlist stats filtered by user and market
    // Join watchlist with watchlists to filter by userId
    const watchlistStats = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(CASE WHEN ${watchlist.active} = true THEN 1 END)`,
      })
      .from(watchlist)
      .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
      .where(and(
        eq(watchlist.market, marketType),
        eq(watchlists.userId, userId)
      ));

    // Get alert stats filtered by user and market (join with user_alerts)
    const alertStats = await db
      .select({
        total: count(),
        critical: sql<number>`COUNT(CASE WHEN ${alerts.critical} = true THEN 1 END)`,
        today: sql<number>`COUNT(CASE WHEN DATE(${alerts.timestamp}) = CURRENT_DATE THEN 1 END)`,
      })
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(and(
        eq(alerts.market, marketType),
        eq(userAlerts.userId, userId)
      ));

    // Check Redis connection
    let redisConnected = false;
    try {
      redisConnected = redisClient.isOpen;
    } catch {
      redisConnected = false;
    }

    // Get market status for the specified market
    const marketOpen = isMarketOpen(marketType);

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        market: {
          type: marketType,
          open: marketOpen,
        },
        watchlist: {
          total: watchlistStats[0]?.total ?? 0,
          active: watchlistStats[0]?.active ?? 0,
        },
        alerts: {
          total: alertStats[0]?.total ?? 0,
          critical: alertStats[0]?.critical ?? 0,
          today: alertStats[0]?.today ?? 0,
        },
        services: {
          database: 'connected',
          redis: redisConnected ? 'connected' : 'disconnected',
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching status', { error, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system status',
    });
  }
});

/**
 * GET /api/status/cache
 * Get cache and price updater status for monitoring
 * Query params: market (optional, defaults to INDIA)
 */
router.get('/cache', async (req: Request, res: Response) => {
  try {
    const { market = 'INDIA' } = req.query;

    if (market && market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';

    const priceUpdater = getPriceUpdaterInstance();
    const updaterStatus = priceUpdater.getStatus(marketType);
    const cacheStats = await cache.getStats(marketType);

    // Calculate time since last update
    let timeSinceLastUpdate: number | null = null;
    if (updaterStatus.lastUpdateComplete) {
      timeSinceLastUpdate = Date.now() - updaterStatus.lastUpdateComplete.getTime();
    }

    // Calculate cache efficiency (estimate)
    const cacheHitRate = cacheStats.currentPricesCached ? 'high' : 'low';

    res.json({
      success: true,
      data: {
        market: marketType,
        redis: {
          connected: cacheStats.connected,
          totalKeys: cacheStats.totalKeys,
        },
        priceCache: {
          currentPricesCached: cacheStats.currentPricesCached,
          estimatedHitRate: cacheHitRate,
        },
        backgroundUpdater: {
          isUpdating: updaterStatus.isUpdating,
          lastUpdateStart: updaterStatus.lastUpdateStart,
          lastUpdateComplete: updaterStatus.lastUpdateComplete,
          lastUpdateDuration: updaterStatus.lastUpdateDuration,
          lastUpdateSymbolCount: updaterStatus.lastUpdateSymbolCount,
          timeSinceLastUpdate,
          consecutiveFailures: updaterStatus.consecutiveFailures,
          lastError: updaterStatus.lastError,
          healthStatus: updaterStatus.healthStatus,
        },
        recommendations: getHealthRecommendations(updaterStatus, cacheStats),
      },
    });
  } catch (error) {
    logger.error('Error fetching cache status', { error, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache status',
    });
  }
});

/**
 * Helper function to provide health recommendations
 */
function getHealthRecommendations(
  updaterStatus: any,
  cacheStats: any
): string[] {
  const recommendations: string[] = [];

  if (!cacheStats.connected) {
    recommendations.push('Redis is disconnected - API responses will be slower');
  }

  if (!cacheStats.currentPricesCached) {
    recommendations.push('Price cache is empty - waiting for first update or warmup');
  }

  if (updaterStatus.consecutiveFailures >= 3) {
    recommendations.push(`Background updater has ${updaterStatus.consecutiveFailures} consecutive failures - check NSE API connectivity`);
  }

  if (updaterStatus.healthStatus === 'unhealthy') {
    recommendations.push('Background updater is unhealthy - manual intervention may be required');
  }

  if (updaterStatus.lastUpdateComplete) {
    const timeSince = Date.now() - updaterStatus.lastUpdateComplete.getTime();
    if (timeSince > 10 * 60 * 1000) {
      recommendations.push('Last successful update was more than 10 minutes ago');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems operational');
  }

  return recommendations;
}

export default router;

