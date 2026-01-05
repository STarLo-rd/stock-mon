import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface AlertChartsProps {
  alerts: Alert[];
}

const COLORS = {
  threshold5: '#22c55e', // green
  threshold10: '#eab308', // yellow
  threshold15: '#f97316', // orange
  threshold20: '#ef4444', // red
};

export const AlertCharts: React.FC<AlertChartsProps> = ({ alerts }) => {
  // Prepare data for trends chart (alerts over time)
  const trendsData = useMemo(() => {
    const groupedByDate = new Map<string, number>();

    alerts.forEach((alert) => {
      const date = new Date(alert.timestamp).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      groupedByDate.set(date, (groupedByDate.get(date) || 0) + 1);
    });

    return Array.from(groupedByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }, [alerts]);

  // Calculate Y-axis domain for alert trends chart
  const alertTrendsDomain = useMemo(() => {
    if (trendsData.length === 0) return [0, 10];
    
    const counts = trendsData.map((d) => d.count).filter((c) => c != null && !isNaN(c));
    if (counts.length === 0) return [0, 10];
    
    const maxCount = Math.max(...counts);
    // For count data, start at 0 but add padding at the top
    const padding = maxCount * 0.1 || 1;
    return [0, maxCount + padding];
  }, [trendsData]);

  // Calculate median count for reference line
  const medianCount = useMemo(() => {
    if (trendsData.length === 0) return null;
    
    const counts = trendsData
      .map((d) => d.count)
      .filter((c) => c != null && !isNaN(c))
      .sort((a, b) => a - b);
    
    if (counts.length === 0) return null;
    
    const mid = Math.floor(counts.length / 2);
    return counts.length % 2 === 0
      ? (counts[mid - 1] + counts[mid]) / 2
      : counts[mid];
  }, [trendsData]);

  // Prepare data for threshold distribution
  const thresholdData = useMemo(() => {
    const threshold5 = alerts.filter((a) => a.threshold === 5).length;
    const threshold10 = alerts.filter((a) => a.threshold === 10).length;
    const threshold15 = alerts.filter((a) => a.threshold === 15).length;
    const threshold20 = alerts.filter((a) => a.threshold >= 20).length;

    return [
      { name: '5%', value: threshold5, color: COLORS.threshold5 },
      { name: '10%', value: threshold10, color: COLORS.threshold10 },
      { name: '15%', value: threshold15, color: COLORS.threshold15 },
      { name: '20%+', value: threshold20, color: COLORS.threshold20 },
    ].filter((item) => item.value > 0);
  }, [alerts]);

  // Prepare data for timeframe distribution
  const timeframeData = useMemo(() => {
    const day = alerts.filter((a) => a.timeframe === 'day').length;
    const week = alerts.filter((a) => a.timeframe === 'week').length;
    const month = alerts.filter((a) => a.timeframe === 'month').length;
    const year = alerts.filter((a) => a.timeframe === 'year').length;

    return [
      { name: 'Day', value: day },
      { name: 'Week', value: week },
      { name: 'Month', value: month },
      { name: 'Year', value: year },
    ];
  }, [alerts]);


  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Insights</CardTitle>
          <CardDescription>Charts and visualizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No alerts to display charts
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      {/* Alert Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Trends</CardTitle>
          <CardDescription>Alerts over time (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={alertTrendsDomain}
                tick={{ fontSize: 10 }} 
              />
              <Tooltip />
              {medianCount !== null && (
                <ReferenceLine
                  y={medianCount}
                  stroke="#888888"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: `Median: ${Math.round(medianCount)}`,
                    position: 'right',
                    fill: '#666',
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                strokeWidth={2}
                name="Alerts"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Threshold Distribution</CardTitle>
          <CardDescription>Alerts by threshold level</CardDescription>
        </CardHeader>
        <CardContent>
          {thresholdData.length > 0 ? (
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                  data={thresholdData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${((entry.percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {thresholdData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No threshold data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeframe Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Timeframe Distribution</CardTitle>
          <CardDescription>Alerts by comparison timeframe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeframeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" name="Alerts" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

