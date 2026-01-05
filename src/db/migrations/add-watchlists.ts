import { db } from '../index';
import { watchlists, watchlist } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Migration: Add watchlists table and migrate existing symbols
 * 
 * This migration:
 * 1. Creates default watchlists for INDIA and USA markets
 * 2. Migrates all existing symbols to the default watchlists
 * 3. Sets appropriate order values
 */
export async function addWatchlistsMigration(): Promise<void> {
  console.log('🔄 Starting watchlists migration...');

  try {
    // Check if watchlists table already has data
    const existingWatchlists = await db.select().from(watchlists).limit(1);
    
    if (existingWatchlists.length > 0) {
      console.log('⏭️  Watchlists already exist, skipping migration');
      return;
    }

    // Create default watchlists for both markets
    console.log('📝 Creating default watchlists...');
    
    const [indiaWatchlist] = await db.insert(watchlists).values({
      name: 'My Watchlist',
      market: 'INDIA',
      order: 0,
    }).returning();

    const [usaWatchlist] = await db.insert(watchlists).values({
      name: 'My Watchlist',
      market: 'USA',
      order: 0,
    }).returning();

    console.log(`✅ Created default watchlist for INDIA: ${indiaWatchlist.id}`);
    console.log(`✅ Created default watchlist for USA: ${usaWatchlist.id}`);

    // Get all existing symbols grouped by market
    const existingSymbols = await db.select().from(watchlist);
    
    if (existingSymbols.length === 0) {
      console.log('⏭️  No existing symbols to migrate');
      return;
    }

    console.log(`📦 Migrating ${existingSymbols.length} existing symbols...`);

    let indiaCount = 0;
    let usaCount = 0;

    // Migrate symbols to appropriate watchlist based on market
    for (let i = 0; i < existingSymbols.length; i++) {
      const symbol = existingSymbols[i];
      const watchlistId = symbol.market === 'USA' ? usaWatchlist.id : indiaWatchlist.id;
      
      await db.update(watchlist)
        .set({
          watchlistId,
          order: i,
        })
        .where(eq(watchlist.id, symbol.id));

      if (symbol.market === 'USA') {
        usaCount++;
      } else {
        indiaCount++;
      }
    }

    console.log(`✅ Migrated ${indiaCount} symbols to INDIA watchlist`);
    console.log(`✅ Migrated ${usaCount} symbols to USA watchlist`);
    console.log('🎉 Watchlists migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addWatchlistsMigration()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

