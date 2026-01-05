import { pgTable, text, timestamp, decimal, integer, boolean, uuid, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Watchlists table - stores watchlist metadata
export const watchlists = pgTable('watchlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // Supabase user ID
  name: text('name').notNull(),
  order: integer('order').notNull().default(0), // For drag-and-drop ordering
  market: text('market').notNull().default('INDIA'), // 'INDIA' or 'USA'
  type: text('type').notNull(), // 'INDEX', 'STOCK', or 'MUTUAL_FUND'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one watchlist name per type per market per user
  uniqueNameTypeMarketUser: unique('unique_name_type_market_user')
    .on(table.name, table.type, table.market, table.userId),
}));

// Watchlist items table - stores symbols within watchlists
export const watchlist = pgTable('watchlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  symbol: text('symbol').notNull(),
  name: text('name'), // Display name for the symbol (e.g., "Tata Digital India Fund-Direct Plan-Growth")
  market: text('market').notNull().default('INDIA'), // 'INDIA' or 'USA'
  exchange: text('exchange').notNull().default('NSE'),
  type: text('type').notNull(), // 'INDEX', 'STOCK', or 'MUTUAL_FUND'
  active: boolean('active').notNull().default(true),
  watchlistId: uuid('watchlist_id').references(() => watchlists.id).notNull(),
  order: integer('order').notNull().default(0), // For symbol ordering within watchlist
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one symbol per watchlist per market
  uniqueSymbolWatchlistMarket: unique('unique_symbol_watchlist_market')
    .on(table.symbol, table.watchlistId, table.market),
}));

// REMOVED: priceHistory table - now using Yahoo Finance for all historical data

// Daily snapshots for alert detection (stores only end-of-day closing prices)
export const dailySnapshots = pgTable('daily_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  symbol: text('symbol').notNull(),
  market: text('market').notNull().default('INDIA'), // 'INDIA' or 'USA'
  date: timestamp('date', { mode: 'date' }).notNull(), // Date only (no time)
  closePrice: decimal('close_price', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one record per symbol per day per market
  uniqueSymbolDateMarket: unique('unique_symbol_date_market').on(table.symbol, table.date, table.market),
}));

export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  symbol: text('symbol').notNull(),
  market: text('market').notNull().default('INDIA'), // 'INDIA' or 'USA'
  dropPercentage: decimal('drop_percentage', { precision: 5, scale: 2 }).notNull(),
  threshold: integer('threshold').notNull(), // 5, 10, 15, 20
  timeframe: text('timeframe').notNull(), // 'day', 'week', 'month', 'year'
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  historicalPrice: decimal('historical_price', { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  critical: boolean('critical').notNull().default(false),
});

// User-alert junction table - links users to symbol-level alerts
export const userAlerts = pgTable('user_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // Supabase user ID
  alertId: uuid('alert_id').notNull().references(() => alerts.id),
  notified: boolean('notified').notNull().default(false),
  read: boolean('read').notNull().default(false),
  dismissed: boolean('dismissed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one user_alert per user per alert
  uniqueUserAlert: unique('unique_user_alert').on(table.userId, table.alertId),
}));

export const recoveryTracking = pgTable('recovery_tracking', {
  id: uuid('id').defaultRandom().primaryKey(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id),
  symbol: text('symbol').notNull(),
  market: text('market').notNull().default('INDIA'), // 'INDIA' or 'USA'
  bottomPrice: decimal('bottom_price', { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal('current_price', { precision: 10, scale: 2 }).notNull(),
  recoveryPercentage: decimal('recovery_percentage', { precision: 5, scale: 2 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  notified: boolean('notified').notNull().default(false),
});

// Relations
export const watchlistsRelations = relations(watchlists, ({ many }) => ({
  watchlistItems: many(watchlist),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  watchlist: one(watchlists, {
    fields: [watchlist.watchlistId],
    references: [watchlists.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ many }) => ({
  recoveryTracking: many(recoveryTracking),
  userAlerts: many(userAlerts),
}));

export const recoveryTrackingRelations = relations(recoveryTracking, ({ one }) => ({
  alert: one(alerts, {
    fields: [recoveryTracking.alertId],
    references: [alerts.id],
  }),
}));

export const userAlertsRelations = relations(userAlerts, ({ one }) => ({
  alert: one(alerts, {
    fields: [userAlerts.alertId],
    references: [alerts.id],
  }),
}));

