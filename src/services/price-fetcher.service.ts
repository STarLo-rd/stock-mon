import { db } from '../db';
import { watchlist } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { ApiFactoryService, PriceData } from './api-factory.service';
import axios from 'axios';
import { config } from '../config';

export interface HistoricalPrice {
  symbol: string;
  price: number;
  timestamp: Date;
}

/**
 * Service for fetching and storing stock/index prices
 */
export class PriceFetcherService {
  private apiFactory: ApiFactoryService;

  constructor() {
    this.apiFactory = new ApiFactoryService();
  }

  /**
   * Fetch current prices for all active symbols in watchlist
   * @param market - Market type (INDIA or USA), if not provided fetches all markets
   */
  async fetchAllPrices(market?: 'INDIA' | 'USA'): Promise<Map<string, PriceData>> {
    const conditions = [eq(watchlist.active, true)];
    
    if (market) {
      conditions.push(eq(watchlist.market, market));
    }

    const activeSymbols = await db
      .select()
      .from(watchlist)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    if (activeSymbols.length === 0) {
      return new Map();
    }

    // Group symbols by market for efficient batch fetching
    const symbolsByMarket = new Map<'INDIA' | 'USA', Array<{ symbol: string; isIndex: boolean }>>();
    
    for (const symbolEntry of activeSymbols) {
      const marketType = symbolEntry.market as 'INDIA' | 'USA';
      if (!symbolsByMarket.has(marketType)) {
        symbolsByMarket.set(marketType, []);
      }
      symbolsByMarket.get(marketType)!.push({
        symbol: symbolEntry.symbol,
        isIndex: symbolEntry.type === 'INDEX',
      });
    }

    // Fetch prices for each market
    const pricesMap = new Map<string, PriceData>();
    
    for (const [marketType, symbols] of symbolsByMarket) {
      const batchPrices = await this.apiFactory.getBatchPrices(symbols, marketType);
      
      for (const [symbol, priceData] of batchPrices) {
        pricesMap.set(symbol, priceData);
      }
    }

    return pricesMap;
  }


  /**
   * Get historical price for a symbol at a specific time
   * @param symbol - Stock/index symbol
   * @param targetDate - Target date to get price for
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  async getHistoricalPrice(symbol: string, targetDate: Date, market: 'INDIA' | 'USA' = 'INDIA'): Promise<number | null> {
    try {
      // Use Yahoo Finance for historical prices
      if (market !== 'INDIA') {
        console.warn(`[PriceFetcher] Yahoo Finance only supports INDIA market for now`);
        return null;
      }

      // Skip Yahoo Finance for indices
      if (symbol.startsWith('NIFTY') || symbol.startsWith('SENSEX')) {
        console.warn(`[PriceFetcher] Yahoo Finance doesn't support indices: ${symbol}`);
        return null;
      }

      const yahooSymbol = `${symbol}.NS`;

      // Fetch a small range around the target date (±7 days for weekends/holidays)
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 7);

      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 7);

      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          params: {
            period1: period1,
            period2: period2,
            interval: '1d',
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          },
          timeout: 5000,
        }
      );

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        return null;
      }

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      // Find closest date to target
      let closestIndex = -1;
      let minDiff = Infinity;

      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        const diff = Math.abs(date.getTime() - targetDate.getTime());

        if (diff < minDiff && closes[i] !== null && closes[i] !== undefined) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      if (closestIndex >= 0) {
        return closes[closestIndex];
      }

      return null;
    } catch (error) {
      console.error(`Error getting historical price for ${symbol} (${market}):`, error);
      return null;
    }
  }

  /**
   * Get historical prices for multiple timeframes
   * @param symbol - Stock/index symbol
   * @param market - Market type (INDIA or USA), defaults to INDIA
   * @returns Object with prices for day, week, month, year
   */
  async getHistoricalPricesForTimeframes(symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{
    day: number | null;
    week: number | null;
    month: number | null;
    year: number | null;
  }> {
    const now = new Date();
    
    // Get market hours for proper close time
    const { getMarketHours } = await import('../utils/market-hours.util');
    const marketHours = getMarketHours(market);
    
    const dayAgo = new Date(now);
    dayAgo.setDate(dayAgo.getDate() - 1);
    // Set to market close time
    dayAgo.setHours(marketHours.closeHour, marketHours.closeMinute, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(marketHours.closeHour, marketHours.closeMinute, 0, 0);

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(marketHours.closeHour, marketHours.closeMinute, 0, 0);

    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    yearAgo.setHours(marketHours.closeHour, marketHours.closeMinute, 0, 0);

    const [dayPrice, weekPrice, monthPrice, yearPrice] = await Promise.all([
      this.getHistoricalPrice(symbol, dayAgo, market),
      this.getHistoricalPrice(symbol, weekAgo, market),
      this.getHistoricalPrice(symbol, monthAgo, market),
      this.getHistoricalPrice(symbol, yearAgo, market),
    ]);

    return {
      day: dayPrice,
      week: weekPrice,
      month: monthPrice,
      year: yearPrice,
    };
  }


  /**
   * Fetch price for a single symbol (used when adding new symbols)
   * @param symbol - Stock/index symbol
   * @param isIndex - Whether it's an index
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  async fetchPriceForSymbol(symbol: string, isIndex: boolean, market: 'INDIA' | 'USA' = 'INDIA'): Promise<PriceData | null> {
    try {
      return await this.apiFactory.getPrice(symbol, isIndex, market);
    } catch (error) {
      console.error(`Error fetching price for ${symbol} (${market}):`, error);
      return null;
    }
  }
}

