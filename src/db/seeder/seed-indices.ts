import { db } from '../index';
import { watchlist } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Seed database with Indian indices
 */
export async function seedIndices(): Promise<void> {
  const indices = [
    { symbol: 'NIFTY50', exchange: 'NSE', type: 'INDEX' as const, name: 'NIFTY 50' },
    { symbol: 'NIFTYMIDCAP', exchange: 'NSE', type: 'INDEX' as const, name: 'NIFTY MIDCAP 100' },
    { symbol: 'NIFTYSMLCAP', exchange: 'NSE', type: 'INDEX' as const, name: 'NIFTY SMALLCAP 100' },
    { symbol: 'NIFTYIT', exchange: 'NSE', type: 'INDEX' as const, name: 'NIFTY IT' },
  ];

  console.log('📈 Seeding Indian indices...');
  console.log(`Total indices to seed: ${indices.length}`);

  let addedCount = 0;
  let skippedCount = 0;

  for (const indexData of indices) {
    try {
      // Check if symbol already exists
      const existing = await db
        .select()
        .from(watchlist)
        .where(eq(watchlist.symbol, indexData.symbol))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(watchlist).values({
          ...indexData,
          market: 'INDIA',
          active: true,
        });
        console.log(`✅ Added ${indexData.symbol} (${indexData.name}) to watchlist`);
        addedCount++;
      } else {
        // Update name if it's missing or different
        if (indexData.name && existing[0].name !== indexData.name) {
          await db.update(watchlist)
            .set({ name: indexData.name })
            .where(eq(watchlist.symbol, indexData.symbol));
          console.log(`🔄 Updated name for ${indexData.symbol}: ${indexData.name}`);
        } else {
          console.log(`⏭️  ${indexData.symbol} already exists, skipping`);
          skippedCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error adding ${indexData.symbol}:`, error);
    }
  }

  console.log('\n📊 Indices Seeding Summary:');
  console.log(`   Added: ${addedCount} indices`);
  console.log(`   Skipped: ${skippedCount} indices (already exist)`);
  console.log(`   Total: ${indices.length} indices`);
  console.log('✅ Indian indices seeding completed!\n');
}

