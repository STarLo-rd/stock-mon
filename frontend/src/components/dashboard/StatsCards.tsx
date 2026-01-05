import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, List, AlertTriangle, Database } from 'lucide-react';
import { SystemStatus } from '@/services/api';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  status: SystemStatus;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ status }) => {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card elevation={2}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-body-sm font-semibold">Market Status</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-h3 font-bold">
            <Badge
              variant={status.market.open ? 'success' : 'secondary'}
            >
              {status.market.open ? 'OPEN' : 'CLOSED'}
            </Badge>
          </div>
          <p className="text-caption text-muted-foreground mt-3">
            {status.market.open
              ? 'Market is currently trading'
              : 'Market is closed'}
          </p>
        </CardContent>
      </Card>

      <Card elevation={2}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-body-sm font-semibold">Watchlist</CardTitle>
          <List className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-h3 font-bold">{status.watchlist.active}</div>
          <p className="text-caption text-muted-foreground mt-1">
            of {status.watchlist.total} total symbols
          </p>
        </CardContent>
      </Card>

      <Card elevation={2}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-body-sm font-semibold">Alerts Today</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-h3 font-bold">{status.alerts.today}</div>
          <p className="text-caption text-muted-foreground mt-1">
            {status.alerts.critical > 0 && (
              <Badge variant="critical" className="mr-1">
                {status.alerts.critical} critical
              </Badge>
            )}
            {status.alerts.critical === 0 && 'No critical alerts'}
          </p>
        </CardContent>
      </Card>

      <Card elevation={2}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-body-sm font-semibold">Services</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-2">
            <Badge
              variant={status.services.database === 'connected' ? 'success' : 'destructive'}
            >
              DB
            </Badge>
            <Badge
              variant={status.services.redis === 'connected' ? 'success' : 'destructive'}
            >
              Redis
            </Badge>
          </div>
          <p className="text-caption text-muted-foreground">
            All services operational
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

