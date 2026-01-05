import { redisClient } from '../utils/redis.client';
import { PriceData } from './api-factory.service';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Cache Service - Redis caching layer for performance optimization
 * Provides multi-layer caching strategy for prices, historical data, and aggregations
 * NOW SUPPORTS MULTI-MARKET: India and USA markets have separate cache keys
 */
export class CacheService {
  // Cache key prefixes (will be scoped by market)
  private readonly CURRENT_PRICES_PREFIX = 'prices:current:';
  private readonly PRICE_LATEST_PREFIX = 'price:latest:';
  private readonly HISTORY_PREFIX = 'history:';
  private readonly HISTORY_RECENT_PREFIX = 'history:recent:';
  private readonly MARKET_STATUS_PREFIX = 'market:status:';

  // TTLs (in seconds)
  // Current prices: 72 hours (3 days) - covers weekends, last closing prices always available
  private readonly CURRENT_PRICES_TTL = 259200; // 72 hours
  // Latest price: 24 hours - individual symbol cache
  private readonly PRICE_LATEST_TTL = 86400; // 24 hours
  private readonly HISTORY_DAY_TTL = 3600; // 1 hour
  private readonly HISTORY_WEEK_TTL = 21600; // 6 hours
  private readonly HISTORY_MONTH_TTL = 86400; // 24 hours
  private readonly HISTORY_YEAR_TTL = 86400; // 24 hours
  private readonly HISTORY_RECENT_TTL = 900; // 15 minutes
  private readonly MARKET_STATUS_TTL = 60; // 1 minute

  /**
   * Get cache key for current prices
   */
  private getCurrentPricesKey(market: 'INDIA' | 'USA'): string {
    return `${this.CURRENT_PRICES_PREFIX}${market}`;
  }

  /**
   * Get cache key for latest price
   */
  private getPriceLatestKey(symbol: string, market: 'INDIA' | 'USA'): string {
    return `${this.PRICE_LATEST_PREFIX}${market}:${symbol}`;
  }

  /**
   * Get cache key for historical price
   */
  private getHistoryKey(symbol: string, market: 'INDIA' | 'USA', timeframe: string): string {
    return `${this.HISTORY_PREFIX}${market}:${symbol}:${timeframe}`;
  }

  /**
   * Get cache key for recent history
   */
  private getHistoryRecentKey(symbol: string, market: 'INDIA' | 'USA'): string {
    return `${this.HISTORY_RECENT_PREFIX}${market}:${symbol}`;
  }

  /**
   * Get cache key for market status
   */
  private getMarketStatusKey(market: 'INDIA' | 'USA'): string {
    return `${this.MARKET_STATUS_PREFIX}${market}`;
  }

  /**
   * Get all current prices from cache
   * @param market - Market type (INDIA or USA)
   * @returns Map of symbol to PriceData or null if cache miss
   */
  async getCurrentPrices(market: 'INDIA' | 'USA' = 'INDIA'): Promise<Map<string, PriceData> | null> {
    try {
      const key = this.getCurrentPricesKey(market);
      const cached = await redisClient.get(key);
      if (!cached) {
        logger.debug(`Cache miss: current prices for ${market}`, { market });
        return null;
      }

      const data = JSON.parse(cached);
      const pricesMap = new Map<string, PriceData>();

      // Convert object back to Map
      for (const [symbol, priceData] of Object.entries(data as Record<string, PriceData>)) {
        pricesMap.set(symbol, priceData);
      }

      logger.debug(`Cache hit: current prices for ${market}`, { market, symbolCount: pricesMap.size });
      return pricesMap;
    } catch (error) {
      logger.error(`Error getting current prices from cache for ${market}`, { market, error });
      return null; // Fail gracefully
    }
  }

  /**
   * Set all current prices in cache
   * @param prices - Map of symbol to PriceData
   * @param market - Market type (INDIA or USA)
   */
  async setCurrentPrices(prices: Map<string, PriceData>, market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
    try {
      // Convert Map to object for JSON serialization
      const obj = Object.fromEntries(prices);
      const key = this.getCurrentPricesKey(market);

      await redisClient.setEx(
        key,
        this.CURRENT_PRICES_TTL,
        JSON.stringify(obj)
      );

      logger.debug(`Cached current prices for ${market}`, { market, symbolCount: prices.size });
    } catch (error) {
      logger.error(`Error setting current prices in cache for ${market}`, { market, error });
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Invalidate current prices cache
   * @param market - Market type (INDIA or USA)
   */
  async invalidateCurrentPrices(market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
    try {
      const key = this.getCurrentPricesKey(market);
      await redisClient.del(key);
      logger.debug(`Invalidated current prices cache for ${market}`, { market });
    } catch (error) {
      logger.error(`Error invalidating current prices for ${market}`, { market, error });
    }
  }

  /**
   * Get latest price for a specific symbol
   * @param symbol - Stock/index symbol
   * @param market - Market type (INDIA or USA)
   * @returns Price number or null if cache miss
   */
  async getLatestPrice(symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<number | null> {
    try {
      const key = this.getPriceLatestKey(symbol, market);
      const cached = await redisClient.get(key);

      if (!cached) {
        return null;
      }

      return parseFloat(cached);
    } catch (error) {
      logger.error(`Error getting latest price for ${symbol}`, { symbol, market, error });
      return null;
    }
  }

  /**
   * Set latest price for a symbol
   * @param symbol - Stock/index symbol
   * @param price - Price value
   * @param market - Market type (INDIA or USA)
   */
  async setLatestPrice(symbol: string, price: number, market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
    try {
      const key = this.getPriceLatestKey(symbol, market);
      await redisClient.setEx(key, this.PRICE_LATEST_TTL, price.toString());
    } catch (error) {
      logger.error(`Error setting latest price for ${symbol}`, { symbol, market, error });
    }
  }

  /**
   * Get historical price for a symbol at a specific timeframe
   * @param symbol - Stock/index symbol
   * @param timeframe - 'day' | 'week' | 'month' | 'year'
   * @param market - Market type (INDIA or USA)
   * @returns Price or null if cache miss
   */
  async getHistoricalPrice(
    symbol: string,
    timeframe: 'day' | 'week' | 'month' | 'year',
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<number | null> {
    try {
      const key = this.getHistoryKey(symbol, market, timeframe);
      const cached = await redisClient.get(key);

      if (!cached) {
        return null;
      }

      return parseFloat(cached);
    } catch (error) {
      logger.error(`Error getting historical price for ${symbol}`, { symbol, timeframe, market, error });
      return null;
    }
  }

  /**
   * Set historical price for a symbol at a specific timeframe
   * @param symbol - Stock/index symbol
   * @param timeframe - 'day' | 'week' | 'month' | 'year'
   * @param price - Price value
   * @param market - Market type (INDIA or USA)
   */
  async setHistoricalPrice(
    symbol: string,
    timeframe: 'day' | 'week' | 'month' | 'year',
    price: number,
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<void> {
    try {
      const key = this.getHistoryKey(symbol, market, timeframe);
      let ttl: number;

      switch (timeframe) {
        case 'day':
          ttl = this.HISTORY_DAY_TTL;
          break;
        case 'week':
          ttl = this.HISTORY_WEEK_TTL;
          break;
        case 'month':
          ttl = this.HISTORY_MONTH_TTL;
          break;
        case 'year':
          ttl = this.HISTORY_YEAR_TTL;
          break;
      }

      await redisClient.setEx(key, ttl, price.toString());
    } catch (error) {
      logger.error(`Error setting historical price for ${symbol}`, { symbol, timeframe, market, error });
    }
  }

  /**
   * Batch set historical prices for multiple symbols
   * @param data - Map of symbol to Map of timeframe to price
   * @param market - Market type (INDIA or USA)
   */
  async batchSetHistoricalPrices(
    data: Map<string, Map<string, number>>,
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<void> {
    try {
      for (const [symbol, timeframes] of data.entries()) {
        for (const [timeframe, price] of timeframes.entries()) {
          if (['day', 'week', 'month', 'year'].includes(timeframe)) {
            await this.setHistoricalPrice(
              symbol,
              timeframe as 'day' | 'week' | 'month' | 'year',
              price,
              market
            );
          }
        }
      }
    } catch (error) {
      logger.error(`Error batch setting historical prices for ${market}`, { market, error });
    }
  }

  /**
   * Get recent price history for a symbol
   * @param symbol - Stock/index symbol
   * @param limit - Number of recent prices to return
   * @param market - Market type (INDIA or USA)
   * @returns Array of price points or null if cache miss
   */
  async getRecentHistory(
    symbol: string,
    limit: number = 100,
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<Array<{ price: number; timestamp: Date }> | null> {
    try {
      const key = this.getHistoryRecentKey(symbol, market);
      const cached = await redisClient.get(key);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      return data.slice(0, limit).map((item: any) => ({
        price: item.price,
        timestamp: new Date(item.timestamp),
      }));
    } catch (error) {
      logger.error(`Error getting recent history for ${symbol}`, { symbol, market, error });
      return null;
    }
  }

  /**
   * Set recent price history for a symbol
   * @param symbol - Stock/index symbol
   * @param history - Array of price points
   * @param market - Market type (INDIA or USA)
   */
  async setRecentHistory(
    symbol: string,
    history: Array<{ price: number; timestamp: Date }>,
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<void> {
    try {
      const key = this.getHistoryRecentKey(symbol, market);
      await redisClient.setEx(
        key,
        this.HISTORY_RECENT_TTL,
        JSON.stringify(history)
      );
    } catch (error) {
      logger.error(`Error setting recent history for ${symbol}`, { symbol, market, error });
    }
  }

  /**
   * Get market open/closed status
   * @param market - Market type (INDIA or USA)
   * @returns Market status or null if cache miss
   */
  async getMarketStatus(market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ open: boolean; lastUpdate: Date } | null> {
    try {
      const key = this.getMarketStatusKey(market);
      const cached = await redisClient.get(key);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      return {
        open: data.open,
        lastUpdate: new Date(data.lastUpdate),
      };
    } catch (error) {
      logger.error(`Error getting market status from cache for ${market}`, { market, error });
      return null;
    }
  }

  /**
   * Set market open/closed status
   * @param open - Is market currently open
   * @param market - Market type (INDIA or USA)
   */
  async setMarketStatus(open: boolean, market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
    try {
      const data = {
        open,
        lastUpdate: new Date().toISOString(),
      };

      const key = this.getMarketStatusKey(market);
      await redisClient.setEx(
        key,
        this.MARKET_STATUS_TTL,
        JSON.stringify(data)
      );
    } catch (error) {
      logger.error(`Error setting market status for ${market}`, { market, error });
    }
  }

  /**
   * Warm cache on startup by fetching from NSE/Yahoo APIs
   * This ensures cache hits immediately after server start (no waiting for cron)
   * @param market - Market type (INDIA or USA) - if not provided, warms both markets
   */
  async warmCache(market?: 'INDIA' | 'USA'): Promise<void> {
    try {
      logger.info(`Starting cache warmup`, { market: market || 'all markets' });

      // Import services dynamically to avoid circular dependencies
      const { getPriceUpdaterInstance } = await import('../services/price-updater.service');

      // Determine which markets to warm
      const marketsToWarm: Array<'INDIA' | 'USA'> = market ? [market] : ['INDIA', 'USA'];

      for (const currentMarket of marketsToWarm) {
        logger.info(`Warming cache for ${currentMarket} market`, { market: currentMarket });

        try {
          // Trigger immediate price update for this market
          const priceUpdater = getPriceUpdaterInstance();
          await priceUpdater.updatePrices(currentMarket);
          logger.info(`Cache warmed for ${currentMarket} market`, { market: currentMarket });
        } catch (error) {
          logger.error(`Failed to warm cache for ${currentMarket}`, {
            market: currentMarket,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with next market even if one fails
        }
      }

      logger.info('Cache warmup completed');
    } catch (error) {
      logger.error('Error in warmCache', { error });
      // Don't throw - startup should continue even if cache warmup fails
    }
  }

  /**
   * Invalidate cache for a specific symbol
   * @param symbol - Stock/index symbol
   * @param market - Market type (INDIA or USA)
   */
  async invalidateSymbol(symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
    try {
      const keys = [
        this.getPriceLatestKey(symbol, market),
        this.getHistoryKey(symbol, market, 'day'),
        this.getHistoryKey(symbol, market, 'week'),
        this.getHistoryKey(symbol, market, 'month'),
        this.getHistoryKey(symbol, market, 'year'),
        this.getHistoryRecentKey(symbol, market),
      ];

      await Promise.all(keys.map((key) => redisClient.del(key)));
      logger.debug(`Invalidated cache for symbol`, { symbol, market });
    } catch (error) {
      logger.error(`Error invalidating cache for ${symbol}`, { symbol, market, error });
    }
  }

  /**
   * Invalidate all caches for a specific market or all markets
   * @param market - Market type (INDIA or USA) - if not provided, invalidates all markets
   */
  async invalidateAll(market?: 'INDIA' | 'USA'): Promise<void> {
    try {
      // Get all our cache keys
      const patterns = market
        ? [
            `prices:current:${market}`,
            `price:latest:${market}:*`,
            `history:${market}:*`,
            `market:status:${market}`,
          ]
        : [
            'prices:*',
            'price:*',
            'history:*',
            'market:*',
          ];

      for (const pattern of patterns) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key)));
        }
      }

      logger.info(`Invalidated all caches`, { market: market || 'all markets' });
    } catch (error) {
      logger.error('Error invalidating all caches', { error });
    }
  }

  /**
   * Get cache statistics for monitoring
   * @param market - Market type (INDIA or USA)
   * @returns Cache stats object
   */
  async getStats(market: 'INDIA' | 'USA' = 'INDIA'): Promise<{
    connected: boolean;
    currentPricesCached: boolean;
    totalKeys: number;
    market: string;
  }> {
    try {
      const currentPricesKey = this.getCurrentPricesKey(market);
      const currentPrices = await redisClient.get(currentPricesKey);
      const allKeys = await redisClient.keys(`*${market}*`);

      return {
        connected: redisClient.isOpen,
        currentPricesCached: currentPrices !== null,
        totalKeys: allKeys.length,
        market,
      };
    } catch (error) {
      logger.error(`Error getting cache stats for ${market}`, { market, error });
      return {
        connected: false,
        currentPricesCached: false,
        totalKeys: 0,
        market,
      };
    }
  }
}
