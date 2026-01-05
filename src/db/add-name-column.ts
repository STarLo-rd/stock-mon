import { db } from './index';
import { sql } from 'drizzle-orm';

/**
 * Add name column to watchlist table and update existing mutual funds
 */
async function addNameColumn() {
  try {
    console.log('Adding name column to watchlist table...');
    
    // Add the column
    await db.execute(sql`ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS name TEXT`);
    console.log('✓ Added name column');
    
    // Update existing mutual funds with their names
    console.log('Updating existing mutual funds with names...');
    await db.execute(sql`
      UPDATE watchlist 
      SET name = CASE symbol
        WHEN '135800' THEN 'Tata Digital India Fund-Direct Plan-Growth'
        WHEN '152712' THEN 'Motilal Oswal Nifty India Defence Index Fund Direct Plan Growth'
        WHEN '122639' THEN 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth'
        WHEN '118763' THEN 'Nippon India Power & Infra Fund - Direct Plan Growth Plan - Growth Option'
        WHEN '120546' THEN 'Aditya Birla Sun Life Gold Fund - Growth - Direct Plan'
        ELSE name
      END
      WHERE type = 'MUTUAL_FUND'
    `);
    console.log('✓ Updated mutual fund names');
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addNameColumn();

