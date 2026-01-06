import { db } from '../db';
import { subscriptionPlans, userSubscriptions } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { SubscriptionPlanName } from '../config/subscription-plans';
import logger from '../utils/logger';

export interface SubscriptionLimits {
  maxWatchlists: number;
  maxAssetsPerWatchlist: number;
  prioritySupport: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: string;
  paymentGatewaySubscriptionId?: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Subscription Service
 * Manages user subscriptions and provides subscription-related operations
 */
export class SubscriptionService {
  /**
   * Get active subscription for a user
   * Returns FREE plan if no active subscription exists
   */
  async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // Get active subscription
      const activeSub = await db
        .select({
          id: userSubscriptions.id,
          userId: userSubscriptions.userId,
          planId: userSubscriptions.planId,
          planName: subscriptionPlans.name,
          status: userSubscriptions.status,
          paymentGatewaySubscriptionId: userSubscriptions.paymentGatewaySubscriptionId,
          currentPeriodStart: userSubscriptions.currentPeriodStart,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
        })
        .from(userSubscriptions)
        .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.status, 'ACTIVE')
          )
        )
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(1);

      if (activeSub.length > 0) {
        return {
          id: activeSub[0].id,
          userId: activeSub[0].userId,
          planId: activeSub[0].planId,
          planName: activeSub[0].planName,
          status: activeSub[0].status,
          paymentGatewaySubscriptionId: activeSub[0].paymentGatewaySubscriptionId ?? null,
          currentPeriodStart: activeSub[0].currentPeriodStart,
          currentPeriodEnd: activeSub[0].currentPeriodEnd,
          cancelAtPeriodEnd: activeSub[0].cancelAtPeriodEnd,
        };
      }

      // No active subscription, return null (will default to FREE)
      return null;
    } catch (error) {
      logger.error('Error getting active subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Get subscription limits for a user
   * Returns FREE plan limits if no active subscription
   */
  async getSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
    try {
      const subscription = await this.getActiveSubscription(userId);
      
      // If no active subscription, return FREE plan limits
      const planName = subscription?.planName ?? SubscriptionPlanName.FREE;

      const plan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, planName))
        .limit(1);

      if (plan.length === 0) {
        logger.warn('Plan not found, using FREE defaults', { planName });
        return {
          maxWatchlists: 4,
          maxAssetsPerWatchlist: 8,
          prioritySupport: false,
        };
      }

      return {
        maxWatchlists: plan[0].maxWatchlists,
        maxAssetsPerWatchlist: plan[0].maxAssetsPerWatchlist,
        prioritySupport: plan[0].prioritySupport,
      };
    } catch (error) {
      logger.error('Error getting subscription limits', { userId, error });
      // Return FREE plan limits on error
      return {
        maxWatchlists: 4,
        maxAssetsPerWatchlist: 8,
        prioritySupport: false,
      };
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string) {
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    return plan[0] ?? null;
  }

  /**
   * Get plan by name
   */
  async getPlanByName(planName: string) {
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, planName))
      .limit(1);

    return plan[0] ?? null;
  }

  /**
   * Create subscription for a user
   * Creates subscription with PENDING status
   */
  async createSubscription(
    userId: string,
    planId: string,
    paymentGatewaySubscriptionId?: string
  ): Promise<UserSubscription> {
    try {
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // Check if user already has an active subscription to the same plan
      const existingActive = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.planId, planId),
            eq(userSubscriptions.status, 'ACTIVE')
          )
        )
        .limit(1);

      if (existingActive.length > 0) {
        logger.warn('User already has active subscription to this plan', { userId, planId });
        // Return existing subscription instead of creating duplicate
        return {
          id: existingActive[0].id,
          userId: existingActive[0].userId,
          planId: existingActive[0].planId,
          planName: plan.name,
          status: existingActive[0].status,
          paymentGatewaySubscriptionId: existingActive[0].paymentGatewaySubscriptionId ?? null,
          currentPeriodStart: existingActive[0].currentPeriodStart,
          currentPeriodEnd: existingActive[0].currentPeriodEnd,
          cancelAtPeriodEnd: existingActive[0].cancelAtPeriodEnd,
        };
      }

      // Calculate period dates (30 days from now)
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      // Cancel any existing ACTIVE subscriptions to DIFFERENT plans
      // This ensures only one ACTIVE subscription per user
      await db
        .update(userSubscriptions)
        .set({
          status: 'CANCELLED',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.status, 'ACTIVE')
          )
        );

      // Delete any existing PENDING subscriptions (from previous failed attempts)
      // PENDING subscriptions are temporary and can be safely deleted
      // Only delete PENDING subscriptions older than 10 minutes
      await db
        .delete(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.status, 'PENDING')
          )
        );

      // Create new subscription
      const [newSubscription] = await db
        .insert(userSubscriptions)
        .values({
          userId,
          planId,
          status: 'PENDING',
          paymentGateway: 'RAZORPAY',
          paymentGatewaySubscriptionId: paymentGatewaySubscriptionId ?? null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        })
        .returning();

      logger.info('Subscription created', { userId, planId, subscriptionId: newSubscription.id });

      return {
        id: newSubscription.id,
        userId: newSubscription.userId,
        planId: newSubscription.planId,
        planName: plan.name,
        status: newSubscription.status,
        currentPeriodStart: newSubscription.currentPeriodStart,
        currentPeriodEnd: newSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: newSubscription.cancelAtPeriodEnd,
      };
    } catch (error) {
      logger.error('Error creating subscription', { userId, planId, error });
      throw error;
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    userId: string,
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING',
    paymentGatewaySubscriptionId?: string
  ): Promise<void> {
    try {
      let subscription;

      // If paymentGatewaySubscriptionId is provided, find by that first
      if (paymentGatewaySubscriptionId) {
        subscription = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.paymentGatewaySubscriptionId, paymentGatewaySubscriptionId))
          .limit(1);

        if (subscription.length === 0) {
          logger.warn('Subscription not found by payment gateway ID, searching by userId', {
            paymentGatewaySubscriptionId,
            userId,
          });
        }
      }

      // If not found by payment gateway ID, find by userId (most recent)
      if (!subscription || subscription.length === 0) {
        subscription = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, userId))
          .orderBy(desc(userSubscriptions.createdAt))
          .limit(1);
      }

      if (subscription.length === 0) {
        throw new Error(`No subscription found for user: ${userId}`);
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (paymentGatewaySubscriptionId && !subscription[0].paymentGatewaySubscriptionId) {
        updateData.paymentGatewaySubscriptionId = paymentGatewaySubscriptionId;
      }

      // If activating, cancel any other ACTIVE subscriptions and update period dates
      if (status === 'ACTIVE') {
        // Cancel any other ACTIVE subscriptions for this user (except the one we're updating)
        await db
          .update(userSubscriptions)
          .set({
            status: 'CANCELLED',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userSubscriptions.userId, userId),
              eq(userSubscriptions.status, 'ACTIVE')
            )
          );

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);
        updateData.currentPeriodStart = now;
        updateData.currentPeriodEnd = periodEnd;
      }

      await db
        .update(userSubscriptions)
        .set(updateData)
        .where(eq(userSubscriptions.id, subscription[0].id));

      logger.info('Subscription status updated', {
        userId,
        status,
        subscriptionId: subscription[0].id,
        paymentGatewaySubscriptionId: subscription[0].paymentGatewaySubscriptionId,
      });
    } catch (error) {
      logger.error('Error updating subscription status', { userId, status, error });
      throw error;
    }
  }

  /**
   * Cancel subscription
   * Sets cancelAtPeriodEnd to true
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getActiveSubscription(userId);
      if (!subscription) {
        throw new Error(`No active subscription found for user: ${userId}`);
      }

      await db
        .update(userSubscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscription.id));

      logger.info('Subscription cancelled', { userId, subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Error cancelling subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Assign default FREE subscription to a new user
   */
  async assignDefaultSubscription(userId: string): Promise<void> {
    try {
      // Check if user already has a subscription
      const existing = await this.getActiveSubscription(userId);
      if (existing) {
        logger.info('User already has subscription', { userId });
        return;
      }

      const freePlan = await this.getPlanByName(SubscriptionPlanName.FREE);
      if (!freePlan) {
        logger.error('FREE plan not found in database', { userId });
        throw new Error('FREE plan not found');
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 365); // Free plan valid for 1 year

      await db.insert(userSubscriptions).values({
        userId,
        planId: freePlan.id,
        status: 'ACTIVE',
        paymentGateway: null,
        paymentGatewaySubscriptionId: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });

      logger.info('Default FREE subscription assigned', { userId });
    } catch (error) {
      logger.error('Error assigning default subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Get all available plans
   */
  async getAllPlans() {
    return await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.priceMonthly);
  }

  /**
   * Create or update subscription from Razorpay data
   * Used when syncing subscriptions from Razorpay webhook or manual sync
   * @param userId - User ID
   * @param razorpaySubscriptionId - Razorpay subscription ID
   * @param planId - Our plan ID
   * @param status - Subscription status
   * @param periodStart - Period start date
   * @param periodEnd - Period end date
   */
  async createOrUpdateSubscriptionFromRazorpay(
    userId: string,
    razorpaySubscriptionId: string,
    planId: string,
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING',
    periodStart: Date,
    periodEnd: Date
  ): Promise<UserSubscription> {
    try {
      // Check if subscription already exists
      const existing = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.paymentGatewaySubscriptionId, razorpaySubscriptionId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing subscription
        await db
          .update(userSubscriptions)
          .set({
            userId,
            planId,
            status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.id, existing[0].id));

        const plan = await this.getPlanById(planId);
        logger.info('Subscription updated from Razorpay', {
          userId,
          subscriptionId: existing[0].id,
          razorpaySubscriptionId,
          status,
        });

        return {
          id: existing[0].id,
          userId,
          planId,
          planName: plan?.name ?? 'UNKNOWN',
          status,
          paymentGatewaySubscriptionId: razorpaySubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: existing[0].cancelAtPeriodEnd,
        };
      }

      // Cancel any existing ACTIVE subscriptions for this user
      if (status === 'ACTIVE') {
        await db
          .update(userSubscriptions)
          .set({
            status: 'CANCELLED',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userSubscriptions.userId, userId),
              eq(userSubscriptions.status, 'ACTIVE')
            )
          );
      }

      // Create new subscription
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      const [newSubscription] = await db
        .insert(userSubscriptions)
        .values({
          userId,
          planId,
          status,
          paymentGateway: 'RAZORPAY',
          paymentGatewaySubscriptionId: razorpaySubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        })
        .returning();

      logger.info('Subscription created from Razorpay', {
        userId,
        subscriptionId: newSubscription.id,
        razorpaySubscriptionId,
        status,
      });

      return {
        id: newSubscription.id,
        userId: newSubscription.userId,
        planId: newSubscription.planId,
        planName: plan.name,
        status: newSubscription.status,
        paymentGatewaySubscriptionId: newSubscription.paymentGatewaySubscriptionId ?? null,
        currentPeriodStart: newSubscription.currentPeriodStart,
        currentPeriodEnd: newSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: newSubscription.cancelAtPeriodEnd,
      };
    } catch (error) {
      logger.error('Error creating/updating subscription from Razorpay', {
        userId,
        razorpaySubscriptionId,
        planId,
        error,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

