import { db } from './index';
import { watchlist } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Seed database with default watchlist
 */
export async function seedWatchlist(): Promise<void> {
  const defaultSymbols = [
    // Indices
    { symbol: 'NIFTY50', exchange: 'NSE', type: 'INDEX' as const },
    { symbol: 'NIFTYMIDCAP', exchange: 'NSE', type: 'INDEX' as const },
    { symbol: 'NIFTYSMLCAP', exchange: 'NSE', type: 'INDEX' as const },
    { symbol: 'NIFTYIT', exchange: 'NSE', type: 'INDEX' as const },
    
    // Popular Indian Stocks
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

  console.log('Seeding watchlist with default symbols...');

  for (const symbolData of defaultSymbols) {
    try {
      // Check if symbol already exists
      const existing = await db
        .select()
        .from(watchlist)
        .where(eq(watchlist.symbol, symbolData.symbol))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(watchlist).values({
          ...symbolData,
          active: true,
        });
        console.log(`Added ${symbolData.symbol} to watchlist`);
      } else {
        console.log(`${symbolData.symbol} already exists, skipping`);
      }
    } catch (error) {
      console.error(`Error adding ${symbolData.symbol}:`, error);
    }
  }

  console.log('Watchlist seeding completed');
}

/**
 * Seed database with mutual funds
 */
export async function seedMutualFunds(): Promise<void> {
  const mutualFunds = [
    { symbol: '135800', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Tata Digital India Fund-Direct Plan-Growth' },
    { symbol: '152712', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Motilal Oswal Nifty India Defence Index Fund Direct Plan Growth' },
    { symbol: '122639', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
    { symbol: '118763', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Nippon India Power & Infra Fund - Direct Plan Growth Plan - Growth Option' },
    { symbol: '120546', exchange: 'MF', type: 'MUTUAL_FUND' as const, name: 'Aditya Birla Sun Life Gold Fund - Growth - Direct Plan' },
  ];

  console.log('Seeding watchlist with mutual funds...');

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
        console.log(`Added ${mfData.symbol} (${mfData.name}) to watchlist`);
      } else {
        // Always update name to ensure it's current
        if (mfData.name && existing[0].name !== mfData.name) {
          await db.update(watchlist)
            .set({ name: mfData.name })
            .where(eq(watchlist.symbol, mfData.symbol));
          console.log(`Updated name for ${mfData.symbol}: ${mfData.name}`);
        } else if (!existing[0].name && mfData.name) {
          await db.update(watchlist)
            .set({ name: mfData.name })
            .where(eq(watchlist.symbol, mfData.symbol));
          console.log(`Added name for ${mfData.symbol}: ${mfData.name}`);
        } else {
          console.log(`${mfData.symbol} already exists with name, skipping`);
        }
      }
    } catch (error) {
      console.error(`Error adding ${mfData.symbol}:`, error);
    }
  }

  console.log('Mutual fund seeding completed');
}

// Run if called directly
if (require.main === module) {
  seedWatchlist()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

