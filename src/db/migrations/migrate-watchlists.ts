import { db } from '../index';
import postgres from 'postgres';
import { config } from '../../config';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

/**
 * Comprehensive migration script for watchlists feature
 * This script:
 * 1. Creates watchlists table
 * 2. Adds watchlist_id and order columns to watchlist table
 * 3. Creates default watchlists
 * 4. Migrates existing symbols to default watchlists
 * 5. Adds constraints
 */
async function migrateWatchlists() {
  console.log('🔄 Starting watchlists migration...');

  try {
    // Step 1: Create watchlists table
    console.log('📝 Step 1: Creating watchlists table...');
    await sql`
      CREATE TABLE IF NOT EXISTS watchlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        market TEXT NOT NULL DEFAULT 'INDIA',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Watchlists table created');

    // Step 2: Add columns to watchlist table (nullable first)
    console.log('📝 Step 2: Adding columns to watchlist table...');
    
    // Check if watchlist_id column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'watchlist' AND column_name = 'watchlist_id'
    `;
    
    if (columnCheck.length === 0) {
      await sql`ALTER TABLE watchlist ADD COLUMN watchlist_id UUID`;
      console.log('✅ Added watchlist_id column');
    } else {
      console.log('⏭️  watchlist_id column already exists');
    }

    const orderCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'watchlist' AND column_name = 'order'
    `;
    
    if (orderCheck.length === 0) {
      await sql`ALTER TABLE watchlist ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`;
      console.log('✅ Added order column');
    } else {
      console.log('⏭️  order column already exists');
    }

    // Step 3: Create default watchlists
    console.log('📝 Step 3: Creating default watchlists...');
    
    const indiaWatchlistCheck = await sql`
      SELECT id FROM watchlists WHERE market = 'INDIA' LIMIT 1
    `;
    
    let indiaWatchlistId: string;
    if (indiaWatchlistCheck.length === 0) {
      const [indiaWatchlist] = await sql`
        INSERT INTO watchlists (name, market, "order")
        VALUES ('My Watchlist', 'INDIA', 0)
        RETURNING id
      `;
      indiaWatchlistId = indiaWatchlist.id;
      console.log(`✅ Created default watchlist for INDIA: ${indiaWatchlistId}`);
    } else {
      indiaWatchlistId = indiaWatchlistCheck[0].id;
      console.log(`⏭️  Default INDIA watchlist already exists: ${indiaWatchlistId}`);
    }

    const usaWatchlistCheck = await sql`
      SELECT id FROM watchlists WHERE market = 'USA' LIMIT 1
    `;
    
    let usaWatchlistId: string;
    if (usaWatchlistCheck.length === 0) {
      const [usaWatchlist] = await sql`
        INSERT INTO watchlists (name, market, "order")
        VALUES ('My Watchlist', 'USA', 0)
        RETURNING id
      `;
      usaWatchlistId = usaWatchlist.id;
      console.log(`✅ Created default watchlist for USA: ${usaWatchlistId}`);
    } else {
      usaWatchlistId = usaWatchlistCheck[0].id;
      console.log(`⏭️  Default USA watchlist already exists: ${usaWatchlistId}`);
    }

    // Step 4: Migrate existing symbols
    console.log('📝 Step 4: Migrating existing symbols...');
    
    // Get symbols without watchlist_id
    const unmigratedSymbols = await sql`
      SELECT id, symbol, market FROM watchlist WHERE watchlist_id IS NULL
    `;
    
    if (unmigratedSymbols.length > 0) {
      console.log(`📦 Found ${unmigratedSymbols.length} symbols to migrate`);
      
      let indiaCount = 0;
      let usaCount = 0;
      let orderCounter = 0;

      for (const symbol of unmigratedSymbols) {
        const watchlistId = symbol.market === 'USA' ? usaWatchlistId : indiaWatchlistId;
        
        // Get current max order for this watchlist
        const maxOrderResult = await sql`
          SELECT COALESCE(MAX("order"), -1) as max_order
          FROM watchlist
          WHERE watchlist_id = ${watchlistId}
        `;
        const maxOrder = maxOrderResult[0]?.max_order ?? -1;
        const nextOrder = maxOrder + 1;

        await sql`
          UPDATE watchlist
          SET watchlist_id = ${watchlistId}, "order" = ${nextOrder}
          WHERE id = ${symbol.id}
        `;

        if (symbol.market === 'USA') {
          usaCount++;
        } else {
          indiaCount++;
        }
        orderCounter++;
      }

      console.log(`✅ Migrated ${indiaCount} symbols to INDIA watchlist`);
      console.log(`✅ Migrated ${usaCount} symbols to USA watchlist`);
    } else {
      console.log('⏭️  No symbols to migrate (all already have watchlist_id)');
    }

    // Step 5: Add foreign key constraint if it doesn't exist
    console.log('📝 Step 5: Adding foreign key constraint...');
    const fkCheck = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'watchlist' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%watchlist_id%'
    `;
    
    if (fkCheck.length === 0) {
      await sql`
        ALTER TABLE watchlist
        ADD CONSTRAINT watchlist_watchlist_id_fkey
        FOREIGN KEY (watchlist_id) REFERENCES watchlists(id)
      `;
      console.log('✅ Added foreign key constraint');
    } else {
      console.log('⏭️  Foreign key constraint already exists');
    }

    // Step 6: Make watchlist_id NOT NULL (only if all rows have it)
    console.log('📝 Step 6: Making watchlist_id NOT NULL...');
    const nullCheck = await sql`
      SELECT COUNT(*) as null_count
      FROM watchlist
      WHERE watchlist_id IS NULL
    `;
    
    if (nullCheck[0].null_count === '0') {
      await sql`
        ALTER TABLE watchlist
        ALTER COLUMN watchlist_id SET NOT NULL
      `;
      console.log('✅ Made watchlist_id NOT NULL');
    } else {
      console.log(`⚠️  Cannot make watchlist_id NOT NULL: ${nullCheck[0].null_count} rows still have NULL`);
    }

    // Step 7: Update unique constraint
    console.log('📝 Step 7: Updating unique constraint...');
    
    // Drop old constraint if it exists
    await sql`
      ALTER TABLE watchlist
      DROP CONSTRAINT IF EXISTS unique_symbol_market
    `;
    
    // Create new constraint
    const uniqueCheck = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'watchlist'
      AND constraint_name = 'unique_symbol_watchlist_market'
    `;
    
    if (uniqueCheck.length === 0) {
      await sql`
        CREATE UNIQUE INDEX unique_symbol_watchlist_market
        ON watchlist(symbol, watchlist_id, market)
      `;
      console.log('✅ Created new unique constraint');
    } else {
      console.log('⏭️  Unique constraint already exists');
    }

    console.log('🎉 Watchlists migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateWatchlists()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateWatchlists };



