# Alert System V2.0 - Quick Reference Guide

**Last Updated:** 2025-12-31

---

## 🎯 TL;DR

**Old System:** Alert every hour = Spam 📧📧📧
**New System:** Alert daily + 5% exceptions = Smart ✅

---

## 📊 Alert Logic (One Diagram)

```
New price received
     ↓
Is there a previous alert for this symbol?
     ├─ NO  → ALERT ✅ (first time)
     │
     └─ YES → Check date
              ├─ New day? → ALERT ✅ (daily reminder)
              │
              └─ Same day → Check price
                           ├─ Dropped 5%+? → ALERT ✅ (escalation)
                           │
                           └─ Otherwise → SKIP ❌ (cooldown)
```

---

## 🔑 Key Numbers

| What | Value | Why |
|------|-------|-----|
| Daily cooldown | 24 hours | Prevent hourly spam |
| Further drop threshold | 5% | Catch escalating crashes |
| Recovery threshold | 5% | Know when market bounces |
| Alert tracking TTL | 7 days | Auto-cleanup |

---

## 💾 Redis Data

**Key:** `alert:tracking:{MARKET}:{SYMBOL}`
**Example:** `alert:tracking:INDIA:NIFTY50`

**Value:**
```json
{
  "lastAlertPrice": 20000,
  "lastAlertDate": "2025-12-31",
  "highestThreshold": 20,
  "timeframe": "year",
  "market": "INDIA"
}
```

---

## 📝 Common Scenarios (Copy-Paste Examples)

### Scenario 1: First Alert
```
10 AM: Price ₹20,000 (20% down)
→ No previous alert
→ ✅ ALERT: "NIFTY50 down 20%"
```

### Scenario 2: Same Day, No Change
```
10 AM: ✅ Alert sent
11 AM: Same price
→ Same day, no 5% drop
→ ❌ NO ALERT (cooldown)
```

### Scenario 3: Same Day, 5% Further Drop
```
10 AM: ✅ Alert at ₹20,000
2 PM: Price ₹19,000 (5% further)
→ Same day BUT 5% worse
→ ✅ ALERT: "Down 25%, 5% further"
```

### Scenario 4: Next Day Reminder
```
Day 1: ✅ Alert at ₹20,000
Day 2: Still ₹20,000
→ New day
→ ✅ ALERT: "Still down 20%"
```

### Scenario 5: Recovery
```
Last alert: ₹20,000
Now: ₹21,000 (5% recovery)
→ ✅ RECOVERY ALERT
→ Clear tracking
```

---

## 🔧 Functions Cheat Sheet

### Check if Should Alert
```typescript
const { shouldAlert, reason } = await shouldSendAlert(
  'NIFTY50',
  19000,
  20,
  'INDIA'
);

// reason can be:
// - 'first_alert'
// - 'new_day'
// - 'further_drop_5_percent'
// - 'cooldown_active'
```

### Check if Should Send Recovery
```typescript
const { shouldAlert, recoveryPercent, lastAlertPrice } =
  await shouldSendRecoveryAlert('NIFTY50', 21000, 'INDIA');
```

### Store Alert Tracking
```typescript
await setAlertTracking('NIFTY50', 'INDIA', {
  lastAlertPrice: 20000,
  lastAlertDate: '2025-12-31',
  highestThreshold: 20,
  timeframe: 'year',
  market: 'INDIA'
});
```

### Clear Tracking (Testing)
```typescript
await clearAlertTracking('NIFTY50', 'INDIA');
```

---

## 🐛 Debug Commands

### Check Alert Tracking
```bash
redis-cli get "alert:tracking:INDIA:NIFTY50"
```

### List All Tracking
```bash
redis-cli KEYS "alert:tracking:*"
```

### Delete Tracking (Force Reset)
```bash
redis-cli del "alert:tracking:INDIA:NIFTY50"
```

### Delete All Tracking
```bash
redis-cli KEYS "alert:tracking:*" | xargs redis-cli DEL
```

### Monitor Logs
```bash
# See alert decisions
tail -f logs/app.log | grep "Alert"

# Look for:
# "✅ Alert approved for X: Y% (reason: ...)"
# "⏸️ Alert skipped for X: Y% (reason: ...)"
# "📈 Recovery alert for X: Y% recovery from Z"
```

---

## 🚨 Troubleshooting

### Problem: Still getting hourly alerts
```bash
# Check if using new system
redis-cli get "alert:tracking:INDIA:NIFTY50"
# Should return JSON, not "1"

# If still returns "1", old system is active
# Check code was deployed correctly
```

### Problem: No alerts at all
```bash
# Check cooldown status
redis-cli get "alert:tracking:INDIA:NIFTY50"

# Check lastAlertDate
# If today, in cooldown until tomorrow

# Force new alert:
redis-cli del "alert:tracking:INDIA:NIFTY50"
```

### Problem: Wrong daily reset time
```typescript
// Check timezone calculation
const date = new Date().toLocaleDateString('en-CA', {
  timeZone: 'Asia/Kolkata'  // For INDIA
  // timeZone: 'America/New_York'  // For USA
});
console.log('Current market date:', date);
```

---

## 📊 Before vs After

| Metric | V1.0 | V2.0 |
|--------|------|------|
| Alerts per crash | 30+ over 5 days | 1-2 per day |
| Spam rate | 95% | <10% |
| Multi-threshold spam | 4 alerts same time | 1 alert (highest) |
| Recovery tracking | Bottom only | From last alert too |
| Further drops | Missed | Caught (5%+) |

---

## 📋 Files Changed

```
✅ src/utils/cooldown.util.ts (new tracking logic)
✅ src/services/alert-detection.service.ts (new processing)
✅ src/services/notification.service.ts (recovery alerts)
✅ src/templates/alert.templates.ts (new message format)
✅ src/cron/price-monitor.cron.ts (recovery checking)
```

---

## 🎯 Testing Checklist

```
□ First alert works (reason: first_alert)
□ Same day cooldown works (reason: cooldown_active)
□ 5% further drop alerts (reason: further_drop_5_percent)
□ Next day reminder works (reason: new_day)
□ Recovery alert works (5%+ recovery)
□ Tracking cleared after recovery
□ Only highest threshold alerts
□ No multi-timeframe spam
```

---

## 📞 Quick Help

**See full documentation:** `Documentation/ALERT_SYSTEM_V2.md`

**Common fixes:**
- Hourly spam → Check Redis key format
- No alerts → Clear tracking: `redis-cli del "alert:tracking:INDIA:NIFTY50"`
- Wrong time → Check timezone in logs
- Still confused → Read scenarios in full docs

---

**Pro Tip:** Use `reason` field in logs to understand why alerts were sent/skipped!

```typescript
console.log(`✅ Alert approved for ${symbol}: ${threshold}% (reason: ${reason})`);
```

Reasons tell you exactly what triggered the alert:
- `first_alert` = First time alerting this symbol
- `new_day` = Daily reminder
- `further_drop_5_percent` = Escalating crash
- `cooldown_active` = Skipped due to cooldown
