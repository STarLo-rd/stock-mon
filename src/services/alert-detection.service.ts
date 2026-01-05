import { db } from '../db';
import { alerts } from '../db/schema';
import { HistoricalPriceService } from './historical-price.service';
import { shouldSendAlert, setAlertTracking, shouldSendRecoveryAlert } from '../utils/cooldown.util';
import { config } from '../config';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger';

export interface AlertTrigger {
  symbol: string;
  currentPrice: number;
  historicalPrice: number;
  dropPercentage: number;
  threshold: number;
  timeframe: 'day' | 'week' | 'month' | 'year';
  market?: 'INDIA' | 'USA';
  alertReason?: string; // Why this alert was triggered
}

export interface RecoveryAlert {
  symbol: string;
  currentPrice: number;
  lastAlertPrice: number;
  recoveryPercentage: number;
  market: 'INDIA' | 'USA';
}

/**
 * Service for detecting market crashes and triggering alerts
 * Uses live prices + Redis-cached historical prices with API fallback
 */
export class AlertDetectionService {
  private historicalPriceService: HistoricalPriceService;

  constructor() {
    this.historicalPriceService = new HistoricalPriceService();
  }

  /**
   * Calculate drop percentage
   * @param currentPrice - Current price
   * @param historicalPrice - Historical price
   * @returns Drop percentage (positive number)
   */
  private calculateDropPercentage(currentPrice: number, historicalPrice: number): number {
    if (historicalPrice <= 0) {
      return 0;
    }
    const drop = ((historicalPrice - currentPrice) / historicalPrice) * 100;
    return Math.max(0, drop); // Only positive drops
  }

  /**
   * Check which thresholds have been crossed
   * Returns ALL thresholds that were crossed for further filtering
   * @param dropPercentage - Calculated drop percentage
   * @returns Array of all thresholds that were crossed
   */
  private getCrossedThresholds(dropPercentage: number): number[] {
    // Find all thresholds that were crossed
    const crossed = config.thresholds.dropPercentages.filter(
      (threshold) => dropPercentage >= threshold
    );

    // Return all crossed thresholds - we'll filter to highest in processAlerts
    return crossed;
  }

  /**
   * Detect alerts for a single symbol
   * Returns all potential alerts across all timeframes
   * (Cooldown checking happens in processAlerts)
   *
   * @param symbol - Stock/index symbol
   * @param currentPrice - Current price
   * @param market - Market type (INDIA or USA), defaults to INDIA
   * @returns Array of alert triggers
   */
  async detectAlerts(symbol: string, currentPrice: number, market: 'INDIA' | 'USA' = 'INDIA'): Promise<AlertTrigger[]> {
    const triggers: AlertTrigger[] = [];

    // Fetch historical prices from Redis cache (with API fallback)
    const historicalPrices = await this.historicalPriceService.getHistoricalPrices(symbol, market);

    const timeframes: Array<{ key: 'day' | 'week' | 'month' | 'year'; price: number | null }> = [
      { key: 'day', price: historicalPrices.day },
      { key: 'week', price: historicalPrices.week },
      { key: 'month', price: historicalPrices.month },
      { key: 'year', price: historicalPrices.year },
    ];

    for (const timeframe of timeframes) {
      if (timeframe.price === null || timeframe.price <= 0) {
        continue; // Skip if no historical data
      }

      const dropPercentage = this.calculateDropPercentage(currentPrice, timeframe.price);
      const crossedThresholds = this.getCrossedThresholds(dropPercentage);

      for (const threshold of crossedThresholds) {
        triggers.push({
          symbol,
          currentPrice,
          historicalPrice: timeframe.price,
          dropPercentage,
          threshold,
          timeframe: timeframe.key,
          market,
        });
      }
    }

    return triggers;
  }

  /**
   * Process alerts for all symbols with current prices
   *
   * Symbol-First Architecture:
   * 1. Detect all potential alerts for each symbol
   * 2. Group by symbol and find HIGHEST threshold
   * 3. Check cooldown using new daily + 5% further drop logic
   * 4. Only return alerts that pass cooldown check
   * 5. Update alert tracking for future comparisons
   *
   * Note: Alert storage and user linking happens in the caller (cron job)
   *
   * @param prices - Map of symbol to current price
   * @param market - Market type (INDIA or USA), defaults to INDIA
   * @returns Array of alert triggers that need notifications
   */
  async processAlerts(prices: Map<string, number>, market: 'INDIA' | 'USA' = 'INDIA'): Promise<AlertTrigger[]> {
    const alertsToSend: AlertTrigger[] = [];

    // Step 1: Detect all potential alerts for all symbols
    const allPotentialTriggers: AlertTrigger[] = [];

    for (const [symbol, currentPrice] of prices) {
      try {
        const triggers = await this.detectAlerts(symbol, currentPrice, market);
        allPotentialTriggers.push(...triggers);
      } catch (error) {
        logger.error(`Error detecting alerts for ${symbol}`, { symbol, market, error });
      }
    }

    // Step 2: Group by symbol and find highest threshold per symbol
    const symbolToHighestAlert = new Map<string, AlertTrigger>();

    for (const trigger of allPotentialTriggers) {
      const existing = symbolToHighestAlert.get(trigger.symbol);

      if (!existing || trigger.threshold > existing.threshold) {
        symbolToHighestAlert.set(trigger.symbol, trigger);
      }
    }

    // Step 3: Check cooldown for each symbol's highest threshold alert
    for (const [symbol, trigger] of symbolToHighestAlert) {
      try {
        const marketValue = trigger.market ?? market;
        const { shouldAlert, reason } = await shouldSendAlert(
          symbol,
          trigger.currentPrice,
          trigger.threshold,
          marketValue
        );

        if (shouldAlert) {
          // Add reason to trigger for logging
          trigger.alertReason = reason;
          alertsToSend.push(trigger);

          // Update alert tracking (symbol-level, no userId)
          await setAlertTracking(symbol, marketValue, {
            lastAlertPrice: trigger.currentPrice,
            lastAlertDate: new Date().toLocaleDateString('en-CA', {
              timeZone: marketValue === 'USA' ? 'America/New_York' : 'Asia/Kolkata'
            }),
            highestThreshold: trigger.threshold,
            timeframe: trigger.timeframe,
            market: marketValue,
          });

          logger.info(`Alert approved for ${symbol}`, {
            symbol,
            market: marketValue,
            threshold: trigger.threshold,
            reason,
            dropPercentage: trigger.dropPercentage,
            timeframe: trigger.timeframe,
          });
        } else {
          logger.debug(`Alert skipped for ${symbol}`, {
            symbol,
            market: marketValue,
            threshold: trigger.threshold,
            reason,
          });
        }
      } catch (error) {
        logger.error(`Error processing alert for ${symbol}`, { symbol, market, error });
      }
    }

    return alertsToSend;
  }

  /**
   * Check for recovery alerts
   * Sends notification if price has recovered 5%+ from last alert price
   *
   * @param prices - Map of symbol to current price
   * @param market - Market type (INDIA or USA), defaults to INDIA
   * @returns Array of recovery alerts
   */
  async processRecoveryAlerts(prices: Map<string, number>, market: 'INDIA' | 'USA' = 'INDIA'): Promise<RecoveryAlert[]> {
    const recoveryAlerts: RecoveryAlert[] = [];

    for (const [symbol, currentPrice] of prices) {
      try {
        const { shouldAlert, recoveryPercent, lastAlertPrice } = await shouldSendRecoveryAlert(
          symbol,
          currentPrice,
          market
        );

        if (shouldAlert) {
          recoveryAlerts.push({
            symbol,
            currentPrice,
            lastAlertPrice,
            recoveryPercentage: recoveryPercent,
            market,
          });

          // Clear alert tracking since market has recovered
          // This allows new alerts if it crashes again
          const { clearAlertTracking } = await import('../utils/cooldown.util');
          await clearAlertTracking(symbol, market);

          logger.info(`Recovery alert for ${symbol}`, {
            symbol,
            market,
            recoveryPercent: recoveryPercent.toFixed(2),
            lastAlertPrice,
            currentPrice,
          });
        }
      } catch (error) {
        logger.error(`Error checking recovery for ${symbol}`, { symbol, market, error });
      }
    }

    return recoveryAlerts;
  }

  /**
   * Store alert in database (symbol-level, no userId)
   * @param trigger - Alert trigger data (must include market field)
   * @returns Alert ID of the created alert
   */
  async storeAlert(trigger: AlertTrigger): Promise<string> {
    try {
      const isCritical = trigger.threshold >= 20;
      const market = trigger.market ?? 'INDIA'; // Default to INDIA for backward compatibility
      
      const result = await db.insert(alerts).values({
        symbol: trigger.symbol,
        market,
        dropPercentage: trigger.dropPercentage.toFixed(2),
        threshold: trigger.threshold,
        timeframe: trigger.timeframe,
        price: trigger.currentPrice.toFixed(2),
        historicalPrice: trigger.historicalPrice.toFixed(2),
        critical: isCritical,
      }).returning({ id: alerts.id });

      if (result.length === 0 || !result[0]?.id) {
        throw new Error('Failed to create alert - no ID returned');
      }

      return result[0].id;
    } catch (error) {
      logger.error('Error storing alert', { error, trigger });
      throw error;
    }
  }
}

