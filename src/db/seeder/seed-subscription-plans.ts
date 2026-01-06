import { db } from '../index';
import { subscriptionPlans } from '../schema';
import { SubscriptionPlanName } from '../../config/subscription-plans';
import logger from '../../utils/logger';

/**
 * Seed subscription plans
 * Creates FREE, PREMIUM, and PRO plans
 */
export async function seedSubscriptionPlans(): Promise<void> {
  try {
    logger.info('Seeding subscription plans...');

    const plans = [
      {
        name: SubscriptionPlanName.FREE,
        priceMonthly: '0.00',
        maxWatchlists: 4,
        maxAssetsPerWatchlist: 8,
        prioritySupport: false,
      },
      {
        name: SubscriptionPlanName.PREMIUM,
        priceMonthly: '199.00',
        maxWatchlists: 8,
        maxAssetsPerWatchlist: 15,
        prioritySupport: true,
      },
      {
        name: SubscriptionPlanName.PRO,
        priceMonthly: '499.00',
        maxWatchlists: 15,
        maxAssetsPerWatchlist: 40,
        prioritySupport: true,
      },
    ];

    for (const plan of plans) {
      await db
        .insert(subscriptionPlans)
        .values(plan)
        .onConflictDoUpdate({
          target: subscriptionPlans.name,
          set: {
            maxWatchlists: plan.maxWatchlists,
            maxAssetsPerWatchlist: plan.maxAssetsPerWatchlist,
            priceMonthly: plan.priceMonthly,
            prioritySupport: plan.prioritySupport,
          },
        });

      logger.info(`Seeded subscription plan: ${plan.name}`);
    }

    logger.info('Subscription plans seeding completed');
  } catch (error) {
    logger.error('Error seeding subscription plans', { error });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedSubscriptionPlans()
    .then(() => {
      logger.info('Subscription plans seeded successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Failed to seed subscription plans', { error });
      process.exit(1);
    });
}


