import { NSEApiService } from './nse-api.service';
import { MutualFundApiService } from './mutual-fund-api.service';
import axios, { AxiosInstance } from 'axios';
import { db } from '../db';
import { watchlist } from '../db/schema';
import { NIFTY50_STOCKS, NIFTY50_COMPANY_NAMES } from '../config/subscription-plans';
import logger from '../utils/logger';

export interface SymbolSuggestion {
  symbol: string;
  name?: string;
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  exchange: string;
  isAccessible?: boolean; // Whether user can access this symbol based on subscription
}

/**
 * Service for searching and validating NSE symbols dynamically via API
 * No hardcoded lists - all symbols discovered via API calls
 */
export class SymbolSearchService {
  private nseService: NSEApiService;
  private mfService: MutualFundApiService;
  private yahooClient: AxiosInstance;
  private indicesCache: Array<{ symbol: string; name: string }> | null = null;
  private indicesCacheTime: Date | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.nseService = new NSEApiService();
    this.mfService = new MutualFundApiService();
    this.yahooClient = axios.create({
      baseURL: 'https://query1.finance.yahoo.com',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  }

  /**
   * Map NSE index name to our symbol format
   */
  private mapIndexNameToSymbol(indexName: string): string {
    const mapping: Record<string, string> = {
      'NIFTY 50': 'NIFTY50',
      'NIFTY MIDCAP 100': 'NIFTYMIDCAP',
      'NIFTY SMALLCAP 100': 'NIFTYSMLCAP',
      'NIFTY IT': 'NIFTYIT',
      'NIFTY BANK': 'NIFTYBANK',
      'NIFTY AUTO': 'NIFTYAUTO',
      'NIFTY FMCG': 'NIFTYFMCG',
      'NIFTY METAL': 'NIFTYMETAL',
      'NIFTY PHARMA': 'NIFTYPHARMA',
      'NIFTY PSU BANK': 'NIFTYPSU',
      'NIFTY REALTY': 'NIFTYREALTY',
    };

    // Check exact match first
    if (mapping[indexName]) {
      return mapping[indexName];
    }

    // Generate symbol from name (remove spaces, uppercase)
    return indexName.replace(/\s+/g, '').toUpperCase();
  }

  /**
   * Fetch and cache indices from NSE API
   */
  private async getCachedIndices(): Promise<Array<{ symbol: string; name: string }>> {
    const now = new Date();
    
    // Return cached if still valid
    if (
      this.indicesCache &&
      this.indicesCacheTime &&
      now.getTime() - this.indicesCacheTime.getTime() < this.CACHE_TTL
    ) {
      return this.indicesCache;
    }

    try {
      // Fetch from NSE API
      const nseIndices = await this.nseService.getAllIndices();
      
      // Map to our format
      this.indicesCache = nseIndices.map((index) => ({
        symbol: this.mapIndexNameToSymbol(index.index),
        name: index.index,
      })).filter((idx) => idx.symbol && idx.name); // Filter out invalid entries

      this.indicesCacheTime = now;
      return this.indicesCache;
    } catch (error) {
      logger.error('Error fetching indices from NSE API', { error });
      return [];
    }
  }

  /**
   * Search stocks via Yahoo Finance API
   * @param query - Search query
   * @returns Array of matching NSE stock suggestions
   */
  private async searchStocksViaYahoo(query: string): Promise<SymbolSuggestion[]> {
    try {
      const response = await this.yahooClient.get('/v1/finance/search', {
        params: { q: query },
      });

      const quotes = response.data?.quotes || [];

      // Filter for NSE stocks only
      const nseStocks = quotes.filter((quote: any) => {
        return quote.exchange === 'NSI' &&
               quote.quoteType === 'EQUITY' &&
               quote.symbol?.endsWith('.NS');
      });

      // Map to SymbolSuggestion format
      const results: SymbolSuggestion[] = nseStocks.map((quote: any) => {
        // Strip .NS suffix from symbol
        const symbol = quote.symbol.replace(/\.NS$/, '');
        
        return {
          symbol,
          name: quote.longname || quote.shortname || symbol,
          type: 'STOCK' as const,
          exchange: 'NSE',
        };
      });

      return results.slice(0, 20); // Limit to top 20 matches
    } catch (error: any) {
      logger.error('Error searching stocks via Yahoo Finance', {
        query,
        error: error.message || error,
        status: error.response?.status,
      });
      return [];
    }
  }

  /**
   * Search NIFTY50 stocks by symbol or company name
   * @param query - Search query
   * @returns Array of matching NIFTY50 stock suggestions
   */
  private searchNifty50Stocks(query: string): SymbolSuggestion[] {
    const upperQuery = query.toUpperCase().trim();
    const results: SymbolSuggestion[] = [];

    // Search by symbol
    const symbolMatches = NIFTY50_STOCKS.filter((symbol) =>
      symbol.includes(upperQuery)
    );

    // Search by company name
    const companyMatches = Object.entries(NIFTY50_COMPANY_NAMES)
      .filter(([symbol, companyName]) => {
        const upperCompanyName = companyName.toUpperCase();
        return (
          upperCompanyName.includes(upperQuery) ||
          upperQuery.includes(companyName.toUpperCase().split(' ')[0])
        );
      })
      .map(([symbol]) => symbol);

    // Combine and deduplicate
    const allMatches = Array.from(new Set([...symbolMatches, ...companyMatches]));

    // Create suggestions with company names
    for (const symbol of allMatches) {
      results.push({
        symbol,
        name: NIFTY50_COMPANY_NAMES[symbol] ?? symbol,
        type: 'STOCK' as const,
        exchange: 'NSE',
      });
    }

    return results.slice(0, 20); // Limit to 20 results
  }

  /**
   * Get popular symbols from existing watchlist
   */
  private async getPopularSymbols(): Promise<SymbolSuggestion[]> {
    try {
      const existing = await db.select().from(watchlist).limit(100);
      return existing.map((item) => ({
        symbol: item.symbol,
        type: item.type,
        exchange: item.exchange,
      }));
    } catch (error) {
      logger.error('Error fetching popular symbols', { error });
      return [];
    }
  }

  /**
   * Search mutual funds via mfapi.in API
   * @param query - Search query
   * @returns Array of mutual fund suggestions
   */
  private async searchMutualFunds(query: string): Promise<SymbolSuggestion[]> {
    try {
      const schemes = await this.mfService.searchSchemes(query);
      return schemes.map((scheme) => ({
        symbol: scheme.schemeCode.toString(),
        name: scheme.schemeName,
        type: 'MUTUAL_FUND' as const,
        exchange: 'MF',
      }));
    } catch (error) {
      logger.error('Error searching mutual funds', { error });
      return [];
    }
  }

  /**
   * Search for symbols matching query
   * @param query - Search query (min 2 characters)
   * @param type - Optional filter by type
   */
  async searchSymbols(query: string, type?: 'INDEX' | 'STOCK' | 'MUTUAL_FUND'): Promise<SymbolSuggestion[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const upperQuery = query.toUpperCase();
    const results: SymbolSuggestion[] = [];

    // Search mutual funds if type is MUTUAL_FUND or not specified
    if (!type || type === 'MUTUAL_FUND') {
      const mfResults = await this.searchMutualFunds(query);
      results.push(...mfResults);
    }

    // Search indices if type is INDEX or not specified
    if (!type || type === 'INDEX') {
      const indices = await this.getCachedIndices();
      const matchingIndices = indices
        .filter((idx) => 
          idx.symbol.includes(upperQuery) || 
          idx.name.toUpperCase().includes(upperQuery)
        )
        .map((idx) => ({
          symbol: idx.symbol,
          name: idx.name,
          type: 'INDEX' as const,
          exchange: 'NSE',
        }));

      results.push(...matchingIndices);
    }

    // Search stocks if type is STOCK or not specified
    if (!type || type === 'STOCK') {
      // Search NIFTY50 stocks first (fast, instant results)
      const nifty50Results = this.searchNifty50Stocks(query);
      results.push(...nifty50Results);

      // Search Yahoo Finance API for broader coverage
      const yahooResults = await this.searchStocksViaYahoo(query);
      results.push(...yahooResults);

      // Add popular stocks from watchlist as fallback (only if not already in results)
      const popular = await this.getPopularSymbols();
      const existingSymbols = new Set(results.map(r => r.symbol.toUpperCase()));
      const matchingPopular = popular
        .filter((item) =>
          item.type === 'STOCK' &&
          item.symbol.includes(upperQuery) &&
          !existingSymbols.has(item.symbol.toUpperCase())
        )
        .slice(0, 5); // Limit to 5 popular matches

      results.push(...matchingPopular);
    }

    // Remove duplicates and limit results
    const uniqueResults = Array.from(
      new Map(results.map((item) => [item.symbol, item])).values()
    );

    return uniqueResults.slice(0, 20); // Return top 20 matches
  }

  /**
   * Validate if a symbol exists
   * @param symbol - Symbol to validate
   * @param type - Symbol type
   */
  async validateSymbol(symbol: string, type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND'): Promise<{ valid: boolean; error?: string }> {
    if (!symbol || symbol.trim().length === 0) {
      return { valid: false, error: 'Symbol cannot be empty' };
    }

    const upperSymbol = symbol.toUpperCase().trim();

    try {
      if (type === 'MUTUAL_FUND') {
        // Validate mutual fund scheme code
        const schemeCode = parseInt(upperSymbol, 10);
        if (isNaN(schemeCode)) {
          return {
            valid: false,
            error: `Invalid mutual fund scheme code. Scheme codes are numeric (e.g., "135800").`,
          };
        }

        const isValid = await this.mfService.validateSchemeCode(schemeCode);
        if (!isValid) {
          return {
            valid: false,
            error: `Mutual fund scheme "${upperSymbol}" not found. Please check the scheme code.`,
          };
        }

        return { valid: true };
      }

      if (type === 'INDEX') {
        // Validate index by checking against NSE indices API
        const indices = await this.getCachedIndices();
        const indexExists = indices.some(
          (idx) => idx.symbol === upperSymbol || idx.name.toUpperCase().replace(/\s+/g, '') === upperSymbol
        );

        if (!indexExists) {
          return {
            valid: false,
            error: `Index "${upperSymbol}" not found. Please check the symbol name.`,
          };
        }

        return { valid: true };
      } else {
        // Validate stock - try multiple sources for reliability

        // First check: Is it in NIFTY50?
        if (NIFTY50_STOCKS.includes(upperSymbol)) {
          return { valid: true };
        }

        // Second check: Try NSE API
        try {
          const quote = await this.nseService.getQuote(upperSymbol);
          if (quote && quote.lastPrice > 0) {
            return { valid: true };
          }
        } catch (quoteError: any) {
          // NSE API failed, will try Yahoo Finance fallback
        }

        // Third check: Try Yahoo Finance as fallback
        try {
          const response = await this.yahooClient.get('/v1/finance/search', {
            params: { q: upperSymbol },
          });

          const quotes = response.data?.quotes || [];
          const nseStock = quotes.find((quote: any) =>
            quote.symbol === `${upperSymbol}.NS` &&
            quote.exchange === 'NSI' &&
            quote.quoteType === 'EQUITY'
          );

          if (nseStock) {
            return { valid: true };
          }
        } catch (yahooError: any) {
          // Yahoo Finance also failed
        }

        // If all methods fail, symbol doesn't exist
        return {
          valid: false,
          error: `Stock "${upperSymbol}" not found on NSE. Please check the symbol name.`,
        };
      }
    } catch (error: any) {
      // If API call fails, assume invalid symbol
      return {
        valid: false,
        error: `Unable to validate "${upperSymbol}". ${error.message || 'Please check the symbol name.'}`,
      };
    }
  }
}

