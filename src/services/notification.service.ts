import { TelegramService } from './telegram.service';
import { EmailService } from './email.service';
import { AlertTrigger, RecoveryAlert, AlertDetectionService } from './alert-detection.service';
import { formatAlertMessage, formatAlertSubject, formatRecoveryMessage, formatNewRecoveryMessage } from '../templates/alert.templates';
import { config } from '../config';
import { db } from '../db';
import { alerts, userAlerts } from '../db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
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
   * Send alert notification based on threshold to specific users
   * @param trigger - Alert trigger data
   * @param alertId - Alert ID (symbol-level alert)
   * @param userIds - Array of user IDs to notify
   */
  async sendAlert(trigger: AlertTrigger, alertId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return; // No users to notify
    }

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

    // Mark user_alerts as notified if notification was sent successfully
    if (notificationSent && userIds.length > 0) {
      try {
        await db
          .update(userAlerts)
          .set({ notified: true })
          .where(
            and(
              eq(userAlerts.alertId, alertId),
              inArray(userAlerts.userId, userIds)
            )
          );
      } catch (error) {
        logger.error('Error marking user alerts as notified', { error, alertId, userIdCount: userIds.length });
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
   * Send multiple alerts to users
   * @param triggers - Array of alert triggers with alertId
   * @param userIds - Array of user IDs to notify (applies to all triggers)
   */
  async sendAlerts(triggers: Array<AlertTrigger & { alertId: string }>, userIds: string[]): Promise<void> {
    if (triggers.length === 0 || userIds.length === 0) {
      return;
    }

    // Send alerts directly using provided alertIds (no DB lookup needed)
    const promises = triggers.map(async (trigger) => {
      try {
        await this.sendAlert(trigger, trigger.alertId, userIds);
      } catch (error) {
        logger.error('Error sending alert', { error, trigger });
      }
    });

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

