import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { config } from '../../config';
import { subscriptionService } from '../subscription.service';
import { paymentTransactions, userSubscriptions } from '../../db/schema';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import logger from '../../utils/logger';
import { SubscriptionPlanName } from '../../config/subscription-plans';
import { supabaseAdmin } from '../../config/supabase';

/**
 * Razorpay Service
 * Handles Razorpay payment gateway integration
 */
export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      logger.warn('Razorpay credentials not configured. Payment features will be disabled.');
    } else {
      logger.info('Razorpay service initialized', {
        keyIdPrefix: config.razorpay.keyId?.substring(0, 12),
        hasKeySecret: !!config.razorpay.keySecret,
      });
    }

    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  /**
   * Get Razorpay plan ID for a given plan name
   * Reads from environment variables: RAZORPAY_PLAN_ID_PREMIUM, RAZORPAY_PLAN_ID_PRO
   */
  private getRazorpayPlanId(planName: string): string | null {
    const envVarName = `RAZORPAY_PLAN_ID_${planName}`;
    const razorpayPlanId = process.env[envVarName];
    
    if (!razorpayPlanId || razorpayPlanId.trim() === '') {
      logger.warn(`Razorpay plan ID not configured for ${planName}. Set ${envVarName} environment variable.`);
      return null;
    }
    
    return razorpayPlanId.trim();
  }

  /**
   * Create subscription checkout
   * Creates Razorpay subscription with customer details and returns checkout URL
   */
  async createSubscription(
    planId: string,
    userId: string,
    userEmail?: string,
    userName?: string
  ): Promise<{ subscriptionId: string; razorpayKey: string }> {
    try {
      const plan = await subscriptionService.getPlanById(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // Create subscription in our database first (status: PENDING)
      const subscription = await subscriptionService.createSubscription(userId, planId);

      // Skip Razorpay for FREE plan - activate directly
      if (plan.name === SubscriptionPlanName.FREE) {
        await subscriptionService.updateSubscriptionStatus(userId, 'ACTIVE');
        return {
          subscriptionId: subscription.id,
          razorpayKey: '',
        };
      }

      // Map our plan name to Razorpay plan ID
      // Get Razorpay plan ID from environment variables or config
      const razorpayPlanId = this.getRazorpayPlanId(plan.name);

      if (!razorpayPlanId) {
        throw new Error(
          `Razorpay plan ID not configured for plan ${plan.name}. ` +
          `Please add RAZORPAY_PLAN_ID_${plan.name} environment variable. ` +
          `Example: RAZORPAY_PLAN_ID_PREMIUM=plan_xxxxxxxxxxxxx`
        );
      }

      // Get or create Razorpay customer
      // Customer is required for subscription checkout to work
      let customerId: string;
      const customerEmail = userEmail || `user_${userId}@market-crash-monitor.com`;
      const customerName = userName || userEmail || 'User';

      logger.info('Getting or creating Razorpay customer', {
        userId,
        userEmail,
        userName,
        customerEmail,
        customerName,
      });

      try {
        // Try to create a new customer first
        // If it fails with "customer already exists", we'll search for it
        try {
          const customer = await this.razorpay.customers.create({
            name: customerName,
            email: customerEmail,
            notes: {
              userId: userId,
            },
          });
          customerId = customer.id;
          logger.info('New Razorpay customer created', { customerId, userId, customerEmail });
        } catch (createError: any) {
          // If customer already exists, search for them
          if (createError.error?.code === 'BAD_REQUEST_ERROR' &&
              createError.error?.description?.includes('already exists')) {
            logger.info('Customer already exists, searching...', { customerEmail });

            // Fetch all customers and filter by email manually
            // Razorpay API doesn't support email filter in customers.all()
            const allCustomers = await this.razorpay.customers.all({ count: 100 });
            const existingCustomer = allCustomers.items.find(
              (c: any) => c.email === customerEmail
            );

            if (existingCustomer) {
              customerId = existingCustomer.id;
              logger.info('Existing Razorpay customer found', { customerId, userId, customerEmail });
            } else {
              throw new Error(`Customer with email ${customerEmail} exists but could not be found`);
            }
          } else {
            // Different error, rethrow it
            throw createError;
          }
        }
      } catch (error: any) {
        logger.error('Error getting/creating Razorpay customer', {
          error: error.message,
          errorCode: error.error?.code,
          errorDescription: error.error?.description,
          errorField: error.error?.field,
          statusCode: error.statusCode,
          fullError: JSON.stringify(error),
          userId
        });
        const errorMsg = error.error?.description || error.message || JSON.stringify(error);
        throw new Error(`Failed to get/create customer: ${errorMsg}`);
      }

      // Create Razorpay subscription with customer
      let razorpaySubscription: any;
      try {
        logger.info('Creating Razorpay subscription', {
          plan_id: razorpayPlanId,
          customer_id: customerId,
          userId,
        });

        razorpaySubscription = await this.razorpay.subscriptions.create({
          plan_id: razorpayPlanId, // Razorpay plan ID (must be created in Razorpay Dashboard)
          customer_id: customerId, // Associate customer with subscription
          customer_notify: 1,
          total_count: 12, // 12 months
          notes: {
            userId,
            planId: plan.id,
            subscriptionId: subscription.id,
          },
        } as any); // Type assertion needed as Razorpay types may not include customer_id

        logger.info('Razorpay subscription API response', {
          subscriptionId: razorpaySubscription.id,
          status: razorpaySubscription.status,
          short_url: razorpaySubscription.short_url,
        });
      } catch (error: any) {
        logger.error('Error creating Razorpay subscription API call', {
          error: error.message,
          errorDetails: error,
          statusCode: error.statusCode,
          userId,
          planId: razorpayPlanId,
        });
        throw new Error(`Failed to create Razorpay subscription: ${error.message}`);
      }

      // Update our subscription with Razorpay subscription ID
      await db
        .update(userSubscriptions)
        .set({
          paymentGatewaySubscriptionId: razorpaySubscription.id,
        })
        .where(eq(userSubscriptions.id, subscription.id));

      logger.info('Razorpay subscription created successfully', {
        userId,
        planId,
        customerId,
        razorpaySubscriptionId: razorpaySubscription.id,
        subscriptionStatus: razorpaySubscription.status,
      });

      // Return subscription ID for frontend to use with Razorpay Checkout.js
      return {
        subscriptionId: razorpaySubscription.id,
        razorpayKey: config.razorpay.keyId,
      };
    } catch (error: any) {
      logger.error('Error creating Razorpay subscription', { userId, planId, error });
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Error verifying webhook signature', { error });
      return false;
    }
  }

  /**
   * Handle Razorpay webhook events
   * @param payload - Parsed JSON payload
   * @param signature - X-Razorpay-Signature header
   * @param rawBody - Raw body string for signature verification
   */
  async handleWebhook(payload: any, signature: string, rawBody: string): Promise<void> {
    try {
      // Verify webhook signature using raw body
      if (!this.verifyWebhookSignature(rawBody, signature)) {
        logger.error('Invalid webhook signature', { signature });
        throw new Error('Invalid webhook signature');
      }

      const event = payload.event;
      // Razorpay webhook structure: payload.payload.subscription.entity or payload.payload.payment.entity
      const subscriptionEntity = payload.payload?.subscription?.entity;
      const paymentEntity = payload.payload?.payment?.entity;

      logger.info('Razorpay webhook received', { 
        event, 
        subscriptionId: subscriptionEntity?.id,
        paymentId: paymentEntity?.id 
      });

      switch (event) {
        case 'subscription.activated':
          await this.handleSubscriptionActivated(subscriptionEntity);
          break;

        case 'subscription.charged':
          // subscription.charged includes both payment and subscription entities
          await this.handleSubscriptionCharged({
            payment: { entity: paymentEntity },
            subscription: { entity: subscriptionEntity },
          });
          break;

        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(subscriptionEntity);
          break;

        case 'payment.captured':
          await this.handlePaymentCaptured(paymentEntity);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(paymentEntity);
          break;

        default:
          logger.info('Unhandled webhook event', { event });
      }
    } catch (error) {
      logger.error('Error handling Razorpay webhook', { error, payload });
      throw error;
    }
  }

  /**
   * Handle subscription.activated event
   */
  private async handleSubscriptionActivated(entity: any): Promise<void> {
    try {
      const razorpaySubscriptionId = entity.id;
      let userId = entity.notes?.userId;

      // Find subscription by Razorpay ID
      const subscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.paymentGatewaySubscriptionId, razorpaySubscriptionId))
        .limit(1);

      if (subscription.length === 0) {
        logger.warn('Subscription not found in DB, attempting to sync from Razorpay', {
          razorpaySubscriptionId,
        });

        // Try to sync subscription from Razorpay
        const syncedUserId = await this.syncSubscriptionFromRazorpay(razorpaySubscriptionId);

        if (!syncedUserId) {
          logger.error('Failed to sync subscription from Razorpay', { razorpaySubscriptionId });
          return;
        }

        userId = syncedUserId;

        // Fetch the newly created subscription
        const newSubscription = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.paymentGatewaySubscriptionId, razorpaySubscriptionId))
          .limit(1);

        if (newSubscription.length === 0) {
          logger.error('Subscription still not found after sync', { razorpaySubscriptionId });
          return;
        }

        // Update status to ACTIVE if not already
        if (newSubscription[0].status !== 'ACTIVE') {
          await subscriptionService.updateSubscriptionStatus(
            userId,
            'ACTIVE',
            razorpaySubscriptionId
          );
        }

        logger.info('Subscription activated after sync', {
          userId,
          subscriptionId: newSubscription[0].id,
        });
        return;
      }

      // Use userId from our database if not in notes
      if (!userId) {
        userId = subscription[0].userId;
      }

      // Update subscription status to ACTIVE
      await subscriptionService.updateSubscriptionStatus(
        userId,
        'ACTIVE',
        razorpaySubscriptionId
      );

      logger.info('Subscription activated', { userId, subscriptionId: subscription[0].id });
    } catch (error) {
      logger.error('Error handling subscription activated', { error, entity });
    }
  }

  /**
   * Handle subscription.charged event
   */
  private async handleSubscriptionCharged(entity: any): Promise<void> {
    try {
      const payment = entity.payment?.entity;
      const subscription = entity.subscription?.entity;

      if (!payment || !subscription) {
        logger.error('Missing payment or subscription in charged event', { entity });
        return;
      }

      const razorpaySubscriptionId = subscription.id;
      let userId = subscription.notes?.userId;

      // Find our subscription record first
      const ourSubscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.paymentGatewaySubscriptionId, razorpaySubscriptionId))
        .limit(1);

      if (ourSubscription.length === 0) {
        logger.warn('Subscription not found in DB, attempting to sync from Razorpay', {
          razorpaySubscriptionId,
        });

        // Try to sync subscription from Razorpay
        const syncedUserId = await this.syncSubscriptionFromRazorpay(razorpaySubscriptionId);

        if (!syncedUserId) {
          logger.error('Failed to sync subscription from Razorpay', { razorpaySubscriptionId });
          return;
        }

        userId = syncedUserId;

        // Fetch the newly created subscription
        const newSubscription = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.paymentGatewaySubscriptionId, razorpaySubscriptionId))
          .limit(1);

        if (newSubscription.length === 0) {
          logger.error('Subscription still not found after sync', { razorpaySubscriptionId });
          return;
        }

        // Create payment transaction record
        await db.insert(paymentTransactions).values({
          userId,
          subscriptionId: newSubscription[0].id,
          amount: (payment.amount / 100).toString(), // Convert from paise to rupees
          currency: payment.currency || 'INR',
          paymentGateway: 'RAZORPAY',
          paymentGatewayTransactionId: payment.id,
          status: 'SUCCESS',
          paymentMethod: payment.method,
        });

        // Update subscription period dates if available in webhook payload
        if (subscription.current_start && subscription.current_end) {
          const periodStart = new Date(subscription.current_start * 1000);
          const periodEnd = new Date(subscription.current_end * 1000);

          await db
            .update(userSubscriptions)
            .set({
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              updatedAt: new Date(),
            })
            .where(eq(userSubscriptions.id, newSubscription[0].id));
        }

        logger.info('Subscription charged after sync', { userId, amount: payment.amount });
        return;
      }

      // Use userId from our database if not in notes
      if (!userId) {
        userId = ourSubscription[0].userId;
      }

      // Create payment transaction record
      await db.insert(paymentTransactions).values({
        userId,
        subscriptionId: ourSubscription[0].id,
        amount: (payment.amount / 100).toString(), // Convert from paise to rupees
        currency: payment.currency || 'INR',
        paymentGateway: 'RAZORPAY',
        paymentGatewayTransactionId: payment.id,
        status: 'SUCCESS',
        paymentMethod: payment.method,
      });

      // Update subscription period dates if available in webhook payload
      // Razorpay sends timestamps in seconds, convert to milliseconds
      if (subscription.current_start && subscription.current_end) {
        const periodStart = new Date(subscription.current_start * 1000);
        const periodEnd = new Date(subscription.current_end * 1000);

        await db
          .update(userSubscriptions)
          .set({
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.id, ourSubscription[0].id));
      }

      logger.info('Subscription charged', { userId, amount: payment.amount });
    } catch (error) {
      logger.error('Error handling subscription charged', { error, entity });
    }
  }

  /**
   * Handle subscription.cancelled event
   */
  private async handleSubscriptionCancelled(entity: any): Promise<void> {
    try {
      const razorpaySubscriptionId = entity.id;
      const userId = entity.notes?.userId;

      if (!userId) {
        logger.error('Missing userId in subscription notes', { entity });
        return;
      }

      await subscriptionService.updateSubscriptionStatus(userId, 'CANCELLED', razorpaySubscriptionId);

      logger.info('Subscription cancelled', { userId });
    } catch (error) {
      logger.error('Error handling subscription cancelled', { error, entity });
    }
  }

  /**
   * Handle payment.captured event
   */
  private async handlePaymentCaptured(entity: any): Promise<void> {
    try {
      const payment = entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        logger.warn('Payment captured without subscription ID', { payment });
        return;
      }

      // Find subscription
      const subscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.paymentGatewaySubscriptionId, subscriptionId))
        .limit(1);

      if (subscription.length === 0) {
        logger.error('Subscription not found for payment', { subscriptionId });
        return;
      }

      // Update or create payment transaction
      await db.insert(paymentTransactions).values({
        userId: subscription[0].userId,
        subscriptionId: subscription[0].id,
        amount: (payment.amount / 100).toString(),
        currency: payment.currency || 'INR',
        paymentGateway: 'RAZORPAY',
        paymentGatewayTransactionId: payment.id,
        status: 'SUCCESS',
        paymentMethod: payment.method,
      }).onConflictDoNothing();

      logger.info('Payment captured', { paymentId: payment.id });
    } catch (error) {
      logger.error('Error handling payment captured', { error, entity });
    }
  }

  /**
   * Handle payment.failed event
   */
  private async handlePaymentFailed(entity: any): Promise<void> {
    try {
      const payment = entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        return;
      }

      // Find subscription
      const subscription = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.paymentGatewaySubscriptionId, subscriptionId))
        .limit(1);

      if (subscription.length === 0) {
        return;
      }

      // Create failed payment transaction record
      await db.insert(paymentTransactions).values({
        userId: subscription[0].userId,
        subscriptionId: subscription[0].id,
        amount: (payment.amount / 100).toString(),
        currency: payment.currency || 'INR',
        paymentGateway: 'RAZORPAY',
        paymentGatewayTransactionId: payment.id,
        status: 'FAILED',
        paymentMethod: payment.method,
      });

      logger.warn('Payment failed', { paymentId: payment.id, userId: subscription[0].userId });
    } catch (error) {
      logger.error('Error handling payment failed', { error, entity });
    }
  }

  /**
   * Get userId from customer email using Supabase admin API
   * @param email - Customer email address
   * @returns userId if found, null otherwise
   */
  private async getUserIdFromCustomerEmail(email: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        logger.error('Error fetching users from Supabase', { error: error.message, email });
        return null;
      }

      const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      
      if (user) {
        logger.info('User found by email', { email, userId: user.id });
        return user.id;
      }

      logger.warn('User not found by email', { email });
      return null;
    } catch (error) {
      logger.error('Error getting userId from email', { email, error });
      return null;
    }
  }

  /**
   * Get our planId from Razorpay plan_id
   * Maps Razorpay plan ID to our plan name, then finds our planId
   * @param razorpayPlanId - Razorpay plan ID (e.g., plan_S0RqNQP9XmhZmU)
   * @returns Our planId if found, null otherwise
   */
  private async getPlanIdFromRazorpayPlanId(razorpayPlanId: string): Promise<string | null> {
    try {
      // Check environment variables for plan mappings
      // RAZORPAY_PLAN_ID_PREMIUM=plan_xxx, RAZORPAY_PLAN_ID_PRO=plan_yyy
      const planNames = [SubscriptionPlanName.PREMIUM, SubscriptionPlanName.PRO];
      
      for (const planName of planNames) {
        const envVarName = `RAZORPAY_PLAN_ID_${planName}`;
        const envPlanId = process.env[envVarName]?.trim();
        
        if (envPlanId === razorpayPlanId) {
          // Found matching plan, get our planId
          const plan = await subscriptionService.getPlanByName(planName);
          if (plan) {
            logger.info('Plan ID mapped from Razorpay', { 
              razorpayPlanId, 
              planName, 
              ourPlanId: plan.id 
            });
            return plan.id;
          }
        }
      }

      logger.warn('Plan ID not found in mappings', { razorpayPlanId });
      return null;
    } catch (error) {
      logger.error('Error mapping Razorpay plan ID', { razorpayPlanId, error });
      return null;
    }
  }

  /**
   * Sync subscription from Razorpay to our database
   * Fetches subscription from Razorpay and creates/updates it in our DB
   * @param razorpaySubscriptionId - Razorpay subscription ID
   * @returns userId if sync successful, null otherwise
   */
  async syncSubscriptionFromRazorpay(razorpaySubscriptionId: string): Promise<string | null> {
    try {
      logger.info('Syncing subscription from Razorpay', { razorpaySubscriptionId });

      // Fetch subscription from Razorpay
      const razorpaySub = await this.razorpay.subscriptions.fetch(razorpaySubscriptionId);
      
      if (!razorpaySub) {
        logger.error('Subscription not found in Razorpay', { razorpaySubscriptionId });
        return null;
      }

      logger.info('Razorpay subscription fetched', {
        razorpaySubscriptionId,
        status: razorpaySub.status,
        customerId: razorpaySub.customer_id,
        planId: razorpaySub.plan_id,
      });

      // Get customer details to find email
      let customerEmail: string | null = null;
      if (razorpaySub.customer_id) {
        try {
          const customer = await this.razorpay.customers.fetch(razorpaySub.customer_id);
          customerEmail = customer.email ?? null;
          logger.info('Customer fetched from Razorpay', {
            customerId: razorpaySub.customer_id,
            email: customerEmail,
          });
        } catch (error: any) {
          logger.error('Error fetching customer from Razorpay', {
            customerId: razorpaySub.customer_id,
            error: error.message,
          });
        }
      }

      // Try to get userId from notes first
      let userId: string | null = null;
      const notesUserId = razorpaySub.notes?.userId;
      if (notesUserId && typeof notesUserId === 'string') {
        userId = notesUserId;
      }

      // If not in notes, try to get from customer email
      if (!userId && customerEmail) {
        userId = await this.getUserIdFromCustomerEmail(customerEmail);
      }

      if (!userId) {
        logger.error('Cannot determine userId for subscription', {
          razorpaySubscriptionId,
          customerEmail,
          notes: razorpaySub.notes,
        });
        return null;
      }

      // Get our planId from Razorpay plan_id
      const razorpayPlanId = typeof razorpaySub.plan_id === 'string' 
        ? razorpaySub.plan_id 
        : String(razorpaySub.plan_id);
      const planId = await this.getPlanIdFromRazorpayPlanId(razorpayPlanId);
      if (!planId) {
        logger.error('Cannot map Razorpay plan_id to our planId', {
          razorpayPlanId,
          razorpaySubscriptionId,
        });
        return null;
      }

      // Check if subscription already exists in our DB
      const existingSub = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.paymentGatewaySubscriptionId, razorpaySubscriptionId))
        .limit(1);

      // Calculate period dates from Razorpay data
      const periodStart = razorpaySub.current_start
        ? new Date(razorpaySub.current_start * 1000)
        : new Date();
      const periodEnd = razorpaySub.current_end
        ? new Date(razorpaySub.current_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      // Map Razorpay status to our status
      let status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING' = 'PENDING';
      if (razorpaySub.status === 'active') {
        status = 'ACTIVE';
      } else if (razorpaySub.status === 'cancelled' || razorpaySub.status === 'halted') {
        status = 'CANCELLED';
      } else if (razorpaySub.status === 'expired') {
        status = 'EXPIRED';
      }

      if (existingSub.length > 0) {
        // Update existing subscription
        await db
          .update(userSubscriptions)
          .set({
            userId: userId as string,
            planId: planId as string,
            status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.id, existingSub[0].id));

        logger.info('Subscription updated from Razorpay sync', {
          userId,
          subscriptionId: existingSub[0].id,
          razorpaySubscriptionId,
          status,
        });
      } else {
        // Create new subscription
        await subscriptionService.createOrUpdateSubscriptionFromRazorpay(
          userId as string,
          razorpaySubscriptionId,
          planId as string,
          status,
          periodStart,
          periodEnd
        );

        logger.info('Subscription created from Razorpay sync', {
          userId,
          razorpaySubscriptionId,
          status,
        });
      }

      return userId as string;
    } catch (error: any) {
      logger.error('Error syncing subscription from Razorpay', {
        razorpaySubscriptionId,
        error: error.message,
        fullError: error,
      });
      return null;
    }
  }

  /**
   * Get customer ID by email
   * @param email - Customer email
   * @returns Customer ID if found, null otherwise
   */
  async getCustomerIdByEmail(email: string): Promise<string | null> {
    try {
      const allCustomers = await this.razorpay.customers.all({ count: 100 });
      const customer = allCustomers.items.find(
        (c: any) => c.email?.toLowerCase() === email.toLowerCase()
      );
      return customer?.id ?? null;
    } catch (error: any) {
      logger.error('Error fetching customers from Razorpay', { email, error: error.message });
      return null;
    }
  }

  /**
   * Get all subscriptions for a customer
   * @param customerId - Razorpay customer ID
   * @returns Array of subscriptions
   */
  async getSubscriptionsByCustomerId(customerId: string): Promise<any[]> {
    try {
      const allSubscriptions = await this.razorpay.subscriptions.all({ count: 100 });
      return allSubscriptions.items.filter((sub: any) => sub.customer_id === customerId);
    } catch (error: any) {
      logger.error('Error fetching subscriptions from Razorpay', {
        customerId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Cancel Razorpay subscription
   */
  async cancelSubscription(razorpaySubscriptionId: string): Promise<void> {
    try {
      await this.razorpay.subscriptions.cancel(razorpaySubscriptionId);
      logger.info('Razorpay subscription cancelled', { razorpaySubscriptionId });
    } catch (error: any) {
      logger.error('Error cancelling Razorpay subscription', { razorpaySubscriptionId, error });
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }
}

// Export singleton instance
export const razorpayService = new RazorpayService();

