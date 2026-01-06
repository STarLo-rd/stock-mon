import postgres from 'postgres';
import { config } from '../../config';
import { readFileSync } from 'fs';
import { join } from 'path';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

/**
 * Run subscription tables migration
 */
async function runSubscriptionMigration() {
  console.log('🔄 Running subscription tables migration...');

  try {
    // Read the SQL migration file
    const migrationPath = join(__dirname, '0003_add_subscriptions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Subscription tables migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSubscriptionMigration();


