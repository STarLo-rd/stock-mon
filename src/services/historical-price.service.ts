import { redisClient } from '../utils/redis.client';
import axios from 'axios';
import { MutualFundApiService } from './mutual-fund-api.service';

/**
 * Historical Price Service - Redis-only with API fallback
 * Simplified approach: No PostgreSQL, just cache + live API calls
 */
export class HistoricalPriceService {
  private readonly CACHE_PREFIX = 'history:';
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours
  private mfService: MutualFundApiService;

  // NSE index name mapping
  private readonly indexNameMap: Record<string, string> = {
    'NIFTY50': 'NIFTY 50',
    'NIFTYBANK': 'NIFTY BANK',
    'NIFTYMIDCAP': 'NIFTY MIDCAP 100',
    'NIFTYSMLCAP': 'NIFTY SMALLCAP 100',
    'NIFTYSMALLCAP50': 'NIFTY SMALLCAP 50',
    'NIFTYIT': 'NIFTY IT',
    'NIFTYAUTO': 'NIFTY AUTO',
    'NIFTYFMCG': 'NIFTY FMCG',
    'NIFTYMETAL': 'NIFTY METAL',
    'NIFTYPHARMA': 'NIFTY PHARMA',
    'NIFTYPSU': 'NIFTY PSU BANK',
    'NIFTYREALTY': 'NIFTY REALTY',
    'NIFTYMICROCAP250': 'NIFTY MICROCAP 250',
  };

  constructor() {
    this.mfService = new MutualFundApiService();
  }

  /**
   * Check if symbol is a mutual fund scheme code
   */
  private isMutualFundSymbol(symbol: string): boolean {
    return /^\d+$/.test(symbol);
  }

  /**
   * Get historical prices for a symbol (day, week, month, 3-month, 6-month, year ago)
   * Uses Redis cache with API fallback
   * @param symbol - Stock/index symbol
   * @param market - Market type (INDIA or USA), defaults to INDIA
   * @returns Historical prices or null if not available
   */
  async getHistoricalPrices(symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{
    day: number | null;
    week: number | null;
    month: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    year: number | null;
  }> {
    // Try to get from Redis cache first
    const cached = await this.getFromCache(symbol, market);
    if (cached) {
      console.log(`[HistoricalPrice] Cache hit for ${symbol} (${market})`);
      return cached;
    }

    console.log(`[HistoricalPrice] Cache miss for ${symbol} (${market}), fetching from API...`);

    // Fetch from appropriate API based on market
    let prices;
    if (market === 'USA') {
      // USA market: Use Yahoo Finance exclusively
      prices = await this.fetchFromYahoo(symbol);
    } else {
      // INDIA market: Check if mutual fund, then NSE for indices, Yahoo for stocks
      if (this.isMutualFundSymbol(symbol)) {
        prices = await this.fetchFromMutualFund(symbol);
      } else {
        const isIndex = this.isIndexSymbol(symbol);
        prices = isIndex
          ? await this.fetchFromNSE(symbol)
          : await this.fetchFromYahoo(symbol);
      }
    }

    // Cache the results
    if (prices) {
      await this.saveToCache(symbol, prices, market);
    }

    return prices ?? { day: null, week: null, month: null, threeMonth: null, sixMonth: null, year: null };
  }

  /**
   * Warm cache for all symbols (called by daily cron)
   * @param symbols - Array of symbols to warm cache for
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  async warmCache(symbols: Array<{ symbol: string; isIndex: boolean }>, market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
    console.log(`[HistoricalPrice] Warming cache for ${symbols.length} symbols (${market})...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const { symbol, isIndex } of symbols) {
      try {
        let prices;
        if (market === 'USA') {
          // USA market: Use Yahoo Finance exclusively
          prices = await this.fetchFromYahoo(symbol);
        } else {
          // INDIA market: Check if mutual fund, then NSE for indices, Yahoo for stocks
          if (this.isMutualFundSymbol(symbol)) {
            prices = await this.fetchFromMutualFund(symbol);
          } else {
            prices = isIndex
              ? await this.fetchFromNSE(symbol)
              : await this.fetchFromYahoo(symbol);
          }
        }

        if (prices) {
          await this.saveToCache(symbol, prices, market);
          successCount++;
          console.log(`[HistoricalPrice] ✓ Cached ${symbol} (${market})`);
        } else {
          failCount++;
          console.warn(`[HistoricalPrice] ✗ No data for ${symbol} (${market})`);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        failCount++;
        console.error(`[HistoricalPrice] Error warming cache for ${symbol} (${market}):`, error instanceof Error ? error.message : 'Unknown');
      }
    }

    console.log(`[HistoricalPrice] Cache warm complete for ${market}: ${successCount} success, ${failCount} failed`);
  }

  /**
   * Get cached historical prices from Redis
   * @param symbol - Stock/index symbol
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  private async getFromCache(symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{
    day: number | null;
    week: number | null;
    month: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    year: number | null;
  } | null> {
    try {
      const keys = ['day', 'week', 'month', 'threeMonth', 'sixMonth', 'year'];
      const promises = keys.map((timeframe) =>
        redisClient.get(`${this.CACHE_PREFIX}${market}:${symbol}:${timeframe}`)
      );

      const results = await Promise.all(promises);

      // If any key is missing, return null (will trigger API fetch)
      if (results.some((r) => r === null)) {
        return null;
      }

      return {
        day: results[0] ? parseFloat(results[0]) : null,
        week: results[1] ? parseFloat(results[1]) : null,
        month: results[2] ? parseFloat(results[2]) : null,
        threeMonth: results[3] ? parseFloat(results[3]) : null,
        sixMonth: results[4] ? parseFloat(results[4]) : null,
        year: results[5] ? parseFloat(results[5]) : null,
      };
    } catch (error) {
      console.error(`[HistoricalPrice] Cache read error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Save historical prices to Redis cache
   * @param symbol - Stock/index symbol
   * @param prices - Historical prices object
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  private async saveToCache(
    symbol: string,
    prices: {
      day: number | null;
      week: number | null;
      month: number | null;
      threeMonth: number | null;
      sixMonth: number | null;
      year: number | null;
    },
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<void> {
    try {
      const promises: Promise<string | null>[] = [];

      if (prices.day !== null) {
        promises.push(
          redisClient.setEx(
            `${this.CACHE_PREFIX}${market}:${symbol}:day`,
            this.CACHE_TTL,
            prices.day.toString()
          )
        );
      }

      if (prices.week !== null) {
        promises.push(
          redisClient.setEx(
            `${this.CACHE_PREFIX}${market}:${symbol}:week`,
            this.CACHE_TTL,
            prices.week.toString()
          )
        );
      }

      if (prices.month !== null) {
        promises.push(
          redisClient.setEx(
            `${this.CACHE_PREFIX}${market}:${symbol}:month`,
            this.CACHE_TTL,
            prices.month.toString()
          )
        );
      }

      if (prices.threeMonth !== null) {
        promises.push(
          redisClient.setEx(
            `${this.CACHE_PREFIX}${market}:${symbol}:threeMonth`,
            this.CACHE_TTL,
            prices.threeMonth.toString()
          )
        );
      }

      if (prices.sixMonth !== null) {
        promises.push(
          redisClient.setEx(
            `${this.CACHE_PREFIX}${market}:${symbol}:sixMonth`,
            this.CACHE_TTL,
            prices.sixMonth.toString()
          )
        );
      }

      if (prices.year !== null) {
        promises.push(
          redisClient.setEx(
            `${this.CACHE_PREFIX}${market}:${symbol}:year`,
            this.CACHE_TTL,
            prices.year.toString()
          )
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error(`[HistoricalPrice] Cache write error for ${symbol}:`, error);
    }
  }

  /**
   * Fetch historical prices from NSE API (for indices)
   */
  private async fetchFromNSE(symbol: string): Promise<{
    day: number | null;
    week: number | null;
    month: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    year: number | null;
  } | null> {
    try {
      const nseSymbol = this.indexNameMap[symbol] ?? symbol;

      // Fetch 1 year of data from NSE
      const response = await axios.get(
        'https://www.nseindia.com/api/NextApi/apiClient/historicalGraph',
        {
          params: {
            functionName: 'getGraphChart',
            type: nseSymbol,
            flag: '1Y', // Get 1 year data
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.nseindia.com/',
          },
          timeout: 10000,
        }
      );

      const graphData = response.data?.data?.grapthData; // NSE has typo
      if (!graphData || !Array.isArray(graphData) || graphData.length === 0) {
        console.warn(`[HistoricalPrice] No NSE data for ${symbol}`);
        return null;
      }

      // Parse data: [[timestamp_ms, price, "NM"], ...]
      const prices = graphData.map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp),
        price,
      }));

      // Find closest prices for each timeframe
      return this.extractHistoricalPrices(prices);
    } catch (error) {
      console.error(`[HistoricalPrice] NSE fetch error for ${symbol}:`, error instanceof Error ? error.message : 'Unknown');
      return null;
    }
  }

  /**
   * Fetch historical prices from Yahoo Finance (for stocks)
   */
  private async fetchFromYahoo(symbol: string): Promise<{
    day: number | null;
    week: number | null;
    month: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    year: number | null;
  } | null> {
    try {
      const yahooSymbol = `${symbol}.NS`;

      // Fetch 1 year of data
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 400); // Get extra data for safety

      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          params: {
            period1,
            period2,
            interval: '1d',
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          },
          timeout: 10000,
        }
      );

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        console.warn(`[HistoricalPrice] No Yahoo data for ${symbol}`);
        return null;
      }

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      if (timestamps.length === 0 || closes.length === 0) {
        console.warn(`[HistoricalPrice] Empty Yahoo data for ${symbol}`);
        return null;
      }

      // Parse data
      const prices = timestamps
        .map((timestamp: number, index: number) => {
          const close = closes[index];
          if (close === null || close === undefined) {
            return null;
          }
          return {
            date: new Date(timestamp * 1000),
            price: close,
          };
        })
        .filter((p: { date: Date; price: number } | null): p is { date: Date; price: number } => p !== null);

      // Find closest prices for each timeframe
      return this.extractHistoricalPrices(prices);
    } catch (error) {
      console.error(`[HistoricalPrice] Yahoo fetch error for ${symbol}:`, error instanceof Error ? error.message : 'Unknown');
      return null;
    }
  }

  /**
   * Fetch historical prices from Mutual Fund API (for mutual funds)
   */
  private async fetchFromMutualFund(symbol: string): Promise<{
    day: number | null;
    week: number | null;
    month: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    year: number | null;
  } | null> {
    try {
      const schemeCode = parseInt(symbol, 10);
      if (isNaN(schemeCode)) {
        console.warn(`[HistoricalPrice] Invalid mutual fund scheme code: ${symbol}`);
        return null;
      }

      // Fetch 1 year of NAV history
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 400); // Get extra data for safety

      const navHistory = await this.mfService.getNAVHistory(schemeCode, startDate, endDate);

      if (navHistory.length === 0) {
        console.warn(`[HistoricalPrice] No mutual fund NAV data for ${symbol}`);
        return null;
      }

      // Convert to price array format
      const prices = navHistory.map((item) => ({
        date: item.date,
        price: item.nav,
      }));

      // Find closest prices for each timeframe
      return this.extractHistoricalPrices(prices);
    } catch (error) {
      console.error(`[HistoricalPrice] Mutual fund fetch error for ${symbol}:`, error instanceof Error ? error.message : 'Unknown');
      return null;
    }
  }

  /**
   * Extract historical prices from price array
   * Finds closest prices to target dates (1d, 7d, 30d, 90d, 180d, 365d ago)
   */
  private extractHistoricalPrices(
    prices: Array<{ date: Date; price: number }>
  ): {
    day: number | null;
    week: number | null;
    month: number | null;
    threeMonth: number | null;
    sixMonth: number | null;
    year: number | null;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targets = {
      day: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      week: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      threeMonth: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      sixMonth: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000),
      year: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
    };

    const findClosest = (targetDate: Date): number | null => {
      let closest: { date: Date; price: number } | null = null;
      let minDiff = Infinity;

      for (const pricePoint of prices) {
        const diff = Math.abs(pricePoint.date.getTime() - targetDate.getTime());
        // Accept prices within 7 days tolerance
        if (diff < minDiff && diff < 7 * 24 * 60 * 60 * 1000) {
          minDiff = diff;
          closest = pricePoint;
        }
      }

      return closest?.price ?? null;
    };

    return {
      day: findClosest(targets.day),
      week: findClosest(targets.week),
      month: findClosest(targets.month),
      threeMonth: findClosest(targets.threeMonth),
      sixMonth: findClosest(targets.sixMonth),
      year: findClosest(targets.year),
    };
  }

  /**
   * Check if symbol is an index
   */
  private isIndexSymbol(symbol: string): boolean {
    return symbol.startsWith('NIFTY') || symbol.startsWith('SENSEX');
  }

  /**
   * Invalidate cache for a symbol
   */
  async invalidateCache(symbol: string): Promise<void> {
    try {
      const keys = [
        `${this.CACHE_PREFIX}${symbol}:day`,
        `${this.CACHE_PREFIX}${symbol}:week`,
        `${this.CACHE_PREFIX}${symbol}:month`,
        `${this.CACHE_PREFIX}${symbol}:threeMonth`,
        `${this.CACHE_PREFIX}${symbol}:sixMonth`,
        `${this.CACHE_PREFIX}${symbol}:year`,
      ];

      await Promise.all(keys.map((key) => redisClient.del(key)));
      console.log(`[HistoricalPrice] Invalidated cache for ${symbol}`);
    } catch (error) {
      console.error(`[HistoricalPrice] Cache invalidation error for ${symbol}:`, error);
    }
  }
}

