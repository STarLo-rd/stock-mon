# Mutual Fund Backend Fixes

## 🐛 Issues Fixed

### 1. **Popular Mutual Funds Using Wrong Identifiers**
**Problem:** Frontend was using fund names (e.g., "HDFCEQUITY", "SBIELSS") instead of scheme codes (e.g., "135800", "122639")

**Root Cause:** 
- Mutual funds in India use numeric scheme codes (AMFI scheme codes)
- These are different from stock symbols
- The backend expects scheme codes, not fund names

**Solution:**
Updated `frontend/src/data/popular-assets.ts` to use actual scheme codes:

```typescript
// ❌ BEFORE (Wrong)
{ symbol: 'HDFCEQUITY', name: 'HDFC Equity Fund', type: 'MUTUAL_FUND' }

// ✅ AFTER (Correct)
{ symbol: '122639', name: 'Parag Parikh Flexi Cap Fund', type: 'MUTUAL_FUND' }
```

**Scheme Codes Used:**
- `122639` - Parag Parikh Flexi Cap Fund
- `135800` - Tata Digital India Fund
- `152712` - Motilal Oswal Nifty India Defence Index Fund
- `118763` - Nippon India Power & Infra Fund
- `120546` - Aditya Birla Sun Life Gold Fund

---

### 2. **Type Mismatch Error (400 Bad Request)**
**Problem:** 
```
POST /api/watchlist
Status: 400
Error: "Symbol type (MUTUAL_FUND) does not match watchlist type (STOCK). 
        This watchlist only accepts STOCK symbols."
```

**Root Cause:**
- When switching between STOCK and MUTUAL_FUND tabs in onboarding
- Component was reusing watchlistId from previous type
- Backend correctly validates that watchlist type must match symbol type
- Frontend wasn't clearing/resetting watchlistId when asset type changed

**Solution:**
Fixed `AddAssetStep.tsx` to properly handle type switching:

```typescript
// ✅ Clear watchlistId when asset type changes
useEffect(() => {
  // Clear watchlistId when asset type changes
  setWatchlistId(null);
  setSelectedAsset(null);
  
  // Find watchlist matching the current asset type
  if (existingWatchlists.length > 0) {
    const matchingWatchlist = existingWatchlists.find(w => w.type === assetType);
    if (matchingWatchlist) {
      setWatchlistId(matchingWatchlist.id);
    }
  }
}, [assetType]); // Only depend on assetType

// ✅ Verify type match before adding asset
const handlePopularAssetClick = async (asset: PopularAsset) => {
  let currentWatchlistId = watchlistId;
  
  // CRITICAL: Verify watchlist type matches asset type
  if (currentWatchlistId) {
    const currentWatchlist = existingWatchlists.find(w => w.id === currentWatchlistId);
    if (currentWatchlist && currentWatchlist.type !== asset.type) {
      // Type mismatch - clear and find correct watchlist
      currentWatchlistId = null;
      setWatchlistId(null);
    }
  }
  
  // ... rest of logic
};
```

---

### 3. **Mutual Fund Provider Difference**
**Problem:** Mutual funds use a different API provider (mfapi.in) than stocks (NSE)

**Status:** ✅ Already Handled Correctly

The backend already handles this correctly:
- **Stocks/Indices:** Uses NSE API
- **Mutual Funds:** Uses `MutualFundApiService` (mfapi.in API)

**Backend Flow:**
```typescript
// src/routes/watchlist.routes.ts
if (type === 'MUTUAL_FUND') {
  // Parse symbol as scheme code
  const schemeCode = parseInt(symbol, 10);
  if (!isNaN(schemeCode)) {
    const schemeInfo = await mfService.getSchemeInfo(schemeCode);
    symbolName = schemeInfo.scheme_name;
  }
}

// Exchange is set to 'MF' for mutual funds
const finalExchange = exchange ?? (
  market === 'USA' ? 'NYSE' :
  type === 'MUTUAL_FUND' ? 'MF' :
  'NSE'
);
```

---

## 📊 How Mutual Funds Work

### **Scheme Codes**
- Mutual funds use **AMFI scheme codes** (numeric strings)
- Examples: `122639`, `135800`, `152712`
- These are NOT stock symbols
- Must be validated via mutual fund API

### **API Provider**
- **Provider:** mfapi.in (Mutual Fund API)
- **Service:** `MutualFundApiService`
- **Endpoints:**
  - `/api/schemes/{schemeCode}` - Get scheme info
  - `/api/nav-history/{schemeCode}` - Get NAV history

### **Database Storage**
```sql
-- watchlist table
symbol: '122639'        -- Scheme code (string)
name: 'Parag Parikh...' -- Full fund name
type: 'MUTUAL_FUND'
exchange: 'MF'          -- Always 'MF' for mutual funds
market: 'INDIA'
```

---

## ✅ Validation Flow

### **Frontend → Backend**
1. User selects mutual fund (scheme code: `122639`)
2. Frontend sends:
   ```json
   {
     "watchlistId": "...",
     "symbol": "122639",
     "type": "MUTUAL_FUND",
     "market": "INDIA",
     "name": "Parag Parikh Flexi Cap Fund"
   }
   ```

### **Backend Validation**
1. ✅ Check watchlist exists and belongs to user
2. ✅ **Validate type match:** `watchlist.type === symbol.type`
3. ✅ Parse symbol as scheme code: `parseInt("122639")`
4. ✅ Validate scheme code exists via `MutualFundApiService`
5. ✅ Fetch scheme name if not provided
6. ✅ Insert into database

### **Error Cases Handled**
- ❌ Invalid scheme code (non-numeric)
- ❌ Scheme code not found
- ❌ Type mismatch (MUTUAL_FUND → STOCK watchlist)
- ❌ Watchlist not found
- ❌ Duplicate symbol in watchlist

---

## 🔧 Files Modified

### **Frontend**
1. **`frontend/src/data/popular-assets.ts`**
   - Updated mutual fund symbols to use scheme codes
   - Changed from fund names to numeric codes

2. **`frontend/src/components/onboarding/AddAssetStep.tsx`**
   - Fixed watchlist type matching logic
   - Added type verification before adding assets
   - Clear watchlistId when switching asset types
   - Better error handling for type mismatches

### **Backend** (No changes needed)
- Backend already handles mutual funds correctly
- Validation logic is correct
- API integration works properly

---

## 🧪 Testing Checklist

### **Mutual Fund Addition**
- [ ] Can add mutual fund via popular buttons
- [ ] Can add mutual fund via search
- [ ] Scheme codes are validated (non-numeric rejected)
- [ ] Invalid scheme codes show error
- [ ] Type mismatch shows clear error message
- [ ] Mutual funds go to MUTUAL_FUND watchlist
- [ ] Stocks go to STOCK watchlist
- [ ] Switching tabs clears previous selection

### **Type Switching**
- [ ] Switch from STOCK to MUTUAL_FUND tab
- [ ] WatchlistId resets correctly
- [ ] Can add mutual fund without errors
- [ ] Switch back to STOCK tab
- [ ] Can add stock without errors
- [ ] No type mismatch errors

### **Backend Validation**
- [ ] POST `/api/watchlist` with correct types → 201 Created
- [ ] POST `/api/watchlist` with type mismatch → 400 Bad Request
- [ ] POST `/api/watchlist` with invalid scheme code → 400 Bad Request
- [ ] Scheme code validation works via mfapi.in

---

## 📝 Example Requests

### **✅ Valid Request**
```bash
POST /api/watchlist
Content-Type: application/json
Authorization: Bearer <token>

{
  "watchlistId": "db06b7ee-f2d3-40e3-97b1-bc05e64561cc",
  "symbol": "122639",
  "type": "MUTUAL_FUND",
  "market": "INDIA",
  "name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth"
}

# Response: 201 Created
{
  "success": true,
  "data": {
    "id": "...",
    "symbol": "122639",
    "name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    "type": "MUTUAL_FUND",
    "exchange": "MF",
    ...
  }
}
```

### **❌ Type Mismatch (Fixed)**
```bash
POST /api/watchlist

{
  "watchlistId": "<STOCK_WATCHLIST_ID>",
  "symbol": "122639",
  "type": "MUTUAL_FUND",
  "market": "INDIA"
}

# Response: 400 Bad Request
{
  "success": false,
  "error": "Symbol type (MUTUAL_FUND) does not match watchlist type (STOCK). 
            This watchlist only accepts STOCK symbols."
}
```

**This error is now prevented by frontend validation!**

---

## 🎯 Key Takeaways

1. **Mutual funds use scheme codes, not symbols**
   - Always use numeric scheme codes (e.g., "122639")
   - Never use fund names or abbreviations

2. **Type matching is critical**
   - Watchlist type MUST match symbol type
   - Frontend must verify before sending request
   - Backend validates as final check

3. **Different providers for different asset types**
   - Stocks: NSE API
   - Indices: NSE API
   - Mutual Funds: mfapi.in API

4. **Clear watchlistId when switching types**
   - Prevents type mismatch errors
   - Ensures correct watchlist selection
   - Better user experience

---

## 🚀 Next Steps

1. **Test the fixes**
   - Reset onboarding state
   - Try adding mutual funds
   - Verify no type mismatch errors

2. **Monitor backend logs**
   - Check for any remaining 400 errors
   - Verify scheme code validation works
   - Ensure API calls succeed

3. **Update documentation**
   - Add mutual fund examples to API docs
   - Document scheme code format
   - Add troubleshooting guide

---

**Last Updated:** January 5, 2026  
**Status:** ✅ Fixed - Ready for Testing

