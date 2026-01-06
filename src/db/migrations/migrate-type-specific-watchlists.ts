import { db } from '../index';
import postgres from 'postgres';
import { config } from '../../config';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

/**
 * Migration: Add type field to watchlists and create type-specific watchlists
 * This migration:
 * 1. Adds type column to watchlists table (nullable first)
 * 2. Creates separate default watchlists for each type (INDIA and USA)
 * 3. Migrates existing symbols to appropriate type-specific watchlists
 * 4. Makes type NOT NULL
 * 5. Updates unique constraints
 */
async function migrateTypeSpecificWatchlists() {
  console.log('🔄 Starting type-specific watchlists migration...');

  try {
    // Step 1: Add type column to watchlists table
    console.log('📝 Step 1: Adding type column to watchlists table...');
    
    const typeColumnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'watchlists' AND column_name = 'type'
    `;
    
    if (typeColumnCheck.length === 0) {
      await sql`ALTER TABLE watchlists ADD COLUMN type TEXT`;
      console.log('✅ Added type column');
    } else {
      console.log('⏭️  type column already exists');
    }

    // Step 2: Get existing watchlists and their symbols
    console.log('📝 Step 2: Analyzing existing watchlists...');
    
    const existingWatchlists = await sql`
      SELECT id, name, market FROM watchlists
    `;
    
    console.log(`Found ${existingWatchlists.length} existing watchlists`);

    // Step 3: Create type-specific default watchlists
    console.log('📝 Step 3: Creating type-specific default watchlists...');
    
    const types = ['INDEX', 'STOCK', 'MUTUAL_FUND'];
    const markets = ['INDIA', 'USA'];
    
    const newWatchlists: { [key: string]: string } = {};
    
    for (const market of markets) {
      for (const type of types) {
        const check = await sql`
          SELECT id FROM watchlists 
          WHERE market = ${market} AND type = ${type} AND name = 'My Watchlist'
          LIMIT 1
        `;
        
        if (check.length === 0) {
          const [watchlist] = await sql`
            INSERT INTO watchlists (name, market, type, "order")
            VALUES ('My Watchlist', ${market}, ${type}, 0)
            RETURNING id
          `;
          const key = `${market}_${type}`;
          newWatchlists[key] = watchlist.id;
          console.log(`✅ Created ${type} watchlist for ${market}: ${watchlist.id}`);
        } else {
          const key = `${market}_${type}`;
          newWatchlists[key] = check[0].id;
          console.log(`⏭️  ${type} watchlist for ${market} already exists: ${check[0].id}`);
        }
      }
    }

    // Step 4: Migrate existing watchlists and their symbols
    console.log('📝 Step 4: Migrating existing watchlists and symbols...');
    
    for (const watchlist of existingWatchlists) {
      // Get symbols in this watchlist
      const symbols = await sql`
        SELECT id, symbol, type, market FROM watchlist 
        WHERE watchlist_id = ${watchlist.id}
      `;
      
      if (symbols.length === 0) {
        // Empty watchlist - assign a default type (STOCK)
        await sql`
          UPDATE watchlists 
          SET type = 'STOCK'
          WHERE id = ${watchlist.id}
        `;
        console.log(`✅ Set type STOCK for empty watchlist ${watchlist.id}`);
        continue;
      }

      // Group symbols by type
      const symbolsByType: { [key: string]: any[] } = {};
      for (const symbol of symbols) {
        const symbolType = symbol.type;
        if (!symbolsByType[symbolType]) {
          symbolsByType[symbolType] = [];
        }
        symbolsByType[symbolType].push(symbol);
      }

      const typeKeys = Object.keys(symbolsByType);
      
      if (typeKeys.length === 1) {
        // All symbols are same type - assign that type to watchlist
        const watchlistType = typeKeys[0];
        await sql`
          UPDATE watchlists 
          SET type = ${watchlistType}
          WHERE id = ${watchlist.id}
        `;
        console.log(`✅ Set type ${watchlistType} for watchlist ${watchlist.id} (${symbols.length} symbols)`);
      } else {
        // Mixed types - need to split into separate watchlists
        console.log(`⚠️  Watchlist ${watchlist.id} has mixed types: ${typeKeys.join(', ')}`);
        
        // For each type, create a new watchlist or use existing default
        for (const symbolType of typeKeys) {
          const key = `${watchlist.market}_${symbolType}`;
          const targetWatchlistId = newWatchlists[key];
          
          // Update symbols to point to type-specific watchlist
          const symbolIds = symbolsByType[symbolType].map(s => s.id);
          
          // Get max order for target watchlist
          const maxOrderResult = await sql`
            SELECT COALESCE(MAX("order"), -1) as max_order
            FROM watchlist
            WHERE watchlist_id = ${targetWatchlistId}
          `;
          let currentOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;
          
          for (const symbolId of symbolIds) {
            await sql`
              UPDATE watchlist
              SET watchlist_id = ${targetWatchlistId}, "order" = ${currentOrder}
              WHERE id = ${symbolId}
            `;
            currentOrder++;
          }
          
          console.log(`✅ Migrated ${symbolIds.length} ${symbolType} symbols to type-specific watchlist`);
        }
        
        // Delete the old mixed-type watchlist
        await sql`DELETE FROM watchlists WHERE id = ${watchlist.id}`;
        console.log(`🗑️  Deleted mixed-type watchlist ${watchlist.id}`);
      }
    }

    // Step 5: Make type NOT NULL
    console.log('📝 Step 5: Making type NOT NULL...');
    const nullCheck = await sql`
      SELECT COUNT(*) as null_count
      FROM watchlists
      WHERE type IS NULL
    `;
    
    if (nullCheck[0].null_count === '0') {
      await sql`
        ALTER TABLE watchlists
        ALTER COLUMN type SET NOT NULL
      `;
      console.log('✅ Made type NOT NULL');
    } else {
      console.log(`⚠️  Cannot make type NOT NULL: ${nullCheck[0].null_count} rows still have NULL`);
    }

    // Step 6: Update unique constraint
    console.log('📝 Step 6: Updating unique constraint...');
    
    // Drop old constraint if it exists
    await sql`
      ALTER TABLE watchlists
      DROP CONSTRAINT IF EXISTS unique_name_type_market
    `;
    
    // Create new constraint
    const uniqueCheck = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'watchlists'
      AND constraint_name = 'unique_name_type_market'
    `;
    
    if (uniqueCheck.length === 0) {
      await sql`
        CREATE UNIQUE INDEX unique_name_type_market
        ON watchlists(name, type, market)
      `;
      console.log('✅ Created new unique constraint');
    } else {
      console.log('⏭️  Unique constraint already exists');
    }

    console.log('🎉 Type-specific watchlists migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateTypeSpecificWatchlists()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateTypeSpecificWatchlists };



