import { db } from '../index';
import { watchlist } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Seed database with popular Indian stocks
 */
export async function seedStocks(): Promise<void> {
  const stocks = [
    { symbol: 'RELIANCE', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'TCS', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'HDFCBANK', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'INFY', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'ICICIBANK', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'HINDUNILVR', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'BHARTIARTL', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'SBIN', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'BAJFINANCE', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'LICI', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'ITC', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'HCLTECH', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'AXISBANK', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'KOTAKBANK', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'LT', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'ASIANPAINT', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'MARUTI', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'TITAN', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'SUNPHARMA', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'ULTRACEMCO', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'WIPRO', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'NESTLEIND', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'POWERGRID', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'ONGC', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'NTPC', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'TATAMOTORS', exchange: 'NSE', type: 'STOCK' as const },
    { symbol: 'JSWSTEEL', exchange: 'NSE', type: 'STOCK' as const },
  ];

  console.log('📊 Seeding Indian stocks...');
  console.log(`Total stocks to seed: ${stocks.length}`);

  let addedCount = 0;
  let skippedCount = 0;

  for (const stockData of stocks) {
    try {
      // Check if symbol already exists
      const existing = await db
        .select()
        .from(watchlist)
        .where(eq(watchlist.symbol, stockData.symbol))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(watchlist).values({
          ...stockData,
          market: 'INDIA',
          active: true,
        });
        console.log(`✅ Added ${stockData.symbol} to watchlist`);
        addedCount++;
      } else {
        console.log(`⏭️  ${stockData.symbol} already exists, skipping`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error adding ${stockData.symbol}:`, error);
    }
  }

  console.log('\n📊 Stocks Seeding Summary:');
  console.log(`   Added: ${addedCount} stocks`);
  console.log(`   Skipped: ${skippedCount} stocks (already exist)`);
  console.log(`   Total: ${stocks.length} stocks`);
  console.log('✅ Indian stocks seeding completed!\n');
}

