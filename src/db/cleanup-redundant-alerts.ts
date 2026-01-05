import { db } from './index';
import { alerts, recoveryTracking } from './schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Script to clean up redundant alerts from the database
 * 
 * This script removes lower threshold alerts when multiple alerts exist
 * for the same symbol, timeframe, and timestamp (within 1 minute window).
 * Only the highest threshold alert is kept.
 * 
 * Example:
 * - If there are alerts for 5% and 10% threshold for the same symbol/timeframe/timestamp
 * - Only the 10% alert is kept, the 5% alert is deleted
 */

interface RedundantAlertGroup {
  symbol: string;
  timeframe: string;
  timestamp: Date;
  market: string;
  alerts: Array<{
    id: string;
    threshold: number;
    dropPercentage: string;
  }>;
}

async function findRedundantAlerts(): Promise<RedundantAlertGroup[]> {
  console.log('🔍 Finding redundant alerts...');

  // Get all alerts grouped by symbol, timeframe, and timestamp (rounded to nearest minute)
  const allAlerts = await db.select().from(alerts);

  // Group alerts by symbol + timeframe + timestamp (within 1 minute window) + market
  const groups = new Map<string, RedundantAlertGroup>();

  for (const alert of allAlerts) {
    // Round timestamp to nearest minute for grouping
    const timestamp = new Date(alert.timestamp);
    timestamp.setSeconds(0, 0);
    
    const key = `${alert.symbol}|${alert.timeframe}|${timestamp.toISOString()}|${alert.market || 'INDIA'}`;

    if (!groups.has(key)) {
      groups.set(key, {
        symbol: alert.symbol,
        timeframe: alert.timeframe,
        timestamp,
        market: alert.market || 'INDIA',
        alerts: [],
      });
    }

    groups.get(key)!.alerts.push({
      id: alert.id,
      threshold: alert.threshold,
      dropPercentage: alert.dropPercentage,
    });
  }

  // Filter to only groups with multiple alerts (redundant)
  const redundantGroups: RedundantAlertGroup[] = [];

  for (const group of groups.values()) {
    if (group.alerts.length > 1) {
      // Sort by threshold descending (highest first)
      group.alerts.sort((a, b) => b.threshold - a.threshold);
      redundantGroups.push(group);
    }
  }

  console.log(`Found ${redundantGroups.length} groups with redundant alerts`);
  return redundantGroups;
}

async function cleanupRedundantAlerts(): Promise<void> {
  try {
    console.log('🧹 Starting cleanup of redundant alerts...\n');

    const redundantGroups = await findRedundantAlerts();

    if (redundantGroups.length === 0) {
      console.log('✅ No redundant alerts found. Database is clean!');
      return;
    }

    let totalDeleted = 0;
    let totalKept = 0;
    let totalRecoveryUpdated = 0;

    for (const group of redundantGroups) {
      // Keep the highest threshold alert (first in sorted array)
      const keepAlert = group.alerts[0];
      const deleteAlerts = group.alerts.slice(1);

      console.log(`\n📊 ${group.symbol} (${group.timeframe}, ${group.market}):`);
      console.log(`   ✅ Keeping: ${keepAlert.threshold}% threshold (ID: ${keepAlert.id})`);
      
      for (const deleteAlert of deleteAlerts) {
        console.log(`   ❌ Deleting: ${deleteAlert.threshold}% threshold (ID: ${deleteAlert.id})`);
        
        // Check if this alert has recovery tracking records
        const recoveryRecords = await db
          .select()
          .from(recoveryTracking)
          .where(eq(recoveryTracking.alertId, deleteAlert.id));

        if (recoveryRecords.length > 0) {
          // Update recovery tracking records to point to the kept alert
          console.log(`   🔄 Updating ${recoveryRecords.length} recovery tracking record(s) to point to kept alert`);
          
          await db
            .update(recoveryTracking)
            .set({ alertId: keepAlert.id })
            .where(eq(recoveryTracking.alertId, deleteAlert.id));
          
          totalRecoveryUpdated += recoveryRecords.length;
        }
        
        // Now safe to delete the redundant alert
        await db.delete(alerts).where(eq(alerts.id, deleteAlert.id));
        totalDeleted++;
      }
      
      totalKept++;
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`   ✅ Kept: ${totalKept} alerts (highest threshold per group)`);
    console.log(`   ❌ Deleted: ${totalDeleted} redundant alerts`);
    if (totalRecoveryUpdated > 0) {
      console.log(`   🔄 Updated: ${totalRecoveryUpdated} recovery tracking record(s)`);
    }
    console.log(`\n✅ Cleanup completed successfully!`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run cleanup if executed directly
if (require.main === module) {
  cleanupRedundantAlerts()
    .then(() => {
      console.log('\n🎉 Cleanup script finished. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

export { cleanupRedundantAlerts };

