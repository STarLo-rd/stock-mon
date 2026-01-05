# Fixing 500 Errors on Watchlists Endpoint

## 🐛 Problem

**500 Internal Server Error** on watchlists endpoint:

```
watchlists?type=STOCK&market=INDIA    500  xhr  api.ts:186  0.2 kB  3 ms
watchlists?type=STOCK&market=INDIA    500  xhr  api.ts:186  0.2 kB  2 ms
watchlists?type=STOCK&market=INDIA    500  xhr  api.ts:186  0.2 kB  4 ms
```

**Root Causes:**
1. **Generic error handling** - Catch block doesn't log enough details
2. **Missing userId validation** - Non-null assertion (`!`) could hide issues
3. **Database query failures** - No specific error handling for DB errors
4. **No error details in response** - Hard to debug in production

---

## ✅ Solutions Implemented

### **1. Enhanced Error Logging**

**Before:**
```typescript
catch (error) {
  logger.error('Error fetching watchlists', { error, market: req.query.market, type: req.query.type });
  res.status(500).json({
    success: false,
    error: 'Failed to fetch watchlists',
  });
}
```

**After:**
```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  logger.error('Error fetching watchlists', { 
    error: errorMessage,
    stack: errorStack,
    userId: req.userId,
    market: req.query.market, 
    type: req.query.type,
    queryString: req.url
  });
  
  res.status(500).json({
    success: false,
    error: 'Failed to fetch watchlists',
    details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
  });
}
```

**Benefits:**
- Logs full error message and stack trace
- Includes userId for debugging
- Includes full query string
- Shows error details in development mode

---

### **2. userId Validation**

**Before:**
```typescript
const userId = req.userId!;  // Non-null assertion - hides potential issues
```

**After:**
```typescript
const userId = req.userId;

// Validate userId is present (should be set by requireAuth middleware)
if (!userId) {
  logger.error('userId is missing in watchlists GET request', { 
    hasAuthHeader: !!req.headers.authorization,
    query: req.query 
  });
  return res.status(401).json({
    success: false,
    error: 'Authentication required. Please login again.',
  });
}
```

**Benefits:**
- Explicit validation instead of assertion
- Returns 401 instead of 500 if auth fails
- Logs helpful debugging info

---

## 🔍 Debugging Steps

### **1. Check Server Logs**

Look for the detailed error logs:
```bash
# Check error.log
tail -f logs/error.log | grep "Error fetching watchlists"

# Should show:
# - Error message
# - Stack trace
# - userId
# - market and type
# - Full query string
```

### **2. Common Causes**

#### **Database Connection Issues**
```typescript
// Check if database is accessible
// Error: "Connection refused" or "ECONNREFUSED"
```

**Solution:** Verify database is running and DATABASE_URL is correct

#### **Schema Mismatch**
```typescript
// Error: "column does not exist" or "relation does not exist"
```

**Solution:** Run database migrations

#### **Missing userId**
```typescript
// Error: "userId is missing"
```

**Solution:** Check auth middleware is running before route handler

#### **Type Casting Issues**
```typescript
// Error: "invalid input syntax for type"
```

**Solution:** Verify market and type values are correct

---

## 📝 Files Modified

1. **`src/routes/watchlists.routes.ts`**
   - Added userId validation
   - Enhanced error logging
   - Added error details in development mode

---

## 🧪 Testing

### **Test Cases**

1. **Valid Request**
   ```bash
   GET /api/watchlists?type=STOCK&market=INDIA
   Authorization: Bearer <valid_token>
   
   Expected: 200 OK with watchlists array
   ```

2. **Missing userId**
   ```bash
   GET /api/watchlists?type=STOCK&market=INDIA
   # No Authorization header
   
   Expected: 401 Unauthorized
   ```

3. **Invalid Type**
   ```bash
   GET /api/watchlists?type=INVALID&market=INDIA
   
   Expected: 400 Bad Request
   ```

4. **Database Error**
   ```bash
   # Database down or connection error
   
   Expected: 500 Internal Server Error with detailed log
   ```

---

## 🚀 Next Steps

1. **Monitor Logs**
   - Check `logs/error.log` for detailed error messages
   - Look for patterns in errors

2. **Verify Database**
   ```bash
   # Check database connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check watchlists table exists
   psql $DATABASE_URL -c "\d watchlists"
   ```

3. **Check Auth Flow**
   - Verify tokens are being sent correctly
   - Check auth middleware is executing
   - Verify Supabase auth is working

4. **Add Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Monitor 500 error rates
   - Alert on repeated failures

---

## 💡 Key Improvements

1. **Better Error Visibility**
   - Full error messages in logs
   - Stack traces for debugging
   - Context information (userId, query params)

2. **Proper Error Codes**
   - 401 for auth issues (not 500)
   - 400 for validation errors
   - 500 only for actual server errors

3. **Development-Friendly**
   - Error details in dev mode
   - Helpful error messages
   - Easy to debug

---

## 🔧 Additional Recommendations

### **1. Add Database Health Check**
```typescript
// Add endpoint to check database connectivity
router.get('/health', async (req, res) => {
  try {
    await db.select().from(watchlists).limit(1);
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});
```

### **2. Add Request Retry Logic (Frontend)**
```typescript
// In api.ts, add retry for 500 errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 500 && retryCount < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### **3. Add Circuit Breaker**
```typescript
// Prevent cascading failures
if (errorCount > 10) {
  // Temporarily disable endpoint
  // Return 503 Service Unavailable
}
```

---

**Last Updated:** January 5, 2026  
**Status:** ✅ Enhanced Error Handling - Check Logs for Details

