import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMarketHealth } from '@/hooks/usePrices';
import { Activity, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Market Health Indicators Component
 * Shows volatility, alert frequency, recovery rate, and sentiment
 */
export const MarketHealth: React.FC = () => {
  const { data: health, isLoading } = useMarketHealth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">No health data available</div>
        </CardContent>
      </Card>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'bullish') return 'text-green-500 bg-green-500/10 border-green-500';
    if (sentiment === 'bearish') return 'text-red-500 bg-red-500/10 border-red-500';
    return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
  };

  const getVolatilityLevel = (volatility: number) => {
    if (volatility < 2) return { level: 'Low', color: 'text-green-600' };
    if (volatility < 5) return { level: 'Moderate', color: 'text-yellow-600' };
    return { level: 'High', color: 'text-red-600' };
  };

  const volatilityInfo = getVolatilityLevel(health.volatility);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Alert Frequency */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alert Frequency</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{health.alertFrequency.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Alerts per day (7-day avg)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {health.totalAlerts} total alerts
          </p>
        </CardContent>
      </Card>

      {/* Recovery Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{health.recoveryRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            Symbols recovered after alerts
          </p>
          <Badge
            variant="outline"
            className={cn(
              'mt-2',
              health.recoveryRate >= 50
                ? 'text-green-600 border-green-600'
                : health.recoveryRate >= 30
                ? 'text-yellow-600 border-yellow-600'
                : 'text-red-600 border-red-600'
            )}
          >
            {health.recoveryRate >= 50
              ? 'Healthy'
              : health.recoveryRate >= 30
              ? 'Moderate'
              : 'Low'}
          </Badge>
        </CardContent>
      </Card>

      {/* Volatility */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Volatility</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', volatilityInfo.color)}>
            {health.volatility.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Price change std dev
          </p>
          <Badge
            variant="outline"
            className={cn('mt-2', volatilityInfo.color, 'border-current')}
          >
            {volatilityInfo.level}
          </Badge>
        </CardContent>
      </Card>

      {/* Market Sentiment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Badge
            variant="outline"
            className={cn('text-lg font-semibold px-3 py-1', getSentimentColor(health.sentiment))}
          >
            {health.sentiment.charAt(0).toUpperCase() + health.sentiment.slice(1)}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            Based on recent alerts
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {health.criticalAlerts} critical alerts
          </p>
        </CardContent>
      </Card>
    </div>
  );
};



