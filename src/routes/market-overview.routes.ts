import { Router, Request, Response } from 'express';
import { db } from '../db';
import { watchlist, alerts, recoveryTracking, watchlists, userAlerts } from '../db/schema';
import { eq, and, gte, sql, desc, inArray } from 'drizzle-orm';
import { CacheService } from '../services/cache.service';
import { HistoricalPriceService } from '../services/historical-price.service';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const router = Router();
const cache = new CacheService();
const historicalPriceService = new HistoricalPriceService();

/**
 * GET /api/market-overview/top-movers
 * Get top gainers and losers based on price changes from user's watchlists
 * Query params: market (optional, defaults to INDIA), timeframe (1D, 1W, 1M)
 * Requires authentication
 */
router.get('/top-movers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { market = 'INDIA', timeframe = '1D' } = req.query;

    if (market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';
    const timeframeStr = timeframe as string;

    // Get current prices
    const currentPrices = await cache.getCurrentPrices(marketType);
    if (!currentPrices || currentPrices.size === 0) {
      return res.json({
        success: true,
        data: {
          gainers: [],
          losers: [],
        },
      });
    }

    // Get active symbols from user's watchlists
    const activeSymbols = await db
      .select({
        symbol: watchlist.symbol,
        name: watchlist.name,
        type: watchlist.type,
        exchange: watchlist.exchange,
      })
      .from(watchlist)
      .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
      .where(and(
        eq(watchlist.active, true),
        eq(watchlist.market, marketType),
        eq(watchlists.userId, userId)
      ));

    // Calculate price changes
    const movers: Array<{
      symbol: string;
      name?: string;
      currentPrice: number;
      previousPrice: number | null;
      change: number;
      changePercent: number;
    }> = [];

    for (const symbolEntry of activeSymbols) {
      const currentPriceData = currentPrices.get(symbolEntry.symbol);
      if (!currentPriceData || !currentPriceData.price) continue;

      const currentPrice = currentPriceData.price;
      
      // Get historical price based on timeframe
      const historical = await historicalPriceService.getHistoricalPrices(
        symbolEntry.symbol,
        marketType
      );

      let previousPrice: number | null = null;
      if (timeframeStr === '1D') {
        previousPrice = historical.day;
      } else if (timeframeStr === '1W') {
        previousPrice = historical.week;
      } else if (timeframeStr === '1M') {
        previousPrice = historical.month;
      }

      if (previousPrice && previousPrice > 0) {
        const change = currentPrice - previousPrice;
        const changePercent = (change / previousPrice) * 100;

        movers.push({
          symbol: symbolEntry.symbol,
          name: symbolEntry.name ?? undefined,
          currentPrice,
          previousPrice,
          change,
          changePercent,
        });
      }
    }

    // Sort by change percent
    movers.sort((a, b) => b.changePercent - a.changePercent);

    // Get top 10 gainers and losers
    const gainers = movers.slice(0, 10);
    const losers = movers.slice(-10).reverse();

    res.json({
      success: true,
      data: {
        gainers,
        losers,
      },
    });
  } catch (error) {
    logger.error('Error fetching top movers', { error, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top movers',
    });
  }
});

/**
 * GET /api/market-overview/trends
 * Get aggregate price trends over time from user's watchlists
 * Query params: market (optional, defaults to INDIA), timeframe (1W, 1M, 3M, 6M, 1Y)
 * Requires authentication
 */
router.get('/trends', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { market = 'INDIA', timeframe = '1M' } = req.query;

    if (market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';

    // Get active symbols from user's watchlists
    const activeSymbols = await db
      .select({
        symbol: watchlist.symbol,
        name: watchlist.name,
        type: watchlist.type,
        exchange: watchlist.exchange,
      })
      .from(watchlist)
      .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
      .where(and(
        eq(watchlist.active, true),
        eq(watchlist.market, marketType),
        eq(watchlists.userId, userId)
      ));

    if (activeSymbols.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get current prices
    const currentPrices = await cache.getCurrentPrices(marketType);
    if (!currentPrices || currentPrices.size === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Calculate aggregate price index
    // Simple average of all active symbols
    let totalPrice = 0;
    let count = 0;

    for (const symbolEntry of activeSymbols) {
      const priceData = currentPrices.get(symbolEntry.symbol);
      if (priceData && priceData.price) {
        totalPrice += priceData.price;
        count++;
      }
    }

    if (count === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const currentIndex = totalPrice / count;

    // Get historical index values
    const timeframes = ['day', 'week', 'month', 'threeMonth', 'sixMonth', 'year'];
    const trends: Array<{ date: string; index: number; changePercent: number }> = [];

    for (const tf of timeframes) {
      let historicalTotal = 0;
      let historicalCount = 0;

      for (const symbolEntry of activeSymbols) {
        const priceData = currentPrices.get(symbolEntry.symbol);
        if (!priceData || !priceData.price) continue;

        const historical = await historicalPriceService.getHistoricalPrices(
          symbolEntry.symbol,
          marketType
        );

        let historicalPrice: number | null = null;
        if (tf === 'day') historicalPrice = historical.day;
        else if (tf === 'week') historicalPrice = historical.week;
        else if (tf === 'month') historicalPrice = historical.month;
        else if (tf === 'threeMonth') historicalPrice = historical.threeMonth;
        else if (tf === 'sixMonth') historicalPrice = historical.sixMonth;
        else if (tf === 'year') historicalPrice = historical.year;

        if (historicalPrice && historicalPrice > 0) {
          historicalTotal += historicalPrice;
          historicalCount++;
        }
      }

      if (historicalCount > 0) {
        const historicalIndex = historicalTotal / historicalCount;
        const changePercent = ((currentIndex - historicalIndex) / historicalIndex) * 100;

        // Calculate date
        const now = new Date();
        let date = new Date();
        if (tf === 'day') date.setDate(now.getDate() - 1);
        else if (tf === 'week') date.setDate(now.getDate() - 7);
        else if (tf === 'month') date.setMonth(now.getMonth() - 1);
        else if (tf === 'threeMonth') date.setMonth(now.getMonth() - 3);
        else if (tf === 'sixMonth') date.setMonth(now.getMonth() - 6);
        else if (tf === 'year') date.setFullYear(now.getFullYear() - 1);

        trends.push({
          date: date.toISOString().split('T')[0],
          index: historicalIndex,
          changePercent,
        });
      }
    }

    // Add current point
    trends.push({
      date: new Date().toISOString().split('T')[0],
      index: currentIndex,
      changePercent: 0,
    });

    // Sort by date
    trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Error fetching market trends', { error, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market trends',
    });
  }
});

/**
 * GET /api/market-overview/health
 * Get market health indicators based on user's alerts
 * Query params: market (optional, defaults to INDIA)
 * Requires authentication
 */
router.get('/health', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { market = 'INDIA' } = req.query;

    if (market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';

    // Get alerts from last 7 days for this user
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAlerts = await db
      .select()
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(
        and(
          eq(alerts.market, marketType),
          eq(userAlerts.userId, userId),
          gte(alerts.timestamp, sevenDaysAgo)
        )
      );

    // Calculate alert frequency (alerts per day)
    const alertFrequency = recentAlerts.length / 7;

    // Get recovery tracking data for recent alerts only
    const recentAlertIds = recentAlerts.map((a) => a.id);
    const recoveries = recentAlertIds.length > 0
      ? await db
          .select()
          .from(recoveryTracking)
          .where(
            and(
              eq(recoveryTracking.market, marketType),
              inArray(recoveryTracking.alertId, recentAlertIds)
            )
          )
      : [];

    // Calculate recovery rate (percentage of recent alerts that have recovered)
    const totalAlerts = recentAlerts.length;
    const recoveredAlerts = recoveries.filter(
      (r) => r.recoveryPercentage > 0 && parseFloat(r.recoveryPercentage.toString()) > 0
    ).length;
    const recoveryRate = totalAlerts > 0 ? (recoveredAlerts / totalAlerts) * 100 : 0;

    // Calculate volatility (standard deviation of price changes from alerts)
    const priceChanges = recentAlerts.map((a) => parseFloat(a.dropPercentage.toString()));
    let volatility = 0;
    if (priceChanges.length > 1) {
      const mean = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
      const variance =
        priceChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        priceChanges.length;
      volatility = Math.sqrt(variance);
    }

    // Market sentiment (based on recent alerts - more critical alerts = bearish)
    const criticalAlerts = recentAlerts.filter((a) => a.critical).length;
    const sentiment =
      criticalAlerts > recentAlerts.length * 0.3
        ? 'bearish'
        : criticalAlerts > recentAlerts.length * 0.1
        ? 'neutral'
        : 'bullish';

    res.json({
      success: true,
      data: {
        alertFrequency: Math.round(alertFrequency * 10) / 10, // Round to 1 decimal
        recoveryRate: Math.round(recoveryRate * 10) / 10,
        volatility: Math.round(volatility * 10) / 10,
        sentiment,
        totalAlerts: recentAlerts.length,
        criticalAlerts,
      },
    });
  } catch (error) {
    logger.error('Error fetching market health', { error, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market health',
    });
  }
});

/**
 * GET /api/market-overview/symbols-requiring-attention
 * Get symbols that require attention from user's watchlists (approaching thresholds, recent alerts, high volatility)
 * Query params: market (optional, defaults to INDIA), type (optional: INDEX, STOCK, MUTUAL_FUND)
 * Requires authentication
 */
router.get('/symbols-requiring-attention', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { market = 'INDIA', type } = req.query;

    if (market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';
    const symbolType = type as string | undefined;

    // Apply filters for active symbols from user's watchlists
    let filters = [
      eq(watchlist.active, true),
      eq(watchlist.market, marketType),
      eq(watchlists.userId, userId)
    ];
    if (symbolType && ['INDEX', 'STOCK', 'MUTUAL_FUND'].includes(symbolType)) {
      filters.push(eq(watchlist.type, symbolType));
    }

    const activeSymbols = await db
      .select({
        symbol: watchlist.symbol,
        name: watchlist.name,
        type: watchlist.type,
        exchange: watchlist.exchange,
      })
      .from(watchlist)
      .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
      .where(and(...filters));

    if (activeSymbols.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get current prices
    const currentPrices = await cache.getCurrentPrices(marketType);
    if (!currentPrices || currentPrices.size === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get recent alerts (last 24 hours) for this user
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const recentAlerts = await db
      .select()
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(
        and(
          eq(alerts.market, marketType),
          eq(userAlerts.userId, userId),
          gte(alerts.timestamp, oneDayAgo)
        )
      )
      .orderBy(desc(alerts.timestamp));

    const recentAlertSymbols = new Set(recentAlerts.map((a) => a.symbol));

    // Calculate symbols requiring attention
    const symbolsRequiringAttention: Array<{
      symbol: string;
      name?: string;
      type: string;
      currentPrice: number;
      changePercent: number;
      reason: 'approaching_threshold' | 'recent_alert' | 'high_volatility' | 'significant_move';
      details: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    const THRESHOLD_WARNING = 8; // Warn if down 8% or more
    const VOLATILITY_THRESHOLD = 5; // High volatility if daily change > 5%
    const SIGNIFICANT_MOVE = 3; // Significant if daily change > 3%

    for (const symbolEntry of activeSymbols) {
      const currentPriceData = currentPrices.get(symbolEntry.symbol);
      if (!currentPriceData || !currentPriceData.price) continue;

      const currentPrice = currentPriceData.price;

      // Get historical prices
      const historical = await historicalPriceService.getHistoricalPrices(
        symbolEntry.symbol,
        marketType
      );

      // Calculate 1-day change
      let changePercent = 0;
      if (historical.day && historical.day > 0) {
        changePercent = ((currentPrice - historical.day) / historical.day) * 100;
      }

      // Check if symbol has recent alert
      if (recentAlertSymbols.has(symbolEntry.symbol)) {
        const alert = recentAlerts.find((a) => a.symbol === symbolEntry.symbol);
        symbolsRequiringAttention.push({
          symbol: symbolEntry.symbol,
          name: symbolEntry.name ?? undefined,
          type: symbolEntry.type,
          currentPrice,
          changePercent,
          reason: 'recent_alert',
          details: alert
            ? `Crashed ${parseFloat(alert.dropPercentage.toString()).toFixed(2)}% (${alert.timeframe})`
            : 'Recent crash alert',
          severity: alert?.critical ? 'high' : 'medium',
        });
        continue;
      }

      // Check if approaching threshold
      if (changePercent <= -THRESHOLD_WARNING) {
        symbolsRequiringAttention.push({
          symbol: symbolEntry.symbol,
          name: symbolEntry.name ?? undefined,
          type: symbolEntry.type,
          currentPrice,
          changePercent,
          reason: 'approaching_threshold',
          details: `Down ${Math.abs(changePercent).toFixed(2)}% today`,
          severity: changePercent <= -15 ? 'high' : changePercent <= -10 ? 'medium' : 'low',
        });
        continue;
      }

      // Check for high volatility (large moves in either direction)
      if (Math.abs(changePercent) >= VOLATILITY_THRESHOLD) {
        symbolsRequiringAttention.push({
          symbol: symbolEntry.symbol,
          name: symbolEntry.name ?? undefined,
          type: symbolEntry.type,
          currentPrice,
          changePercent,
          reason: 'high_volatility',
          details: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% today`,
          severity: Math.abs(changePercent) >= 10 ? 'high' : 'medium',
        });
        continue;
      }

      // Check for significant moves
      if (Math.abs(changePercent) >= SIGNIFICANT_MOVE) {
        symbolsRequiringAttention.push({
          symbol: symbolEntry.symbol,
          name: symbolEntry.name ?? undefined,
          type: symbolEntry.type,
          currentPrice,
          changePercent,
          reason: 'significant_move',
          details: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% today`,
          severity: 'low',
        });
      }
    }

    // Sort by severity (high -> medium -> low) then by absolute change percent
    const severityOrder = { high: 0, medium: 1, low: 2 };
    symbolsRequiringAttention.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    });

    res.json({
      success: true,
      data: symbolsRequiringAttention,
    });
  } catch (error) {
    logger.error('Error fetching symbols requiring attention', { error, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symbols requiring attention',
    });
  }
});

export default router;

