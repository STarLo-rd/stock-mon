# Market Crash Monitor

A real-time market crash monitoring system that tracks stocks/indices and sends alerts when prices drop by specific thresholds (5%, 10%, 15%, 20%) compared to previous day, week, month, or year.

## Features

- **Real-time Monitoring**: Tracks 100+ stocks and indices every minute during market hours (9:15 AM - 3:30 PM IST)
- **Multi-timeframe Analysis**: Compares current prices against previous day, week, month, and year
- **Smart Alerts**: Different notification levels based on drop percentage:
  - 5% drop → Email only
  - 10% drop → Telegram + Email
  - 15% drop → Telegram (with sound) + Email
  - 20%+ drop → Telegram + Email + Critical flag
- **Recovery Tracking**: Monitors stocks after crashes and alerts when they bounce back 2% from bottom
- **Cooldown System**: Prevents duplicate alerts within 1 hour
- **Web Dashboard**: React-based frontend to view alerts and manage watchlist

## Tech Stack

- **Backend**: Node.js 20+, TypeScript 5+, Express.js
- **Database**: PostgreSQL (with Drizzle ORM) - Optimized with 6 strategic indexes
- **Cache**: Redis (multi-layer caching + cooldown management) - 99% faster API responses
- **Scheduler**: node-cron
- **Notifications**: Telegram Bot API + Nodemailer (SMTP)
- **Frontend**: React + TypeScript + Vite
- **Data Sources**: NSE API (primary), Yahoo Finance (backup)

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ installed and running
- Redis installed and running
- Telegram Bot Token (optional, for Telegram notifications)
- SMTP credentials (optional, for email notifications)

## Setup

### 1. Clone and Install Dependencies

```bash
cd market-crash-monitor
npm install
cd frontend
npm install
cd ..
```

### 2. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
docker-compose up -d postgres redis
```

This will start PostgreSQL on port 5432 and Redis on port 6379.

#### Option B: Manual Setup

- Start PostgreSQL and Redis manually
- Create a database named `market_crash_monitor`

### 3. Environment Variables

Create a `.env` file in the root directory. See `ENV_TEMPLATE.md` for a complete template with setup instructions.

Basic `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/market_crash_monitor

# Redis
REDIS_URL=redis://localhost:6379

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Email SMTP (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
EMAIL_FROM=your_email@gmail.com

# Application
NODE_ENV=development
PORT=3000

# Market Hours (IST)
MARKET_OPEN_HOUR=9
MARKET_OPEN_MINUTE=15
MARKET_CLOSE_HOUR=15
MARKET_CLOSE_MINUTE=30
```

### 4. Database Migrations

```bash
npm run db:generate
npm run db:migrate
```

### 5. Seed Default Watchlist

```bash
npx tsx src/db/seed.ts
```

This will add default indices (NIFTY50, MIDCAP, SMALLCAP, NIFTYIT) and 30+ popular Indian stocks to the watchlist.

### 6. Start Backend Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 7. Start Frontend (in a new terminal)

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## Usage

### API Endpoints

- `GET /api/alerts` - Get alert history (with filters)
- `GET /api/alerts/:id` - Get specific alert
- `GET /api/watchlist` - Get all symbols in watchlist
- `POST /api/watchlist` - Add symbol to watchlist
- `DELETE /api/watchlist/:symbol` - Remove symbol from watchlist
- `PATCH /api/watchlist/:symbol` - Update watchlist entry
- `GET /api/status` - System health and statistics

### Monitoring

The system automatically:
1. Fetches prices every 1 minute during market hours
2. Compares with historical prices (day/week/month/year)
3. Detects threshold breaches (5%, 10%, 15%, 20%)
4. Sends notifications based on alert level
5. Tracks recovery after crashes (every 5 minutes)

### Adding Symbols

You can add symbols via:
- **API**: `POST /api/watchlist` with `{ symbol: "RELIANCE", type: "STOCK", exchange: "NSE" }`
- **Frontend**: Use the Watchlist Manager component

### Notification Setup

#### Telegram

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Get your chat ID (send a message to your bot, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates`)
4. Add both to `.env`

#### Email

1. For Gmail, enable "App Passwords" in your Google Account settings
2. Use the app password (not your regular password) in `SMTP_PASS`
3. Update other SMTP settings in `.env`

## Development

### Project Structure

```
market-crash-monitor/
├── src/
│   ├── config/          # Configuration management
│   ├── db/              # Database schema and migrations
│   ├── services/        # Core services (price, alerts, notifications)
│   ├── routes/          # Express API routes
│   ├── cron/            # Cron job definitions
│   ├── utils/           # Utility functions
│   ├── templates/       # Alert message templates
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── frontend/
│   └── src/
│       ├── components/  # React components
│       ├── services/    # API client
│       └── ...
└── drizzle/             # Database migrations
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Documentation

### Architecture Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive architecture documentation with system diagrams, caching strategy, data flow, and performance optimizations
- **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)** - Detailed performance optimization guide covering database indexes, caching strategies, and query optimizations

### Key Features Documented

- **System Architecture**: High-level architecture with component interactions
- **Caching Strategy**: Multi-layer Redis caching with TTLs and cache warming
- **Database Indexes**: 6 strategic indexes for optimal query performance
- **Performance Metrics**: Before/after performance comparisons (99% improvement)
- **Data Flow**: Request flow diagrams and sequence diagrams

### Quick Links

- [System Architecture Overview](./ARCHITECTURE.md#system-architecture)
- [Caching Strategy](./ARCHITECTURE.md#caching-strategy)
- [Performance Optimizations](./PERFORMANCE_GUIDE.md#performance-improvements-summary)
- [Database Indexes](./PERFORMANCE_GUIDE.md#database-indexes)

## Deployment

### Using Docker

```bash
docker build -t market-crash-monitor .
docker run -p 3000:3000 --env-file .env market-crash-monitor
```

### Using Render/Railway

1. Connect your repository
2. Set environment variables
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add PostgreSQL and Redis services

## Troubleshooting

### NSE API Issues

If NSE API fails, the system automatically falls back to Yahoo Finance. However, you may need to adjust symbol formats for Yahoo Finance.

### Redis Connection Errors

Ensure Redis is running and `REDIS_URL` is correct. The system will continue to work without Redis, but cooldown functionality will be disabled.

### Database Connection Errors

Check that PostgreSQL is running and `DATABASE_URL` is correct. Run migrations if tables don't exist.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

