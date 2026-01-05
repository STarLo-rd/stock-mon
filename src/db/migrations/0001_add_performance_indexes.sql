-- Performance Optimization: Add indexes for faster queries
-- Run with: psql -U postgres -d market_crash_monitor -f 0001_add_performance_indexes.sql

-- Critical index for price history lookups by symbol and timestamp
-- Supports queries: getHistoricalPrice(), getLatestPrice(), price chart queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_symbol_timestamp
  ON price_history(symbol, timestamp DESC);

-- Index for time-range queries across all symbols
-- Supports queries: recent prices, date-filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_timestamp
  ON price_history(timestamp DESC);

-- Index for alert queries by symbol
-- Supports queries: symbol alert history, filtered alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_symbol_timestamp
  ON alerts(symbol, timestamp DESC);

-- Index for recent alerts across all symbols
-- Supports queries: dashboard recent alerts, alert feed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_timestamp
  ON alerts(timestamp DESC);

-- Partial index for active watchlist symbols only
-- Supports queries: fetchAllPrices(), active symbol lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watchlist_active
  ON watchlist(active) WHERE active = true;

-- Composite index for complex alert queries
-- Supports queries: filtered alerts by threshold/timeframe
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_symbol_threshold_timeframe
  ON alerts(symbol, threshold, timeframe, timestamp DESC);

-- Verify index creation
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('price_history', 'alerts', 'watchlist')
-- ORDER BY tablename, indexname;
