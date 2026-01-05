import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MarketProvider } from './components/market-provider';
import { WatchlistProvider } from './contexts/WatchlistContext';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/toaster';
import Dashboard from './pages/Dashboard';
import Watchlist from './pages/Watchlist';
import Alerts from './pages/Alerts';
import StockDetail from './pages/StockDetail';
import './App.css';

/**
 * React Query Client Configuration
 * Optimized for market data with smart caching and background refetching
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 10 seconds (matches backend cache freshness)
      staleTime: 10000,

      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Background refetch every 30 seconds when window is focused
      refetchInterval: 30000,

      // Don't refetch on window focus (we have interval-based refetch)
      refetchOnWindowFocus: false,

      // Refetch on reconnect to get latest data after network issues
      refetchOnReconnect: true,

      // Retry failed requests once (backend is reliable with caching)
      retry: 1,

      // 500ms delay before retry
      retryDelay: 500,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MarketProvider defaultMarket="INDIA" storageKey="market-monitor-market">
        <WatchlistProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/symbol/:symbol" element={<StockDetail />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </WatchlistProvider>
      </MarketProvider>
      <Toaster />
      {/* DevTools for development - automatically disabled in production */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
