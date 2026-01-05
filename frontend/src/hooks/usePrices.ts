import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, WatchlistItem, Watchlist, Alert, SystemStatus, MarketTrend, TopMover, MarketHealth, SymbolRequiringAttention } from '../services/api';
import { useMarket } from '@/components/market-provider';

/**
 * React Query Hooks for Market Crash Monitor
 * Provides smart caching, background refetching, and request deduplication
 * NOW SUPPORTS MULTI-MARKET: All hooks automatically filter by selected market
 */

// ==================== PRICE HOOKS ====================

/**
 * Hook to get current prices for all active symbols
 * Refetches every 2 minutes automatically (backend updates every 5 min)
 * Automatically filters by selected market
 */
export function useCurrentPrices() {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['prices', 'current', market],
    queryFn: async () => {
      const response = await api.prices.getCurrent(market);
      return response.data;
    },
    staleTime: 90000,       // Fresh for 90 seconds
    refetchInterval: 120000, // Refetch every 2 minutes (backend updates every 5 min)
  });
}

/**
 * Hook to get price history for a specific symbol
 * @param symbol - Stock/index symbol
 * @param limit - Number of price points to return
 */
export function usePriceHistory(symbol: string, limit: number = 100) {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['prices', 'history', symbol, limit, market],
    queryFn: async () => {
      const response = await api.prices.getHistory(symbol, { limit, market });
      return response.data;
    },
    staleTime: 60000,      // Fresh for 1 minute (historical data changes slowly)
    enabled: !!symbol,     // Only fetch if symbol exists
  });
}

// ==================== SYMBOL HOOKS ====================

/**
 * Hook to get symbol details (current price + historical prices)
 * @param symbol - Stock/index symbol
 */
export function useSymbolData(symbol: string) {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['symbols', symbol, market],
    queryFn: async () => {
      const response = await api.symbols.get(symbol, market);
      return response.data;
    },
    staleTime: 30000,      // Fresh for 30 seconds
    enabled: !!symbol,
  });
}

/**
 * Hook to get symbol price chart data
 * @param symbol - Stock/index symbol
 * @param timeframe - '1D' | '1W' | '1M' | '1Y'
 */
export function useSymbolPrices(symbol: string, timeframe: string = '1M') {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['symbols', symbol, 'prices', timeframe, market],
    queryFn: async () => {
      const response = await api.symbols.getPrices(symbol, timeframe, market);
      return response.data;
    },
    staleTime: 60000,      // Fresh for 1 minute
    enabled: !!symbol,
  });
}

/**
 * Hook to get symbol alert history
 * @param symbol - Stock/index symbol
 * @param limit - Number of alerts to return
 */
export function useSymbolAlerts(symbol: string, limit: number = 50) {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['symbols', symbol, 'alerts', limit, market],
    queryFn: async () => {
      const response = await api.symbols.getAlerts(symbol, limit, market);
      return response.data;
    },
    staleTime: 30000,      // Fresh for 30 seconds
    enabled: !!symbol,
  });
}

// ==================== ALERT HOOKS ====================

/**
 * Hook to get all alerts with optional filters
 * @param params - Filter parameters
 */
export function useAlerts(params?: {
  symbol?: string;
  threshold?: number;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  critical?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['alerts', params, market],
    queryFn: async () => {
      const response = await api.alerts.getAll({ ...params, market });
      return response.data;
    },
    staleTime: 90000,       // Fresh for 90 seconds
    refetchInterval: 120000, // Refetch every 2 minutes (backend updates every 5 min)
  });
}

/**
 * Hook to get today's alerts
 * @param market - Market type (INDIA or USA), optional (uses context if not provided)
 * @param limit - Number of alerts to return
 */
export function useTodayAlerts(market?: 'INDIA' | 'USA', limit: number = 50) {
  const { market: contextMarket } = useMarket();
  const selectedMarket = market ?? contextMarket;

  return useQuery({
    queryKey: ['alerts', 'today', selectedMarket, limit],
    queryFn: async () => {
      const response = await api.alerts.getToday(selectedMarket, limit);
      return response.data;
    },
    staleTime: 90000,       // Fresh for 90 seconds
    refetchInterval: 120000, // Refetch every 2 minutes (backend updates every 5 min)
  });
}

/**
 * Hook to get a specific alert by ID
 * @param id - Alert ID
 */
export function useAlert(id: string) {
  return useQuery({
    queryKey: ['alerts', id],
    queryFn: async () => {
      const response = await api.alerts.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// ==================== WATCHLIST HOOKS ====================

/**
 * Hook to get all watchlist items
 * @param activeOnly - If true, only return active symbols
 */
/**
 * Hook to get all watchlists for a market and type
 */
export function useWatchlists(type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND') {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['watchlists', type, market],
    queryFn: async () => {
      const response = await api.watchlists.getAll(type, market);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,      // Fresh for 5 minutes (changes infrequently)
    refetchOnWindowFocus: false,   // Don't refetch on window focus during onboarding
    refetchOnMount: false,          // Don't refetch on component mount if data is fresh
    refetchOnReconnect: false,      // Don't refetch on reconnect
    retry: 2,                       // Retry failed requests twice
  });
}

/**
 * Hook to get symbols in a specific watchlist
 */
export function useWatchlist(watchlistId: string | null, activeOnly?: boolean) {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['watchlist', watchlistId, activeOnly, market],
    queryFn: async () => {
      if (!watchlistId) return [];
      const response = await api.watchlist.getAll(watchlistId, activeOnly, market);
      return response.data;
    },
    enabled: !!watchlistId,
    staleTime: 5 * 60 * 1000,      // Fresh for 5 minutes (changes infrequently)
    refetchOnWindowFocus: false,   // Don't refetch on window focus during onboarding
    retry: 2,                       // Retry failed requests twice
  });
}

/**
 * Hook to create a new watchlist
 */
export function useWatchlistLimits() {
  return useQuery({
    queryKey: ['watchlist-limits'],
    queryFn: async () => {
      const response = await api.watchlists.getLimits();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useCreateWatchlist() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { name: string; type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND' }) => {
      const response = await api.watchlists.create(data.name, data.type, market);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists', variables.type, market] });
    },
  });
}

/**
 * Hook to update a watchlist (rename, reorder)
 */
export function useUpdateWatchlistMeta() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { id: string; type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND'; name?: string; order?: number }) => {
      const { id, type, ...updateData } = data;
      const response = await api.watchlists.update(id, updateData, type, market);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists', variables.type, market] });
    },
  });
}

/**
 * Hook to delete a watchlist
 */
export function useDeleteWatchlist() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { id: string; type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND' }) => {
      const response = await api.watchlists.delete(data.id, data.type, market);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists', variables.type, market] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

/**
 * Hook to reorder watchlists
 */
export function useReorderWatchlists() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { watchlistIds: string[]; type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND' }) => {
      const response = await api.watchlists.reorder(data.watchlistIds, data.type, market);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists', variables.type, market] });
    },
  });
}

/**
 * Hook to add a symbol to watchlist
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { watchlistId: string; symbol: string; type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND'; exchange?: string; name?: string }) => {
      const response = await api.watchlist.add(data.watchlistId, data.symbol, data.type, data.exchange, market, data.name);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate watchlist queries for the specific watchlist
      queryClient.invalidateQueries({ queryKey: ['watchlist', variables.watchlistId] });
      // Also invalidate prices to refresh the list
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });
}

/**
 * Hook to remove a symbol from watchlist
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { watchlistId: string; symbol: string }) => {
      const response = await api.watchlist.remove(data.watchlistId, data.symbol, market);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate watchlist queries for the specific watchlist
      queryClient.invalidateQueries({ queryKey: ['watchlist', variables.watchlistId] });
      // Also invalidate prices to refresh the list
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });
}

/**
 * Hook to update watchlist item (activate/deactivate, reorder)
 */
export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { watchlistId: string; symbol: string; active?: boolean; order?: number }) => {
      const { watchlistId, symbol, ...updateData } = data;
      const response = await api.watchlist.update(watchlistId, symbol, updateData, market);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate watchlist queries for the specific watchlist
      queryClient.invalidateQueries({ queryKey: ['watchlist', variables.watchlistId] });
      queryClient.invalidateQueries({ queryKey: ['prices', market] });
    },
  });
}

/**
 * Hook to reorder symbols within a watchlist
 */
export function useReorderWatchlistItems() {
  const queryClient = useQueryClient();
  const { market } = useMarket();

  return useMutation({
    mutationFn: async (data: { watchlistId: string; symbolIds: string[] }) => {
      const response = await api.watchlist.reorder(data.watchlistId, data.symbolIds, market);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', variables.watchlistId] });
    },
  });
}

// ==================== STATUS HOOKS ====================

/**
 * Hook to get system status
 * Refetches every 2 minutes (backend updates every 5 min)
 */
export function useStatus() {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['status', market],
    queryFn: async () => {
      const response = await api.status.get(market);
      return response.data;
    },
    staleTime: 90000,       // Fresh for 90 seconds
    refetchInterval: 120000, // Refetch every 2 minutes (backend updates every 5 min)
  });
}

// ==================== UTILITY HOOKS ====================

/**
 * Hook to manually invalidate price caches
 * Useful for forcing a refresh
 */
export function useInvalidatePrices() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['prices'] });
    queryClient.invalidateQueries({ queryKey: ['symbols'] });
  };
}

/**
 * Hook to manually invalidate all caches
 * Useful for complete refresh
 */
export function useInvalidateAll() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries();
  };
}

// ==================== MARKET OVERVIEW HOOKS ====================

/**
 * Hook to get market trends (aggregate price movements over time)
 * @param timeframe - Time period: '1W', '1M', '3M', '6M', '1Y'
 */
export function useMarketTrends(timeframe: string = '1M') {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['marketOverview', 'trends', market, timeframe],
    queryFn: async () => {
      const response = await api.marketOverview.getTrends(market, timeframe);
      return response.data;
    },
    staleTime: 120000,      // Fresh for 2 minutes
    refetchInterval: 180000, // Refetch every 3 minutes
  });
}

/**
 * Hook to get top movers (gainers and losers)
 * @param timeframe - Time period: '1D', '1W', '1M'
 */
export function useTopMovers(timeframe: string = '1D') {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['marketOverview', 'topMovers', market, timeframe],
    queryFn: async () => {
      const response = await api.marketOverview.getTopMovers(market, timeframe);
      return response.data;
    },
    staleTime: 90000,       // Fresh for 90 seconds
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}

/**
 * Hook to get market health indicators
 */
export function useMarketHealth() {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['marketOverview', 'health', market],
    queryFn: async () => {
      const response = await api.marketOverview.getHealth(market);
      return response.data;
    },
    staleTime: 120000,      // Fresh for 2 minutes
    refetchInterval: 180000, // Refetch every 3 minutes
  });
}

/**
 * Hook to get symbols requiring attention (approaching thresholds, recent alerts, etc.)
 * @param type - Optional filter by symbol type (INDEX, STOCK, MUTUAL_FUND)
 */
export function useSymbolsRequiringAttention(type?: 'INDEX' | 'STOCK' | 'MUTUAL_FUND') {
  const { market } = useMarket();

  return useQuery({
    queryKey: ['marketOverview', 'symbolsRequiringAttention', market, type],
    queryFn: async () => {
      const response = await api.marketOverview.getSymbolsRequiringAttention(market, type);
      return response.data;
    },
    staleTime: 90000,       // Fresh for 90 seconds
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}
