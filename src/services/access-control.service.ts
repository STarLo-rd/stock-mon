import { subscriptionService, UserSubscription } from './subscription.service';
import { getPlanRules, StockAccess, MutualFundAccess, NIFTY50_STOCKS, MIDCAP150_STOCKS, TOP_15_MUTUAL_FUNDS, TOP_30_MUTUAL_FUNDS, TOP_5_INDICES } from '../config/subscription-plans';
import { db } from '../db';
import { watchlists, watchlist } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import logger from '../utils/logger';

export interface SymbolSuggestion {
  symbol: string;
  name?: string;
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  exchange: string;
  isAccessible?: boolean; // Whether user can access this symbol based on subscription
}

/**
 * Access Control Service
 * Handles symbol and resource access control based on subscription plans
 */
export class AccessControlService {
  /**
   * Check if user can access a specific symbol
   */
  async canAccessSymbol(
    userId: string,
    symbol: string,
    type: 'STOCK' | 'MUTUAL_FUND' | 'INDEX'
  ): Promise<boolean> {
    try {
      const subscription = await subscriptionService.getActiveSubscription(userId);
      const planName = subscription?.planName ?? 'FREE';
      const rules = getPlanRules(planName);

      if (type === 'STOCK') {
        return this.canAccessStock(symbol, [...rules.stockAccess]);
      }

      if (type === 'MUTUAL_FUND') {
        return this.canAccessMutualFund(symbol, rules.mutualFundAccess);
      }

      if (type === 'INDEX') {
        return this.canAccessIndex(symbol, [...rules.indicesAccess]);
      }

      return false;
    } catch (error) {
      logger.error('Error checking symbol access', { userId, symbol, type, error });
      // Default to false on error
      return false;
    }
  }

  /**
   * Check stock access based on plan rules
   */
  private canAccessStock(symbol: string, stockAccess: StockAccess[]): boolean {
    // If plan has ALL access, allow everything
    if (stockAccess.includes(StockAccess.ALL)) {
      return true;
    }

    // Check if symbol is in NIFTY50
    if (stockAccess.includes(StockAccess.NIFTY50)) {
      if (this.isNifty50Stock(symbol)) {
        return true;
      }
    }

    // Check if symbol is in Midcap150
    if (stockAccess.includes(StockAccess.MIDCAP150)) {
      if (this.isMidcap150Stock(symbol)) {
        return true;
      }
    }

    // Check if symbol is Smallcap (any stock not in NIFTY50 or Midcap150)
    if (stockAccess.includes(StockAccess.SMALLCAP)) {
      if (!this.isNifty50Stock(symbol) && !this.isMidcap150Stock(symbol)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check mutual fund access based on plan rules
   */
  private canAccessMutualFund(symbol: string, mutualFundAccess: MutualFundAccess): boolean {
    if (mutualFundAccess === MutualFundAccess.ALL) {
      return true;
    }

    if (mutualFundAccess === MutualFundAccess.TOP_30) {
      return this.isTop30MutualFund(symbol);
    }

    if (mutualFundAccess === MutualFundAccess.TOP_15) {
      return this.isTop15MutualFund(symbol);
    }

    return false;
  }

  /**
   * Check index access based on plan rules
   */
  private canAccessIndex(symbol: string, indicesAccess: string[]): boolean {
    if (indicesAccess.includes('ALL')) {
      return true;
    }

    if (indicesAccess.includes('TOP_5')) {
      return TOP_5_INDICES.includes(symbol);
    }

    return false;
  }

  /**
   * Filter symbols by user's subscription plan
   * Returns all symbols but marks inaccessible ones with isAccessible flag
   * Frontend will display locked state for inaccessible symbols
   * @param userId - User ID, or empty string for unauthenticated users (defaults to FREE)
   */
  async filterSymbolsByPlan(
    userId: string,
    symbols: SymbolSuggestion[]
  ): Promise<SymbolSuggestion[]> {
    try {
      // For empty userId (unauthenticated users), default to FREE plan
      const planName = userId 
        ? ((await subscriptionService.getActiveSubscription(userId))?.planName ?? 'FREE')
        : 'FREE';
      const rules = getPlanRules(planName);

      return symbols
        .map((symbol) => {
          let isAccessible = false;
          
          if (symbol.type === 'STOCK') {
            // For stocks, check accessibility but don't filter out
            isAccessible = this.canAccessStock(symbol.symbol, [...rules.stockAccess]);
            return { ...symbol, isAccessible };
          } else if (symbol.type === 'MUTUAL_FUND') {
            // For mutual funds, check accessibility but don't filter out
            isAccessible = this.canAccessMutualFund(symbol.symbol, rules.mutualFundAccess);
            return { ...symbol, isAccessible };
          } else if (symbol.type === 'INDEX') {
            // For indices, check accessibility but don't filter out
            isAccessible = this.canAccessIndex(symbol.symbol, [...rules.indicesAccess]);
            return { ...symbol, isAccessible };
          }
          
          return { ...symbol, isAccessible };
        })
        .filter((symbol) => {
          // Show all symbols - they're all marked with isAccessible flag
          // Frontend will handle locked state display
          return true;
        });
    } catch (error) {
      logger.error('Error filtering symbols by plan', { userId, error });
      // Return empty array on error
      return [];
    }
  }

  /**
   * Check if user can create more watchlists
   * Returns { allowed: boolean, current: number, max: number }
   * Note: Limit is per type/market (e.g., 4 watchlists for STOCK type in INDIA market)
   */
  async checkWatchlistLimit(
    userId: string,
    type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND',
    market: 'INDIA' | 'USA'
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    try {
      const limits = await subscriptionService.getSubscriptionLimits(userId);
      const maxWatchlists = limits.maxWatchlists;

      // Count watchlists for the specific type and market
      const existingWatchlists = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(watchlists)
        .where(
          and(
            eq(watchlists.userId, userId),
            eq(watchlists.market, market),
            eq(watchlists.type, type)
          )
        );

      const currentCount = Number(existingWatchlists[0]?.count ?? 0);

      return {
        allowed: currentCount < maxWatchlists,
        current: currentCount,
        max: maxWatchlists,
      };
    } catch (error) {
      logger.error('Error checking watchlist limit', { userId, type, market, error });
      // Default to not allowed on error
      return {
        allowed: false,
        current: 0,
        max: 0,
      };
    }
  }

  /**
   * Check if watchlist can have more assets
   * Returns { allowed: boolean, current: number, max: number }
   */
  async checkAssetLimit(
    watchlistId: string,
    userId: string
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    try {
      const limits = await subscriptionService.getSubscriptionLimits(userId);
      const maxAssets = limits.maxAssetsPerWatchlist;

      // Verify watchlist belongs to user
      const watchlistRecord = await db
        .select()
        .from(watchlists)
        .where(
          and(
            eq(watchlists.id, watchlistId),
            eq(watchlists.userId, userId)
          )
        )
        .limit(1);

      if (watchlistRecord.length === 0) {
        return {
          allowed: false,
          current: 0,
          max: 0,
        };
      }

      // Count active items in watchlist
      const activeItems = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(watchlist)
        .where(
          and(
            eq(watchlist.watchlistId, watchlistId),
            eq(watchlist.active, true)
          )
        );

      const currentCount = Number(activeItems[0]?.count ?? 0);

      return {
        allowed: currentCount < maxAssets,
        current: currentCount,
        max: maxAssets,
      };
    } catch (error) {
      logger.error('Error checking asset limit', { watchlistId, userId, error });
      // Default to not allowed on error
      return {
        allowed: false,
        current: 0,
        max: 0,
      };
    }
  }

  /**
   * Helper: Check if stock is in NIFTY50
   */
  private isNifty50Stock(symbol: string): boolean {
    return NIFTY50_STOCKS.includes(symbol.toUpperCase());
  }

  /**
   * Helper: Check if stock is in Midcap150
   */
  private isMidcap150Stock(symbol: string): boolean {
    // If Midcap150 list is populated, check it
    if (MIDCAP150_STOCKS.length > 0) {
      return MIDCAP150_STOCKS.includes(symbol.toUpperCase());
    }
    // Otherwise, if not NIFTY50, consider it midcap/smallcap
    return !this.isNifty50Stock(symbol);
  }

  /**
   * Helper: Check if mutual fund is in Top 15
   */
  private isTop15MutualFund(symbol: string): boolean {
    return TOP_15_MUTUAL_FUNDS.includes(symbol);
  }

  /**
   * Helper: Check if mutual fund is in Top 30
   */
  private isTop30MutualFund(symbol: string): boolean {
    return TOP_30_MUTUAL_FUNDS.includes(symbol);
  }
}

// Export singleton instance
export const accessControlService = new AccessControlService();

