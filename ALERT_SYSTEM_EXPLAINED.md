# Market Crash Alert System - Complete Explanation 🚨

**Date:** 2025-12-30  
**Status:** Production Ready ✅

---

## 🎯 Core Concept

**Main Goal:** Get notified immediately when stocks/indices drop by specific thresholds (5%, 10%, 15%, 20%+) compared to previous day, week, month, or year.

**Key Principle:** Compare current live price with historical prices to detect crashes in real-time.

---

## 🔄 How It Works - Step by Step

### 1. **Price Monitoring Cycle** (Every 1 Minute)

**Cron Job:** `price-monitor.cron.ts` runs every minute during market hours (9:15 AM - 3:30 PM IST)

```
Every Minute:
  ↓
Is Market Open? (9:15 AM - 3:30 PM IST)
  ├─ NO → Skip (market closed)
  └─ YES → Continue
      ↓
Get Current Prices from Redis Cache (instant, <10ms)
  ↓
For Each Symbol:
  ├─ Get Current Price (from cache)
  └─ Get Historical Prices (from daily_snapshots)
      ├─ Previous Day Close
      ├─ 1 Week Ago Close
      ├─ 1 Month Ago Close
      └─ 1 Year Ago Close
      ↓
Calculate Drop Percentage for Each Timeframe
  ↓
Check if Drop Crosses Thresholds (5%, 10%, 15%, 20%)
  ↓
Check Cooldown (prevent duplicate alerts for 1 hour)
  ↓
If Threshold Crossed + Not in Cooldown:
  ├─ Store Alert in Database
  ├─ Send Notification (Email/Telegram)
  └─ Initialize Recovery Tracking
```

---

## 📊 Alert Detection Logic

### Step 1: Get Historical Prices

**Source:** `daily_snapshots` table (NOT `price_history`)

**Timeframes Checked:**
- **Day:** Previous day's closing price
- **Week:** 7 days ago closing price
- **Month:** 30 days ago closing price
- **Year:** 365 days ago closing price

**Fallback:** If `daily_snapshots` doesn't have data, uses Yahoo Finance API

### Step 2: Calculate Drop Percentage

**Formula:**
```typescript
dropPercentage = ((historicalPrice - currentPrice) / historicalPrice) * 100
```

**Example:**
- Historical Price (1 week ago): ₹100
- Current Price: ₹90
- Drop: ((100 - 90) / 100) * 100 = **10%**

### Step 3: Check Thresholds

**Thresholds:** 5%, 10%, 15%, 20%

**Logic:** If drop is 12%, it triggers **both** 5% and 10% alerts

**Example:**
- Drop: 12%
- Crossed Thresholds: [5%, 10%] ✅
- Not Crossed: [15%, 20%] ❌

### Step 4: Check Cooldown

**Purpose:** Prevent spam - don't send same alert multiple times

**Duration:** 1 hour per symbol + threshold + timeframe combination

**Example:**
- NIFTY50 drops 10% vs 1 week ago → Alert sent ✅
- 30 minutes later, still 10% down → No alert (cooldown) ⏸️
- 1 hour later, still 10% down → Alert sent again ✅

**Storage:** Redis with key: `cooldown:{symbol}:{threshold}:{timeframe}`

---

## 📧 Notification System

### Notification Tiers (Based on Drop Percentage)

| Drop % | Channels | Priority | Example |
|--------|----------|----------|---------|
| **5%** | Email only | Low | "NIFTY50 dropped 5.2% vs yesterday" |
| **10%** | Telegram + Email | Medium | "RELIANCE dropped 10.5% vs last week" |
| **15%** | Telegram (sound) + Email | High | "TCS dropped 15.8% vs last month" |
| **20%+** | Telegram + Email + Critical | Critical | "🚨 CRITICAL: NIFTY50 dropped 22% vs last year" |

### Notification Channels

#### 1. **Email** (Nodemailer)
- **5% drops:** Email only
- **10%+ drops:** Email + Telegram
- **Format:** Subject + formatted message with all details

#### 2. **Telegram** (Telegram Bot API)
- **10%+ drops:** Telegram message
- **15%+ drops:** Telegram with sound notification
- **20%+ drops:** Telegram with "🚨 CRITICAL ALERT 🚨" prefix

---

## 🔄 Recovery Tracking

**Purpose:** Notify when market recovers after a crash

**How It Works:**

1. **When Alert Triggers:**
   - Initialize recovery tracking
   - Record bottom price (lowest price after alert)

2. **Every 5 Minutes:**
   - Check current price
   - Update bottom price if it goes lower
   - Calculate recovery percentage: `((currentPrice - bottomPrice) / bottomPrice) * 100`

3. **Recovery Alert:**
   - When recovery reaches **2% bounce** from bottom
   - Send notification: "RELIANCE recovered 2.5% from bottom (₹90 → ₹92.25)"

**Example:**
```
Alert: RELIANCE drops 15% → Price: ₹85
Bottom: Price continues to ₹80 (lowest)
Recovery: Price bounces to ₹81.60 (2% from ₹80)
Notification: "RELIANCE recovered 2% from bottom!"
```

---

## 📅 Daily Snapshot System

**Purpose:** Store historical closing prices for comparison

**When:** Every day at 3:35 PM IST (5 minutes after market close)

**What:** Stores closing price for each symbol in `daily_snapshots` table

**Why:** 
- Provides accurate historical prices for comparison
- Not affected by intraday volatility
- Used for alert detection (day/week/month/year comparisons)

**Data Flow:**
```
Market Close (3:30 PM)
  ↓
Wait 5 minutes (3:35 PM)
  ↓
Get Current Prices from Cache (closing prices)
  ↓
Store in daily_snapshots table
  ↓
Used next day for alert detection
```

---

## 🎯 Complete Flow Example

### Scenario: NIFTY50 drops 12% vs last week

**Timeline:**

1. **9:15 AM** - Market opens
2. **10:30 AM** - NIFTY50 price: ₹25,000 (was ₹28,000 last week)
   - Drop: ((28,000 - 25,000) / 28,000) * 100 = **10.7%**
   - Crossed thresholds: [5%, 10%]
   - Check cooldown: Not in cooldown ✅
   - **Action:**
     - Store alert in database
     - Send Telegram + Email (10% threshold)
     - Send Email only (5% threshold)
     - Initialize recovery tracking

3. **10:31 AM** - Still 10.7% down
   - Check cooldown: In cooldown (just sent) ⏸️
   - **Action:** Skip (no duplicate alert)

4. **11:30 AM** - Still 10.7% down
   - Check cooldown: Still in cooldown (1 hour not passed) ⏸️
   - **Action:** Skip

5. **11:31 AM** - Still 10.7% down
   - Check cooldown: Cooldown expired ✅
   - **Action:** Send alert again (if still above threshold)

6. **2:00 PM** - Price drops further to ₹24,000
   - Drop: ((28,000 - 24,000) / 28,000) * 100 = **14.3%**
   - Crossed thresholds: [5%, 10%, 15%]
   - Check cooldown: 15% threshold not in cooldown ✅
   - **Action:**
     - Store alert (15% threshold)
     - Send Telegram (with sound) + Email
     - Update recovery tracking (new bottom: ₹24,000)

7. **2:30 PM** - Price recovers to ₹24,480
   - Recovery: ((24,480 - 24,000) / 24,000) * 100 = **2%**
   - **Action:** Send recovery notification ✅

---

## 🔧 Technical Architecture

### Components

1. **Price Monitor Cron** (`price-monitor.cron.ts`)
   - Runs every minute
   - Orchestrates the entire alert detection process

2. **Alert Detection Service** (`alert-detection.service.ts`)
   - Calculates drop percentages
   - Checks thresholds
   - Manages cooldowns

3. **Notification Service** (`notification.service.ts`)
   - Sends alerts via Email/Telegram
   - Determines notification channels based on threshold

4. **Recovery Tracking Service** (`recovery-tracking.service.ts`)
   - Monitors recovery after crashes
   - Sends recovery notifications

5. **Daily Snapshot Service** (`daily-snapshot.service.ts`)
   - Stores historical closing prices
   - Provides historical data for comparison

### Data Sources

1. **Current Prices:** Redis Cache (updated every minute)
2. **Historical Prices:** `daily_snapshots` table (with Yahoo Finance fallback)
3. **Cooldowns:** Redis (1-hour TTL)
4. **Alerts:** PostgreSQL `alerts` table
5. **Recovery Tracking:** PostgreSQL `recovery_tracking` table

---

## 📊 Alert Database Schema

**Table:** `alerts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique alert ID |
| `symbol` | Text | Stock/index symbol |
| `dropPercentage` | Decimal | Calculated drop % |
| `threshold` | Integer | Threshold crossed (5, 10, 15, 20) |
| `timeframe` | Text | Timeframe ('day', 'week', 'month', 'year') |
| `price` | Decimal | Current price when alert triggered |
| `historicalPrice` | Decimal | Historical price used for comparison |
| `timestamp` | Timestamp | When alert was triggered |
| `notified` | Boolean | Whether notification was sent |
| `critical` | Boolean | Whether it's a critical alert (20%+) |

---

## ⚙️ Configuration

**File:** `src/config/index.ts`

```typescript
thresholds: {
  dropPercentages: [5, 10, 15, 20],  // Alert thresholds
  recoveryBouncePercent: 2,            // Recovery threshold
  cooldownHours: 1,                    // Cooldown duration
}
```

**Market Hours:**
- **Open:** 9:15 AM IST
- **Close:** 3:30 PM IST
- **Days:** Monday to Friday

---

## 🚨 Alert Message Format

### Example Alert Message

```
🚨 Market Crash Alert 🚨

Symbol: NIFTY50
Drop: 10.7%
Threshold: 10%
Timeframe: 1 week ago

Current Price: ₹25,000
Historical Price: ₹28,000

Alert Time: 2025-12-30 10:30:15 IST
```

### Recovery Message

```
📈 Recovery Alert 📈

Symbol: NIFTY50
Recovery: 2.5% from bottom

Bottom Price: ₹24,000
Current Price: ₹24,600

Recovery Time: 2025-12-30 14:30:15 IST
```

---

## ✅ Key Features

1. **Real-time Detection:** Checks every minute during market hours
2. **Multiple Timeframes:** Compares vs day, week, month, year
3. **Smart Cooldown:** Prevents spam (1 hour per symbol+threshold+timeframe)
4. **Tiered Notifications:** Different channels based on severity
5. **Recovery Tracking:** Notifies when market bounces back
6. **Historical Data:** Uses daily snapshots for accurate comparisons
7. **Fallback Support:** Yahoo Finance for missing historical data
8. **Non-blocking:** Price updates run in background, alerts use cached data

---

## 🎯 Summary

**The alert system works by:**

1. ✅ Monitoring prices every minute during market hours
2. ✅ Comparing current prices with historical prices (day/week/month/year)
3. ✅ Calculating drop percentages
4. ✅ Checking if thresholds are crossed (5%, 10%, 15%, 20%)
5. ✅ Respecting cooldowns to prevent spam
6. ✅ Sending tiered notifications (Email/Telegram based on severity)
7. ✅ Tracking recovery and notifying on 2% bounce

**Result:** You get notified immediately when the market crashes, with different notification levels based on severity! 🚨

---

*Documentation generated: 2025-12-30*  
*System status: Production Ready ✅*
