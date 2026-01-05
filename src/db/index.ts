import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config';

const connectionString = config.database.url;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

/**
 * PostgreSQL client with optimized connection pooling
 * Configuration optimized for 10-100 concurrent users
 */
const client = postgres(connectionString, {
  max: 20,                    // Maximum pool size (supports 100 concurrent users)
  idle_timeout: 20,           // Seconds before closing idle connections
  connect_timeout: 10,        // Connection timeout in seconds
  max_lifetime: 60 * 30,      // Max connection lifetime (30 minutes)
  connection: {
    application_name: 'market-crash-monitor',
  },
  onnotice: () => {},         // Suppress NOTICE messages in logs
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

