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

