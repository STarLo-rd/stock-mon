import axios, { AxiosInstance } from 'axios';

export interface YahooQuoteData {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
}

/**
 * Yahoo Finance API Service (backup data source)
 */
export class YahooApiService {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://query1.finance.yahoo.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://finance.yahoo.com',
        'Origin': 'https://finance.yahoo.com',
      },
    });
  }

  /**
   * Fetch quote for a symbol
   * @param symbol - Stock symbol (e.g., 'RELIANCE.NS', '^NSEI')
   */
  async getQuote(symbol: string): Promise<YahooQuoteData | null> {
    try {
      const response = await this.client.get('/v7/finance/quote', {
        params: {
          symbols: symbol,
        },
      });

      const result = response.data?.quoteResponse?.result?.[0];
      if (!result) {
        return null;
      }

      return {
        symbol: result.symbol ?? symbol,
        regularMarketPrice: result.regularMarketPrice ?? 0,
        regularMarketChange: result.regularMarketChange ?? 0,
        regularMarketChangePercent: result.regularMarketChangePercent ?? 0,
      };
    } catch (error) {
      console.error(`Error fetching Yahoo quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch quotes for multiple symbols in batch
   * @param symbols - Array of stock symbols
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, YahooQuoteData>> {
    const results = new Map<string, YahooQuoteData>();
    
    if (symbols.length === 0) {
      return results;
    }

    try {
      // Yahoo supports batch requests (up to ~20 symbols)
      const symbolsParam = symbols.join(',');
      const response = await this.client.get('/v7/finance/quote', {
        params: {
          symbols: symbolsParam,
        },
      });

      const quotes = response.data?.quoteResponse?.result ?? [];
      
      for (const quote of quotes) {
        results.set(quote.symbol, {
          symbol: quote.symbol,
          regularMarketPrice: quote.regularMarketPrice ?? 0,
          regularMarketChange: quote.regularMarketChange ?? 0,
          regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
        });
      }
    } catch (error) {
      console.error('Error fetching batch quotes from Yahoo:', error);
    }

    return results;
  }

  /**
   * Get price for a symbol (simplified interface)
   * @param symbol - Stock symbol
   */
  async getPrice(symbol: string): Promise<number | null> {
    const quote = await this.getQuote(symbol);
    return quote?.regularMarketPrice ?? null;
  }

  /**
   * Convert NSE symbol to Yahoo Finance format
   * @param symbol - NSE symbol
   * @param isIndex - Whether it's an index
   */
  static convertToYahooSymbol(symbol: string, isIndex: boolean): string {
    if (isIndex) {
      // Map common indices
      const indexMap: Record<string, string> = {
        'NIFTY50': '^NSEI',
        'NIFTYMIDCAP': '^NSEMDCP50',
        'NIFTYSMLCAP': '^NSESMCP50',
        'NIFTYIT': '^CNXIT',
      };
      return indexMap[symbol] ?? `^${symbol}`;
    }
    return `${symbol}.NS`;
  }
}

