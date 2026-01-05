import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },
  email: {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? '',
  },
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  market: {
    openHour: parseInt(process.env.MARKET_OPEN_HOUR ?? '9', 10),
    openMinute: parseInt(process.env.MARKET_OPEN_MINUTE ?? '15', 10),
    closeHour: parseInt(process.env.MARKET_CLOSE_HOUR ?? '15', 10),
    closeMinute: parseInt(process.env.MARKET_CLOSE_MINUTE ?? '30', 10),
  },
  thresholds: {
    dropPercentages: [5, 10, 15, 20],
    recoveryBouncePercent: 2,
  },
  cooldown: {
    alertHours: 1,
  },
  batchSize: 20,
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  limits: {
    maxWatchlistsPerType: parseInt(process.env.MAX_WATCHLISTS_PER_TYPE ?? '4', 10),
    maxItemsPerWatchlist: parseInt(process.env.MAX_ITEMS_PER_WATCHLIST ?? '8', 10),
  },
  rateLimit: {
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS ?? '900000', 10), // 15 minutes default
      maxRequests: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX ?? '100', 10), // 100 requests per 15 minutes default
    },
    auth: {
      windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? '900000', 10), // 15 minutes default
      maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '5', 10), // 5 requests per 15 minutes default
    },
  },
} as const;

