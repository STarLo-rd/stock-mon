import { NSEApiService } from './nse-api.service';
import { YahooApiService } from './yahoo-api.service';
import { MutualFundApiService } from './mutual-fund-api.service';
import { db } from '../db';
import { watchlist } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface PriceData {
  symbol: string;
  price: number;
  source: 'NSE' | 'YAHOO' | 'MFAPI';
  market: 'INDIA' | 'USA';
}

/**
 * Factory service to select appropriate API based on symbol type
 */
export class ApiFactoryService {
  private nseService: NSEApiService;
  private yahooService: YahooApiService;
  private mfService: MutualFundApiService;

  constructor() {
    this.nseService = new NSEApiService();
    this.yahooService = new YahooApiService();
    this.mfService = new MutualFundApiService();
  }

  /**
   * Check if symbol is a mutual fund scheme code (numeric)
   */
  private isMutualFundSymbol(symbol: string): boolean {
    return /^\d+$/.test(symbol);
  }

  /**
   * Get symbol type from watchlist
   */
  private async getSymbolType(symbol: string, market: 'INDIA' | 'USA'): Promise<'INDEX' | 'STOCK' | 'MUTUAL_FUND' | null> {
    try {
      const result = await db
        .select({ type: watchlist.type })
        .from(watchlist)
        .where(and(eq(watchlist.symbol, symbol), eq(watchlist.market, market)))
        .limit(1);

      if (result.length > 0) {
        return result[0].type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get price for a symbol using appropriate API
   * @param symbol - Stock/index/mutual fund symbol
   * @param isIndex - Whether it's an index
   * @param market - Market type (INDIA or USA)
   */
  async getPrice(symbol: string, isIndex: boolean, market: 'INDIA' | 'USA' = 'INDIA'): Promise<PriceData | null> {
    // USA market: Use Yahoo Finance exclusively
    if (market === 'USA') {
      try {
        // USA symbols are used as-is (^GSPC, AAPL, etc.)
        const price = await this.yahooService.getPrice(symbol);
        if (price !== null && price > 0) {
          return { symbol, price, source: 'YAHOO', market: 'USA' };
        }
      } catch (error) {
        console.error(`Yahoo Finance failed for USA symbol ${symbol}:`, error);
      }
      return null;
    }

    // INDIA market: Check if it's a mutual fund
    const symbolType = await this.getSymbolType(symbol, market);
    const isMutualFund = symbolType === 'MUTUAL_FUND' || (symbolType === null && this.isMutualFundSymbol(symbol));

    if (isMutualFund) {
      try {
        const schemeCode = parseInt(symbol, 10);
        if (isNaN(schemeCode)) {
          return null;
        }

        const navData = await this.mfService.getLatestNAV(schemeCode);
        if (navData && navData.nav > 0) {
          return { symbol, price: navData.nav, source: 'MFAPI', market: 'INDIA' };
        }
      } catch (error) {
        console.error(`Mutual fund API failed for ${symbol}:`, error);
      }
      return null;
    }

    // INDIA market: NSE first, Yahoo fallback (existing logic)
    if (isIndex) {
      // For indices, fetch from NSE indices API
      try {
        const nseIndices = await this.nseService.getAllIndices();
        
        // Map our symbol names to NSE index names
        const indexNameMap: Record<string, string> = {
          'NIFTY50': 'NIFTY 50',
          'NIFTYMIDCAP': 'NIFTY MIDCAP 100',
          'NIFTYSMLCAP': 'NIFTY SMALLCAP 100',
          'NIFTYSMALLCAP50': 'NIFTY SMALLCAP 50',
          'NIFTYIT': 'NIFTY IT',
          'NIFTYBANK': 'NIFTY BANK',
          'NIFTYAUTO': 'NIFTY AUTO',
          'NIFTYFMCG': 'NIFTY FMCG',
          'NIFTYMETAL': 'NIFTY METAL',
          'NIFTYPHARMA': 'NIFTY PHARMA',
          'NIFTYPSU': 'NIFTY PSU BANK',
          'NIFTYREALTY': 'NIFTY REALTY',
          'NIFTYMICROCAP250': 'NIFTY MICROCAP 250',
        };

        const nseIndexName = indexNameMap[symbol];
        if (nseIndexName) {
          const indexData = nseIndices.find((idx) => idx.index === nseIndexName);
          if (indexData && indexData.last > 0) {
            return { symbol, price: indexData.last, source: 'NSE', market: 'INDIA' };
          }
        }

        // Fallback to fuzzy matching for unmapped indices
        const indexData = nseIndices.find((idx) =>
          idx.index.toUpperCase().replace(/\s+/g, '') === symbol.toUpperCase() ||
          idx.index.toUpperCase().includes(symbol.toUpperCase())
        );
        if (indexData && indexData.last > 0) {
          return { symbol, price: indexData.last, source: 'NSE', market: 'INDIA' };
        }
      } catch (error) {
        console.warn(`NSE indices fetch failed for ${symbol}, trying Yahoo:`, error);
      }

      // Fallback to Yahoo Finance for indices
      try {
        const yahooSymbol = YahooApiService.convertToYahooSymbol(symbol, true);
        const price = await this.yahooService.getPrice(yahooSymbol);
        if (price !== null && price > 0) {
          return { symbol, price, source: 'YAHOO', market: 'INDIA' };
        }
      } catch (error) {
        console.error(`Yahoo also failed for index ${symbol}:`, error);
      }

      return null;
    }

    // For stocks, try NSE first
    try {
      const price = await this.nseService.getPrice(symbol);
      if (price !== null && price > 0) {
        return { symbol, price, source: 'NSE', market: 'INDIA' };
      }
    } catch (error) {
      console.warn(`NSE failed for ${symbol}, trying Yahoo:`, error);
    }

    // Fallback to Yahoo Finance for stocks
    try {
      const yahooSymbol = YahooApiService.convertToYahooSymbol(symbol, false);
      const price = await this.yahooService.getPrice(yahooSymbol);
      if (price !== null && price > 0) {
        return { symbol, price, source: 'YAHOO', market: 'INDIA' };
      }
    } catch (error) {
      console.error(`Yahoo also failed for stock ${symbol}:`, error);
    }

    return null;
  }

  /**
   * Get prices for multiple symbols in batch
   * @param symbols - Array of symbols with their types
   * @param market - Market type (INDIA or USA)
   */
  async getBatchPrices(
    symbols: Array<{ symbol: string; isIndex: boolean }>,
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    // USA market: Use Yahoo Finance exclusively
    if (market === 'USA') {
      try {
        // USA symbols are used as-is (no conversion needed)
        const yahooSymbols = symbols.map((s) => s.symbol);
        const yahooQuotes = await this.yahooService.getBatchQuotes(yahooSymbols);

        for (const [yahooSymbol, quote] of yahooQuotes) {
          const originalSymbol = symbols.find((s) => s.symbol === yahooSymbol);
          if (originalSymbol && quote.regularMarketPrice > 0) {
            results.set(originalSymbol.symbol, {
              symbol: originalSymbol.symbol,
              price: quote.regularMarketPrice,
              source: 'YAHOO',
              market: 'USA',
            });
          }
        }
      } catch (error) {
        console.error('Yahoo batch fetch failed for USA:', error);
      }

      return results;
    }

    // INDIA market: Split into mutual funds, indices, and stocks
    const mutualFunds: string[] = [];
    const indices: string[] = [];
    const stocks: string[] = [];

    // Get types from watchlist for all symbols
    const symbolTypes = new Map<string, 'INDEX' | 'STOCK' | 'MUTUAL_FUND'>();
    for (const { symbol } of symbols) {
      const type = await this.getSymbolType(symbol, market);
      if (type) {
        symbolTypes.set(symbol, type);
      }
    }

    for (const { symbol, isIndex } of symbols) {
      const type = symbolTypes.get(symbol);
      const isMutualFund = type === 'MUTUAL_FUND' || (type === null && this.isMutualFundSymbol(symbol));

      if (isMutualFund) {
        mutualFunds.push(symbol);
      } else if (isIndex) {
        indices.push(symbol);
      } else {
        stocks.push(symbol);
      }
    }

    // Fetch mutual funds
    if (mutualFunds.length > 0) {
      try {
        const schemeCodes = mutualFunds.map((s) => parseInt(s, 10)).filter((code) => !isNaN(code));
        const navDataMap = await this.mfService.getBatchNAVs(schemeCodes);

        for (const [schemeCode, navData] of navDataMap) {
          const symbol = schemeCode.toString();
          if (mutualFunds.includes(symbol) && navData.nav > 0) {
            results.set(symbol, {
              symbol,
              price: navData.nav,
              source: 'MFAPI',
              market: 'INDIA',
            });
          }
        }
      } catch (error) {
        console.error('Mutual fund batch fetch failed:', error);
      }
    }

    // Fetch indices from NSE
    if (indices.length > 0) {
      try {
        const nseIndices = await this.nseService.getAllIndices();

        // Map our symbol names to NSE index names
        const indexNameMap: Record<string, string> = {
          'NIFTY50': 'NIFTY 50',
          'NIFTYMIDCAP': 'NIFTY MIDCAP 100',
          'NIFTYSMLCAP': 'NIFTY SMALLCAP 100',
          'NIFTYSMALLCAP50': 'NIFTY SMALLCAP 50',
          'NIFTYIT': 'NIFTY IT',
          'NIFTYBANK': 'NIFTY BANK',
          'NIFTYAUTO': 'NIFTY AUTO',
          'NIFTYFMCG': 'NIFTY FMCG',
          'NIFTYMETAL': 'NIFTY METAL',
          'NIFTYPHARMA': 'NIFTY PHARMA',
          'NIFTYPSU': 'NIFTY PSU BANK',
          'NIFTYREALTY': 'NIFTY REALTY',
          'NIFTYMICROCAP250': 'NIFTY MICROCAP 250',
        };

        for (const ourSymbol of indices) {
          const nseIndexName = indexNameMap[ourSymbol];
          if (nseIndexName) {
            const indexData = nseIndices.find((idx) =>
              idx.index === nseIndexName
            );
            if (indexData && indexData.last > 0) {
              results.set(ourSymbol, {
                symbol: ourSymbol,
                price: indexData.last,
                source: 'NSE',
                market: 'INDIA',
              });
            }
          } else {
            // Fallback to fuzzy matching for unmapped indices
            const indexData = nseIndices.find((idx) =>
              idx.index.toUpperCase().replace(/\s+/g, '') === ourSymbol.toUpperCase()
            );
            if (indexData && indexData.last > 0) {
              results.set(ourSymbol, {
                symbol: ourSymbol,
                price: indexData.last,
                source: 'NSE',
                market: 'INDIA',
              });
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch indices from NSE, trying Yahoo:', error);
      }
    }

    // Fetch stocks in batches
    const batchSize = 20;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      // Try NSE first
      try {
        const nseQuotes = await this.nseService.getBatchQuotes(batch);
        for (const [symbol, quote] of nseQuotes) {
          if (quote.lastPrice > 0) {
            results.set(symbol, {
              symbol,
              price: quote.lastPrice,
              source: 'NSE',
              market: 'INDIA',
            });
          }
        }
      } catch (error) {
        console.warn(`NSE batch failed, trying Yahoo for batch:`, error);
      }

      // Fallback to Yahoo for missing symbols
      const missingSymbols = batch.filter((s) => !results.has(s));
      if (missingSymbols.length > 0) {
        try {
          const yahooSymbols = missingSymbols.map((s) => 
            YahooApiService.convertToYahooSymbol(s, false)
          );
          const yahooQuotes = await this.yahooService.getBatchQuotes(yahooSymbols);
          
          for (const [yahooSymbol, quote] of yahooQuotes) {
            // Map back to original symbol
            const originalSymbol = missingSymbols.find((s) => 
              YahooApiService.convertToYahooSymbol(s, false) === yahooSymbol
            );
            if (originalSymbol && quote.regularMarketPrice > 0) {
              results.set(originalSymbol, {
                symbol: originalSymbol,
                price: quote.regularMarketPrice,
                source: 'YAHOO',
                market: 'INDIA',
              });
            }
          }
        } catch (error) {
          console.error('Yahoo batch fetch failed:', error);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < stocks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }
}

