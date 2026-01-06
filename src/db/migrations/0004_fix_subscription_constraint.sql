-- Migration: Fix subscription unique constraint
-- Issue: The unique constraint (user_id, status) is too restrictive
-- It prevents users from having multiple CANCELLED or EXPIRED subscriptions
-- Solution: Use a partial unique index to only enforce uniqueness for ACTIVE subscriptions

-- Step 1: Drop the existing constraint
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS unique_user_active_subscription;

-- Step 2: Create a partial unique index
-- This only enforces uniqueness when status = 'ACTIVE'
-- Allows multiple CANCELLED, EXPIRED, PENDING subscriptions for history
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_active_subscription
ON user_subscriptions(user_id)
WHERE status = 'ACTIVE';

-- Step 3: Clean up any duplicate PENDING subscriptions (keep only the most recent)
-- First, identify and cancel old PENDING subscriptions
UPDATE user_subscriptions
SET status = 'CANCELLED', updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM user_subscriptions
    WHERE status = 'PENDING'
  ) sub
  WHERE rn > 1
);

-- Step 4: If there are multiple ACTIVE subscriptions, keep only the most recent
UPDATE user_subscriptions
SET status = 'CANCELLED', updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM user_subscriptions
    WHERE status = 'ACTIVE'
  ) sub
  WHERE rn > 1
);
