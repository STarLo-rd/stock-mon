import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboardingStatus } from '../../hooks/useOnboarding';
import { useQuery } from '@tanstack/react-query';
import { useMarket } from '../../components/market-provider';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

/**
 * OnboardingCheck Component
 * Checks if user needs onboarding and redirects accordingly
 * Single source of truth for onboarding status
 */
export const OnboardingCheck: React.FC<OnboardingCheckProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { market } = useMarket();
  const { isCompleted } = useOnboardingStatus();
  const [shouldOnboard, setShouldOnboard] = useState(false);

  // Check if onboarding is completed in localStorage first
  const onboardingCompleted = isCompleted();

  // Only fetch watchlists if user is authenticated and onboarding not completed
  const { data: watchlistsData, isLoading: loadingWatchlists, error } = useQuery({
    queryKey: ['onboarding-check', user?.id, market],
    queryFn: async () => {
      // Fetch both types of watchlists
      const [stockResponse, mfResponse] = await Promise.all([
        api.watchlists.getAll('STOCK', market),
        api.watchlists.getAll('MUTUAL_FUND', market),
      ]);

      const allWatchlists = [...stockResponse.data, ...mfResponse.data];

      // If no watchlists, user needs onboarding
      if (allWatchlists.length === 0) {
        return { needsOnboarding: true, hasItems: false };
      }

      // Check if any watchlist has items
      const itemChecks = await Promise.all(
        allWatchlists.map(async (wl) => {
          try {
            const itemsResponse = await api.watchlist.getAll(wl.id, false, market);
            return itemsResponse.data.length > 0;
          } catch {
            return false;
          }
        })
      );

      const hasItems = itemChecks.some(Boolean);
      return { needsOnboarding: !hasItems, hasItems };
    },
    enabled: !!user && !onboardingCompleted && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on error
  });

  useEffect(() => {
    if (!authLoading && user && !onboardingCompleted && watchlistsData) {
      setShouldOnboard(watchlistsData.needsOnboarding);
    }
  }, [authLoading, user, onboardingCompleted, watchlistsData]);

  // Show loading spinner while checking
  if (authLoading || (user && !onboardingCompleted && loadingWatchlists)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-gray-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading your workspace...</p>
      </div>
    );
  }

  // Show error state if there was an issue
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center space-y-4">
          <p className="text-red-600 font-semibold">Unable to load workspace</p>
          <p className="text-gray-600 text-sm">Please refresh the page or try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if needed
  if (!authLoading && user && shouldOnboard) {
    return <Navigate to="/onboarding" replace />;
  }

  // User is authenticated and has completed onboarding (or has watchlist items)
  return <>{children}</>;
};

