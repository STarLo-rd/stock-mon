import postgres from 'postgres';
import { config } from '../config';
import logger from '../utils/logger';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

/**
 * Cleanup script to remove unwanted tables from database
 * Removes:
 * - alerts_backup (created during migration)
 * - Any other temporary/backup tables
 */
export async function cleanupUnwantedTables(): Promise<void> {
  logger.info('🧹 Starting database cleanup...');

  try {
    // Step 1: List all tables
    logger.info('📝 Step 1: Listing all tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tableNames = tables.map(t => t.table_name);
    logger.info(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`);

    // Step 2: Define wanted tables (from schema)
    const wantedTables = [
      'watchlists',
      'watchlist',
      'daily_snapshots',
      'alerts',
      'user_alerts',
      'recovery_tracking',
    ];

    // Step 3: Identify unwanted tables
    const unwantedTables = tableNames.filter(name => !wantedTables.includes(name));
    
    if (unwantedTables.length === 0) {
      logger.info('✅ No unwanted tables found - database is clean!');
      return;
    }

    logger.info(`📝 Step 2: Found ${unwantedTables.length} unwanted table(s): ${unwantedTables.join(', ')}`);

    // Step 4: Remove unwanted tables
    for (const tableName of unwantedTables) {
      try {
        logger.info(`🗑️  Dropping table: ${tableName}...`);
        await sql.unsafe(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
        logger.info(`✅ Dropped table: ${tableName}`);
      } catch (error) {
        logger.error(`❌ Error dropping table ${tableName}`, { error });
      }
    }

    // Step 5: Verify cleanup
    const remainingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const remainingTableNames = remainingTables.map(t => t.table_name);
    
    logger.info('✅ Database cleanup completed successfully');
    logger.info(`📊 Remaining tables: ${remainingTableNames.join(', ')}`);
  } catch (error) {
    logger.error('❌ Error in database cleanup', { error });
    throw error;
  } finally {
    await sql.end();
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupUnwantedTables()
    .then(() => {
      logger.info('Cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Cleanup failed', { error });
      process.exit(1);
    });
}

