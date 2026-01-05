import { Router, Request, Response } from 'express';
import { db } from '../db';
import { alerts, watchlist, watchlists, userAlerts } from '../db/schema';
import { eq, desc, and, gte, lte, inArray } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/alerts
 * Get alert history with optional filters (user-scoped)
 * Query params: symbol, threshold, timeframe, startDate, endDate, critical, market (optional), limit, offset
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      symbol,
      threshold,
      timeframe,
      startDate,
      endDate,
      critical,
      market,
      limit = '50',
      offset = '0',
    } = req.query;

    // Validate market if provided
    if (market && market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    // Apply filters (join with user_alerts to filter by userId)
    const conditions = [eq(userAlerts.userId, userId)];

    if (symbol) {
      conditions.push(eq(alerts.symbol, symbol as string));
    }

    if (market) {
      conditions.push(eq(alerts.market, market as 'INDIA' | 'USA'));
    }

    if (threshold) {
      conditions.push(eq(alerts.threshold, parseInt(threshold as string, 10)));
    }

    if (timeframe) {
      conditions.push(eq(alerts.timeframe, timeframe as string));
    }

    if (critical !== undefined) {
      conditions.push(eq(alerts.critical, critical === 'true'));
    }

    if (startDate) {
      conditions.push(gte(alerts.timestamp, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(alerts.timestamp, new Date(endDate as string)));
    }

    // Join with watchlist to get name and type for mutual funds
    // Use a subquery to get distinct name/type per symbol (to avoid duplicates)
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Get alerts joined with user_alerts to filter by userId
    const alertResults = await db
      .select({
        id: alerts.id,
        symbol: alerts.symbol,
        market: alerts.market,
        dropPercentage: alerts.dropPercentage,
        threshold: alerts.threshold,
        timeframe: alerts.timeframe,
        price: alerts.price,
        historicalPrice: alerts.historicalPrice,
        timestamp: alerts.timestamp,
        critical: alerts.critical,
        notified: userAlerts.notified,
        read: userAlerts.read,
        dismissed: userAlerts.dismissed,
      })
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(and(...conditions))
      .orderBy(desc(alerts.timestamp))
      .limit(limitNum)
      .offset(offsetNum);

    // Then enrich with name and type from watchlist
    const symbolSet = new Set(alertResults.map(a => a.symbol));
    const symbols = Array.from(symbolSet);

    const watchlistData = symbols.length > 0
      ? await db
          .select({
            symbol: watchlist.symbol,
            name: watchlist.name,
            type: watchlist.type,
          })
          .from(watchlist)
          .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
          .where(and(
            eq(watchlists.userId, userId),
            inArray(watchlist.symbol, symbols)
          ))
          .groupBy(watchlist.symbol, watchlist.name, watchlist.type)
      : [];

    // Create a map for quick lookup
    const nameTypeMap = new Map<string, { name: string | null; type: string | null }>();
    watchlistData.forEach(item => {
      if (!nameTypeMap.has(item.symbol)) {
        nameTypeMap.set(item.symbol, { name: item.name, type: item.type });
      }
    });

    // Enrich alerts with name and type
    const results = alertResults.map(alert => ({
      ...alert,
      name: nameTypeMap.get(alert.symbol)?.name ?? null,
      type: nameTypeMap.get(alert.symbol)?.type ?? null,
    }));

    // Get total count for pagination (user-scoped)
    const totalCount = await db
      .select()
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(and(...conditions));

    res.json({
      success: true,
      data: results,
      pagination: {
        total: totalCount.length,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    logger.error('Error fetching alerts', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

/**
 * GET /api/alerts/today
 * Get only today's alerts (filtered by date) - user-scoped
 * Query params: market (optional), limit, offset
 */
router.get('/today', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { market, limit = '50', offset = '0' } = req.query;

    // Validate market if provided
    if (market && market !== 'INDIA' && market !== 'USA') {
      return res.status(400).json({
        success: false,
        error: 'Market must be either INDIA or USA',
      });
    }

    // Get start of today in market timezone
    const now = new Date();
    let startOfToday: Date;

    if (market === 'USA') {
      // USA market: Use EST/EDT timezone
      const usaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      startOfToday = new Date(usaDate);
      startOfToday.setHours(0, 0, 0, 0);
      // Convert back to UTC for database comparison
      const utcOffset = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTime();
      startOfToday = new Date(startOfToday.getTime() - utcOffset);
    } else {
      // INDIA market: Use IST timezone (default)
      const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      startOfToday = new Date(istDate);
      startOfToday.setHours(0, 0, 0, 0);
      // Convert back to UTC for database comparison
      const utcOffset = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getTime();
      startOfToday = new Date(startOfToday.getTime() - utcOffset);
    }

    // Build conditions (join with user_alerts to filter by userId)
    const conditions = [
      eq(userAlerts.userId, userId),
      gte(alerts.timestamp, startOfToday),
    ];

    if (market) {
      conditions.push(eq(alerts.market, market as 'INDIA' | 'USA'));
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Get today's alerts joined with user_alerts to filter by userId
    const alertResults = await db
      .select({
        id: alerts.id,
        symbol: alerts.symbol,
        market: alerts.market,
        dropPercentage: alerts.dropPercentage,
        threshold: alerts.threshold,
        timeframe: alerts.timeframe,
        price: alerts.price,
        historicalPrice: alerts.historicalPrice,
        timestamp: alerts.timestamp,
        critical: alerts.critical,
        notified: userAlerts.notified,
        read: userAlerts.read,
        dismissed: userAlerts.dismissed,
      })
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(and(...conditions))
      .orderBy(desc(alerts.timestamp))
      .limit(limitNum)
      .offset(offsetNum);

    // Then enrich with name and type from watchlist
    const symbolSet = new Set(alertResults.map(a => a.symbol));
    const symbols = Array.from(symbolSet);

    const watchlistData = symbols.length > 0
      ? await db
          .select({
            symbol: watchlist.symbol,
            name: watchlist.name,
            type: watchlist.type,
          })
          .from(watchlist)
          .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
          .where(and(
            eq(watchlists.userId, userId),
            inArray(watchlist.symbol, symbols)
          ))
          .groupBy(watchlist.symbol, watchlist.name, watchlist.type)
      : [];

    // Create a map for quick lookup
    const nameTypeMap = new Map<string, { name: string | null; type: string | null }>();
    watchlistData.forEach(item => {
      if (!nameTypeMap.has(item.symbol)) {
        nameTypeMap.set(item.symbol, { name: item.name, type: item.type });
      }
    });

    // Enrich alerts with name and type
    const results = alertResults.map(alert => ({
      ...alert,
      name: nameTypeMap.get(alert.symbol)?.name ?? null,
      type: nameTypeMap.get(alert.symbol)?.type ?? null,
    }));

    // Get total count for pagination
    const totalCount = await db
      .select()
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(and(...conditions));

    res.json({
      success: true,
      data: results,
      pagination: {
        total: totalCount.length,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    logger.error('Error fetching today\'s alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s alerts',
    });
  }
});

/**
 * GET /api/alerts/:id
 * Get a specific alert by ID (user-scoped)
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Get alert joined with user_alerts to verify ownership
    const alertResult = await db
      .select({
        id: alerts.id,
        symbol: alerts.symbol,
        market: alerts.market,
        dropPercentage: alerts.dropPercentage,
        threshold: alerts.threshold,
        timeframe: alerts.timeframe,
        price: alerts.price,
        historicalPrice: alerts.historicalPrice,
        timestamp: alerts.timestamp,
        critical: alerts.critical,
        notified: userAlerts.notified,
        read: userAlerts.read,
        dismissed: userAlerts.dismissed,
      })
      .from(alerts)
      .innerJoin(userAlerts, eq(alerts.id, userAlerts.alertId))
      .where(and(
        eq(alerts.id, id),
        eq(userAlerts.userId, userId)
      ))
      .limit(1);

    if (alertResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or you do not have permission to view it',
      });
    }

    const alert = alertResult[0];

    // Get name and type from watchlist
    const watchlistData = await db
      .select({
        symbol: watchlist.symbol,
        name: watchlist.name,
        type: watchlist.type,
      })
      .from(watchlist)
      .innerJoin(watchlists, eq(watchlist.watchlistId, watchlists.id))
      .where(and(
        eq(watchlists.userId, userId),
        eq(watchlist.symbol, alert.symbol),
        eq(watchlist.market, alert.market)
      ))
      .limit(1);

    const result = {
      ...alert,
      name: watchlistData[0]?.name ?? null,
      type: watchlistData[0]?.type ?? null,
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching alert', { error, alertId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert',
    });
  }
});

/**
 * PATCH /api/alerts/:id/read
 * Mark an alert as read (user-scoped)
 */
router.patch('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Update user_alerts to mark as read
    const result = await db
      .update(userAlerts)
      .set({ read: true })
      .where(
        and(
          eq(userAlerts.alertId, id),
          eq(userAlerts.userId, userId)
        )
      )
      .returning({ id: userAlerts.id });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or you do not have permission to update it',
      });
    }

    res.json({
      success: true,
      message: 'Alert marked as read',
    });
  } catch (error) {
    logger.error('Error marking alert as read', { error, alertId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to mark alert as read',
    });
  }
});

/**
 * PATCH /api/alerts/:id/dismiss
 * Mark an alert as dismissed (user-scoped)
 */
router.patch('/:id/dismiss', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Update user_alerts to mark as dismissed
    const result = await db
      .update(userAlerts)
      .set({ dismissed: true })
      .where(
        and(
          eq(userAlerts.alertId, id),
          eq(userAlerts.userId, userId)
        )
      )
      .returning({ id: userAlerts.id });

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or you do not have permission to update it',
      });
    }

    res.json({
      success: true,
      message: 'Alert dismissed',
    });
  } catch (error) {
    logger.error('Error dismissing alert', { error, alertId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to dismiss alert',
    });
  }
});

export default router;

