import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { checkSubscription, SubscriptionRequest } from '../middleware/subscription.middleware';
import { subscriptionService } from '../services/subscription.service';
import { razorpayService } from '../services/payment/razorpay.service';
import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans (public endpoint)
 */
router.get('/plans', async (_req, res: Response) => {
  try {
    const plans = await subscriptionService.getAllPlans();

    res.json({
      success: true,
      data: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        maxWatchlists: plan.maxWatchlists,
        maxAssetsPerWatchlist: plan.maxAssetsPerWatchlist,
        prioritySupport: plan.prioritySupport,
      })),
    });
  } catch (error) {
    logger.error('Error fetching subscription plans', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans',
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Get user's current subscription (requires auth)
 */
router.get('/current', requireAuth, checkSubscription, async (req: SubscriptionRequest, res: Response) => {
  try {
    const subscription = req.subscription;
    const limits = req.subscriptionLimits!;

    if (!subscription) {
      // User has no active subscription, return FREE plan info with consistent structure
      const freePlan = await subscriptionService.getPlanByName('FREE');
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 365); // FREE plan valid for 1 year

      return res.json({
        success: true,
        data: {
          subscription: {
            id: null,
            plan: freePlan
              ? {
                  id: freePlan.id,
                  name: freePlan.name,
                  priceMonthly: freePlan.priceMonthly,
                  maxWatchlists: freePlan.maxWatchlists,
                  maxAssetsPerWatchlist: freePlan.maxAssetsPerWatchlist,
                }
              : null,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
          limits,
        },
      });
    }

    const plan = await subscriptionService.getPlanById(subscription.planId);

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          plan: plan
            ? {
                id: plan.id,
                name: plan.name,
                priceMonthly: plan.priceMonthly,
                maxWatchlists: plan.maxWatchlists,
                maxAssetsPerWatchlist: plan.maxAssetsPerWatchlist,
              }
            : null,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
        limits,
      },
    });
  } catch (error) {
    logger.error('Error fetching current subscription', { userId: req.userId, error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
});

/**
 * GET /api/subscriptions/limits
 * Get user's current subscription limits (requires auth)
 */
router.get('/limits', requireAuth, checkSubscription, async (req: SubscriptionRequest, res: Response) => {
  try {
    const limits = req.subscriptionLimits!;

    res.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    logger.error('Error fetching subscription limits', { userId: req.userId, error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription limits',
    });
  }
});

/**
 * POST /api/subscriptions/create
 * Create subscription and return Razorpay checkout URL (requires auth)
 * Body: { planId, confirmDowngrade? }
 */
router.post('/create', requireAuth, async (req: SubscriptionRequest, res: Response) => {
  try {
    const { planId, confirmDowngrade } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
    }

    // Verify selected plan exists
    const selectedPlan = await subscriptionService.getPlanById(planId);
    if (!selectedPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    // Get current subscription
    const currentSubscription = await subscriptionService.getActiveSubscription(req.userId!);

    // Prevent "upgrading" to the same plan
    if (currentSubscription && currentSubscription.planId === planId) {
      return res.status(400).json({
        success: false,
        error: 'You are already subscribed to this plan',
      });
    }

    // Check if downgrading
    if (currentSubscription) {
      const currentPlan = await subscriptionService.getPlanById(currentSubscription.planId);

      if (currentPlan) {
        const currentPrice = parseFloat(currentPlan.priceMonthly);
        const selectedPrice = parseFloat(selectedPlan.priceMonthly);
        const isDowngrade = selectedPrice < currentPrice;

        if (isDowngrade) {
          logger.info('User attempting to downgrade subscription', {
            userId: req.userId,
            fromPlan: currentPlan.name,
            toPlan: selectedPlan.name,
            fromPrice: currentPrice,
            toPrice: selectedPrice,
          });

          // Require explicit confirmation for downgrade
          if (!confirmDowngrade) {
            return res.status(400).json({
              success: false,
              error: 'DOWNGRADE_CONFIRMATION_REQUIRED',
              message: `You are about to downgrade from ${currentPlan.name} to ${selectedPlan.name}`,
              data: {
                currentPlan: {
                  name: currentPlan.name,
                  priceMonthly: currentPlan.priceMonthly,
                  maxWatchlists: currentPlan.maxWatchlists,
                  maxAssetsPerWatchlist: currentPlan.maxAssetsPerWatchlist,
                  prioritySupport: currentPlan.prioritySupport,
                },
                selectedPlan: {
                  name: selectedPlan.name,
                  priceMonthly: selectedPlan.priceMonthly,
                  maxWatchlists: selectedPlan.maxWatchlists,
                  maxAssetsPerWatchlist: selectedPlan.maxAssetsPerWatchlist,
                  prioritySupport: selectedPlan.prioritySupport,
                },
                featuresYouWillLose: {
                  watchlists: Math.max(0, currentPlan.maxWatchlists - selectedPlan.maxWatchlists),
                  assetsPerWatchlist: Math.max(0, currentPlan.maxAssetsPerWatchlist - selectedPlan.maxAssetsPerWatchlist),
                  prioritySupport: currentPlan.prioritySupport && !selectedPlan.prioritySupport,
                },
                currentPeriodEnd: currentSubscription.currentPeriodEnd,
              },
            });
          }

          logger.info('Downgrade confirmed by user', {
            userId: req.userId,
            fromPlan: currentPlan.name,
            toPlan: selectedPlan.name,
          });
        }
      }
    }

    // Create subscription with user details
    const { subscriptionId, razorpayKey } = await razorpayService.createSubscription(
      planId,
      req.userId!,
      req.userEmail,
      req.body.userName
    );

    res.json({
      success: true,
      data: {
        subscriptionId,
        razorpayKey,
        planId,
        userEmail: req.userEmail,
        isFree: selectedPlan.priceMonthly === '0.00',
      },
    });
  } catch (error: any) {
    logger.error('Error creating subscription', { userId: req.userId, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create subscription',
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel user's subscription (requires auth)
 */
router.post('/cancel', requireAuth, checkSubscription, async (req: SubscriptionRequest, res: Response) => {
  try {
    const subscription = req.subscription;

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel subscription with status: ${subscription.status}`,
      });
    }

    // Cancel subscription (sets cancelAtPeriodEnd = true)
    await subscriptionService.cancelSubscription(req.userId!);

    // If subscription has Razorpay ID, cancel it there too
    if (subscription.paymentGatewaySubscriptionId) {
      try {
        await razorpayService.cancelSubscription(subscription.paymentGatewaySubscriptionId);
      } catch (error) {
        logger.error('Error cancelling Razorpay subscription', {
          userId: req.userId,
          razorpaySubscriptionId: subscription.paymentGatewaySubscriptionId,
          error,
        });
        // Don't fail the request if Razorpay cancellation fails
      }
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. Access will continue until the end of the current billing period.',
    });
  } catch (error: any) {
    logger.error('Error cancelling subscription', { userId: req.userId, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel subscription',
    });
  }
});

/**
 * POST /api/subscriptions/sync/:razorpaySubscriptionId
 * Manually sync a subscription from Razorpay (requires auth)
 * Useful for fixing subscriptions that weren't properly synced
 */
router.post('/sync/:razorpaySubscriptionId', requireAuth, async (req: SubscriptionRequest, res: Response) => {
  try {
    const { razorpaySubscriptionId } = req.params;

    if (!razorpaySubscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Razorpay subscription ID is required',
      });
    }

    logger.info('Manual subscription sync requested', {
      userId: req.userId,
      razorpaySubscriptionId,
    });

    const syncedUserId = await razorpayService.syncSubscriptionFromRazorpay(razorpaySubscriptionId);

    if (!syncedUserId) {
      return res.status(404).json({
        success: false,
        error: 'Failed to sync subscription. Subscription may not exist in Razorpay or user not found.',
      });
    }

    // Verify the subscription was synced for the requesting user
    if (syncedUserId !== req.userId) {
      logger.warn('Subscription synced for different user', {
        requestedUserId: req.userId,
        syncedUserId,
        razorpaySubscriptionId,
      });
      return res.status(403).json({
        success: false,
        error: 'Subscription belongs to a different user',
      });
    }

    // Get the synced subscription
    const subscription = await subscriptionService.getActiveSubscription(req.userId!);

    res.json({
      success: true,
      message: 'Subscription synced successfully',
      data: {
        subscription: subscription
          ? {
              id: subscription.id,
              planName: subscription.planName,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
            }
          : null,
      },
    });
  } catch (error: any) {
    logger.error('Error syncing subscription', { userId: req.userId, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync subscription',
    });
  }
});

/**
 * POST /api/admin/subscriptions/sync-by-email
 * Admin endpoint: Sync all subscriptions for a customer by email
 * Body: { email }
 * Note: This is an admin endpoint - consider adding admin authentication in production
 */
router.post('/admin/subscriptions/sync-by-email', requireAuth, async (req: SubscriptionRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    logger.info('Admin subscription sync by email requested', {
      requestedBy: req.userId,
      email,
    });

    // Get userId from email
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      logger.error('Error fetching users from Supabase', { error: error.message, email });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
      });
    }

    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found with this email',
      });
    }

    const userId = user.id;

    // Fetch customer from Razorpay by email
    const customerId = await razorpayService.getCustomerIdByEmail(email);

    if (!customerId) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found in Razorpay with this email',
      });
    }

    // Fetch all subscriptions for this customer
    const subscriptions = await razorpayService.getSubscriptionsByCustomerId(customerId);

    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        message: 'No subscriptions found for this customer',
        data: {
          userId,
          email,
          subscriptionsSynced: 0,
        },
      });
    }

    // Sync each subscription
    const syncResults = [];
    for (const sub of subscriptions) {
      try {
        const syncedUserId = await razorpayService.syncSubscriptionFromRazorpay(sub.id);
        syncResults.push({
          razorpaySubscriptionId: sub.id,
          status: syncedUserId ? 'synced' : 'failed',
          userId: syncedUserId,
        });
      } catch (error: any) {
        logger.error('Error syncing subscription', {
          razorpaySubscriptionId: sub.id,
          error: error.message,
        });
        syncResults.push({
          razorpaySubscriptionId: sub.id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const syncedCount = syncResults.filter((r) => r.status === 'synced').length;

    res.json({
      success: true,
      message: `Synced ${syncedCount} of ${subscriptions.length} subscriptions`,
      data: {
        userId,
        email,
        subscriptionsSynced: syncedCount,
        totalSubscriptions: subscriptions.length,
        results: syncResults,
      },
    });
  } catch (error: any) {
    logger.error('Error syncing subscriptions by email', { userId: req.userId, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync subscriptions',
    });
  }
});

export default router;

