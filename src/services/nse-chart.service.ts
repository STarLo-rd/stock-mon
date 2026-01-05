import axios from 'axios';
import { redisClient } from '../utils/redis.client';
import { DailySnapshotService } from './daily-snapshot.service';
import { MutualFundApiService } from './mutual-fund-api.service';

/**
 * Service for fetching chart data from NSE API
 * Provides historical price data for charting with smart caching
 */
export class NSEChartService {
  private snapshotService: DailySnapshotService;
  private mfService: MutualFundApiService;
  private baseURL = 'https://www.nseindia.com/api/NextApi/apiClient/historicalGraph';

  // NSE index name mapping (NSE uses different names than our symbols)
  private indexNameMap: Record<string, string> = {
    'NIFTY50': 'NIFTY 50',
    'NIFTYMIDCAP': 'NIFTY MIDCAP 100',
    'NIFTYSMLCAP': 'NIFTY SMALLCAP 100',
    'NIFTYSMALLCAP50': 'NIFTY SMALLCAP 50',
    'NIFTYIT': 'NIFTY IT',
    'NIFTYMICROCAP250': 'NIFTY MICROCAP 250',
  };

  constructor() {
    this.snapshotService = new DailySnapshotService();
    this.mfService = new MutualFundApiService();
  }

  /**
   * Check if symbol is a mutual fund scheme code
   */
  private isMutualFundSymbol(symbol: string): boolean {
    return /^\d+$/.test(symbol);
  }

  /**
   * Fetch chart data from NSE API (for indices) or Yahoo Finance (for stocks)
   * Automatically cached in Redis for 15 minutes
   *
   * Data sources:
   * - Indices (NIFTY 50, etc.): NSE API
   * - Stocks (RELIANCE, TCS, etc.): Yahoo Finance
   * - Fallback: daily_snapshots table
   *
   * @param symbol - Stock/index symbol (e.g., "RELIANCE", "NIFTY50")
   * @param timeframe - Chart timeframe ("1D", "1W", "1M", "6M", "1Y")
   * @returns Array of price data points
   */
  async getChartData(
    symbol: string,
    timeframe: string = '1M'
  ): Promise<Array<{ timestamp: Date; price: number }>> {
    const cacheKey = `nse:chart:${symbol}:${timeframe}`;

    try {
      // Check Redis cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log(`[NSEChart] Cache hit for ${symbol} ${timeframe}`);
        return JSON.parse(cached);
      }

      console.log(`[NSEChart] Cache miss, fetching data for ${symbol} ${timeframe}`);

      // Check if this is a mutual fund, index, or stock
      const isMutualFund = this.isMutualFundSymbol(symbol);
      const isIndex = this.isIndexSymbol(symbol);

      let chartData: Array<{ timestamp: Date; price: number }> = [];

      if (isMutualFund) {
        // Fetch from Mutual Fund API
        console.log(`[NSEChart] Fetching ${symbol} from Mutual Fund API`);
        chartData = await this.fetchFromMutualFund(symbol, timeframe);
      } else if (isIndex) {
        // Try NSE API for indices
        console.log(`[NSEChart] Fetching ${symbol} from NSE API (index)`);
        chartData = await this.fetchFromNSE(symbol, timeframe);
      } else {
        // Try Yahoo Finance for stocks
        console.log(`[NSEChart] Fetching ${symbol} from Yahoo Finance (stock)`);
        chartData = await this.fetchFromYahooFinance(symbol, timeframe);
      }

      // If primary source failed, use daily_snapshots fallback
      if (chartData.length === 0) {
        console.log(`[NSEChart] Using daily_snapshots fallback for ${symbol}`);
        chartData = await this.getFallbackData(symbol, timeframe);
      }

      if (chartData.length === 0) {
        console.warn(`[NSEChart] No data available for ${symbol} ${timeframe}`);
        return [];
      }

      // Cache for 15 minutes (900 seconds)
      await redisClient.setEx(cacheKey, 900, JSON.stringify(chartData));

      console.log(`[NSEChart] ✓ Returning ${chartData.length} data points for ${symbol} ${timeframe}`);

      return chartData;
    } catch (error) {
      console.error(`[NSEChart] Error fetching chart for ${symbol}:`, error);

      // Final fallback to daily snapshots
      console.log(`[NSEChart] Using fallback (daily_snapshots) for ${symbol}`);
      return await this.getFallbackData(symbol, timeframe);
    }
  }

  /**
   * Check if symbol is an index (not a stock)
   */
  private isIndexSymbol(symbol: string): boolean {
    return symbol.startsWith('NIFTY') || symbol.startsWith('SENSEX');
  }

  /**
   * Fetch from NSE API (works for indices only)
   */
  private async fetchFromNSE(
    symbol: string,
    timeframe: string
  ): Promise<Array<{ timestamp: Date; price: number }>> {
    try {
      // Map our symbol to NSE's format
      const nseSymbol = this.mapToNSESymbol(symbol);

      // Fetch from NSE API
      const response = await axios.get(this.baseURL, {
        params: {
          functionName: 'getGraphChart',
          type: nseSymbol,
          flag: this.mapTimeframeToNSEFlag(timeframe),
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.nseindia.com/',
        },
        timeout: 10000, // 10 second timeout
      });

      // Parse NSE response
      return this.parseNSEResponse(response.data);
    } catch (error) {
      console.error(`[NSEChart] NSE API error for ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Map our symbol format to NSE's format
   * NSE uses different names for indices
   */
  private mapToNSESymbol(symbol: string): string {
    // Check if it's an index that needs mapping
    if (this.indexNameMap[symbol]) {
      return this.indexNameMap[symbol];
    }

    // For stocks, NSE uses the symbol as-is
    return symbol;
  }

  /**
   * Map timeframe to NSE flag parameter
   */
  private mapTimeframeToNSEFlag(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1W': '1W',
      '1M': '1M',
      '3M': '3M',
      '6M': '6M',
      '1Y': '1Y',
    };

    return mapping[timeframe] || '1M';
  }

  /**
   * Parse NSE API response to standard format
   * NSE returns: [[timestamp_ms, price, "NM"], ...]
   */
  private parseNSEResponse(data: any): Array<{ timestamp: Date; price: number }> {
    try {
      const graphData = data?.data?.grapthData; // Note: NSE has typo "grapthData"

      if (!graphData || !Array.isArray(graphData)) {
        console.warn('[NSEChart] Invalid NSE response format');
        return [];
      }

      return graphData
        .map((point: [number, number, string]) => {
          // point[0] = timestamp in milliseconds
          // point[1] = price
          // point[2] = "NM" flag (not needed)

          if (!point[0] || !point[1]) {
            return null;
          }

          return {
            timestamp: new Date(point[0]), // Convert Unix timestamp to Date
            price: point[1],
          };
        })
        .filter((point): point is { timestamp: Date; price: number } => point !== null);
    } catch (error) {
      console.error('[NSEChart] Error parsing NSE response:', error);
      return [];
    }
  }

  /**
   * Fetch from Yahoo Finance (works for NSE stocks)
   * Yahoo Finance symbol format: {SYMBOL}.NS (e.g., INFY.NS for INFY)
   */
  private async fetchFromYahooFinance(
    symbol: string,
    timeframe: string
  ): Promise<Array<{ timestamp: Date; price: number }>> {
    try {
      // Convert symbol to Yahoo Finance format (add .NS suffix for NSE)
      const yahooSymbol = `${symbol}.NS`;

      // Calculate date range based on timeframe
      const days = this.getTimeframeDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      // Convert to Unix timestamps (Yahoo Finance uses seconds)
      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      // Fetch from Yahoo Finance API
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          params: {
            period1: period1,
            period2: period2,
            interval: '1d', // Daily data
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          },
          timeout: 10000,
        }
      );

      // Parse Yahoo Finance response
      return this.parseYahooFinanceResponse(response.data);
    } catch (error) {
      console.error(`[NSEChart] Yahoo Finance error for ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Parse Yahoo Finance API response to standard format
   * Yahoo Finance returns: { chart: { result: [{ timestamp: [...], indicators: { quote: [{ close: [...] }] } }] } }
   */
  private parseYahooFinanceResponse(data: any): Array<{ timestamp: Date; price: number }> {
    try {
      const result = data?.chart?.result?.[0];

      if (!result) {
        console.warn('[NSEChart] Invalid Yahoo Finance response format');
        return [];
      }

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      if (timestamps.length === 0 || closes.length === 0) {
        console.warn('[NSEChart] No data in Yahoo Finance response');
        return [];
      }

      // Combine timestamps and closing prices
      return timestamps
        .map((timestamp: number, index: number) => {
          const close = closes[index];

          // Skip null/undefined prices
          if (close === null || close === undefined) {
            return null;
          }

          return {
            timestamp: new Date(timestamp * 1000), // Convert Unix timestamp to Date
            price: close,
          };
        })
        .filter((point: { timestamp: Date; price: number } | null): point is { timestamp: Date; price: number } => point !== null);
    } catch (error) {
      console.error('[NSEChart] Error parsing Yahoo Finance response:', error);
      return [];
    }
  }

  /**
   * Fetch from Mutual Fund API (for mutual funds)
   */
  private async fetchFromMutualFund(
    symbol: string,
    timeframe: string
  ): Promise<Array<{ timestamp: Date; price: number }>> {
    try {
      const schemeCode = parseInt(symbol, 10);
      if (isNaN(schemeCode)) {
        console.warn(`[NSEChart] Invalid mutual fund scheme code: ${symbol}`);
        return [];
      }

      // Calculate date range based on timeframe
      const days = this.getTimeframeDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      // Fetch NAV history from mutual fund API
      const navHistory = await this.mfService.getNAVHistory(schemeCode, startDate, endDate);

      if (navHistory.length === 0) {
        console.warn(`[NSEChart] No mutual fund NAV data for ${symbol}`);
        return [];
      }

      // Convert to chart format
      return navHistory.map((item) => ({
        timestamp: item.date,
        price: item.nav,
      }));
    } catch (error) {
      console.error(`[NSEChart] Mutual fund API error for ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Fallback: Get data from daily_snapshots table
   * Used when NSE API and Yahoo Finance fail or return no data
   */
  private async getFallbackData(
    symbol: string,
    timeframe: string
  ): Promise<Array<{ timestamp: Date; price: number }>> {
    try {
      const days = this.getTimeframeDays(timeframe);
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      // Fetch from daily_snapshots table
      const snapshots = await this.snapshotService.getSnapshotRange(
        symbol,
        startDate,
        endDate
      );

      return snapshots.map((s) => ({
        timestamp: s.date,
        price: s.closePrice,
      }));
    } catch (error) {
      console.error('[NSEChart] Fallback data fetch failed:', error);
      return [];
    }
  }

  /**
   * Convert timeframe string to number of days
   */
  private getTimeframeDays(timeframe: string): number {
    const mapping: Record<string, number> = {
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
    };

    return mapping[timeframe] || 30;
  }

  /**
   * Invalidate cache for a symbol (useful after adding new symbol)
   */
  async invalidateCache(symbol: string): Promise<void> {
    const timeframes = ['1W', '1M', '3M', '6M', '1Y'];

    for (const timeframe of timeframes) {
      const cacheKey = `nse:chart:${symbol}:${timeframe}`;
      await redisClient.del(cacheKey);
    }

    console.log(`[NSEChart] Cache invalidated for ${symbol}`);
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(symbol: string): Promise<{
    symbol: string;
    cached: Record<string, boolean>;
  }> {
    const timeframes = ['1W', '1M', '3M', '6M', '1Y'];
    const cached: Record<string, boolean> = {};

    for (const timeframe of timeframes) {
      const cacheKey = `nse:chart:${symbol}:${timeframe}`;
      const exists = await redisClient.get(cacheKey);
      cached[timeframe] = exists !== null;
    }

    return { symbol, cached };
  }
}
