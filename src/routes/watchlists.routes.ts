import { Router, Request, Response } from 'express';
import { db } from '../db';
import { watchlists, watchlist } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
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
 * GET /api/watchlists
 * Get all watchlists for a market and type
 * Query params: market (optional, defaults to INDIA), type (required)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
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
        eq(watchlists.market, market as 'INDIA' | 'USA'),
        eq(watchlists.type, type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND')
      ))
      .orderBy(watchlists.order);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error fetching watchlists', { error, market: req.query.market, type: req.query.type });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch watchlists',
    });
  }
});

/**
 * POST /api/watchlists
 * Create a new watchlist
 * Body: { name, type (required), market (optional, defaults to INDIA) }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
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

    // Get the highest order value for this market and type
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${watchlists.order}), -1)` })
      .from(watchlists)
      .where(and(
        eq(watchlists.market, market as 'INDIA' | 'USA'),
        eq(watchlists.type, type as 'INDEX' | 'STOCK' | 'MUTUAL_FUND')
      ));

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const result = await db
      .insert(watchlists)
      .values({
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
 * Update a watchlist (name, order)
 * Body: { name? (optional), order? (optional) }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
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
      .where(eq(watchlists.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
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
 * Delete a watchlist
 * Query params: market (optional, defaults to INDIA)
 * Note: This will also delete all symbols in the watchlist
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
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

    // Check if watchlist exists
    const existingWatchlist = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, id), eq(watchlists.market, market as 'INDIA' | 'USA')))
      .limit(1);

    if (existingWatchlist.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found for this market',
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
 * Reorder multiple watchlists
 * Body: { watchlistIds: string[] } - array of watchlist IDs in desired order
 * Query params: market (optional, defaults to INDIA), type (required)
 */
router.post('/reorder', async (req: Request, res: Response) => {
  try {
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

    // Update order for each watchlist
    const updates = watchlistIds.map((watchlistId: string, index: number) =>
      db
        .update(watchlists)
        .set({ order: index, updatedAt: new Date() })
        .where(and(
          eq(watchlists.id, watchlistId),
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

