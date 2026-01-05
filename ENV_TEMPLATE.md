# Environment Variables Template

Copy this content to create your `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/market_crash_monitor

# Redis
REDIS_URL=redis://localhost:6379

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Email (SMTP)
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

# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:5173

# Subscription Limits (Free Tier)
MAX_WATCHLISTS_PER_TYPE=4
MAX_ITEMS_PER_WATCHLIST=8

# Rate Limiting
# Global rate limit: requests per window (applies to all routes)
RATE_LIMIT_GLOBAL_WINDOW_MS=900000
RATE_LIMIT_GLOBAL_MAX=100

# Auth rate limit: authentication attempts per window (stricter for security)
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=5

# Trust Proxy (set to 'true' if behind reverse proxy/load balancer for accurate IP addresses)
TRUST_PROXY=false
```

## Frontend Environment Variables

Create a `frontend/.env` file:

```env
# API URL
VITE_API_URL=http://localhost:3000

# Supabase Authentication
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Setup Instructions

1. Create a `.env` file in the root directory
2. Copy the above template
3. Replace placeholder values with your actual credentials

### Getting Telegram Credentials

1. Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. Get your bot token from BotFather
3. Send a message to your bot
4. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
5. Find your chat ID in the response

### Getting Email Credentials (Gmail)

1. Enable 2-Factor Authentication on your Google Account
2. Go to Google Account Settings > Security > App Passwords
3. Generate an app password for "Mail"
4. Use this app password (not your regular password) in `SMTP_PASS`

### Getting Supabase Credentials

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings > API
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY` (backend and frontend)
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (backend only, keep secret!)
5. Go to Authentication > Providers
6. Enable Email/Password authentication
7. Enable Google OAuth provider (optional but recommended)
8. Configure redirect URLs:
   - `http://localhost:5173/auth/callback` (development)
   - `http://localhost:5173/reset-password` (password reset)
   - Add your production URLs when deploying

