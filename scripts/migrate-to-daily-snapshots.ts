import { db } from '../src/db';
import { priceHistory, dailySnapshots } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Migrate existing price_history data to daily_snapshots
 * Extracts closing price (last price of each day) for each symbol
 */
async function migrateToDailySnapshots() {
  console.log('🔄 Starting migration from price_history to daily_snapshots...\n');

  try {
    // Step 1: Get all unique symbols
    const symbols = await db
      .selectDistinct({ symbol: priceHistory.symbol })
      .from(priceHistory);

    console.log(`📊 Found ${symbols.length} unique symbols to migrate\n`);

    let totalDaysInserted = 0;
    let symbolsProcessed = 0;

    for (const { symbol } of symbols) {
      console.log(`Processing ${symbol}...`);

      // Step 2: Get all records for this symbol
      const records = await db
        .select()
        .from(priceHistory)
        .where(eq(priceHistory.symbol, symbol))
        .orderBy(priceHistory.timestamp);

      if (records.length === 0) {
        console.log(`  ⚠️  No records found for ${symbol}, skipping`);
        continue;
      }

      // Step 3: Group by date and extract closing price (last price of day)
      const dailyMap = new Map<string, { timestamp: Date; price: number }>();

      for (const record of records) {
        const dateStr = record.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        const price = parseFloat(record.price);

        // Keep track of last price for each date
        if (!dailyMap.has(dateStr) || record.timestamp > dailyMap.get(dateStr)!.timestamp) {
          dailyMap.set(dateStr, {
            timestamp: record.timestamp,
            price: price,
          });
        }
      }

      // Step 4: Insert daily snapshots
      let daysInserted = 0;

      for (const [dateStr, data] of dailyMap) {
        try {
          await db.insert(dailySnapshots).values({
            symbol,
            date: new Date(dateStr), // Convert to Date object
            closePrice: data.price.toString(),
          }).onConflictDoNothing(); // Skip if already exists

          daysInserted++;
        } catch (error) {
          console.error(`  ❌ Error inserting ${symbol} for ${dateStr}:`, error);
        }
      }

      totalDaysInserted += daysInserted;
      symbolsProcessed++;

      console.log(`  ✅ Migrated ${daysInserted} daily snapshots (from ${records.length} records)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Symbols processed: ${symbolsProcessed}`);
    console.log(`   - Daily snapshots created: ${totalDaysInserted}`);

    // Step 5: Verify the migration
    console.log('\n🔍 Verifying migration...');

    const snapshotCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailySnapshots);

    console.log(`   - Total records in daily_snapshots: ${snapshotCount[0].count}`);

    // Show sample data
    console.log('\n📋 Sample daily snapshots:');
    const samples = await db
      .select()
      .from(dailySnapshots)
      .orderBy(sql`random()`)
      .limit(5);

    for (const sample of samples) {
      const date = new Date(sample.date).toISOString().split('T')[0];
      console.log(`   ${sample.symbol} | ${date} | ₹${sample.closePrice}`);
    }

    console.log('\n✅ Migration verification complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. ✅ daily_snapshots table is now populated');
    console.log('   2. 🔄 Update services to use daily_snapshots');
    console.log('   3. 🧪 Test alert detection with new architecture');
    console.log('   4. ⏰ Update cron jobs to write to daily_snapshots');
    console.log('   5. 🗄️  Keep price_history as backup for 30 days');
    console.log('   6. 🗑️  Drop price_history after verification (optional)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateToDailySnapshots()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
