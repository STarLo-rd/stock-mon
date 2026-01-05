import { PriceFetcherService } from './price-fetcher.service';
import { CacheService } from './cache.service';
import { PriceData } from './api-factory.service';
import logger from '../utils/logger';

/**
 * Background Price Updater Service
 *
 * Purpose: Decouple slow price fetching from fast API serving
 *
 * Architecture:
 * - Runs in background (triggered by cron every minute)
 * - Fetches prices from NSE (takes 2+ minutes)
 * - Updates database and cache atomically
 * - Pre-computes historical aggregations
 * - APIs always serve from cache (instant responses)
 */
interface MarketStatus {
  isUpdating: boolean;
  lastUpdateStart: Date | null;
  lastUpdateComplete: Date | null;
  lastUpdateDuration: number;
  lastUpdateSymbolCount: number;
  consecutiveFailures: number;
  lastError: string | null;
}

export class PriceUpdaterService {
  private priceFetcher: PriceFetcherService;
  private cache: CacheService;
  private marketStatuses: Map<'INDIA' | 'USA', MarketStatus>;

  constructor() {
    this.priceFetcher = new PriceFetcherService();
    this.cache = new CacheService();
    this.marketStatuses = new Map([
      ['INDIA', {
        isUpdating: false,
        lastUpdateStart: null,
        lastUpdateComplete: null,
        lastUpdateDuration: 0,
        lastUpdateSymbolCount: 0,
        consecutiveFailures: 0,
        lastError: null,
      }],
      ['USA', {
        isUpdating: false,
        lastUpdateStart: null,
        lastUpdateComplete: null,
        lastUpdateDuration: 0,
        lastUpdateSymbolCount: 0,
        consecutiveFailures: 0,
        lastError: null,
      }],
    ]);
  }

  /**
   * Main update cycle - called by cron every minute
   * Non-blocking: If already updating, skips this cycle
   * @param market - Market type (INDIA or USA), if not provided updates all markets
   */
  async updatePrices(market?: 'INDIA' | 'USA'): Promise<void> {
    const marketsToUpdate: Array<'INDIA' | 'USA'> = market ? [market] : ['INDIA', 'USA'];

    for (const marketType of marketsToUpdate) {
      await this.updateMarketPrices(marketType);
    }
  }

  /**
   * Update prices for a specific market
   * @param market - Market type (INDIA or USA)
   */
  private async updateMarketPrices(market: 'INDIA' | 'USA'): Promise<void> {
    const status = this.marketStatuses.get(market)!;

    // Skip if already updating (prevents overlapping updates)
    if (status.isUpdating) {
      logger.debug(`Update already in progress for ${market}, skipping this cycle`, { market });
      return;
    }

    const startTime = Date.now();
    status.isUpdating = true;
    status.lastUpdateStart = new Date();
    status.lastError = null;

    try {
      logger.info(`Starting background price update for ${market}`, {
        market,
        timestamp: status.lastUpdateStart.toISOString(),
      });

      // Step 1: Fetch fresh prices from APIs (this is the slow part - 2+ minutes)
      const prices = await this.priceFetcher.fetchAllPrices(market);

      if (prices.size === 0) {
        logger.warn(`No prices fetched for ${market}, skipping update`, { market });
        status.consecutiveFailures++;
        status.lastError = 'No prices fetched from API';
        return;
      }

      status.lastUpdateSymbolCount = prices.size;
      logger.info(`Fetched ${prices.size} symbols for ${market}`, { market, symbolCount: prices.size });

      // Step 2: Update cache atomically (makes API responses instant)
      await this.cache.setCurrentPrices(prices, market);
      logger.debug(`Updated current prices cache for ${market}`, { market });

      // Step 3: Pre-compute and cache historical aggregations in background
      // This runs async - don't block on it
      this.updateHistoricalCache(prices, market).catch((error) => {
        logger.error(`Error updating historical cache for ${market}`, { market, error });
      });

      // Success
      status.lastUpdateComplete = new Date();
      status.lastUpdateDuration = Date.now() - startTime;
      status.consecutiveFailures = 0;

      logger.info(`Update completed for ${market}`, {
        market,
        duration: `${status.lastUpdateDuration}ms`,
        symbolCount: prices.size,
      });
    } catch (error) {
      status.consecutiveFailures++;
      status.lastError = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error during price update for ${market}`, { market, error });

      // If we're failing consistently, log warning
      if (status.consecutiveFailures >= 3) {
        logger.warn(`Consecutive update failures for ${market}`, {
          market,
          consecutiveFailures: status.consecutiveFailures,
        });
      }
    } finally {
      status.isUpdating = false;
    }
  }

  /**
   * Pre-compute and cache historical prices for all symbols
   * Runs asynchronously in background - doesn't block main update
   * @param currentPrices - Map of symbol to price data
   * @param market - Market type (INDIA or USA)
   */
  private async updateHistoricalCache(currentPrices: Map<string, PriceData>, market: 'INDIA' | 'USA'): Promise<void> {
    logger.debug(`Starting historical cache update for ${market}`, { market });
    const symbols = Array.from(currentPrices.keys());
    let cachedCount = 0;

    for (const symbol of symbols) {
      try {
        // Get historical prices for all timeframes
        const historical = await this.priceFetcher.getHistoricalPricesForTimeframes(symbol, market);

        // Cache each timeframe that has data
        if (historical.day !== null) {
          await this.cache.setHistoricalPrice(symbol, 'day', historical.day, market);
          cachedCount++;
        }

        if (historical.week !== null) {
          await this.cache.setHistoricalPrice(symbol, 'week', historical.week, market);
          cachedCount++;
        }

        if (historical.month !== null) {
          await this.cache.setHistoricalPrice(symbol, 'month', historical.month, market);
          cachedCount++;
        }

        if (historical.year !== null) {
          await this.cache.setHistoricalPrice(symbol, 'year', historical.year, market);
          cachedCount++;
        }
      } catch (error) {
        logger.error(`Error caching historical prices for ${symbol}`, { symbol, market, error });
        // Continue with other symbols even if one fails
      }
    }

    logger.debug(`Historical cache update complete for ${market}`, {
      market,
      cachedCount,
      totalSymbols: symbols.length,
    });
  }

  /**
   * Force an immediate update (useful for manual triggers or testing)
   * @param market - Market type (INDIA or USA), if not provided updates all markets
   */
  async forceUpdate(market?: 'INDIA' | 'USA'): Promise<void> {
    logger.info(`Force update requested`, { market: market || 'all markets' });
    await this.updatePrices(market);
  }

  /**
   * Get current status for health checks and monitoring
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  getStatus(market: 'INDIA' | 'USA' = 'INDIA'): {
    isUpdating: boolean;
    lastUpdateStart: Date | null;
    lastUpdateComplete: Date | null;
    lastUpdateDuration: number;
    lastUpdateSymbolCount: number;
    consecutiveFailures: number;
    lastError: string | null;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const status = this.marketStatuses.get(market)!;

    // Determine health status based on failures and last update time
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (status.consecutiveFailures >= 5) {
      healthStatus = 'unhealthy';
    } else if (status.consecutiveFailures >= 2) {
      healthStatus = 'degraded';
    } else if (status.lastUpdateComplete) {
      // Check if last update was more than 10 minutes ago
      const timeSinceUpdate = Date.now() - status.lastUpdateComplete.getTime();
      if (timeSinceUpdate > 10 * 60 * 1000) {
        healthStatus = 'degraded';
      }
    }

    return {
      isUpdating: status.isUpdating,
      lastUpdateStart: status.lastUpdateStart,
      lastUpdateComplete: status.lastUpdateComplete,
      lastUpdateDuration: status.lastUpdateDuration,
      lastUpdateSymbolCount: status.lastUpdateSymbolCount,
      consecutiveFailures: status.consecutiveFailures,
      lastError: status.lastError,
      healthStatus,
    };
  }

  /**
   * Reset failure counter (useful after manual intervention)
   * @param market - Market type (INDIA or USA), if not provided resets all markets
   */
  resetFailures(market?: 'INDIA' | 'USA'): void {
    const marketsToReset: Array<'INDIA' | 'USA'> = market ? [market] : ['INDIA', 'USA'];
    
    for (const marketType of marketsToReset) {
      const status = this.marketStatuses.get(marketType)!;
      logger.info(`Resetting failure counter for ${marketType}`, { market: marketType });
      status.consecutiveFailures = 0;
      status.lastError = null;
    }
  }

  /**
   * Check if system is healthy
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  isHealthy(market: 'INDIA' | 'USA' = 'INDIA'): boolean {
    return this.getStatus(market).healthStatus === 'healthy';
  }
}

// Singleton instance for use across the application
let instance: PriceUpdaterService | null = null;

/**
 * Get singleton instance of PriceUpdaterService
 * Ensures only one updater runs across the application
 */
export function getPriceUpdaterInstance(): PriceUpdaterService {
  if (!instance) {
    instance = new PriceUpdaterService();
  }
  return instance;
}
