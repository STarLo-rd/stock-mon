import axios, { AxiosInstance } from 'axios';
import { redisClient } from '../utils/redis.client';

export interface MutualFundScheme {
  schemeCode: number;
  schemeName: string;
}

export interface NAVData {
  date: string;
  nav: string;
}

export interface MutualFundNAVResponse {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
    isin_growth: string | null;
    isin_div_reinvestment: string | null;
  };
  data: NAVData[];
  status: string;
}

export interface MutualFundLatestNAV {
  schemeCode: number;
  schemeName: string;
  nav: number;
  date: string;
}

/**
 * Service for interacting with mfapi.in API
 * Provides mutual fund scheme search, NAV fetching, and history
 */
export class MutualFundApiService {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://api.mfapi.in';
  private readonly CACHE_TTL = 60 * 60; // 1 hour cache for search results
  private readonly NAV_CACHE_TTL = 15 * 60; // 15 minutes cache for NAV data

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });
  }

  /**
   * Search mutual fund schemes by name
   * @param query - Search query (min 2 characters)
   * @returns Array of matching schemes
   */
  async searchSchemes(query: string): Promise<MutualFundScheme[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = `mf:search:${query.toLowerCase()}`;

    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.client.get('/mf/search', {
        params: { q: query },
      });

      const schemes: MutualFundScheme[] = response.data || [];

      // Cache results
      if (schemes.length > 0) {
        await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(schemes));
      }

      return schemes;
    } catch (error) {
      console.error(`Error searching mutual funds for "${query}":`, error);
      return [];
    }
  }

  /**
   * Get latest NAV for a mutual fund scheme
   * @param schemeCode - Scheme code (e.g., 135800)
   * @returns Latest NAV data or null
   */
  async getLatestNAV(schemeCode: number): Promise<MutualFundLatestNAV | null> {
    const cacheKey = `mf:nav:latest:${schemeCode}`;

    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.client.get<MutualFundNAVResponse>(`/mf/${schemeCode}/latest`);

      if (response.data.status !== 'SUCCESS' || !response.data.data || response.data.data.length === 0) {
        return null;
      }

      const latestNAV = response.data.data[0];
      const result: MutualFundLatestNAV = {
        schemeCode: response.data.meta.scheme_code,
        schemeName: response.data.meta.scheme_name,
        nav: parseFloat(latestNAV.nav),
        date: latestNAV.date,
      };

      // Cache result
      await redisClient.setEx(cacheKey, this.NAV_CACHE_TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error(`Error fetching latest NAV for scheme ${schemeCode}:`, error);
      return null;
    }
  }

  /**
   * Get NAV history for a mutual fund scheme
   * @param schemeCode - Scheme code
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Array of NAV data points
   */
  async getNAVHistory(
    schemeCode: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ date: Date; nav: number }>> {
    try {
      const params: Record<string, string> = {};
      
      if (startDate) {
        params.startDate = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        params.endDate = endDate.toISOString().split('T')[0];
      }

      const response = await this.client.get<MutualFundNAVResponse>(`/mf/${schemeCode}`, {
        params,
      });

      if (response.data.status !== 'SUCCESS' || !response.data.data) {
        return [];
      }

      // Parse NAV data and convert dates
      return response.data.data
        .map((item) => {
          // Parse date format: "26-10-2024" (DD-MM-YYYY)
          const [day, month, year] = item.date.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const nav = parseFloat(item.nav);

          if (isNaN(nav) || isNaN(date.getTime())) {
            return null;
          }

          return {
            date,
            nav,
          };
        })
        .filter((item): item is { date: Date; nav: number } => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date ascending
    } catch (error) {
      console.error(`Error fetching NAV history for scheme ${schemeCode}:`, error);
      return [];
    }
  }

  /**
   * Get scheme information/metadata
   * @param schemeCode - Scheme code
   * @returns Scheme metadata or null
   */
  async getSchemeInfo(schemeCode: number): Promise<MutualFundNAVResponse['meta'] | null> {
    try {
      const response = await this.client.get<MutualFundNAVResponse>(`/mf/${schemeCode}/latest`);

      if (response.data.status !== 'SUCCESS' || !response.data.meta) {
        return null;
      }

      return response.data.meta;
    } catch (error) {
      console.error(`Error fetching scheme info for ${schemeCode}:`, error);
      return null;
    }
  }

  /**
   * Validate if a scheme code exists
   * @param schemeCode - Scheme code to validate
   * @returns True if scheme exists, false otherwise
   */
  async validateSchemeCode(schemeCode: number): Promise<boolean> {
    try {
      const nav = await this.getLatestNAV(schemeCode);
      return nav !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get batch NAVs for multiple schemes
   * @param schemeCodes - Array of scheme codes
   * @returns Map of scheme code to NAV data
   */
  async getBatchNAVs(schemeCodes: number[]): Promise<Map<number, MutualFundLatestNAV>> {
    const results = new Map<number, MutualFundLatestNAV>();

    // Fetch sequentially with delay to respect rate limits
    for (const schemeCode of schemeCodes) {
      try {
        const nav = await this.getLatestNAV(schemeCode);
        if (nav) {
          results.set(schemeCode, nav);
        }
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error fetching NAV for scheme ${schemeCode}:`, error);
      }
    }

    return results;
  }
}

