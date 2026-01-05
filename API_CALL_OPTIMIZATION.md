# API Call Optimization - Fixing 429 Rate Limit Errors

## 🐛 Problem

**429 Too Many Requests** errors caused by repeated watchlist API calls:

```
watchlists?type=STOCK&market=INDIA    429  xhr  api.ts:186  0.6 kB  56 ms
watchlists?type=MUTUAL_FUND&market=INDIA  429  xhr  api.ts:186  0.6 kB  53 ms
watchlists?type=STOCK&market=INDIA    429  xhr  api.ts:186  0.6 kB  6 ms
watchlists?type=MUTUAL_FUND&market=INDIA  429  xhr  api.ts:186  0.6 kB  5 ms
```

**Root Causes:**
1. **Multiple components calling same endpoints** - Onboarding.tsx and AddAssetStep.tsx both calling useWatchlists
2. **Unnecessary calls on all steps** - Fetching watchlists even when not needed (steps 1, 3, 4)
3. **Refetching on mount** - React Query refetching on component remount
4. **useEffect dependencies** - Causing unnecessary re-renders and refetches

---

## ✅ Solutions Implemented

### **1. Conditional Fetching in Onboarding.tsx**

**Before:**
```typescript
// Always fetching, even on steps that don't need it
const { data: stockWatchlists = [] } = useWatchlists('STOCK');
const { data: mfWatchlists = [] } = useWatchlists('MUTUAL_FUND');
```

**After:**
```typescript
// Only fetch on step 5 (CelebrationStep)
const shouldFetchWatchlists = currentStep === 5;

const { data: stockWatchlists = [] } = useQuery({
  queryKey: ['watchlists', 'STOCK', market],
  queryFn: async () => { /* ... */ },
  enabled: shouldFetchWatchlists,  // ✅ Only fetch when needed
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,           // ✅ Don't refetch on mount
  refetchOnWindowFocus: false,      // ✅ Don't refetch on focus
});
```

**Impact:** 
- Steps 1, 3, 4: **0 API calls** (was 2 calls each)
- Step 2: **0 calls from Onboarding.tsx** (AddAssetStep handles its own)
- Step 5: **2 calls** (only when needed)

---

### **2. Prevent Refetching in useWatchlists Hook**

**Before:**
```typescript
return useQuery({
  queryKey: ['watchlists', type, market],
  queryFn: async () => { /* ... */ },
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 2,
});
```

**After:**
```typescript
return useQuery({
  queryKey: ['watchlists', type, market],
  queryFn: async () => { /* ... */ },
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,          // ✅ Don't refetch on mount if data is fresh
  refetchOnReconnect: false,      // ✅ Don't refetch on reconnect
  retry: 2,
});
```

**Impact:**
- Prevents unnecessary refetches when component remounts
- Uses cached data if available and fresh

---

### **3. Optimized useEffect Dependencies in AddAssetStep**

**Before:**
```typescript
useEffect(() => {
  // ... logic
}, [existingWatchlists, loadingWatchlists, assetType, watchlistId]);
// ❌ Including existingWatchlists causes re-runs when array reference changes
```

**After:**
```typescript
useEffect(() => {
  // Only set watchlistId if we don't have one and watchlists are loaded
  if (!watchlistId && !loadingWatchlists && existingWatchlists.length > 0) {
    const matchingWatchlist = existingWatchlists[0];
    if (matchingWatchlist && matchingWatchlist.type === assetType) {
      setWatchlistId(matchingWatchlist.id);
    }
  }
}, [loadingWatchlists, assetType]); // ✅ Only depend on loading state and assetType
```

**Impact:**
- Prevents infinite loops
- Reduces unnecessary re-renders
- Only updates when actually needed

---

## 📊 API Call Reduction

### **Before Optimization**

| Step | Calls from Onboarding.tsx | Calls from AddAssetStep.tsx | Total |
|------|---------------------------|----------------------------|-------|
| Step 1 (Welcome) | 2 (STOCK + MF) | 0 | **2** |
| Step 2 (Add Asset) | 2 (STOCK + MF) | 1 (current type) | **3** |
| Step 3 (Set Alerts) | 2 (STOCK + MF) | 0 | **2** |
| Step 4 (Notifications) | 2 (STOCK + MF) | 0 | **2** |
| Step 5 (Celebration) | 2 (STOCK + MF) | 0 | **2** |
| **Total** | **10** | **1** | **11** |

### **After Optimization**

| Step | Calls from Onboarding.tsx | Calls from AddAssetStep.tsx | Total |
|------|---------------------------|----------------------------|-------|
| Step 1 (Welcome) | 0 | 0 | **0** |
| Step 2 (Add Asset) | 0 | 1 (current type) | **1** |
| Step 3 (Set Alerts) | 0 | 0 | **0** |
| Step 4 (Notifications) | 0 | 0 | **0** |
| Step 5 (Celebration) | 2 (STOCK + MF) | 0 | **2** |
| **Total** | **2** | **1** | **3** |

**Reduction: 73% fewer API calls** (from 11 to 3)

---

## 🔧 Technical Details

### **React Query Caching**

React Query automatically deduplicates requests with the same query key:

```typescript
// Multiple components calling this:
useWatchlists('STOCK')

// React Query sees:
queryKey: ['watchlists', 'STOCK', 'INDIA']

// If this query is already in-flight or cached, it reuses it
// No duplicate network requests!
```

**However**, if components mount at different times or query keys differ slightly, duplicates can occur.

### **Query Key Consistency**

All components use the same query key format:
```typescript
['watchlists', type, market]
```

This ensures proper caching and deduplication.

### **Stale Time Strategy**

```typescript
staleTime: 5 * 60 * 1000  // 5 minutes
```

- Data is considered "fresh" for 5 minutes
- No refetching during this time
- Reduces unnecessary API calls

---

## 🎯 Best Practices Applied

### **1. Conditional Fetching**
```typescript
enabled: shouldFetchWatchlists  // Only fetch when needed
```

### **2. Prevent Unnecessary Refetches**
```typescript
refetchOnMount: false      // Don't refetch on mount
refetchOnWindowFocus: false // Don't refetch on focus
refetchOnReconnect: false   // Don't refetch on reconnect
```

### **3. Optimize useEffect Dependencies**
```typescript
// ✅ Good: Only depend on what actually triggers the effect
useEffect(() => { /* ... */ }, [loadingWatchlists, assetType]);

// ❌ Bad: Including array references causes re-runs
useEffect(() => { /* ... */ }, [existingWatchlists, ...]);
```

### **4. Use React Query's enabled Option**
```typescript
// ✅ Fetch only when needed
enabled: currentStep === 5

// ❌ Always fetching
// No enabled option
```

---

## 📝 Files Modified

1. **`frontend/src/pages/Onboarding.tsx`**
   - Conditional fetching based on current step
   - Only fetch watchlists on step 5
   - Use React Query directly with `enabled` flag

2. **`frontend/src/hooks/usePrices.ts`**
   - Added `refetchOnMount: false`
   - Added `refetchOnReconnect: false`
   - Prevents unnecessary refetches

3. **`frontend/src/components/onboarding/AddAssetStep.tsx`**
   - Optimized useEffect dependencies
   - Removed `existingWatchlists` from dependencies
   - Only depends on `loadingWatchlists` and `assetType`

---

## ✅ Testing Checklist

- [ ] Step 1 (Welcome): No watchlist API calls
- [ ] Step 2 (Add Asset): Only 1 call (current asset type)
- [ ] Step 3 (Set Alerts): No watchlist API calls
- [ ] Step 4 (Notifications): No watchlist API calls
- [ ] Step 5 (Celebration): 2 calls (STOCK + MF)
- [ ] Switching asset types: Uses cached data, no new calls
- [ ] No 429 errors in console
- [ ] Network tab shows minimal calls

---

## 🚀 Expected Results

### **Before**
- ❌ 11+ API calls during onboarding
- ❌ 429 rate limit errors
- ❌ Slow performance
- ❌ Poor user experience

### **After**
- ✅ 3 API calls during onboarding (73% reduction)
- ✅ No 429 errors
- ✅ Fast performance
- ✅ Smooth user experience

---

## 💡 Key Takeaways

1. **Fetch Only When Needed**
   - Use `enabled` option in React Query
   - Conditional fetching based on component state

2. **Prevent Unnecessary Refetches**
   - `refetchOnMount: false` for stable data
   - `refetchOnWindowFocus: false` during onboarding
   - `refetchOnReconnect: false` for cached data

3. **Optimize useEffect Dependencies**
   - Only include values that actually trigger the effect
   - Avoid array/object references that change frequently

4. **Leverage React Query Caching**
   - Same query keys = automatic deduplication
   - Stale time prevents unnecessary refetches
   - Cached data reused across components

---

**Last Updated:** January 5, 2026  
**Status:** ✅ Complete - API Calls Optimized

