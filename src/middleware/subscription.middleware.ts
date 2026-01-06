import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { subscriptionService, SubscriptionLimits, UserSubscription } from '../services/subscription.service';
import logger from '../utils/logger';

/**
 * Extended Request interface with subscription information
 */
export interface SubscriptionRequest extends AuthRequest {
  subscription?: UserSubscription | null;
  subscriptionLimits?: SubscriptionLimits;
}

/**
 * Subscription middleware
 * Attaches subscription and limits to request object
 * Should be used after requireAuth middleware
 */
/**
 * Subscription middleware (requires auth)
 * Attaches subscription and limits to request object
 */
export async function checkSubscription(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get active subscription
    const subscription = await subscriptionService.getActiveSubscription(req.userId);
    
    // Get subscription limits
    const limits = await subscriptionService.getSubscriptionLimits(req.userId);

    // Attach to request
    req.subscription = subscription;
    req.subscriptionLimits = limits;

    next();
  } catch (error) {
    logger.error('Error in subscription middleware', { userId: req.userId, error });
    res.status(500).json({
      success: false,
      error: 'Internal server error during subscription check',
    });
  }
}

/**
 * Optional subscription middleware
 * Attaches subscription if user is authenticated, but doesn't fail if not
 */
export async function optionalCheckSubscription(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.userId) {
      // Get active subscription
      const subscription = await subscriptionService.getActiveSubscription(req.userId);
      
      // Get subscription limits
      const limits = await subscriptionService.getSubscriptionLimits(req.userId);

      // Attach to request
      req.subscription = subscription;
      req.subscriptionLimits = limits;
    } else {
      // No user, use FREE plan defaults
      req.subscription = null;
      req.subscriptionLimits = {
        maxWatchlists: 4,
        maxAssetsPerWatchlist: 8,
        prioritySupport: false,
      };
    }

    next();
  } catch (error) {
    logger.error('Error in optional subscription middleware', { userId: req.userId, error });
    // Don't fail, just continue with defaults
    req.subscription = null;
    req.subscriptionLimits = {
      maxWatchlists: 4,
      maxAssetsPerWatchlist: 8,
      prioritySupport: false,
    };
    next();
  }
}

