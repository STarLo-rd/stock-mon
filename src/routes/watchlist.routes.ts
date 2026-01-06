import { Router, Request, Response } from 'express';
import { db } from '../db';
import { watchlist, watchlists } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { checkSubscription, SubscriptionRequest } from '../middleware/subscription.middleware';
import { accessControlService } from '../services/access-control.service';
import { subscriptionService } from '../services/subscription.service';
import { SymbolSearchService } from '../services/symbol-search.service';
import { CacheService } from '../services/cache.service';
import { ApiFactoryService } from '../services/api-factory.service';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();
const symbolSearch = new SymbolSearchService();
const cache = new CacheService();
const apiFactory = new ApiFactoryService();

/**
 * Validate market parameter
 */
function validateMarket(market: any): market is 'INDIA' | 'USA' {
  return market === 'INDIA' || market === 'USA';
}

/**
 * GET /api/watchlist
 * Get all symbols in watchlist (user-scoped)
 * Query params: watchlistId (required), active (optional), market (optional, defaults to INDIA)
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { watchlistId, active, market = 'INDIA' } = req.query;

    if (!watchlistId) {
      return res.status(400).json({
        success: false,
        error: 'watchlistId is required',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    // Verify watchlist exists, belongs to the market, and belongs to the user
    const watchlistExists = await db
      .select()
      .from(watchlists)
      .where(and(
        eq(watchlists.id, watchlistId as string),
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA')
      ))
      .limit(1);

    if (watchlistExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found or you do not have permission to access it',
      });
    }

    const conditions = [
      eq(watchlist.market, market as 'INDIA' | 'USA'),
      eq(watchlist.watchlistId, watchlistId as string),
    ];

    if (active !== undefined) {
      const activeFilter = active === 'true';
      conditions.push(eq(watchlist.active, activeFilter));
      logger.debug('Filtering watchlist items by active status', { 
        watchlistId, 
        userId, 
        market, 
        activeFilter 
      });
    }

    const results = await db
      .select()
      .from(watchlist)
      .where(and(...conditions))
      .orderBy(watchlist.order);

    logger.debug('Fetched watchlist items', { 
      watchlistId, 
      userId, 
      market, 
      itemCount: results.length,
      activeFilter: active !== undefined ? (active === 'true') : 'all'
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error fetching watchlist', { error, market: req.query.market, watchlistId: req.query.watchlistId });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch watchlist',
    });
  }
});

/**
 * POST /api/watchlist
 * Add a symbol to watchlist (user-scoped)
 * Validates symbol exists before adding
 * Body: { symbol, type, watchlistId (required), market (required), exchange (optional, defaults to NSE for INDIA), name (optional) }
 */
router.post('/', requireAuth, checkSubscription, async (req: SubscriptionRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, exchange, type, watchlistId, market = 'INDIA', name } = req.body;

    if (!symbol || !type || !watchlistId || !market) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, type, watchlistId, and market are required',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    if (type !== 'INDEX' && type !== 'STOCK' && type !== 'MUTUAL_FUND') {
      return res.status(400).json({
        success: false,
        error: 'Type must be either INDEX, STOCK, or MUTUAL_FUND',
      });
    }

    // Verify watchlist exists, belongs to the market, belongs to the user, and matches symbol type
    const watchlistExists = await db
      .select()
      .from(watchlists)
      .where(and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA')
      ))
      .limit(1);

    if (watchlistExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found or you do not have permission to add symbols to it',
      });
    }

    // Validate that symbol type matches watchlist type
    if (watchlistExists[0].type !== type) {
      return res.status(400).json({
        success: false,
        error: `Symbol type (${type}) does not match watchlist type (${watchlistExists[0].type}). This watchlist only accepts ${watchlistExists[0].type} symbols.`,
      });
    }

    // Determine exchange based on market and type if not provided
    const finalExchange = exchange ?? (
      market === 'USA' ? 'NYSE' :
      type === 'MUTUAL_FUND' ? 'MF' :
      'NSE'
    );

    // Get symbol name if not provided (for mutual funds and when searching)
    let symbolName = name;
    if (!symbolName && type === 'MUTUAL_FUND') {
      // Try to get name from mutual fund API
      try {
        const { MutualFundApiService } = await import('../services/mutual-fund-api.service');
        const mfService = new MutualFundApiService();
        const schemeCode = parseInt(symbol, 10);
        if (!isNaN(schemeCode)) {
          const schemeInfo = await mfService.getSchemeInfo(schemeCode);
          if (schemeInfo) {
            symbolName = schemeInfo.scheme_name;
          }
        }
      } catch (error) {
        // If we can't get the name, continue without it
        logger.warn(`Could not fetch name for mutual fund ${symbol}:`, error);
      }
    }

    // Validate symbol exists
    if (market === 'INDIA') {
      // For INDIA market, validate based on type
      const validation = await symbolSearch.validateSymbol(symbol, type);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error || 'Symbol not found',
        });
      }
      
      // If name not provided and we got a suggestion from search, try to get it
      if (!symbolName && type === 'MUTUAL_FUND') {
        const searchResults = await symbolSearch.searchSymbols(symbol, 'MUTUAL_FUND');
        const match = searchResults.find(s => s.symbol === symbol);
        if (match && match.name) {
          symbolName = match.name;
        }
      }
    } else {
      // For USA market, validate via Yahoo Finance API
      const isIndex = type === 'INDEX';
      const priceData = await apiFactory.getPrice(symbol, isIndex, 'USA');
      if (!priceData) {
        return res.status(400).json({
          success: false,
          error: `Symbol "${symbol}" not found on USA market. Please check the symbol name.`,
        });
      }
    }

    // Check if user can access this symbol based on subscription (for INDIA market only)
    if (market === 'INDIA') {
      const canAccess = await accessControlService.canAccessSymbol(userId, symbol, type);
      if (!canAccess) {
        const subscription = await subscriptionService.getActiveSubscription(userId);
        const planName = subscription?.planName ?? 'FREE';
        
        let errorMessage = '';
        if (type === 'STOCK') {
          errorMessage = `This stock is not available in ${planName} plan. FREE tier users can only access NIFTY50 stocks.`;
        } else if (type === 'MUTUAL_FUND') {
          errorMessage = `This mutual fund is not available in ${planName} plan. FREE tier users can only access top 15 mutual funds.`;
        } else if (type === 'INDEX') {
          errorMessage = `This index is not available in ${planName} plan. FREE tier users can only access top 5 indices.`;
        }
        
        return res.status(403).json({
          success: false,
          error: errorMessage,
          requiresUpgrade: true,
          planName,
        });
      }
    }

    // Check watchlist item limit using subscription-based limits
    const limitCheck = await accessControlService.checkAssetLimit(watchlistId, userId);
    
    if (!limitCheck.allowed) {
      logger.warn('Watchlist limit reached', { 
        watchlistId, 
        userId, 
        currentCount: limitCheck.current, 
        maxLimit: limitCheck.max,
        market,
        type 
      });
      return res.status(403).json({
        success: false,
        error: `This watchlist has reached the limit of ${limitCheck.max} items. Please upgrade to add more items.`,
        limitReached: true,
        limitType: 'watchlist_item',
        currentCount: limitCheck.current,
        maxLimit: limitCheck.max,
      });
    }

    // Check if symbol already exists in this watchlist
    const existing = await db
      .select()
      .from(watchlist)
      .where(and(
        eq(watchlist.symbol, symbol),
        eq(watchlist.watchlistId, watchlistId),
        eq(watchlist.market, market as 'INDIA' | 'USA')
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Symbol already exists in this watchlist',
      });
    }

    // Get the highest order value for this watchlist
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${watchlist.order}), -1)` })
      .from(watchlist)
      .where(eq(watchlist.watchlistId, watchlistId));

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const result = await db
      .insert(watchlist)
      .values({
        symbol,
        name: symbolName ?? null,
        market,
        exchange: finalExchange,
        type,
        watchlistId,
        order: nextOrder,
        active: true,
      })
      .returning();

    // Immediately fetch price for the new symbol and update cache
    // This ensures the symbol shows up with a price right away
    // Run this async so it doesn't block the response
    setImmediate(async () => {
      try {
        const isIndex = type === 'INDEX';
        // For mutual funds, pass false for isIndex (they're handled separately)
        const priceData = await apiFactory.getPrice(symbol, isIndex, market);

        if (priceData) {
          // Update cache immediately with correct market
          const currentPrices = await cache.getCurrentPrices(market) || new Map();
          currentPrices.set(symbol, priceData);
          await cache.setCurrentPrices(currentPrices, market);
          
          logger.info(`Fetched and cached price for newly added symbol`, { symbol, market, price: priceData.price });
        } else {
          logger.warn(`Could not fetch price for newly added symbol`, { symbol, market });
        }
      } catch (error) {
        // Don't fail the request if price fetch fails - cron will fetch it later
        logger.error(`Error fetching price for newly added symbol`, { symbol, market, error });
      }
    });

    res.status(201).json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    logger.error('Error adding to watchlist', { error, symbol: req.body.symbol, market: req.body.market });
    res.status(500).json({
      success: false,
      error: 'Failed to add symbol to watchlist',
    });
  }
});

/**
 * DELETE /api/watchlist/:symbol
 * Remove a symbol from watchlist (user-scoped)
 * Query params: watchlistId (required), market (optional, defaults to INDIA)
 */
router.delete('/:symbol', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol } = req.params;
    const { watchlistId, market = 'INDIA' } = req.query;

    if (!watchlistId) {
      return res.status(400).json({
        success: false,
        error: 'watchlistId is required',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    // Verify watchlist ownership before deleting
    const watchlistExists = await db
      .select()
      .from(watchlists)
      .where(and(
        eq(watchlists.id, watchlistId as string),
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA')
      ))
      .limit(1);

    if (watchlistExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found or you do not have permission to modify it',
      });
    }

    const result = await db
      .delete(watchlist)
      .where(and(
        eq(watchlist.symbol, symbol),
        eq(watchlist.watchlistId, watchlistId as string),
        eq(watchlist.market, market as 'INDIA' | 'USA')
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Symbol not found in watchlist for this market',
      });
    }

    res.json({
      success: true,
      message: 'Symbol removed from watchlist',
    });
  } catch (error) {
    logger.error('Error removing from watchlist', { error, symbol: req.params.symbol, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to remove symbol from watchlist',
    });
  }
});

/**
 * PATCH /api/watchlist/:symbol
 * Update watchlist entry (e.g., toggle active status, reorder) - user-scoped
 * Query params: watchlistId (required), market (optional, defaults to INDIA)
 * Body: { active? (optional), order? (optional) }
 */
router.patch('/:symbol', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol } = req.params;
    const { watchlistId, market = 'INDIA' } = req.query;
    const { active, order } = req.body;

    if (!watchlistId) {
      return res.status(400).json({
        success: false,
        error: 'watchlistId is required',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    if (active === undefined && order === undefined) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (active or order) must be provided',
      });
    }

    // Verify watchlist ownership
    const watchlistExists = await db
      .select()
      .from(watchlists)
      .where(and(
        eq(watchlists.id, watchlistId as string),
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA')
      ))
      .limit(1);

    if (watchlistExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found or you do not have permission to modify it',
      });
    }

    const updateData: any = { updatedAt: new Date() };
    if (active !== undefined) {
      updateData.active = active;
    }
    if (order !== undefined) {
      if (typeof order !== 'number' || order < 0) {
        return res.status(400).json({
          success: false,
          error: 'Order must be a non-negative number',
        });
      }
      updateData.order = order;
    }

    const result = await db
      .update(watchlist)
      .set(updateData)
      .where(and(
        eq(watchlist.symbol, symbol),
        eq(watchlist.watchlistId, watchlistId as string),
        eq(watchlist.market, market as 'INDIA' | 'USA')
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Symbol not found in watchlist for this market',
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    logger.error('Error updating watchlist', { error, symbol: req.params.symbol, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to update watchlist',
    });
  }
});

/**
 * POST /api/watchlist/reorder
 * Reorder symbols within a watchlist (user-scoped)
 * Query params: watchlistId (required), market (optional, defaults to INDIA)
 * Body: { symbolIds: string[] } - array of symbol IDs in desired order
 */
router.post('/reorder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbolIds } = req.body;
    const { watchlistId, market = 'INDIA' } = req.query;

    if (!watchlistId) {
      return res.status(400).json({
        success: false,
        error: 'watchlistId is required',
      });
    }

    if (!Array.isArray(symbolIds) || symbolIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'symbolIds must be a non-empty array',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    // Verify watchlist ownership
    const watchlistExists = await db
      .select()
      .from(watchlists)
      .where(and(
        eq(watchlists.id, watchlistId as string),
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA')
      ))
      .limit(1);

    if (watchlistExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found or you do not have permission to modify it',
      });
    }

    // Update order for each symbol
    const updates = symbolIds.map((symbolId: string, index: number) =>
      db
        .update(watchlist)
        .set({ order: index, updatedAt: new Date() })
        .where(and(
          eq(watchlist.id, symbolId),
          eq(watchlist.watchlistId, watchlistId as string),
          eq(watchlist.market, market as 'INDIA' | 'USA')
        ))
    );

    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Symbols reordered successfully',
    });
  } catch (error) {
    logger.error('Error reordering symbols', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to reorder symbols',
    });
  }
});

export default router;

