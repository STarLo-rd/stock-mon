import postgres from 'postgres';
import { config } from '../../config';
import logger from '../../utils/logger';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

/**
 * Migration script to add user scoping to watchlists and alerts
 * This script:
 * 1. Adds user_id column to watchlists (nullable initially)
 * 2. Adds user_id column to alerts (nullable initially)
 * 3. Creates a default system user UUID for existing data
 * 4. Migrates existing watchlists/alerts to default user
 * 5. Makes user_id NOT NULL after migration
 * 6. Adds indexes for performance
 * 7. Updates unique constraints
 */
export async function addUserScopingMigration(): Promise<void> {
  logger.info('🔄 Starting user scoping migration...');

  try {
    // Step 1: Add user_id column to watchlists (nullable first)
    logger.info('📝 Step 1: Adding user_id column to watchlists...');
    await sql`
      ALTER TABLE watchlists 
      ADD COLUMN IF NOT EXISTS user_id UUID;
    `;
    logger.info('✅ Added user_id column to watchlists');

    // Step 2: Add user_id column to alerts (nullable first)
    logger.info('📝 Step 2: Adding user_id column to alerts...');
    await sql`
      ALTER TABLE alerts 
      ADD COLUMN IF NOT EXISTS user_id UUID;
    `;
    logger.info('✅ Added user_id column to alerts');

    // Step 3: Create a default system user UUID for existing data
    // This is a placeholder UUID that represents "system" or "legacy" data
    // In production, you might want to create actual Supabase users for this
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    logger.info('📝 Step 3: Using default user ID for existing data', { defaultUserId });

    // Step 4: Migrate existing watchlists to default user
    logger.info('📝 Step 4: Migrating existing watchlists to default user...');
    const watchlistUpdateResult = await sql`
      UPDATE watchlists 
      SET user_id = ${defaultUserId}::uuid
      WHERE user_id IS NULL;
    `;
    logger.info(`✅ Migrated ${watchlistUpdateResult.count} watchlists to default user`);

    // Step 5: Migrate existing alerts to default user
    logger.info('📝 Step 5: Migrating existing alerts to default user...');
    const alertsUpdateResult = await sql`
      UPDATE alerts 
      SET user_id = ${defaultUserId}::uuid
      WHERE user_id IS NULL;
    `;
    logger.info(`✅ Migrated ${alertsUpdateResult.count} alerts to default user`);

    // Step 6: Drop old unique constraint on watchlists
    logger.info('📝 Step 6: Updating unique constraints...');
    await sql`
      DROP INDEX IF EXISTS unique_name_type_market;
    `;
    logger.info('✅ Dropped old unique constraint on watchlists');

    // Step 7: Create new unique constraint including user_id
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_name_type_market_user 
      ON watchlists(name, type, market, user_id);
    `;
    logger.info('✅ Created new unique constraint on watchlists');

    // Step 8: Make user_id NOT NULL on watchlists
    logger.info('📝 Step 8: Making user_id NOT NULL on watchlists...');
    await sql`
      ALTER TABLE watchlists 
      ALTER COLUMN user_id SET NOT NULL;
    `;
    logger.info('✅ Made user_id NOT NULL on watchlists');

    // Step 9: Make user_id NOT NULL on alerts
    logger.info('📝 Step 9: Making user_id NOT NULL on alerts...');
    await sql`
      ALTER TABLE alerts 
      ALTER COLUMN user_id SET NOT NULL;
    `;
    logger.info('✅ Made user_id NOT NULL on alerts');

    // Step 10: Add indexes for performance
    logger.info('📝 Step 10: Adding performance indexes...');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_watchlists_user_id 
      ON watchlists(user_id);
    `;
    logger.info('✅ Created index on watchlists.user_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_watchlists_user_market_type 
      ON watchlists(user_id, market, type);
    `;
    logger.info('✅ Created index on watchlists(user_id, market, type)');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_user_id 
      ON alerts(user_id);
    `;
    logger.info('✅ Created index on alerts.user_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_user_symbol 
      ON alerts(user_id, symbol);
    `;
    logger.info('✅ Created index on alerts(user_id, symbol)');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_user_timestamp 
      ON alerts(user_id, timestamp DESC);
    `;
    logger.info('✅ Created index on alerts(user_id, timestamp DESC)');

    logger.info('✅ User scoping migration completed successfully');
  } catch (error) {
    logger.error('❌ Error in user scoping migration', { error });
    throw error;
  } finally {
    await sql.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  addUserScopingMigration()
    .then(() => {
      logger.info('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed', { error });
      process.exit(1);
    });
}

