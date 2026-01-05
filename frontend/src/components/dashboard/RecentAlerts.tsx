import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTodayAlerts } from '@/hooks/usePrices';
import { getAlertSeverityVariant } from '@/lib/utils';

type ThresholdFilter = 'all' | 'critical' | 'major' | 'minor';

export const RecentAlerts: React.FC = () => {
  const navigate = useNavigate();
  const [thresholdFilter, setThresholdFilter] = useState<ThresholdFilter>('all');
  const { data: alerts = [], isLoading } = useTodayAlerts(undefined, 50); // Fetch more since we'll filter

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  // Filter alerts by threshold
  const filteredAlerts = useMemo(() => {
    if (thresholdFilter === 'all') return alerts;

    return alerts.filter((alert) => {
      if (thresholdFilter === 'critical') return alert.threshold >= 15;
      if (thresholdFilter === 'major') return alert.threshold >= 10 && alert.threshold < 15;
      if (thresholdFilter === 'minor') return alert.threshold < 10;
      return true;
    });
  }, [alerts, thresholdFilter]);

  // Get counts for each threshold level
  const counts = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter(a => a.threshold >= 15).length,
    major: alerts.filter(a => a.threshold >= 10 && a.threshold < 15).length,
    minor: alerts.filter(a => a.threshold < 10).length,
  }), [alerts]);

  return (
    <Card elevation={2}>
      <CardHeader>
        <CardTitle className="text-h4">Today's Alerts</CardTitle>
        <CardDescription className="text-body-sm">
          {isLoading ? 'Loading...' : `${filteredAlerts.length} alert${filteredAlerts.length !== 1 ? 's' : ''} ${thresholdFilter !== 'all' ? `(${counts.all} total)` : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={thresholdFilter} onValueChange={(v) => setThresholdFilter(v as ThresholdFilter)}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="critical" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Critical</span>
              <span className="sm:hidden">15%+</span>
              <span className="ml-1">({counts.critical})</span>
            </TabsTrigger>
            <TabsTrigger value="major" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Major</span>
              <span className="sm:hidden">10%+</span>
              <span className="ml-1">({counts.major})</span>
            </TabsTrigger>
            <TabsTrigger value="minor" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Minor</span>
              <span className="sm:hidden">5%+</span>
              <span className="ml-1">({counts.minor})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={thresholdFilter}>
            <div className="max-h-[450px] overflow-y-auto space-y-4 sm:space-y-5 -mx-1 px-1">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-12">
                  <div className="text-body">Loading alerts...</div>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <div className="text-body font-medium mb-2">
                    {alerts.length === 0 ? 'No alerts today' : `No ${thresholdFilter} alerts today`}
                  </div>
                  <div className="text-body-sm">
                    {alerts.length === 0
                      ? 'Alerts will appear here when thresholds are crossed'
                      : `Try viewing a different severity level`
                    }
                  </div>
                </div>
              ) : (
                filteredAlerts.map((alert) => {
              const severityVariant = getAlertSeverityVariant(alert.threshold);
              const borderColorClass = 
                severityVariant === 'critical' ? 'border-l-critical' :
                severityVariant === 'warning' ? 'border-l-warning' :
                severityVariant === 'caution' ? 'border-l-caution' :
                'border-l-success';
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "p-5 rounded-lg border-l-4 cursor-pointer hover:bg-accent/60 transition-all duration-200",
                    "bg-card border shadow-sm hover:shadow-md",
                    borderColorClass
                  )}
                  onClick={() => navigate(`/alerts?symbol=${alert.symbol}`)}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="font-semibold text-body">{alert.symbol}</span>
                        {alert.critical && (
                          <Badge variant="critical" className="text-xs px-2 py-0.5">
                            CRITICAL
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="text-body-sm text-muted-foreground">
                          <span className="font-medium">Threshold:</span> {alert.threshold}% | 
                          <span className="font-medium ml-1">Timeframe:</span> {alert.timeframe}
                        </div>
                        <div className="text-body-sm text-muted-foreground">
                          <span className="font-medium">Current:</span> ₹{parseFloat(alert.price).toFixed(2)} | 
                          <span className="font-medium ml-1">Was:</span> ₹{parseFloat(alert.historicalPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant={severityVariant} className="text-sm px-3 py-1.5 font-semibold">
                        -{parseFloat(alert.dropPercentage).toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="text-caption text-muted-foreground pt-2 border-t border-border/50">
                    {formatDate(alert.timestamp)}
                  </div>
                </div>
              );
            })
          )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

