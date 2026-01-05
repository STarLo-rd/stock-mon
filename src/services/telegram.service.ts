import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Telegram Bot Service for sending notifications
 */
export class TelegramService {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly baseUrl: string;

  constructor() {
    this.botToken = config.telegram.botToken;
    this.chatId = config.telegram.chatId;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Check if Telegram is configured
   */
  isConfigured(): boolean {
    return !!this.botToken && !!this.chatId;
  }

  /**
   * Send a message to Telegram
   * @param message - Message text
   * @param disableNotification - Whether to disable notification sound
   */
  async sendMessage(message: string, disableNotification = false): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('Telegram not configured, skipping message');
      return false;
    }

    try {
      await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: disableNotification,
      });
      return true;
    } catch (error) {
      logger.error('Error sending Telegram message', { error });
      return false;
    }
  }

  /**
   * Send an alert message with sound
   * @param message - Alert message
   */
  async sendAlert(message: string): Promise<boolean> {
    return this.sendMessage(message, false);
  }

  /**
   * Send a silent message (no sound)
   * @param message - Message text
   */
  async sendSilent(message: string): Promise<boolean> {
    return this.sendMessage(message, true);
  }
}

