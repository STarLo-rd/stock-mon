import postgres from 'postgres';
import { config } from '../config';
import logger from '../utils/logger';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

/**
 * Regenerate user_alerts entries based on current alerts and users watching those symbols
 * This fixes the issue where user_alerts became empty after deduplication
 */
export async function regenerateUserAlerts(): Promise<void> {
  logger.info('🔄 Starting user_alerts regeneration...');

  try {
    // Step 1: Check current state
    logger.info('📝 Step 1: Checking current state...');
    const alertsCount = await sql`SELECT COUNT(*) as count FROM alerts;`;
    const userAlertsCount = await sql`SELECT COUNT(*) as count FROM user_alerts;`;
    logger.info(`Current alerts: ${alertsCount[0]?.count ?? 0}`);
    logger.info(`Current user_alerts: ${userAlertsCount[0]?.count ?? 0}`);

    if (Number(alertsCount[0]?.count ?? 0) === 0) {
      logger.info('⚠️  No alerts found - nothing to regenerate');
      return;
    }

    // Step 2: Clear existing user_alerts (they're pointing to deleted alerts)
    logger.info('📝 Step 2: Clearing existing user_alerts...');
    await sql`DELETE FROM user_alerts;`;
    logger.info('✅ Cleared existing user_alerts');

    // Step 3: For each alert, find all users watching that symbol and create user_alerts entries
    logger.info('📝 Step 3: Regenerating user_alerts entries...');
    
    const result = await sql`
      INSERT INTO user_alerts (user_id, alert_id, notified, read, dismissed, created_at)
      SELECT DISTINCT
        w.user_id,
        a.id as alert_id,
        false as notified,
        false as read,
        false as dismissed,
        a.timestamp as created_at
      FROM alerts a
      INNER JOIN watchlist wl ON (
        wl.symbol = a.symbol
        AND wl.market = a.market
        AND wl.active = true
      )
      INNER JOIN watchlists w ON w.id = wl.watchlist_id
      ON CONFLICT (user_id, alert_id) DO NOTHING;
    `;

    const insertedCount = result.count ?? 0;
    logger.info(`✅ Created ${insertedCount} user_alerts entries`);

    // Step 4: Verify results
    const finalUserAlertsCount = await sql`SELECT COUNT(*) as count FROM user_alerts;`;
    logger.info(`📊 Final user_alerts count: ${finalUserAlertsCount[0]?.count ?? 0}`);

    // Step 5: Show breakdown by user
    const userBreakdown = await sql`
      SELECT 
        user_id,
        COUNT(*) as alert_count
      FROM user_alerts
      GROUP BY user_id
      ORDER BY alert_count DESC;
    `;
    
    if (userBreakdown.length > 0) {
      logger.info('📊 User alerts breakdown:');
      userBreakdown.forEach((row: any) => {
        logger.info(`   User ${row.user_id}: ${row.alert_count} alerts`);
      });
    }

    logger.info('✅ User alerts regeneration completed successfully');
  } catch (error) {
    logger.error('❌ Error regenerating user_alerts', { error });
    throw error;
  } finally {
    await sql.end();
  }
}

// Run regeneration if called directly
if (require.main === module) {
  regenerateUserAlerts()
    .then(() => {
      logger.info('Regeneration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Regeneration failed', { error });
      process.exit(1);
    });
}

