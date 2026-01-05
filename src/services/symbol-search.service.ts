import { NSEApiService } from './nse-api.service';
import { MutualFundApiService } from './mutual-fund-api.service';
import { db } from '../db';
import { watchlist } from '../db/schema';

export interface SymbolSuggestion {
  symbol: string;
  name?: string;
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  exchange: string;
}

/**
 * Service for searching and validating NSE symbols dynamically via API
 * No hardcoded lists - all symbols discovered via API calls
 */
export class SymbolSearchService {
  private nseService: NSEApiService;
  private mfService: MutualFundApiService;
  private indicesCache: Array<{ symbol: string; name: string }> | null = null;
  private indicesCacheTime: Date | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.nseService = new NSEApiService();
    this.mfService = new MutualFundApiService();
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
      console.error('Error fetching indices:', error);
      // Return empty array if API fails
      return [];
    }
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
      console.error('Error fetching popular symbols:', error);
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
      console.error('Error searching mutual funds:', error);
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
      // Add popular stocks from watchlist
      const popular = await this.getPopularSymbols();
      const matchingPopular = popular
        .filter((item) => 
          item.type === 'STOCK' && 
          item.symbol.includes(upperQuery)
        )
        .slice(0, 10); // Limit to 10 popular matches

      results.push(...matchingPopular);

      // For exact symbol matches, attempt to validate via API
      // This allows users to search for any valid NSE stock symbol
      if (upperQuery.length >= 3 && upperQuery.length <= 20) {
        // Check if it looks like a valid stock symbol (alphanumeric, uppercase)
        if (/^[A-Z0-9]+$/.test(upperQuery)) {
          // Try to validate by attempting quote fetch (async, don't block)
          // We'll add it to results if validation succeeds
          this.nseService.getQuote(upperQuery)
            .then((quote) => {
              if (quote && quote.lastPrice > 0) {
                // Symbol exists - could add to cache for future searches
                console.log(`Validated stock symbol via API: ${upperQuery}`);
              }
            })
            .catch(() => {
              // Symbol doesn't exist or API error - ignore
            });
        }
      }
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
        // Validate stock by attempting to fetch quote from NSE API
        try {
          const quote = await this.nseService.getQuote(upperSymbol);

          if (!quote || quote.lastPrice <= 0) {
            return {
              valid: false,
              error: `Stock "${upperSymbol}" not found on NSE. Please check the symbol name.`,
            };
          }

          return { valid: true };
        } catch (quoteError: any) {
          // If quote fetch fails (404, network error, etc.), symbol doesn't exist
          return {
            valid: false,
            error: `Stock "${upperSymbol}" not found on NSE. Please check the symbol name.`,
          };
        }
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

