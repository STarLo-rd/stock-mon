# Watchlist API Fixes

## 🐛 Issues Fixed

### 1. **Empty Array Returned When Items Exist**
**Problem:** 
- API endpoint `/api/watchlist?watchlistId=...&active=false` was returning empty array `{"success":true,"data":[]}` even though assets were added
- Items weren't showing in the UI

**Root Cause:**
- Frontend was passing `active=false` as a query parameter when `activeOnly` was `false`
- Backend treated `active=false` as a filter, returning only inactive items
- Since all items are active by default, this returned an empty array

**Solution:**
- ✅ Fixed frontend API call to only pass `active` parameter when `activeOnly === true`
- ✅ When `activeOnly` is `false` or `undefined`, don't pass the parameter at all
- ✅ Backend now returns all items when `active` parameter is not provided

**Code Changes:**
```typescript
// Before (frontend/src/services/api.ts)
if (active !== undefined) {
  params.active = active.toString(); // This passed "false" as string
}

// After
if (activeOnly === true) {
  params.active = 'true'; // Only pass when filtering for active items
}
```

---

### 2. **Limit Check Counting All Items**
**Problem:**
- Limit check was counting ALL items (including inactive) toward the limit
- This could prevent adding items even when inactive items existed

**Solution:**
- ✅ Updated limit check to only count active items
- ✅ Added market filter to limit check for accuracy
- ✅ Added logging for debugging

**Code Changes:**
```typescript
// Before
const existingItems = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(watchlist)
  .where(eq(watchlist.watchlistId, watchlistId));

// After
const existingItems = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(watchlist)
  .where(and(
    eq(watchlist.watchlistId, watchlistId),
    eq(watchlist.market, market as 'INDIA' | 'USA'),
    eq(watchlist.active, true) // Only count active items
  ));
```

---

### 3. **Missing Debug Logging**
**Problem:**
- No logging to debug why queries returned empty arrays
- Hard to troubleshoot issues

**Solution:**
- ✅ Added debug logging to GET endpoint
- ✅ Added warning logging when limit is reached
- ✅ Logs include watchlistId, userId, market, itemCount, and activeFilter

---

## 📊 Expected Behavior After Fix

### **Query Behavior:**
1. **When `activeOnly` is `true`:**
   - Frontend passes `active=true`
   - Backend filters for `active = true`
   - Returns only active items

2. **When `activeOnly` is `false` or `undefined`:**
   - Frontend doesn't pass `active` parameter
   - Backend returns all items (active and inactive)
   - Returns all items in watchlist

### **Limit Behavior:**
- Only active items count toward the 8-item limit
- Inactive items don't count toward limit
- Separate limits for stocks and mutual funds (separate watchlists)

### **Display Behavior:**
- Items should appear immediately after adding (optimistic updates)
- All items in watchlist should display correctly
- No more empty arrays when items exist

---

## 🧪 Testing Checklist

- [ ] Add a stock → Should appear immediately
- [ ] Add multiple stocks (up to 8) → All should appear
- [ ] Add mutual funds (up to 8) → All should appear
- [ ] Check API response → Should return all items when `active` not provided
- [ ] Check limit enforcement → Should only count active items
- [ ] Verify seeded items show → Should display 5 seeded stocks
- [ ] Test with inactive items → Should not count toward limit

---

## 📝 Files Modified

1. **`frontend/src/services/api.ts`**
   - Fixed `getAll` method to only pass `active` when `activeOnly === true`

2. **`src/routes/watchlist.routes.ts`**
   - Updated limit check to only count active items
   - Added market filter to limit check
   - Added debug logging to GET endpoint
   - Added warning logging to POST endpoint

---

## 🔍 Debugging

If items still don't show:

1. **Check API Response:**
   ```bash
   # Should return items when active parameter is not provided
   curl "http://localhost:5173/api/watchlist?watchlistId=xxx&market=INDIA"
   ```

2. **Check Backend Logs:**
   - Look for "Fetched watchlist items" log
   - Check `itemCount` value
   - Verify `activeFilter` is correct

3. **Check Frontend Network Tab:**
   - Verify request doesn't include `active=false`
   - Verify response contains items

4. **Check Database:**
   ```sql
   SELECT * FROM watchlist WHERE watchlist_id = 'xxx' AND market = 'INDIA';
   ```

---

**Last Updated:** January 2026  
**Status:** ✅ Fixed - Ready for Testing

