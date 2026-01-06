# Razorpay Plan ID Configuration Guide

## Problem
Razorpay is returning "The id provided does not exist" because we're passing our internal database plan IDs instead of Razorpay plan IDs.

## Solution
You need to create plans in Razorpay Dashboard and add their IDs to your `.env` file.

## Steps to Fix

### 1. Create Plans in Razorpay Dashboard

1. Go to Razorpay Dashboard → **Subscriptions** → **Plans**
2. Make sure you're in **Test Mode** (toggle in dashboard)
3. Click **Create Plan**
4. Create plans:
   - **PREMIUM**: ₹199/month, recurring monthly
   - **PRO**: ₹499/month, recurring monthly
5. Copy the Razorpay Plan IDs (format: `plan_xxxxxxxxxxxxx`)

### 2. Add Environment Variables

Add these to your `.env` file:

```env
# Razorpay Plan IDs (from step 1)
# Format: RAZORPAY_PLAN_ID_[PLAN_NAME]=plan_razorpay_id

RAZORPAY_PLAN_ID_PREMIUM=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_ID_PRO=plan_yyyyyyyyyyyyy

# FREE plan doesn't need Razorpay plan ID - leave it out
```

### 3. Restart Your Server

After adding the environment variables, restart your backend server:

```bash
npm run dev
```

## Quick Test

After configuration, try upgrading again. The error should be resolved.

## Troubleshooting

### Still Getting "The id provided does not exist"

1. **Check Razorpay Dashboard**: Make sure plans are created in **Test Mode** (if using test keys)
2. **Verify Plan IDs**: Double-check the Razorpay plan IDs are correct
3. **Check Environment Variables**: Make sure they're loaded correctly
4. **Check Logs**: Look for the exact plan ID being used

### FREE Plan Issues

FREE plan doesn't need Razorpay subscription. The code will skip Razorpay and activate directly.

## Example .env Configuration

```env
# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Plan ID Mappings
# Format: RAZORPAY_PLAN_ID_[PLAN_NAME]_DB=your-database-plan-id
# Format: RAZORPAY_PLAN_ID_[PLAN_NAME]=plan_razorpay_id

RAZORPAY_PLAN_ID_PREMIUM_DB=418b079f-c308-4d3c-90aa-17424554fdf0
RAZORPAY_PLAN_ID_PREMIUM=plan_MjQ3NzY4NzQw

RAZORPAY_PLAN_ID_PRO_DB=abc123-def456-ghi789-jkl012
RAZORPAY_PLAN_ID_PRO=plan_MjQ3NzY4NzQx
```

