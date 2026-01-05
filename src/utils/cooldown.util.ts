import { redisClient } from './redis.client';
import logger from './logger';

const COOLDOWN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days TTL for cleanup

/**
 * Alert tracking data structure
 */
export interface AlertTracking {
  lastAlertPrice: number;
  lastAlertDate: string; // ISO date string (YYYY-MM-DD)
  highestThreshold: number;
  timeframe: 'day' | 'week' | 'month' | 'year';
  market: 'INDIA' | 'USA';
}

/**
 * Get alert tracking data for a symbol
 * @param symbol - Stock/index symbol
 * @param market - Market type (INDIA or USA)
 * @returns Alert tracking data or null if none exists
 */
export async function getAlertTracking(
  symbol: string,
  market: 'INDIA' | 'USA'
): Promise<AlertTracking | null> {
  try {
    const key = `alert:tracking:${market}:${symbol}`;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as AlertTracking;
  } catch (error) {
    logger.error('Error getting alert tracking', { symbol, market, error });
    return null;
  }
}

/**
 * Set alert tracking data for a symbol
 * @param symbol - Stock/index symbol
 * @param market - Market type (INDIA or USA)
 * @param tracking - Alert tracking data
 */
export async function setAlertTracking(
  symbol: string,
  market: 'INDIA' | 'USA',
  tracking: AlertTracking
): Promise<void> {
  try {
    const key = `alert:tracking:${market}:${symbol}`;
    await redisClient.setEx(key, COOLDOWN_TTL_SECONDS, JSON.stringify(tracking));
  } catch (error) {
    logger.error('Error setting alert tracking', { symbol, market, error });
  }
}

/**
 * Check if alert should be sent based on new cooldown logic
 *
 * Logic:
 * 1. If new day (today > lastAlertDate) AND still crosses threshold → ALERT
 * 2. If same day BUT price dropped 5%+ from lastAlertPrice → ALERT
 * 3. Otherwise → NO ALERT
 *
 * @param symbol - Stock/index symbol
 * @param currentPrice - Current price
 * @param threshold - Drop threshold that was crossed
 * @param market - Market type (INDIA or USA)
 * @returns { shouldAlert, reason } - Whether to alert and why
 */
export async function shouldSendAlert(
  symbol: string,
  currentPrice: number,
  _threshold: number,
  market: 'INDIA' | 'USA'
): Promise<{ shouldAlert: boolean; reason: string }> {
  try {
    const tracking = await getAlertTracking(symbol, market);

    // No previous alert - send it
    if (!tracking) {
      return { shouldAlert: true, reason: 'first_alert' };
    }

    // Get current date in market timezone
    const timezone = market === 'USA' ? 'America/New_York' : 'Asia/Kolkata';
    const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD format

    // Check if it's a new day
    if (currentDate > tracking.lastAlertDate) {
      return { shouldAlert: true, reason: 'new_day' };
    }

    // Same day - check if price dropped 5%+ from last alert
    const priceDropPercent = ((tracking.lastAlertPrice - currentPrice) / tracking.lastAlertPrice) * 100;

    if (priceDropPercent >= 5) {
      return { shouldAlert: true, reason: 'further_drop_5_percent' };
    }

    // Same day, not 5% further drop
    return { shouldAlert: false, reason: 'cooldown_active' };

  } catch (error) {
    logger.error('Error checking if should send alert', { symbol, market, error });
    // On error, allow alert (fail open)
    return { shouldAlert: true, reason: 'error_fail_open' };
  }
}

/**
 * Check if recovery alert should be sent (5%+ recovery from last alert price)
 * @param symbol - Stock/index symbol
 * @param currentPrice - Current price
 * @param market - Market type (INDIA or USA)
 * @returns { shouldAlert, recoveryPercent } - Whether to alert and recovery percentage
 */
export async function shouldSendRecoveryAlert(
  symbol: string,
  currentPrice: number,
  market: 'INDIA' | 'USA'
): Promise<{ shouldAlert: boolean; recoveryPercent: number; lastAlertPrice: number }> {
  try {
    const tracking = await getAlertTracking(symbol, market);

    // No previous alert - no recovery to track
    if (!tracking) {
      return { shouldAlert: false, recoveryPercent: 0, lastAlertPrice: 0 };
    }

    // Calculate recovery percentage from last alert price
    const recoveryPercent = ((currentPrice - tracking.lastAlertPrice) / tracking.lastAlertPrice) * 100;

    // Recovery of 5%+ from last alert
    if (recoveryPercent >= 5) {
      return { shouldAlert: true, recoveryPercent, lastAlertPrice: tracking.lastAlertPrice };
    }

    return { shouldAlert: false, recoveryPercent, lastAlertPrice: tracking.lastAlertPrice };

  } catch (error) {
    logger.error('Error checking recovery alert', { symbol, market, error });
    return { shouldAlert: false, recoveryPercent: 0, lastAlertPrice: 0 };
  }
}

/**
 * Clear alert tracking for a symbol (useful for testing)
 * @param symbol - Stock/index symbol
 * @param market - Market type (INDIA or USA)
 */
export async function clearAlertTracking(
  symbol: string,
  market: 'INDIA' | 'USA'
): Promise<void> {
  try {
    const key = `alert:tracking:${market}:${symbol}`;
    await redisClient.del(key);
  } catch (error) {
    logger.error('Error clearing alert tracking', { symbol, market, error });
  }
}


