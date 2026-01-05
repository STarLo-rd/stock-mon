import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import { StatsCards } from '../components/dashboard/StatsCards';
import { SymbolsRequiringAttention } from '../components/dashboard/SymbolsRequiringAttention';
import { RecentAlerts } from '../components/dashboard/RecentAlerts';
import { MarketOverview } from '../components/dashboard/MarketOverview';
import { useStatus } from '../hooks/usePrices';

/**
 * Dashboard Component - Optimized with React Query
 *
 * Benefits:
 * - Automatic background refetching (2 min intervals, backend updates every 5 min)
 * - Smart caching (no redundant API calls)
 * - Request deduplication
 * - Automatic loading & error states
 * - No manual interval management needed
 */
const Dashboard: React.FC = () => {
  // Use React Query hooks - automatically handles caching, refetching, and deduplication
  const { data: status, isLoading: statusLoading } = useStatus();

  const loading = statusLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-h1 sm:text-display-sm font-bold tracking-tight">Dashboard</h1>
        <p className="text-body-sm sm:text-body text-muted-foreground mt-2">
          Real-time market crash monitoring and alerts
        </p>
      </div>

      {status && <StatsCards status={status} />}

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <SymbolsRequiringAttention />
        <RecentAlerts />
      </div>

      <MarketOverview />
    </div>
  );
};

export default Dashboard;

