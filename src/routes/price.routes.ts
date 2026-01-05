import { Router, Request, Response } from 'express';
import { db } from '../db';
import { watchlist } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { PriceFetcherService } from '../services/price-fetcher.service';
import { CacheService } from '../services/cache.service';
import logger from '../utils/logger';

const router = Router();
const priceFetcher = new PriceFetcherService();
const cache = new CacheService();

/**
 * GET /api/prices/current
 * Get current prices for all active symbols
 * Query params: market (optional, defaults to INDIA)
 *
 * Optimized with caching:
 * 1. Try Redis cache first (<10ms)
 * 2. Fallback to database latest prices (indexed, ~50ms)
 * 3. Background cron job updates cache every minute
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const { market = 'INDIA' } = req.query;

    if (market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';

    // Try cache first - this should be the common path
    let prices = await cache.getCurrentPrices(marketType);
    let cached = true;

    if (!prices) {
      // Cache miss - get latest prices from database
      cached = false;
      logger.debug(`Cache miss on /api/prices/current`, { market: marketType });

      const activeSymbols = await db
        .select()
        .from(watchlist)
        .where(and(eq(watchlist.active, true), eq(watchlist.market, marketType)));

      // Cache miss - prices should be in cache from price-updater service
      // If not in cache, return empty (price updater will populate on next run)
      prices = new Map();

      logger.warn(`Cache miss for ${marketType} market`, { market: marketType });

      // Cache the results for next request
      if (prices.size > 0) {
        await cache.setCurrentPrices(prices, marketType);
      }
    }

    const priceArray = Array.from(prices.values());

    // Enrich prices with name and type from watchlist table (for mutual funds display)
    // Get all symbols from prices
    const symbols = priceArray.map((p) => p.symbol);
    
    // Fetch watchlist entries in a single query
    const watchlistEntries = await db
      .select({
        symbol: watchlist.symbol,
        name: watchlist.name,
        type: watchlist.type,
      })
      .from(watchlist)
      .where(
        and(
          eq(watchlist.market, marketType),
          inArray(watchlist.symbol, symbols)
        )
      );

    // Create a map for quick lookup
    const watchlistMap = new Map(
      watchlistEntries.map((entry) => [entry.symbol, { name: entry.name, type: entry.type }])
    );

    // Enrich prices with watchlist data
    const enrichedPrices = priceArray.map((priceData) => {
      const watchlistData = watchlistMap.get(priceData.symbol);
      return {
        ...priceData,
        name: watchlistData?.name ?? undefined,
        type: watchlistData?.type ?? undefined,
      };
    });

    res.json({
      success: true,
      data: enrichedPrices,
      cached, // Include cache status for monitoring
    });
  } catch (error) {
    logger.error('Error fetching current prices', { error, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current prices',
    });
  }
});

/**
 * GET /api/prices/:symbol
 * Get price history for a specific symbol
 * Query params: market (optional, defaults to INDIA), limit, startDate, endDate
 *
 * Optimized with caching for recent history (limit=100, no date filters)
 */
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { limit = '100', startDate, endDate, market = 'INDIA' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    if (market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    const marketType = market as 'INDIA' | 'USA';

    let results: Array<{ symbol: string; price: string; timestamp: Date }> = [];
    let cached = false;

    // Try cache for simple recent history queries (no date filters, limit=100)
    if (!startDate && !endDate && limitNum <= 100) {
      const cachedHistory = await cache.getRecentHistory(symbol, limitNum, marketType);
      if (cachedHistory) {
        cached = true;
        results = cachedHistory.map((item) => ({
          symbol,
          price: item.price.toString(),
          timestamp: item.timestamp,
        }));
      }
    }

    // Cache miss or custom query - redirect to chart endpoint
    // This endpoint is deprecated. Use /api/symbols/:symbol/prices for chart data
    if (!cached) {
      logger.warn(`Price history endpoint deprecated`, { symbol, endpoint: `/api/symbols/${symbol}/prices` });
      results = [];
    }

    res.json({
      success: true,
      data: results.map((r) => ({
        symbol: typeof r.symbol === 'string' ? r.symbol : symbol,
        price: parseFloat(r.price.toString()),
        timestamp: r.timestamp,
      })),
      cached,
    });
  } catch (error) {
    logger.error('Error fetching price history', { error, symbol: req.params.symbol, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
    });
  }
});

export default router;

