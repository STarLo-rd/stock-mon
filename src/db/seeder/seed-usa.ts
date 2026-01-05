import { db } from '../index';
import { watchlist } from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Seed database with USA market watchlist
 *
 * Includes:
 * - 3 major indices (S&P 500, NASDAQ, Dow Jones)
 * - 5 FAANG stocks (AAPL, GOOGL, META, AMZN, NFLX)
 * - 3 extended tech stocks (NVDA, MSFT, TSLA)
 */
export async function seedUSA(): Promise<void> {
  const usaSymbols = [
    // Major Indices
    { symbol: '^GSPC', exchange: 'NYSE', type: 'INDEX' as const, name: 'S&P 500' },
    { symbol: '^IXIC', exchange: 'NASDAQ', type: 'INDEX' as const, name: 'NASDAQ Composite' },
    { symbol: '^DJI', exchange: 'NYSE', type: 'INDEX' as const, name: 'Dow Jones Industrial Average' },

    // FAANG Stocks
    { symbol: 'AAPL', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'Apple Inc.' },
    { symbol: 'GOOGL', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'Alphabet Inc. (Google)' },
    { symbol: 'META', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'Meta Platforms Inc. (Facebook)' },
    { symbol: 'AMZN', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'Amazon.com Inc.' },
    { symbol: 'NFLX', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'Netflix Inc.' },

    // Extended Tech
    { symbol: 'NVDA', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'NVIDIA Corporation' },
    { symbol: 'MSFT', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'Microsoft Corporation' },
    { symbol: 'TSLA', exchange: 'NASDAQ', type: 'STOCK' as const, name: 'Tesla Inc.' },
  ];

  console.log('🇺🇸 Seeding USA market watchlist...');
  console.log(`Total symbols to seed: ${usaSymbols.length}`);

  let addedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  for (const symbolData of usaSymbols) {
    try {
      // Check if symbol already exists in USA market
      const existing = await db
        .select()
        .from(watchlist)
        .where(
          and(
            eq(watchlist.symbol, symbolData.symbol),
            eq(watchlist.market, 'USA')
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(watchlist).values({
          symbol: symbolData.symbol,
          name: symbolData.name,
          exchange: symbolData.exchange,
          type: symbolData.type,
          market: 'USA',
          active: true,
        });
        console.log(`✅ Added ${symbolData.symbol} (${symbolData.name}) to USA watchlist`);
        addedCount++;
      } else {
        // Update name if it's missing or different
        if (symbolData.name && existing[0].name !== symbolData.name) {
          await db.update(watchlist)
            .set({ name: symbolData.name })
            .where(
              and(
                eq(watchlist.symbol, symbolData.symbol),
                eq(watchlist.market, 'USA')
              )
            );
          console.log(`🔄 Updated name for ${symbolData.symbol}: ${symbolData.name}`);
          updatedCount++;
        } else if (!existing[0].name && symbolData.name) {
          await db.update(watchlist)
            .set({ name: symbolData.name })
            .where(
              and(
                eq(watchlist.symbol, symbolData.symbol),
                eq(watchlist.market, 'USA')
              )
            );
          console.log(`➕ Added name for ${symbolData.symbol}: ${symbolData.name}`);
          updatedCount++;
        } else {
          console.log(`⏭️  ${symbolData.symbol} already exists in USA market, skipping`);
          skippedCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error adding ${symbolData.symbol}:`, error);
    }
  }

  console.log('\n📊 USA Watchlist Seeding Summary:');
  console.log(`   Added: ${addedCount} symbols`);
  console.log(`   Updated: ${updatedCount} symbols`);
  console.log(`   Skipped: ${skippedCount} symbols (already exist)`);
  console.log(`   Total: ${usaSymbols.length} symbols`);
  console.log('✅ USA watchlist seeding completed!\n');
}

