import { seedIndices } from './seed-indices';
import { seedStocks } from './seed-stocks';
import { seedMutualFunds } from './seed-mutual-funds';
import { seedUSA } from './seed-usa';

/**
 * Main seeder - runs all seed functions
 * 
 * Usage:
 *   npm run db:seed-all
 *   or
 *   tsx src/db/seeder/index.ts
 */
async function seedAll(): Promise<void> {
  console.log('🌱 Starting database seeding process...\n');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();

  try {
    // Seed Indian market data
    await seedIndices();
    await seedStocks();
    await seedMutualFunds();
    
    // Seed USA market data
    await seedUSA();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('=' .repeat(60));
    console.log('🎉 All seeding completed successfully!');
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('=' .repeat(60));
  } catch (error) {
    console.error('\n💥 Seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedAll()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error during seeding:', error);
      process.exit(1);
    });
}

export { seedAll, seedIndices, seedStocks, seedMutualFunds, seedUSA };

