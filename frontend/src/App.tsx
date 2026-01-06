import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import { MarketProvider } from './components/market-provider';
import { WatchlistProvider } from './contexts/WatchlistContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { OnboardingCheck } from './components/auth/OnboardingCheck';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/toaster';
import Dashboard from './pages/Dashboard';
import Watchlist from './pages/Watchlist';
import Alerts from './pages/Alerts';
import StockDetail from './pages/StockDetail';
import Settings from './pages/Settings';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { AuthCallback } from './pages/auth/AuthCallback';
import { EmailConfirm } from './pages/auth/EmailConfirm';
import Landing from './pages/Landing';
import { PublicRoute } from './components/auth/PublicRoute';
import Onboarding from './pages/Onboarding';
import Upgrade from './pages/Upgrade';
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
      <AuthProvider>
      <MarketProvider defaultMarket="INDIA" storageKey="market-monitor-market">
        <WatchlistProvider>
          <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/"
                  element={
                    <PublicRoute>
                      <Landing />
                    </PublicRoute>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/confirm" element={<EmailConfirm />} />

                {/* Protected routes */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <OnboardingCheck>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </OnboardingCheck>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/watchlist"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Watchlist />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Alerts />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/symbol/:symbol"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <StockDetail />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upgrade"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Upgrade />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
          </BrowserRouter>
        </WatchlistProvider>
      </MarketProvider>
      </AuthProvider>
      <Toaster />
      {/* DevTools for development - automatically disabled in production */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
