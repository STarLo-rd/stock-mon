import { db } from '../db';
import { alerts, recoveryTracking } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { CacheService } from './cache.service';
import { NotificationService } from './notification.service';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Service for tracking recovery after market crashes
 */
export class RecoveryTrackingService {
  private cache: CacheService;
  private notificationService: NotificationService;

  constructor() {
    this.cache = new CacheService();
    this.notificationService = new NotificationService();
  }

  /**
   * Track recovery for all active alerts (INDIA market only)
   */
  async trackRecoveries(): Promise<void> {
    // Get all INDIA market alerts that haven't been fully recovered
    const activeAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.market, 'INDIA'))
      .orderBy(desc(alerts.timestamp))
      .limit(100); // Limit to recent alerts

    for (const alert of activeAlerts) {
      const market: 'INDIA' = 'INDIA';
      try {
        await this.trackRecoveryForAlert(alert.id, alert.symbol, market);
      } catch (error) {
        logger.error(`Error tracking recovery for alert`, { alertId: alert.id, symbol: alert.symbol, market, error });
      }
    }
  }

  /**
   * Track recovery for a specific alert
   * @param alertId - Alert ID
   * @param symbol - Stock/index symbol
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  private async trackRecoveryForAlert(alertId: string, symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
    // Get current price from cache (supports both stocks and indices)
    let currentPrice: number | null = null;
    
    // Try current prices map first (where price updater stores all prices)
    const currentPricesMap = await this.cache.getCurrentPrices(market);
    if (currentPricesMap && currentPricesMap.has(symbol)) {
      const priceData = currentPricesMap.get(symbol);
      if (priceData && priceData.price > 0) {
        currentPrice = priceData.price;
      }
    }
    
    // Fallback to individual cache key
    if (currentPrice === null) {
      currentPrice = await this.cache.getLatestPrice(symbol, market);
    }
    
    if (currentPrice === null) {
      return; // No price data available
    }

    // Get existing recovery tracking or create new
    const existingTracking = await db
      .select()
      .from(recoveryTracking)
      .where(eq(recoveryTracking.alertId, alertId))
      .limit(1);

    let bottomPrice: number;
    let trackingId: string;

    if (existingTracking.length > 0) {
      // Update existing tracking
      trackingId = existingTracking[0].id;
      bottomPrice = parseFloat(existingTracking[0].bottomPrice);
      
      // Update bottom price if current is lower
      if (currentPrice < bottomPrice) {
        bottomPrice = currentPrice;
        await db
          .update(recoveryTracking)
          .set({ bottomPrice: bottomPrice.toFixed(2) })
          .where(eq(recoveryTracking.id, trackingId));
      }
    } else {
      // Create new tracking - use alert price as initial bottom
      const alert = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, alertId))
        .limit(1);

      if (alert.length === 0) {
        return;
      }

      bottomPrice = parseFloat(alert[0].price);
      
      // If current price is lower, use that as bottom
      if (currentPrice < bottomPrice) {
        bottomPrice = currentPrice;
      }

      const alertMarket = alert[0].market ?? market; // Use alert's market or fallback to parameter
      
      const newTracking = await db
        .insert(recoveryTracking)
        .values({
          alertId,
          symbol,
          market: alertMarket as 'INDIA' | 'USA',
          bottomPrice: bottomPrice.toFixed(2),
          currentPrice: currentPrice.toFixed(2),
          recoveryPercentage: '0',
          notified: false,
        })
        .returning();

      trackingId = newTracking[0]?.id ?? '';
    }

    // Calculate recovery percentage
    const recoveryPercentage = ((currentPrice - bottomPrice) / bottomPrice) * 100;

    // Check if recovery threshold is met (2% bounce)
    const recoveryThreshold = config.thresholds.recoveryBouncePercent;
    
    if (recoveryPercentage >= recoveryThreshold) {
      // Check if we've already notified
      const tracking = await db
        .select()
        .from(recoveryTracking)
        .where(eq(recoveryTracking.id, trackingId))
        .limit(1);

      if (tracking.length > 0 && !tracking[0].notified) {
        // DISABLED: Send recovery notification
        // await this.notificationService.sendRecoveryAlert(
        //   symbol,
        //   recoveryPercentage,
        //   bottomPrice,
        //   currentPrice,
        //   market
        // );

        // Mark as notified (but don't send alert)
        await db
          .update(recoveryTracking)
          .set({
            notified: true,
            currentPrice: currentPrice.toFixed(2),
            recoveryPercentage: recoveryPercentage.toFixed(2),
          })
          .where(eq(recoveryTracking.id, trackingId));
      } else {
        // Update recovery percentage even if already notified
        await db
          .update(recoveryTracking)
          .set({
            currentPrice: currentPrice.toFixed(2),
            recoveryPercentage: recoveryPercentage.toFixed(2),
          })
          .where(eq(recoveryTracking.id, trackingId));
      }
    } else {
      // Update current price and recovery percentage
      await db
        .update(recoveryTracking)
        .set({
          currentPrice: currentPrice.toFixed(2),
          recoveryPercentage: recoveryPercentage.toFixed(2),
        })
        .where(eq(recoveryTracking.id, trackingId));
    }
  }

  /**
   * Initialize recovery tracking for a new alert
   * @param alertId - Alert ID
   * @param symbol - Stock/index symbol
   * @param initialPrice - Initial price when alert was triggered
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  async initializeRecoveryTracking(
    alertId: string,
    symbol: string,
    initialPrice: number,
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<void> {
    // Check if tracking already exists
    const existing = await db
      .select()
      .from(recoveryTracking)
      .where(eq(recoveryTracking.alertId, alertId))
      .limit(1);

    if (existing.length > 0) {
      return; // Already tracking
    }

    // Get market from alert if not provided
    let finalMarket = market;
    if (market === 'INDIA') {
      const alert = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, alertId))
        .limit(1);
      
      if (alert.length > 0 && alert[0].market) {
        finalMarket = alert[0].market as 'INDIA' | 'USA';
      }
    }

    // Create new recovery tracking
    await db.insert(recoveryTracking).values({
      alertId,
      symbol,
      market: finalMarket,
      bottomPrice: initialPrice.toFixed(2),
      currentPrice: initialPrice.toFixed(2),
      recoveryPercentage: '0',
      notified: false,
    });
  }
}

