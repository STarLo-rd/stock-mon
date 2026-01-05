import { getPriceUpdaterInstance } from './services/price-updater.service';
import { CacheService } from './services/cache.service';
import { connectRedis } from './utils/redis.client';

/**
 * Test script to manually trigger USA price fetch
 * This will populate the database and cache with USA prices
 */
async function testUSAPrices() {
  try {
    console.log('Starting USA price fetch test...');

    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected');

    // Get price updater instance
    const priceUpdater = getPriceUpdaterInstance();

    // Trigger price update for USA market
    console.log('Fetching USA prices from Yahoo Finance...');
    await priceUpdater.updatePrices('USA');
    console.log('✅ USA prices fetched and stored');

    // Check cache
    const cache = new CacheService();
    const cachedPrices = await cache.getCurrentPrices('USA');

    if (cachedPrices && cachedPrices.size > 0) {
      console.log(`✅ Cache populated with ${cachedPrices.size} USA prices:`);
      for (const [symbol, data] of cachedPrices) {
        console.log(`  - ${symbol}: $${data.price} (${data.source})`);
      }
    } else {
      console.log('⚠️  Cache still empty - check logs for errors');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testUSAPrices();
