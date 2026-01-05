-- Migration: Add watchlists table and update watchlist table
-- This migration:
-- 1. Creates watchlists table
-- 2. Adds watchlist_id and order columns to watchlist table (nullable first)
-- 3. Creates default watchlists
-- 4. Migrates existing symbols to default watchlists
-- 5. Makes watchlist_id NOT NULL

-- Step 1: Create watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  market TEXT NOT NULL DEFAULT 'INDIA',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Add watchlist_id column (nullable first)
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS watchlist_id UUID REFERENCES watchlists(id);
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Step 3: Create default watchlists if they don't exist
INSERT INTO watchlists (name, market, "order")
SELECT 'My Watchlist', 'INDIA', 0
WHERE NOT EXISTS (SELECT 1 FROM watchlists WHERE market = 'INDIA' AND name = 'My Watchlist');

INSERT INTO watchlists (name, market, "order")
SELECT 'My Watchlist', 'USA', 0
WHERE NOT EXISTS (SELECT 1 FROM watchlists WHERE market = 'USA' AND name = 'My Watchlist');

-- Step 4: Migrate existing symbols to default watchlists
UPDATE watchlist w
SET watchlist_id = (
  SELECT id FROM watchlists 
  WHERE market = w.market 
  LIMIT 1
),
"order" = (
  SELECT COALESCE(MAX("order"), -1) + 1
  FROM watchlist w2
  WHERE w2.market = w.market AND w2.watchlist_id IS NOT NULL
)
WHERE watchlist_id IS NULL;

-- Step 5: Make watchlist_id NOT NULL
ALTER TABLE watchlist ALTER COLUMN watchlist_id SET NOT NULL;

-- Step 6: Drop old unique constraint and add new one
ALTER TABLE watchlist DROP CONSTRAINT IF EXISTS unique_symbol_market;
CREATE UNIQUE INDEX IF NOT EXISTS unique_symbol_watchlist_market 
ON watchlist(symbol, watchlist_id, market);


