import { Router, Request, Response } from 'express';
import { db } from '../db';
import { watchlists, watchlist } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest, optionalAuth } from '../middleware/auth.middleware';
import { checkSubscription, SubscriptionRequest, optionalCheckSubscription } from '../middleware/subscription.middleware';
import { accessControlService } from '../services/access-control.service';
import { subscriptionService } from '../services/subscription.service';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Validate type parameter
 */
function validateType(type: any): type is 'INDEX' | 'STOCK' | 'MUTUAL_FUND' {
  return type === 'INDEX' || type === 'STOCK' || type === 'MUTUAL_FUND';
}

const router = Router();

/**
 * Validate market parameter
 */
function validateMarket(market: any): market is 'INDIA' | 'USA' {
  return market === 'INDIA' || market === 'USA';
}

/**
 * GET /api/watchlists/limits
 * Get subscription limits (public endpoint)
 * Returns the current limits for watchlists and items
 * Limits are per type (INDEX, STOCK, MUTUAL_FUND)
 */
router.get('/limits', optionalAuth, optionalCheckSubscription, async (req: SubscriptionRequest, res: Response) => {
  try {
    // If user is authenticated, get their subscription limits
    if (req.userId) {
      const limits = await subscriptionService.getSubscriptionLimits(req.userId);
      
      res.json({
        success: true,
        data: {
          maxWatchlistsPerType: limits.maxWatchlists, // Per type/category limit
          maxItemsPerWatchlist: limits.maxAssetsPerWatchlist,
        },
      });
    } else {
      // For unauthenticated users, return default FREE plan limits
      res.json({
        success: true,
        data: {
          maxWatchlistsPerType: 4, // Per type/category limit
          maxItemsPerWatchlist: 8,
        },
      });
    }
  } catch (error) {
    logger.error('Error fetching limits', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch limits',
    });
  }
});

/**
 * GET /api/watchlists
 * Get all watchlists for a market and type (user-scoped)
 * Query params: market (optional, defaults to INDIA), type (required)
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    // Validate userId is present (should be set by requireAuth middleware)
    if (!userId) {
      logger.error('userId is missing in watchlists GET request', { 
        hasAuthHeader: !!req.headers.authorization,
        query: req.query 
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login again.',
      });
    }

    const { market = 'INDIA', type } = req.query;

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    if (!type || !validateType(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type is required and must be INDEX, STOCK, or MUTUAL_FUND',
      });
    }

    const results = await db
      .select()
      .from(watchlists)
      .where(and(
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA'),
        eq(watchlists.type, type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND')
      ))
      .orderBy(watchlists.order);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error fetching watchlists', { 
      error: errorMessage,
      stack: errorStack,
      userId: req.userId,
      market: req.query.market, 
      type: req.query.type,
      queryString: req.url
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch watchlists',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
});

/**
 * POST /api/watchlists
 * Create a new watchlist (user-scoped)
 * Body: { name, type (required), market (optional, defaults to INDIA) }
 */
router.post('/', requireAuth, checkSubscription, async (req: SubscriptionRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type, market = 'INDIA' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Watchlist name is required and must be a non-empty string',
      });
    }

    if (!type || !validateType(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type is required and must be INDEX, STOCK, or MUTUAL_FUND',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    // Check watchlist limit using subscription-based limits
    const limitCheck = await accessControlService.checkWatchlistLimit(
      userId,
      type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND',
      market as 'INDIA' | 'USA'
    );

    if (!limitCheck.allowed) {
      const typeLabel = type === 'INDEX' ? 'Indices' : type === 'STOCK' ? 'Stocks' : 'Mutual Funds';
      return res.status(403).json({
        success: false,
        error: `You've reached the limit of ${limitCheck.max} watchlists for ${typeLabel}. Please upgrade to create more watchlists.`,
        limitReached: true,
        limitType: 'watchlist',
        currentCount: limitCheck.current,
        maxLimit: limitCheck.max,
      });
    }

    // Get the highest order value for this market and type (user-scoped)
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${watchlists.order}), -1)` })
      .from(watchlists)
      .where(and(
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA'),
        eq(watchlists.type, type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND')
      ));

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const result = await db
      .insert(watchlists)
      .values({
        userId,
        name: name.trim(),
        market: market as 'INDIA' | 'USA',
        type: type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND',
        order: nextOrder,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    logger.error('Error creating watchlist', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create watchlist',
    });
  }
});

/**
 * PATCH /api/watchlists/:id
 * Update a watchlist (name, order) - user-scoped
 * Body: { name? (optional), order? (optional) }
 */
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, order } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Watchlist ID is required',
      });
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Watchlist name must be a non-empty string',
        });
      }
      updateData.name = name.trim();
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

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (name or order) must be provided',
      });
    }

    updateData.updatedAt = new Date();

    const result = await db
      .update(watchlists)
      .set(updateData)
      .where(and(
        eq(watchlists.id, id),
        eq(watchlists.userId, userId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found or you do not have permission to update it',
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    logger.error('Error updating watchlist', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update watchlist',
    });
  }
});

/**
 * DELETE /api/watchlists/:id
 * Delete a watchlist (user-scoped)
 * Query params: market (optional, defaults to INDIA)
 * Note: This will also delete all symbols in the watchlist
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { market = 'INDIA' } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Watchlist ID is required',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    // Check if watchlist exists and belongs to user
    const existingWatchlist = await db
      .select()
      .from(watchlists)
      .where(and(
        eq(watchlists.id, id),
        eq(watchlists.userId, userId),
        eq(watchlists.market, market as 'INDIA' | 'USA')
      ))
      .limit(1);

    if (existingWatchlist.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found or you do not have permission to delete it',
      });
    }

    // Delete all symbols in this watchlist first
    await db.delete(watchlist).where(eq(watchlist.watchlistId, id));

    // Delete the watchlist
    await db.delete(watchlists).where(eq(watchlists.id, id));

    res.json({
      success: true,
      message: 'Watchlist deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting watchlist', { error, id: req.params.id, market: req.query.market });
    res.status(500).json({
      success: false,
      error: 'Failed to delete watchlist',
    });
  }
});

/**
 * POST /api/watchlists/reorder
 * Reorder multiple watchlists (user-scoped)
 * Body: { watchlistIds: string[] } - array of watchlist IDs in desired order
 * Query params: market (optional, defaults to INDIA), type (required)
 */
router.post('/reorder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { watchlistIds } = req.body;
    const { market = 'INDIA', type } = req.query;

    if (!Array.isArray(watchlistIds) || watchlistIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'watchlistIds must be a non-empty array',
      });
    }

    if (!validateMarket(market)) {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    if (!type || !validateType(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type is required and must be INDEX, STOCK, or MUTUAL_FUND',
      });
    }

    // Update order for each watchlist (verify ownership)
    const updates = watchlistIds.map((watchlistId: string, index: number) =>
      db
        .update(watchlists)
        .set({ order: index, updatedAt: new Date() })
        .where(and(
          eq(watchlists.id, watchlistId),
          eq(watchlists.userId, userId),
          eq(watchlists.market, market as 'INDIA' | 'USA'),
          eq(watchlists.type, type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND')
        ))
    );

    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Watchlists reordered successfully',
    });
  } catch (error) {
    logger.error('Error reordering watchlists', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to reorder watchlists',
    });
  }
});

export default router;

