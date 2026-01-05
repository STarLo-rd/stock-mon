import { Router, Request, Response } from 'express';
import { db } from '../db';
import { alerts } from '../db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/alerts
 * Get alert history with optional filters
 * Query params: symbol, threshold, timeframe, startDate, endDate, critical, market (optional), limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
  try {
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

    // Apply filters
    const conditions = [];

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

    let query = db.select().from(alerts);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Order by timestamp descending and apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    const results = await query.orderBy(desc(alerts.timestamp)).limit(limitNum).offset(offsetNum);

    // Get total count for pagination
    const totalCount = await db
      .select()
      .from(alerts)
      .where(conditions.length > 0 ? (and(...conditions) as any) : undefined);

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
 * Get only today's alerts (filtered by date)
 * Query params: market (optional), limit, offset
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
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

    // Build conditions
    const conditions = [gte(alerts.timestamp, startOfToday)];

    if (market) {
      conditions.push(eq(alerts.market, market as 'INDIA' | 'USA'));
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Get today's alerts
    const results = await db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.timestamp))
      .limit(limitNum)
      .offset(offsetNum);

    // Get total count for pagination
    const totalCount = await db
      .select()
      .from(alerts)
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
 * Get a specific alert by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    logger.error('Error fetching alert', { error, alertId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert',
    });
  }
});

export default router;

