import { db } from '../db';
import { dailySnapshots } from '../db/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import axios from 'axios';

/**
 * Service for managing daily price snapshots
 * Stores only end-of-day closing prices for alert detection
 */
export class DailySnapshotService {
  /**
   * Store daily closing price (called at market close)
   * @param symbol - Stock/index symbol
   * @param closePrice - Closing price
   * @param date - Date (defaults to today)
   */
  async storeDailySnapshot(
    symbol: string,
    closePrice: number,
    date: Date = new Date()
  ): Promise<void> {
    try {
      // Remove time component from date
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      await db
        .insert(dailySnapshots)
        .values({
          symbol,
          date: dateOnly,
          closePrice: closePrice.toString(),
        })
        .onConflictDoUpdate({
          target: [dailySnapshots.symbol, dailySnapshots.date],
          set: {
            closePrice: closePrice.toString(),
          },
        });

      console.log(`[DailySnapshot] ✓ Stored ${symbol}: ₹${closePrice} for ${dateOnly.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error(`[DailySnapshot] Error storing snapshot for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Store snapshots for multiple symbols (bulk operation)
   * @param snapshots - Map of symbol to closing price
   * @param date - Date (defaults to today)
   */
  async storeBulkSnapshots(
    snapshots: Map<string, number>,
    date: Date = new Date()
  ): Promise<void> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    console.log(`[DailySnapshot] Storing ${snapshots.size} snapshots for ${dateOnly.toISOString().split('T')[0]}...`);

    for (const [symbol, closePrice] of snapshots) {
      await this.storeDailySnapshot(symbol, closePrice, dateOnly);
    }

    console.log(`[DailySnapshot] ✅ Stored ${snapshots.size} snapshots`);
  }

  /**
   * Get historical prices for alert detection
   * Returns snapshots from specific dates in the past
   * Falls back to Yahoo Finance when daily_snapshots doesn't have the data
   * @param symbol - Stock/index symbol
   * @returns Historical prices (1d, 1w, 1m, 1y ago)
   */
  async getHistoricalPrices(symbol: string): Promise<{
    day: number | null;
    week: number | null;
    month: number | null;
    year: number | null;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate target dates (accounting for weekends/holidays)
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    // Fetch snapshots with tolerance for weekends/holidays
    const [day, week, month, year] = await Promise.all([
      this.getClosestSnapshot(symbol, oneDayAgo, 3), // ±3 days tolerance
      this.getClosestSnapshot(symbol, oneWeekAgo, 5), // ±5 days tolerance
      this.getClosestSnapshot(symbol, oneMonthAgo, 7), // ±7 days tolerance
      this.getClosestSnapshot(symbol, oneYearAgo, 14), // ±14 days tolerance
    ]);

    // Prepare result
    let result = {
      day: day ? parseFloat(day.closePrice) : null,
      week: week ? parseFloat(week.closePrice) : null,
      month: month ? parseFloat(month.closePrice) : null,
      year: year ? parseFloat(year.closePrice) : null,
    };

    // Fallback to Yahoo Finance for missing data (stocks only)
    if (!day || !week || !month || !year) {
      console.log(`[DailySnapshot] Some historical data missing for ${symbol}, trying Yahoo Finance fallback...`);

      const [yahooDay, yahooWeek, yahooMonth, yahooYear] = await Promise.all([
        !result.day ? this.fetchPriceFromYahooFinance(symbol, oneDayAgo) : null,
        !result.week ? this.fetchPriceFromYahooFinance(symbol, oneWeekAgo) : null,
        !result.month ? this.fetchPriceFromYahooFinance(symbol, oneMonthAgo) : null,
        !result.year ? this.fetchPriceFromYahooFinance(symbol, oneYearAgo) : null,
      ]);

      // Use Yahoo Finance data if daily_snapshots was null
      result = {
        day: result.day || yahooDay,
        week: result.week || yahooWeek,
        month: result.month || yahooMonth,
        year: result.year || yahooYear,
      };
    }

    return result;
  }

  /**
   * Get closest snapshot to target date (handles weekends/holidays)
   * @param symbol - Stock/index symbol
   * @param targetDate - Target date
   * @param toleranceDays - Days to search before/after target
   * @returns Closest snapshot or null
   */
  private async getClosestSnapshot(
    symbol: string,
    targetDate: Date,
    toleranceDays: number = 7
  ): Promise<{ closePrice: string } | null> {
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - toleranceDays);

    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + toleranceDays);

    // Get all snapshots within tolerance window
    const snapshots = await db
      .select()
      .from(dailySnapshots)
      .where(
        and(
          eq(dailySnapshots.symbol, symbol),
          gte(dailySnapshots.date, startDate),
          lte(dailySnapshots.date, endDate)
        )
      )
      .orderBy(dailySnapshots.date);

    if (snapshots.length === 0) {
      return null;
    }

    // Find closest to target date
    let closest = snapshots[0];
    let minDiff = Math.abs(
      new Date(snapshots[0].date).getTime() - targetDate.getTime()
    );

    for (const snapshot of snapshots) {
      const diff = Math.abs(
        new Date(snapshot.date).getTime() - targetDate.getTime()
      );
      if (diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }

    return { closePrice: closest.closePrice };
  }

  /**
   * Get snapshot for a specific date
   * @param symbol - Stock/index symbol
   * @param date - Specific date
   * @returns Snapshot or null
   */
  async getSnapshotByDate(
    symbol: string,
    date: Date
  ): Promise<number | null> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const result = await db
      .select()
      .from(dailySnapshots)
      .where(
        and(
          eq(dailySnapshots.symbol, symbol),
          eq(dailySnapshots.date, dateOnly)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return parseFloat(result[0].closePrice);
  }

  /**
   * Get all snapshots for a symbol within date range
   * @param symbol - Stock/index symbol
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of snapshots
   */
  async getSnapshotRange(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; closePrice: number }>> {
    const results = await db
      .select()
      .from(dailySnapshots)
      .where(
        and(
          eq(dailySnapshots.symbol, symbol),
          gte(dailySnapshots.date, startDate),
          lte(dailySnapshots.date, endDate)
        )
      )
      .orderBy(dailySnapshots.date);

    return results.map((r) => ({
      date: new Date(r.date),
      closePrice: parseFloat(r.closePrice),
    }));
  }

  /**
   * Clean old snapshots (retention policy)
   * Keeps last 400 days (enough for 1-year comparison with buffer)
   * @returns Number of snapshots deleted
   */
  async cleanOldSnapshots(): Promise<number> {
    const retentionDays = 400;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    cutoffDate.setHours(0, 0, 0, 0);

    // Query count before delete (Drizzle ORM doesn't return rowCount)
    const toDelete = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailySnapshots)
      .where(lte(dailySnapshots.date, cutoffDate));

    const count = toDelete[0]?.count || 0;

    // Perform deletion
    if (count > 0) {
      await db
        .delete(dailySnapshots)
        .where(lte(dailySnapshots.date, cutoffDate));
    }
    console.log(
      `[DailySnapshot] Cleaned ${count} old snapshots (older than ${retentionDays} days)`
    );

    return count;
  }

  /**
   * Fetch historical price from Yahoo Finance for a specific date
   * Used as fallback when daily_snapshots doesn't have the data
   * @param symbol - Stock symbol
   * @param targetDate - Target date
   * @returns Price or null
   */
  private async fetchPriceFromYahooFinance(
    symbol: string,
    targetDate: Date
  ): Promise<number | null> {
    try {
      // Skip Yahoo Finance for indices (they don't work with .NS suffix)
      if (symbol.startsWith('NIFTY') || symbol.startsWith('SENSEX')) {
        return null;
      }

      const yahooSymbol = `${symbol}.NS`;

      // Fetch a small range around the target date (±7 days for weekends/holidays)
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 7);

      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 7);

      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          params: {
            period1: period1,
            period2: period2,
            interval: '1d',
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          },
          timeout: 5000,
        }
      );

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        return null;
      }

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      // Find closest date to target
      let closestIndex = -1;
      let minDiff = Infinity;

      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        const diff = Math.abs(date.getTime() - targetDate.getTime());

        if (diff < minDiff && closes[i] !== null && closes[i] !== undefined) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      if (closestIndex >= 0) {
        return closes[closestIndex];
      }

      return null;
    } catch (error) {
      console.error(`[DailySnapshot] Yahoo Finance fallback error for ${symbol}:`, error instanceof Error ? error.message : 'Unknown');
      return null;
    }
  }

  /**
   * Get statistics about stored snapshots
   * @returns Stats object
   */
  async getStats(): Promise<{
    totalSnapshots: number;
    uniqueSymbols: number;
    oldestDate: Date | null;
    newestDate: Date | null;
  }> {
    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        symbols: sql<number>`count(distinct symbol)`,
        oldest: sql<Date>`min(date)`,
        newest: sql<Date>`max(date)`,
      })
      .from(dailySnapshots);

    return {
      totalSnapshots: stats[0].total,
      uniqueSymbols: stats[0].symbols,
      oldestDate: stats[0].oldest,
      newestDate: stats[0].newest,
    };
  }
}
