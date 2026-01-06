# Subscription Plans & Payment Integration

## Overview
This document outlines the subscription tiers and payment gateway options for the Market Crash Monitor application.

---

## 📊 Three Subscription Tiers

### 1. **FREE Tier** (₹0/month)
**Target Audience:** Beginners and casual investors

**Features:**
- NIFTY50 stocks
- Top 10 mutual funds
- Top 5 indices
- 4 watchlists
- 8 assets per watchlist
- Email + Telegram alerts
- Daily market summary

**Limits:**
- Max watchlists: 4
- Max assets per watchlist: 8
- Stock access: NIFTY50 only
- Mutual fund access: Top 10 only

---

### 2. **PREMIUM Tier** (₹199/month)
**Target Audience:** Active investors

**Features:**
- Everything in FREE
- NIFTY50 + Midcap150 stocks
- Top 20 mutual funds
- 8 watchlists
- Up to 15 assets per watchlist
- Email + Telegram alerts
- Priority support

**Limits:**
- Max watchlists: 8
- Max assets per watchlist: 15
- Stock access: NIFTY50 + Midcap150
- Mutual fund access: Top 20

---

### 3. **PRO Tier** (₹499/month)
**Target Audience:** Serious investors and professionals

**Features:**
- Everything in PREMIUM
- Any stocks (Nifty50, Midcap, Smallcap)
- Any mutual funds (3,000+ funds)
- Up to 15 watchlists
- Up to 30 assets per watchlist
- Email + Telegram alerts
- Priority support

**Limits:**
- Max watchlists: 15
- Max assets per watchlist: 30
- Stock access: All stocks (unlimited)
- Mutual fund access: All mutual funds (unlimited)

---

## 💳 Payment Gateway Options

### Recommended Options for India:

#### 1. **Razorpay** (Recommended for India)
**Pros:**
- ✅ Native Indian payment gateway
- ✅ Supports subscriptions/recurring payments
- ✅ UPI, Cards, Net Banking, Wallets support
- ✅ Good documentation and SDK
- ✅ Lower transaction fees for Indian market
- ✅ Easy integration with Node.js/Express

**Cons:**
- ❌ Limited international payment support

**Pricing:**
- Setup: Free
- Transaction fees: ~2% + GST
- Subscription management: Built-in

**Integration:**
- Node.js SDK: `razorpay` package
- Webhook support for subscription events
- Dashboard for managing subscriptions

---

#### 2. **Stripe** (Good for International + India)
**Pros:**
- ✅ Excellent subscription management
- ✅ Supports Indian payments (UPI, Cards)
- ✅ International payment support
- ✅ Comprehensive webhook system
- ✅ Great developer experience
- ✅ Built-in subscription lifecycle management

**Cons:**
- ❌ Slightly higher fees for Indian market
- ❌ More complex setup

**Pricing:**
- Setup: Free
- Transaction fees: ~2.9% + ₹2 per transaction
- Subscription management: Built-in

**Integration:**
- Node.js SDK: `stripe` package
- Stripe Checkout for payment pages
- Stripe Customer Portal for self-service

---

#### 3. **PayU** (Alternative Indian Option)
**Pros:**
- ✅ Indian payment gateway
- ✅ Good UPI support
- ✅ Competitive pricing

**Cons:**
- ❌ Less developer-friendly than Razorpay
- ❌ Subscription features may be limited

---

### Recommendation: **Razorpay** for Primary, **Stripe** as Backup

**Why Razorpay:**
1. Better suited for Indian market
2. Lower transaction fees
3. Excellent subscription support
4. Easy integration
5. Good customer support

**Why Keep Stripe Option:**
1. International users
2. Backup payment method
3. More advanced subscription features

---

## 🗄️ Database Schema Requirements

### New Tables Needed:

```sql
-- Subscription plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'FREE', 'PREMIUM', 'PRO'
  price_monthly DECIMAL(10, 2) NOT NULL,
  max_watchlists INTEGER NOT NULL,
  max_assets_per_watchlist INTEGER NOT NULL,
  stock_access TEXT[], -- ['NIFTY50', 'MIDCAP150', 'SMALLCAP', 'ALL']
  mutual_fund_access TEXT, -- 'TOP_10', 'TOP_20', 'ALL'
  priority_support BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL, -- 'ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL'
  payment_gateway TEXT, -- 'RAZORPAY', 'STRIPE'
  payment_gateway_subscription_id TEXT,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_id UUID REFERENCES user_subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_gateway TEXT NOT NULL,
  payment_gateway_transaction_id TEXT,
  status TEXT NOT NULL, -- 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'
  payment_method TEXT, -- 'UPI', 'CARD', 'NETBANKING', 'WALLET'
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Implementation Steps

### Phase 1: Database Setup ✅
- [x] Update landing page with 3 tiers
- [ ] Create subscription_plans table
- [ ] Create user_subscriptions table
- [ ] Create payment_transactions table
- [ ] Seed subscription plans data

### Phase 2: Backend API
- [ ] Create subscription routes (`/api/subscriptions/*`)
- [ ] Implement plan fetching endpoint
- [ ] Implement subscription creation endpoint
- [ ] Implement webhook handlers (Razorpay/Stripe)
- [ ] Update watchlist/item limits based on subscription
- [ ] Add subscription validation middleware

### Phase 3: Payment Gateway Integration
- [ ] Integrate Razorpay SDK
- [ ] Create subscription checkout flow
- [ ] Implement webhook handlers for payment events
- [ ] Handle subscription renewals
- [ ] Handle subscription cancellations
- [ ] (Optional) Integrate Stripe as backup

### Phase 4: Frontend Integration
- [ ] Create subscription upgrade page
- [ ] Update UpgradeModal component
- [ ] Add subscription status display
- [ ] Add payment method management
- [ ] Add subscription cancellation UI

### Phase 5: Access Control
- [ ] Update symbol search to filter by subscription tier
- [ ] Update watchlist creation limits
- [ ] Update watchlist item limits
- [ ] Add subscription tier checks in API routes

---

## 📝 Configuration Updates Needed

### Environment Variables:
```env
# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Subscription defaults
DEFAULT_SUBSCRIPTION_PLAN=FREE
```

---

## 🎯 Next Steps

1. **Review and confirm pricing** (₹199 for PREMIUM, ₹499 for PRO)
2. **Choose primary payment gateway** (Recommend Razorpay)
3. **Set up payment gateway account** and get API keys
4. **Create database migrations** for subscription tables
5. **Implement backend subscription APIs**
6. **Integrate payment gateway**
7. **Update frontend with subscription management UI**
8. **Test end-to-end subscription flow**

---

## 📚 Resources

- [Razorpay Subscriptions Documentation](https://razorpay.com/docs/api/subscriptions/)
- [Stripe Subscriptions Documentation](https://stripe.com/docs/billing/subscriptions/overview)
- [Razorpay Node.js SDK](https://github.com/razorpay/razorpay-node)
- [Stripe Node.js SDK](https://github.com/stripe/stripe-node)

---

**Last Updated:** 2025-01-XX
**Status:** Landing page updated ✅ | Payment integration pending


