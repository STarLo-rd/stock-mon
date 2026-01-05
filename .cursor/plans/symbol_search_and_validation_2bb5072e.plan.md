# Symbol Search and Validation Enhancement Plan

## Overview
Enhance the "Add Symbol to Watchlist" dialog with autocomplete search suggestions and validation to ensure only valid NSE stocks and indices can be added. Uses dynamic API-based discovery instead of hardcoded lists.

## Current State Analysis
- Simple text input without suggestions
- No validation - allows fake symbols like "ADFDSF"
- Users must know exact symbol names
- No search/autocomplete functionality

## Implementation Plan

### 1. Backend: Symbol Search and Validation Service
**File**: `src/services/symbol-search.service.ts` (new)

- Create service with dynamic symbol discovery:
  - **Popular symbols**: Fetch from existing watchlist (already validated symbols)
  - **Indices**: Fetch from NSE API (`getAllIndices()`) dynamically
  - **Stocks**: Search NSE API directly by attempting to fetch quote
  - No hardcoded lists - all symbols discovered via API calls

- Methods:
  ```typescript
  async searchSymbols(query: string, type?: 'INDEX' | 'STOCK'): Promise<SymbolSuggestion[]>
  async validateSymbol(symbol: string, type: 'INDEX' | 'STOCK'): Promise<{valid: boolean; error?: string}>
  ```

- Search strategy:
  1. For indices: Fetch all indices from NSE API, filter by query
  2. For stocks: Attempt to fetch quote from NSE API (if exists, it's valid)
  3. Fallback: Check existing watchlist for popular symbols
  4. If all fail → invalid symbol

### 2. Backend: Symbol Search API Endpoint
**File**: `src/routes/symbol.routes.ts` (modify)

- Add endpoint: `GET /api/symbols/search?q={query}&type={INDEX|STOCK}`
- Returns array of matching symbols:
  ```typescript
  {
    symbol: string;
    name?: string; // Full name if available
    type: 'INDEX' | 'STOCK';
    exchange: string;
  }
  ```

- Search logic:
  - **For indices**: Fetch from NSE `/api/allIndices`, filter by query, map to our format
  - **For stocks**: If query matches known pattern, attempt NSE quote fetch
  - **Popular symbols**: Include symbols from existing watchlist
  - Return top 10-20 matches

- Add validation endpoint: `POST /api/symbols/validate`
- Validates symbol by attempting API fetch:
  - Indices: Check against NSE indices API
  - Stocks: Attempt to fetch quote from NSE (if 404/error → invalid)
- Returns: `{valid: boolean; error?: string}`

### 3. Backend: Enhanced Watchlist Add Validation
**File**: `src/routes/watchlist.routes.ts` (modify)

- Before adding symbol, validate via API:
  - For indices: Check against NSE indices API
  - For stocks: Attempt to fetch quote from NSE API
  - If API call fails → return error "Symbol not found"
  - Only add if validation succeeds

### 4. Frontend: Autocomplete Component
**File**: `frontend/src/components/ui/autocomplete.tsx` (new, using shadcn/ui pattern)

- Create reusable autocomplete component
- Features:
  - Debounced search (300ms delay)
  - Loading state while searching
  - Keyboard navigation (arrow keys, enter to select)
  - Click outside to close
  - Highlight matching text
  - Empty state when no results

### 5. Frontend: Symbol Search Hook
**File**: `frontend/src/hooks/useSymbolSearch.ts` (new)

- React Query hook for symbol search:
  ```typescript
  useSymbolSearch(query: string, type?: 'INDEX' | 'STOCK')
  ```
- Debounced query (300ms)
- Caches search results
- Handles loading and error states
- Only searches if query length >= 2

### 6. Frontend: Enhanced Add Symbol Dialog
**File**: `frontend/src/pages/Watchlist.tsx` (modify)

- Replace simple Input with Autocomplete component
- Show suggestions as user types (min 2 characters)
- Display symbol type (INDEX/STOCK) in suggestions
- Show icons for indices vs stocks
- Auto-select type based on selected suggestion
- Validate symbol before allowing add
- Show error message if symbol is invalid
- Disable "Add" button until valid symbol selected

### 7. Frontend: API Client Updates
**File**: `frontend/src/services/api.ts` (modify)

- Add symbol search methods:
  ```typescript
  symbols: {
    search: async (query: string, type?: 'INDEX' | 'STOCK'): Promise<{success: boolean; data: SymbolSuggestion[]}>
    validate: async (symbol: string, type: 'INDEX' | 'STOCK'): Promise<{success: boolean; valid: boolean; error?: string}>
  }
  ```

## Implementation Details

### Dynamic Symbol Discovery Strategy

**Indices**:
- Fetch from NSE API `/api/allIndices` dynamically
- Map NSE index names to our symbol format:
  - "NIFTY 50" → "NIFTY50"
  - "NIFTY MIDCAP 100" → "NIFTYMIDCAP"
  - etc.
- Cache indices list (refresh every hour)
- Filter by query string (case-insensitive)

**Stocks**:
- **Search**: Attempt to fetch quote from NSE API for query
- **Validation**: Attempt to fetch quote - if successful, symbol exists
- **Popular**: Include symbols from existing watchlist (already validated)
- No hardcoded lists - all discovered via API

**Validation Flow**:
1. User types symbol
2. Search API attempts to find symbol:
   - For indices: Check NSE indices API
   - For stocks: Attempt NSE quote fetch
3. If found → show in suggestions
4. On "Add" click → validate again via API
5. If validation fails → show error "Symbol not found on NSE"

### UI/UX Flow

1. User types in search box (e.g., "nifty")
2. After 300ms delay and 2+ characters, show matching suggestions
3. Suggestions show:
   - Icon (TrendingUp for indices, Building2 for stocks)
   - Symbol name
   - Type badge
   - Full name if available from API
4. User selects suggestion → auto-fills symbol and type
5. User clicks "Add" → validate symbol via API → add if valid
6. Show error if validation fails: "Symbol 'XYZ' not found. Please check the symbol name."

## Files to Create/Modify

### Backend
1. `src/services/symbol-search.service.ts` (new)
2. `src/routes/symbol.routes.ts` (modify - add search endpoint)
3. `src/routes/watchlist.routes.ts` (modify - add validation)

### Frontend
1. `frontend/src/components/ui/autocomplete.tsx` (new)
2. `frontend/src/hooks/useSymbolSearch.ts` (new)
3. `frontend/src/pages/Watchlist.tsx` (modify - replace input with autocomplete)
4. `frontend/src/services/api.ts` (modify - add search methods)

## Benefits

1. **Prevents Invalid Symbols**: Only valid symbols can be added (validated via API)
2. **Dynamic Discovery**: No hardcoded lists - discovers symbols via API
3. **Better UX**: Users can search and discover symbols
4. **Faster Entry**: Autocomplete speeds up symbol entry
5. **Error Prevention**: Validation catches mistakes before adding
6. **Discoverability**: Users can find symbols by partial name
7. **Always Up-to-Date**: Uses live NSE API data

## Testing Considerations

- Test search with partial matches (e.g., "nifty" finds "NIFTY50")
- Test validation rejects invalid symbols (e.g., "ADFDSF")
- Test autocomplete keyboard navigation
- Test debouncing works correctly
- Test error handling for API failures
- Test type auto-selection from suggestions
- Test validation for both indices and stocks

