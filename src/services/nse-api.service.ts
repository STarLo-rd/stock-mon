import axios, { AxiosInstance } from 'axios';

export interface NSESymbolData {
  symbol: string;
  lastPrice: number;
  change: number;
  pChange: number;
}

export interface NSEIndexData {
  index: string;
  last: number;
  variation: number;
  percentChange: number;
}

/**
 * NSE API Service for fetching Indian stock and index data
 */
export class NSEApiService {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://www.nseindia.com';
  private cookies: string = '';
  private lastCookieRefresh: Date | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 10000,
    });
  }

  /**
   * Refresh session cookies by visiting the NSE homepage
   */
  private async refreshCookies(): Promise<void> {
    // Refresh cookies every 5 minutes
    const now = new Date();
    if (
      this.lastCookieRefresh &&
      now.getTime() - this.lastCookieRefresh.getTime() < 5 * 60 * 1000
    ) {
      return;
    }

    try {
      const response = await this.client.get('/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        this.cookies = setCookieHeaders
          .map((cookie) => cookie.split(';')[0])
          .join('; ');
        this.lastCookieRefresh = now;
      }
    } catch (error) {
      console.warn('Failed to refresh NSE cookies:', error);
    }
  }

  /**
   * Fetch all indices data
   */
  async getAllIndices(): Promise<NSEIndexData[]> {
    try {
      const response = await this.client.get('/api/allIndices');
      return response.data?.data ?? [];
    } catch (error) {
      console.error('Error fetching NSE indices:', error);
      throw new Error('Failed to fetch NSE indices');
    }
  }

  /**
   * Fetch quote for a specific symbol
   * @param symbol - Stock symbol (e.g., 'RELIANCE', 'TCS')
   */
  async getQuote(symbol: string): Promise<NSESymbolData | null> {
    try {
      // Refresh cookies if needed
      await this.refreshCookies();

      const response = await this.client.get(`/api/quote-equity?symbol=${symbol}`, {
        headers: {
          'Cookie': this.cookies,
          'Referer': 'https://www.nseindia.com/get-quotes/equity',
        },
      });
      const data = response.data;

      if (data?.priceInfo) {
        return {
          symbol: symbol,
          lastPrice: parseFloat(data.priceInfo.lastPrice ?? '0'),
          change: parseFloat(data.priceInfo.change ?? '0'),
          pChange: parseFloat(data.priceInfo.pChange ?? '0'),
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching NSE quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch quotes for multiple symbols in batch
   * @param symbols - Array of stock symbols
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, NSESymbolData>> {
    const results = new Map<string, NSESymbolData>();
    
    // NSE doesn't have a true batch API, so we fetch sequentially with delay
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        if (quote) {
          results.set(symbol, quote);
        }
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get price for a symbol (simplified interface)
   * @param symbol - Stock symbol
   */
  async getPrice(symbol: string): Promise<number | null> {
    const quote = await this.getQuote(symbol);
    return quote?.lastPrice ?? null;
  }
}

