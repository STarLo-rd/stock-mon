import { TelegramService } from './telegram.service';
import { EmailService } from './email.service';
import { AlertTrigger, RecoveryAlert, AlertDetectionService } from './alert-detection.service';
import { formatAlertMessage, formatAlertSubject, formatRecoveryMessage, formatNewRecoveryMessage } from '../templates/alert.templates';
import { config } from '../config';
import { db } from '../db';
import { alerts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '../utils/logger';

/**
 * Notification Service that handles all notification channels
 */
export class NotificationService {
  private telegramService: TelegramService;
  private emailService: EmailService;

  constructor() {
    this.telegramService = new TelegramService();
    this.emailService = new EmailService();
  }

  /**
   * Send alert notification based on threshold
   * @param trigger - Alert trigger data
   */
  async sendAlert(trigger: AlertTrigger): Promise<void> {
    const message = formatAlertMessage(trigger);
    const subject = formatAlertSubject(trigger);

    let notificationSent = false;

    // Determine notification channels based on threshold
    if (trigger.threshold === 5) {
      // 5% drop → Email only
      notificationSent = await this.emailService.sendAlertEmail(config.email.from, subject, message);
    } else if (trigger.threshold === 10) {
      // 10% drop → Telegram + Email
      const results = await Promise.all([
        this.telegramService.sendAlert(message),
        this.emailService.sendAlertEmail(config.email.from, subject, message),
      ]);
      notificationSent = results.some((r) => r);
    } else if (trigger.threshold === 15) {
      // 15% drop → Telegram (with sound) + Email
      const results = await Promise.all([
        this.telegramService.sendAlert(message), // Sound enabled by default
        this.emailService.sendAlertEmail(config.email.from, subject, message),
      ]);
      notificationSent = results.some((r) => r);
    } else if (trigger.threshold >= 20) {
      // 20%+ drop → Telegram + Email + Critical
      const criticalMessage = `🚨 CRITICAL ALERT 🚨\n\n${message}`;
      const results = await Promise.all([
        this.telegramService.sendAlert(criticalMessage),
        this.emailService.sendAlertEmail(config.email.from, `[CRITICAL] ${subject}`, criticalMessage),
      ]);
      notificationSent = results.some((r) => r);
    }

    // Mark alert as notified if notification was sent successfully
    if (notificationSent) {
      try {
        // Find the most recent alert for this symbol matching the trigger criteria
        const alertRecords = await db
          .select()
          .from(alerts)
          .where(eq(alerts.symbol, trigger.symbol))
          .orderBy(desc(alerts.timestamp))
          .limit(1);

        if (alertRecords.length > 0) {
          const alert = alertRecords[0];
          // Verify it matches the trigger (same threshold and timeframe)
          if (
            alert.threshold === trigger.threshold &&
            alert.timeframe === trigger.timeframe &&
            !alert.notified
          ) {
            await db
              .update(alerts)
              .set({ notified: true })
              .where(eq(alerts.id, alert.id));
          }
        }
      } catch (error) {
        logger.error('Error marking alert as notified', { error, alertId: alert.id });
      }
    }
  }

  /**
   * Send recovery notification
   * @param symbol - Stock/index symbol
   * @param recoveryPercentage - Recovery percentage from bottom
   * @param bottomPrice - Bottom price
   * @param currentPrice - Current price
   * @param market - Market type (INDIA or USA), defaults to INDIA
   */
  async sendRecoveryAlert(
    symbol: string,
    recoveryPercentage: number,
    bottomPrice: number,
    currentPrice: number,
    market: 'INDIA' | 'USA' = 'INDIA'
  ): Promise<void> {
    const message = formatRecoveryMessage(symbol, recoveryPercentage, bottomPrice, currentPrice, market);
    
    await Promise.all([
      this.telegramService.sendAlert(message),
      this.emailService.sendAlertEmail(
        config.email.from,
        `Recovery Alert: ${symbol} bounced ${recoveryPercentage.toFixed(2)}%`,
        message
      ),
    ]);
  }

  /**
   * Send multiple alerts
   * @param triggers - Array of alert triggers
   */
  async sendAlerts(triggers: AlertTrigger[]): Promise<void> {
    const promises = triggers.map((trigger) => this.sendAlert(trigger));
    await Promise.all(promises);
  }

  /**
   * Send new recovery alert (5%+ recovery from last alert price)
   * @param recovery - Recovery alert data
   */
  async sendNewRecoveryAlert(recovery: RecoveryAlert): Promise<void> {
    const message = formatNewRecoveryMessage(
      recovery.symbol,
      recovery.recoveryPercentage,
      recovery.lastAlertPrice,
      recovery.currentPrice,
      recovery.market
    );

    const subject = `Recovery Alert: ${recovery.symbol} recovered ${recovery.recoveryPercentage.toFixed(2)}%`;

    await Promise.all([
      this.telegramService.sendAlert(message),
      this.emailService.sendAlertEmail(config.email.from, subject, message),
    ]);
  }

  /**
   * Send multiple recovery alerts
   * @param recoveries - Array of recovery alerts
   */
  async sendRecoveryAlerts(recoveries: RecoveryAlert[]): Promise<void> {
    const promises = recoveries.map((recovery) => this.sendNewRecoveryAlert(recovery));
    await Promise.all(promises);
  }
}

