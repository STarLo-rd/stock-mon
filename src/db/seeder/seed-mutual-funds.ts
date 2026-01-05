import { db } from '../index';
import { watchlist } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Seed database with Indian mutual funds
 */
export async function seedMutualFunds(): Promise<void> {
  const mutualFunds = [
    { symbol: '135800', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Tata Digital India Fund-Direct Plan-Growth' },
    { symbol: '152712', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Motilal Oswal Nifty India Defence Index Fund Direct Plan Growth' },
    { symbol: '122639', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
    { symbol: '118763', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Nippon India Power & Infra Fund - Direct Plan Growth Plan - Growth Option' },
    { symbol: '120546', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Aditya Birla Sun Life Gold Fund - Growth - Direct Plan' },
  ];

  console.log('💰 Seeding Indian mutual funds...');
  console.log(`Total mutual funds to seed: ${mutualFunds.length}`);

  let addedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  for (const mfData of mutualFunds) {
    try {
      // Check if symbol already exists
      const existing = await db
        .select()
        .from(watchlist)
        .where(eq(watchlist.symbol, mfData.symbol))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(watchlist).values({
          symbol: mfData.symbol,
          name: mfData.name,
          market: 'INDIA',
          exchange: mfData.exchange,
          type: mfData.type,
          active: true,
        });
        console.log(`✅ Added ${mfData.symbol} (${mfData.name}) to watchlist`);
        addedCount++;
      } else {
        // Always update name to ensure it's current
        if (mfData.name && existing[0].name !== mfData.name) {
          await db.update(watchlist)
            .set({ name: mfData.name })
            .where(eq(watchlist.symbol, mfData.symbol));
          console.log(`🔄 Updated name for ${mfData.symbol}: ${mfData.name}`);
          updatedCount++;
        } else if (!existing[0].name && mfData.name) {
          await db.update(watchlist)
            .set({ name: mfData.name })
            .where(eq(watchlist.symbol, mfData.symbol));
          console.log(`➕ Added name for ${mfData.symbol}: ${mfData.name}`);
          updatedCount++;
        } else {
          console.log(`⏭️  ${mfData.symbol} already exists with name, skipping`);
          skippedCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error adding ${mfData.symbol}:`, error);
    }
  }

  console.log('\n📊 Mutual Funds Seeding Summary:');
  console.log(`   Added: ${addedCount} mutual funds`);
  console.log(`   Updated: ${updatedCount} mutual funds`);
  console.log(`   Skipped: ${skippedCount} mutual funds (already exist)`);
  console.log(`   Total: ${mutualFunds.length} mutual funds`);
  console.log('✅ Indian mutual funds seeding completed!\n');
}

