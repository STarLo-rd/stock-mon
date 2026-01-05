import { Router, Request, Response } from 'express';
import { db } from '../db';
import { alerts, watchlist, userAlerts } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { CacheService } from '../services/cache.service';
import { SymbolSearchService } from '../services/symbol-search.service';
import { NSEChartService } from '../services/nse-chart.service';
import { HistoricalPriceService } from '../services/historical-price.service';
import logger from '../utils/logger';

const router = Router();
const cache = new CacheService();
const symbolSearch = new SymbolSearchService();
const nseChart = new NSEChartService();
const historicalPriceService = new HistoricalPriceService();

/**
 * GET /api/symbols/search
 * Search for symbols matching query
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const searchType = type === 'INDEX' || type === 'STOCK' || type === 'MUTUAL_FUND' ? type : undefined;
    const results = await symbolSearch.searchSymbols(q, searchType);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error searching symbols', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to search symbols',
    });
  }
});

/**
 * POST /api/symbols/validate
 * Validate if a symbol exists on NSE
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, type } = req.body;

    if (!symbol || !type) {
      res.status(400).json({
        success: false,
        error: 'Symbol and type are required',
      });
      return;
    }

    if (type !== 'INDEX' && type !== 'STOCK' && type !== 'MUTUAL_FUND') {
      res.status(400).json({
        success: false,
        error: 'Type must be either INDEX, STOCK, or MUTUAL_FUND',
      });
      return;
    }

    const validation = await symbolSearch.validateSymbol(symbol, type);

    res.json({
      success: true,
      valid: validation.valid,
      error: validation.error,
    });
  } catch (error) {
    logger.error('Error validating symbol', { error, symbol: req.body.symbol, type: req.body.type });
    res.status(500).json({
      success: false,
      error: 'Failed to validate symbol',
    });
  }
});

/**
 * GET /api/symbols/:symbol
 * Get symbol details with current price and basic info
 *
 * Optimized with caching:
 * - Current price from cache (instant)
 * - Historical prices from HistoricalPriceService (Redis + API fallback)
 */
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    // Get watchlist entry
    const watchlistEntry = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.symbol, symbol))
      .limit(1);

    if (watchlistEntry.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Symbol not found in watchlist',
      });
    }

    // Get market from watchlist entry
    const market = watchlistEntry[0].market as 'INDIA' | 'USA';
    const isIndex = watchlistEntry[0].type === 'INDEX';

    // Get current price from cache (fast)
    // First try: Check current prices cache (where price updater stores all prices)
    let currentPrice: number | null = null;
    let priceSource: string = 'CACHE';
    
    const currentPricesMap = await cache.getCurrentPrices(market);
    if (currentPricesMap && currentPricesMap.has(symbol)) {
      const priceData = currentPricesMap.get(symbol);
      if (priceData && priceData.price > 0) {
        currentPrice = priceData.price;
        priceSource = 'CACHE';
      }
    }

    // Second try: Check individual latest price cache
    if (currentPrice === null) {
      currentPrice = await cache.getLatestPrice(symbol, market);
      if (currentPrice !== null) {
        priceSource = 'CACHE';
      }
    }

    // Third try: Fetch from API (for indices, use NSE API; for stocks, use Yahoo)
    if (currentPrice === null) {
      const { ApiFactoryService } = await import('../services/api-factory.service');
      const apiFactory = new ApiFactoryService();
      const priceData = await apiFactory.getPrice(symbol, isIndex, market);
      
      if (priceData && priceData.price > 0) {
        currentPrice = priceData.price;
        priceSource = 'API';
        
        // Cache it for next time
        await cache.setLatestPrice(symbol, currentPrice, market);
      }
    }

    // Get historical prices from the new HistoricalPriceService
    // This uses Redis cache with API fallback (NSE/Yahoo)
    const historicalPrices = await historicalPriceService.getHistoricalPrices(symbol, market);

    // Last resort: Use "day" historical price as current price (for indices that might not have live data)
    if (currentPrice === null) {
      if (historicalPrices.day !== null && historicalPrices.day > 0) {
        currentPrice = historicalPrices.day;
        priceSource = 'HISTORICAL_DAY';
      }
    }

    res.json({
      success: true,
      data: {
        symbol: watchlistEntry[0].symbol,
        name: watchlistEntry[0].name ?? undefined,
        market: watchlistEntry[0].market,
        exchange: watchlistEntry[0].exchange,
        type: watchlistEntry[0].type,
        active: watchlistEntry[0].active,
        currentPrice,
        priceSource,
        historicalPrices,
      },
    });
  } catch (error) {
    logger.error('Error fetching symbol details', { error, symbol: req.params.symbol });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symbol details',
    });
  }
});

/**
 * GET /api/symbols/:symbol/prices
 * Get price history for charting
 *
 * Fetches from NSE API (cached 15 min) with fallback to daily_snapshots
 */
router.get('/:symbol/prices', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1M' } = req.query;

    logger.debug(`Fetching chart data for ${symbol}`, { symbol, timeframe });

    // Fetch from NSE API (with Redis caching)
    const chartData = await nseChart.getChartData(symbol, timeframe as string);

    if (chartData.length === 0) {
      logger.debug(`No data available for ${symbol}`, { symbol, timeframe });
      return res.json({
        success: true,
        data: [],
        source: 'none',
        message: 'No chart data available for this symbol/timeframe',
      });
    }

    res.json({
      success: true,
      data: chartData,
      source: 'nse_api', // Indicates data is from NSE API
      count: chartData.length,
      timeframe: timeframe,
    });
  } catch (error) {
    logger.error('Error fetching chart data', { error, symbol: req.params.symbol, timeframe: req.query.timeframe });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data',
    });
  }
});

/**
 * GET /api/symbols/:symbol/alerts
 * Get alerts for a specific symbol (user-scoped)
 * Requires authentication - only returns alerts for the authenticated user
 */
router.get('/:symbol/alerts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol } = req.params;
    const { limit = '50' } = req.query;

    // Join with user_alerts to only return alerts for this user
    const results = await db
      .select({
        id: alerts.id,
        symbol: alerts.symbol,
        market: alerts.market,
        dropPercentage: alerts.dropPercentage,
        threshold: alerts.threshold,
        timeframe: alerts.timeframe,
        price: alerts.price,
        historicalPrice: alerts.historicalPrice,
        timestamp: alerts.timestamp,
        critical: alerts.critical,
        notified: userAlerts.notified,
        read: userAlerts.read,
        dismissed: userAlerts.dismissed,
      })
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(and(
        eq(alerts.symbol, symbol),
        eq(userAlerts.userId, userId)
      ))
      .orderBy(desc(alerts.timestamp))
      .limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error fetching symbol alerts', { error, symbol: req.params.symbol, userId: req.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symbol alerts',
    });
  }
});

export default router;

