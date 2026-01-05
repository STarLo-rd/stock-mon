import { db } from '../db';
import { watchlists, watchlist } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../utils/logger';

/**
 * Default symbols to seed for new users
 */
const DEFAULT_INDICES = [
  { symbol: 'NIFTY50', exchange: 'NSE', name: 'NIFTY 50' },
  { symbol: 'NIFTYMIDCAP', exchange: 'NSE', name: 'NIFTY MIDCAP 100' },
  { symbol: 'NIFTYSMLCAP', exchange: 'NSE', name: 'NIFTY SMALLCAP 100' },
  { symbol: 'NIFTYIT', exchange: 'NSE', name: 'NIFTY IT' },
];

// Reduced to 5 stocks to stay within free tier limit (8 items)
// Users can add more during onboarding or from dashboard
const DEFAULT_STOCKS = [
  { symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services Ltd' },
  { symbol: 'HDFCBANK', exchange: 'NSE', name: 'HDFC Bank Ltd' },
  { symbol: 'INFY', exchange: 'NSE', name: 'Infosys Ltd' },
  { symbol: 'ICICIBANK', exchange: 'NSE', name: 'ICICI Bank Ltd' },
];

const DEFAULT_MUTUAL_FUNDS = [
  { symbol: '135800', exchange: 'MF', name: 'Tata Digital India Fund-Direct Plan-Growth' },
  { symbol: '152712', exchange: 'MF', name: 'Motilal Oswal Nifty India Defence Index Fund Direct Plan Growth' },
  { symbol: '122639', exchange: 'MF', name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth' },
];

/**
 * Seed default watchlists for a new user
 * Creates watchlists for INDEX, STOCK, and MUTUAL_FUND types
 * and populates them with default symbols
 */
export async function seedDefaultWatchlistsForUser(userId: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<void> {
  logger.info('🌱 Seeding default watchlists for user', { userId, market });

  try {
    // Create watchlists for each type
    const watchlistTypes = [
      { type: 'INDEX' as const, name: 'Indices', symbols: DEFAULT_INDICES },
      { type: 'STOCK' as const, name: 'Stocks', symbols: DEFAULT_STOCKS },
      { type: 'MUTUAL_FUND' as const, name: 'Mutual Funds', symbols: DEFAULT_MUTUAL_FUNDS },
    ];

    for (let i = 0; i < watchlistTypes.length; i++) {
      const { type, name, symbols } = watchlistTypes[i];

      // Check if watchlist already exists
      const existingWatchlist = await db
        .select()
        .from(watchlists)
        .where(
          and(
            eq(watchlists.userId, userId),
            eq(watchlists.type, type),
            eq(watchlists.market, market),
            eq(watchlists.name, name)
          )
        )
        .limit(1);

      let watchlistId: string;

      if (existingWatchlist.length > 0) {
        watchlistId = existingWatchlist[0].id;
        logger.info(`Watchlist "${name}" already exists for user, skipping creation`, { userId, watchlistId });
      } else {
        // Create watchlist
        const [newWatchlist] = await db
          .insert(watchlists)
          .values({
            userId,
            name,
            type,
            market,
            order: i,
          })
          .returning();

        watchlistId = newWatchlist.id;
        logger.info(`Created watchlist "${name}" for user`, { userId, watchlistId });
      }

      // Add symbols to watchlist
      for (let j = 0; j < symbols.length; j++) {
        const symbolData = symbols[j];

        // Check if symbol already exists in this watchlist
        const existingSymbol = await db
          .select()
          .from(watchlist)
          .where(
            and(
              eq(watchlist.watchlistId, watchlistId),
              eq(watchlist.symbol, symbolData.symbol),
              eq(watchlist.market, market)
            )
          )
          .limit(1);

        if (existingSymbol.length === 0) {
          await db.insert(watchlist).values({
            symbol: symbolData.symbol,
            name: symbolData.name,
            exchange: symbolData.exchange,
            type,
            market,
            watchlistId,
            order: j,
            active: true,
          });
          logger.debug(`Added ${symbolData.symbol} to ${name} watchlist`, { userId, symbol: symbolData.symbol });
        }
      }
    }

    logger.info('✅ Default watchlists seeded successfully for user', { userId, market });
  } catch (error) {
    logger.error('❌ Error seeding default watchlists for user', { userId, market, error });
    throw error;
  }
}

