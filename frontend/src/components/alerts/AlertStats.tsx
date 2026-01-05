import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/services/api';
import { TrendingUp, AlertTriangle, Calendar, Target, Zap } from 'lucide-react';

interface AlertStatsProps {
  alerts: Alert[];
}

export const AlertStats: React.FC<AlertStatsProps> = ({ alerts }) => {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAlerts = alerts.filter((alert) => {
      const alertDate = new Date(alert.timestamp);
      alertDate.setHours(0, 0, 0, 0);
      return alertDate.getTime() === today.getTime();
    });

    const byThreshold = {
      threshold5: alerts.filter((a) => a.threshold === 5).length,
      threshold10: alerts.filter((a) => a.threshold === 10).length,
      threshold15: alerts.filter((a) => a.threshold === 15).length,
      threshold20: alerts.filter((a) => a.threshold >= 20).length,
    };

    const byTimeframe = {
      day: alerts.filter((a) => a.timeframe === 'day').length,
      week: alerts.filter((a) => a.timeframe === 'week').length,
      month: alerts.filter((a) => a.timeframe === 'month').length,
      year: alerts.filter((a) => a.timeframe === 'year').length,
    };

    const criticalAlerts = alerts.filter((a) => a.critical).length;

    return {
      total: alerts.length,
      today: todayAlerts.length,
      critical: criticalAlerts,
      byThreshold,
      byTimeframe,
    };
  }, [alerts]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {/* Total Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            All time alerts
          </p>
        </CardContent>
      </Card>

      {/* Today's Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.today}</div>
          <p className="text-xs text-muted-foreground">
            Alerts today
          </p>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical</CardTitle>
          <Zap className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
          <p className="text-xs text-muted-foreground">
            20%+ drops
          </p>
        </CardContent>
      </Card>

      {/* 5% Threshold */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">5% Drops</CardTitle>
          <Target className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.byThreshold.threshold5}</div>
          <p className="text-xs text-muted-foreground">
            Threshold: 5%
          </p>
        </CardContent>
      </Card>

      {/* 10% Threshold */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">10% Drops</CardTitle>
          <Target className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.byThreshold.threshold10}</div>
          <p className="text-xs text-muted-foreground">
            Threshold: 10%
          </p>
        </CardContent>
      </Card>

      {/* 15% Threshold */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">15% Drops</CardTitle>
          <Target className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.byThreshold.threshold15}</div>
          <p className="text-xs text-muted-foreground">
            Threshold: 15%
          </p>
        </CardContent>
      </Card>

      {/* 20%+ Threshold */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">20%+ Drops</CardTitle>
          <Target className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.byThreshold.threshold20}</div>
          <p className="text-xs text-muted-foreground">
            Critical threshold
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

