import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Email Service for sending notifications via SMTP
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (this.isConfigured()) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });
    }
  }

  /**
   * Check if email is configured
   */
  isConfigured(): boolean {
    return !!(
      config.email.host &&
      config.email.user &&
      config.email.password &&
      config.email.from
    );
  }

  /**
   * Send an email
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Email HTML content
   * @param text - Email plain text content (optional)
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('Email not configured, skipping email');
      return false;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        text: text ?? html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
        html,
      });
      return true;
    } catch (error) {
      logger.error('Error sending email', { error, to, subject });
      return false;
    }
  }

  /**
   * Send alert email
   * @param to - Recipient email
   * @param subject - Email subject
   * @param message - Alert message
   */
  async sendAlertEmail(to: string, subject: string, message: string): Promise<boolean> {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #d32f2f;">Market Crash Alert</h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated alert from Market Crash Monitor.
          </p>
        </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }
}

