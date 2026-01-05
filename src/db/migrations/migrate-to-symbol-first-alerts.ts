import postgres from 'postgres';
import { config } from '../../config';
import logger from '../../utils/logger';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

/**
 * Migration script to migrate from user-first to symbol-first alert architecture
 * 
 * This script:
 * 1. Creates user_alerts junction table
 * 2. Deduplicates existing alerts (group by symbol, market, threshold, timeframe, timestamp within same day)
 * 3. Migrates existing alerts to symbol-level alerts
 * 4. Creates user_alerts entries linking users to symbol-level alerts
 * 5. Preserves notified status in user_alerts
 * 6. Removes userId and notified columns from alerts table
 * 7. Adds indexes for performance
 */
export async function migrateToSymbolFirstAlerts(): Promise<void> {
  logger.info('🔄 Starting symbol-first alert architecture migration...');

  try {
    // Step 1: Create user_alerts table
    logger.info('📝 Step 1: Creating user_alerts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        notified BOOLEAN NOT NULL DEFAULT false,
        read BOOLEAN NOT NULL DEFAULT false,
        dismissed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, alert_id)
      );
    `;
    logger.info('✅ Created user_alerts table');

    // Step 2: Add indexes for user_alerts
    logger.info('📝 Step 2: Adding indexes to user_alerts...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_alerts_alert_id ON user_alerts(alert_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_alerts_user_notified ON user_alerts(user_id, notified);
    `;
    logger.info('✅ Added indexes to user_alerts');

    // Step 3: Make user_id nullable temporarily to allow inserting alerts without user_id
    logger.info('📝 Step 3: Checking if user_id column exists...');
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alerts' AND column_name = 'user_id'
      ) as exists;
    `;
    const hasUserIdColumn = columnExists[0]?.exists ?? false;
    
    if (hasUserIdColumn) {
      logger.info('📝 Making user_id nullable temporarily...');
      await sql`
        ALTER TABLE alerts ALTER COLUMN user_id DROP NOT NULL;
      `;
      logger.info('✅ Made user_id nullable');
    } else {
      logger.info('⚠️  user_id column already removed, skipping');
    }

    // Step 4: Check if we need to migrate data (only if user_id column exists)
    if (!hasUserIdColumn) {
      logger.info('⚠️  user_id column already removed - schema migration already complete');
      logger.info('📝 Skipping data migration (alerts are already symbol-level)');
    } else {
      logger.info('📝 Step 4: Checking for existing alerts to migrate...');
      const existingAlertsCount = await sql`
        SELECT COUNT(*) as count FROM alerts;
      `;
      const count = Number(existingAlertsCount[0]?.count ?? 0);
      logger.info(`Found ${count} existing alerts to migrate`);

      if (count === 0) {
        logger.info('⚠️  No existing alerts to migrate, skipping data migration');
      } else {
      // Step 5: Deduplicate alerts and create symbol-level alerts
      // Group alerts by (symbol, market, threshold, timeframe, date) and keep one per group
      logger.info('📝 Step 5: Deduplicating alerts and creating symbol-level alerts...');
      
      // Create a temporary table to store deduplicated alerts
      await sql`
        CREATE TEMP TABLE deduplicated_alerts AS
        SELECT DISTINCT ON (
          symbol, 
          market, 
          threshold, 
          timeframe, 
          DATE(timestamp)
        )
        id,
        symbol,
        market,
        drop_percentage,
        threshold,
        timeframe,
        price,
        historical_price,
        timestamp,
        critical
        FROM alerts
        ORDER BY symbol, market, threshold, timeframe, DATE(timestamp), timestamp DESC;
      `;
      logger.info('✅ Created deduplicated alerts');

      // Step 5: Create new symbol-level alerts table (temporary)
      await sql`
        CREATE TEMP TABLE new_alerts AS
        SELECT 
          gen_random_uuid() as id,
          symbol,
          market,
          drop_percentage,
          threshold,
          timeframe,
          price,
          historical_price,
          timestamp,
          critical
        FROM deduplicated_alerts;
      `;
      logger.info('✅ Created new symbol-level alerts');

      // Step 6: Map old alert IDs to new alert IDs
      await sql`
        CREATE TEMP TABLE alert_id_mapping AS
        SELECT 
          da.id as old_id,
          na.id as new_id
        FROM deduplicated_alerts da
        JOIN new_alerts na ON (
          da.symbol = na.symbol AND
          da.market = na.market AND
          da.threshold = na.threshold AND
          da.timeframe = na.timeframe AND
          DATE(da.timestamp) = DATE(na.timestamp)
        );
      `;
      logger.info('✅ Created alert ID mapping');

      // Step 8: Insert new symbol-level alerts into alerts table FIRST
      // We need to insert them before updating recovery_tracking
      logger.info('📝 Step 8: Inserting new symbol-level alerts...');
      await sql`
        INSERT INTO alerts (id, symbol, market, drop_percentage, threshold, timeframe, price, historical_price, timestamp, critical)
        SELECT id, symbol, market, drop_percentage, threshold, timeframe, price, historical_price, timestamp, critical
        FROM new_alerts
        ON CONFLICT DO NOTHING;
      `;
      const newAlertsCount = await sql`SELECT COUNT(*) as count FROM alerts;`;
      logger.info(`✅ Inserted ${newAlertsCount[0]?.count ?? 0} symbol-level alerts`);

      // Step 9: Backup old alerts
      logger.info('📝 Step 9: Backing up old alerts...');
      await sql`
        CREATE TABLE IF NOT EXISTS alerts_backup AS
        SELECT * FROM alerts WHERE 1=0;
      `;
      // Only backup alerts that have user_id (old schema)
      await sql`
        INSERT INTO alerts_backup 
        SELECT * FROM alerts 
        WHERE user_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      `;
      const backupCount = await sql`SELECT COUNT(*) as count FROM alerts_backup;`;
      logger.info(`✅ Backed up ${backupCount[0]?.count ?? 0} old alerts`);

      // Step 10: Update recovery_tracking to use new alert IDs
      logger.info('📝 Step 10: Updating recovery_tracking with new alert IDs...');
      await sql`
        UPDATE recovery_tracking rt
        SET alert_id = aim.new_id
        FROM alert_id_mapping aim
        WHERE rt.alert_id = aim.old_id
        AND EXISTS (SELECT 1 FROM alerts WHERE id = aim.new_id);
      `;
      const updatedRecoveryCount = await sql`
        SELECT COUNT(*) as count FROM recovery_tracking;
      `;
      logger.info(`✅ Updated recovery_tracking records (total: ${updatedRecoveryCount[0]?.count ?? 0})`);

      // Step 11: Delete old alerts that have been successfully migrated
      // Only delete alerts that either:
      // 1. Have no recovery_tracking references, OR
      // 2. Have recovery_tracking that has been updated to point to new alerts
      logger.info('📝 Step 11: Deleting old alerts...');
      await sql`
        DELETE FROM alerts a
        WHERE a.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM recovery_tracking rt
          WHERE rt.alert_id = a.id
          AND rt.alert_id NOT IN (SELECT new_id FROM alert_id_mapping)
        );
      `;
      const remainingAlertsCount = await sql`SELECT COUNT(*) as count FROM alerts;`;
      logger.info(`✅ Deleted migrated old alerts (remaining: ${remainingAlertsCount[0]?.count ?? 0})`);
      
      // Check for orphaned recovery_tracking records
      const orphanedRecovery = await sql`
        SELECT COUNT(*) as count FROM recovery_tracking rt
        WHERE rt.alert_id NOT IN (SELECT id FROM alerts);
      `;
      const orphanedCount = Number(orphanedRecovery[0]?.count ?? 0);
      if (orphanedCount > 0) {
        logger.warn(`⚠️  Found ${orphanedCount} orphaned recovery_tracking records (will be cleaned up)`);
        await sql`
          DELETE FROM recovery_tracking rt
          WHERE rt.alert_id NOT IN (SELECT id FROM alerts);
        `;
        logger.info(`✅ Cleaned up ${orphanedCount} orphaned recovery_tracking records`);
      }

      // Step 12: Create user_alerts entries
      logger.info('📝 Step 12: Creating user_alerts entries...');
      await sql`
        INSERT INTO user_alerts (user_id, alert_id, notified, read, dismissed, created_at)
        SELECT 
          a.user_id,
          aim.new_id as alert_id,
          a.notified,
          false as read,
          false as dismissed,
          a.timestamp as created_at
        FROM alerts_backup a
        JOIN alert_id_mapping aim ON a.id = aim.old_id
        ON CONFLICT (user_id, alert_id) DO NOTHING;
      `;
      const userAlertsCount = await sql`SELECT COUNT(*) as count FROM user_alerts;`;
      logger.info(`✅ Created ${userAlertsCount[0]?.count ?? 0} user_alerts entries`);

        // Cleanup temporary tables
        await sql`DROP TABLE IF EXISTS deduplicated_alerts;`;
        await sql`DROP TABLE IF EXISTS new_alerts;`;
        await sql`DROP TABLE IF EXISTS alert_id_mapping;`;
        logger.info('✅ Cleaned up temporary tables');
      }
    }

    // Step 14: Remove userId and notified columns from alerts table (if they exist)
    if (hasUserIdColumn) {
      logger.info('📝 Step 14: Removing userId and notified columns from alerts table...');
      
      // Drop foreign key constraints first if they exist
      await sql`
        DROP INDEX IF EXISTS idx_alerts_user_id;
      `;
      await sql`
        DROP INDEX IF EXISTS idx_alerts_user_symbol;
      `;
      await sql`
        DROP INDEX IF EXISTS idx_alerts_user_timestamp;
      `;
      
      // Remove columns
      await sql`
        ALTER TABLE alerts DROP COLUMN IF EXISTS user_id;
      `;
      await sql`
        ALTER TABLE alerts DROP COLUMN IF EXISTS notified;
      `;
      logger.info('✅ Removed userId and notified columns from alerts table');
    } else {
      logger.info('⚠️  userId and notified columns already removed, skipping');
    }

    // Step 15: Deduplicate any remaining alerts before adding constraint
    // First update recovery_tracking to point to the kept alert, then delete duplicates
    logger.info('📝 Step 15: Deduplicating any remaining alerts...');
    
    // Step 15a: Update recovery_tracking to point to the kept alert (oldest)
    await sql`
      UPDATE recovery_tracking rt
      SET alert_id = ka.id
      FROM (
        SELECT DISTINCT ON (symbol, market, threshold, timeframe, DATE(timestamp))
          id, symbol, market, threshold, timeframe, DATE(timestamp) as alert_date
        FROM alerts
        ORDER BY symbol, market, threshold, timeframe, DATE(timestamp), timestamp ASC
      ) ka
      WHERE rt.alert_id IN (
        SELECT id FROM alerts a
        WHERE a.symbol = ka.symbol
        AND a.market = ka.market
        AND a.threshold = ka.threshold
        AND a.timeframe = ka.timeframe
        AND DATE(a.timestamp) = ka.alert_date
        AND a.id != ka.id
      );
    `;
    
    // Step 15b: Delete duplicate alerts (now safe since recovery_tracking has been updated)
    await sql`
      DELETE FROM alerts
      WHERE id NOT IN (
        SELECT DISTINCT ON (symbol, market, threshold, timeframe, DATE(timestamp))
          id
        FROM alerts
        ORDER BY symbol, market, threshold, timeframe, DATE(timestamp), timestamp ASC
      );
    `;
    const deduplicatedCount = await sql`SELECT COUNT(*) as count FROM alerts;`;
    logger.info(`✅ Deduplicated alerts (remaining: ${deduplicatedCount[0]?.count ?? 0})`);

    // Step 16: Add unique constraint to prevent duplicate alerts
    logger.info('📝 Step 16: Adding unique constraint to alerts table...');
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_symbol_market_threshold_timeframe_date 
      ON alerts(symbol, market, threshold, timeframe, DATE(timestamp));
    `;
    logger.info('✅ Added unique constraint to alerts table');

    // Step 17: Add indexes for new schema
    logger.info('📝 Step 17: Adding indexes for new schema...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_symbol_market ON alerts(symbol, market);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
    `;
    logger.info('✅ Added indexes for new schema');

    logger.info('✅ Symbol-first alert architecture migration completed successfully');
    logger.info('📊 Migration Summary:');
    const finalAlertsCount = await sql`SELECT COUNT(*) as count FROM alerts;`;
    const finalUserAlertsCount = await sql`SELECT COUNT(*) as count FROM user_alerts;`;
    logger.info(`   - Symbol-level alerts: ${finalAlertsCount[0]?.count ?? 0}`);
    logger.info(`   - User-alert links: ${finalUserAlertsCount[0]?.count ?? 0}`);
    if (hasUserIdColumn) {
      logger.info('   - Old alerts backed up to alerts_backup table');
    }
  } catch (error) {
    logger.error('❌ Error in symbol-first alert migration', { error });
    throw error;
  } finally {
    await sql.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToSymbolFirstAlerts()
    .then(() => {
      logger.info('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed', { error });
      process.exit(1);
    });
}

