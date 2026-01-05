import { seedMutualFunds } from './seed';

/**
 * Seed mutual funds script
 * Run with: npm run db:seed-mutual-funds or tsx src/db/seed-mutual-funds.ts
 */
seedMutualFunds()
  .then(() => {
    console.log('Mutual fund seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Mutual fund seeding failed:', error);
    process.exit(1);
  });

