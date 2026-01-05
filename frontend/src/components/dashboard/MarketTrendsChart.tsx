import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from 'recharts';
import { useMarketTrends } from '@/hooks/usePrices';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Custom tooltip component with investment advice for market trends
 */
interface CustomTrendsTooltipProps extends TooltipProps<number, string> {
  medianIndex: number | null;
}

const CustomTrendsTooltip: React.FC<CustomTrendsTooltipProps> = ({ active, payload, label, medianIndex }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const indexValue = payload[0]?.value as number;
  if (indexValue === undefined || medianIndex === null) {
    return (
      <div className="bg-white border border-gray-300 rounded p-2 shadow-lg">
        <p className="text-sm font-medium">{`Date: ${label}`}</p>
        <p className="text-sm">{`Index: ${indexValue?.toFixed(2) ?? 'N/A'}`}</p>
      </div>
    );
  }

  const isNearMedian = Math.abs(indexValue - medianIndex) / medianIndex < 0.05;
  const isBelowMedian = indexValue <= medianIndex;

  let investmentAdvice = '';
  if (isBelowMedian) {
    investmentAdvice = '💡 Good entry point: Investing at or below median can yield higher returns';
  } else if (isNearMedian) {
    investmentAdvice = '💡 Consider investing: Price near median offers balanced opportunity';
  }

  return (
    <div className="bg-white border border-gray-300 rounded p-2 shadow-lg max-w-[220px]">
      <p className="text-sm font-medium mb-1">{`Date: ${label}`}</p>
      <p className="text-sm font-semibold mb-1">{`Index: ${indexValue.toFixed(2)}`}</p>
      {investmentAdvice && (
        <p className="text-xs text-green-600 mt-2 pt-2 border-t border-gray-200">
          {investmentAdvice}
        </p>
      )}
    </div>
  );
};

/**
 * Market Trends Chart Component
 * Shows aggregate price movements over time
 */
export const MarketTrendsChart: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1M');
  const { data: trends = [], isLoading } = useMarketTrends(timeframe);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const chartData = trends.map((trend) => ({
    date: formatDate(trend.date),
    index: Math.round(trend.index * 100) / 100,
    changePercent: Math.round(trend.changePercent * 100) / 100,
  }));

  const latestTrend = trends[trends.length - 1];
  const firstTrend = trends[0];
  const overallChange = latestTrend && firstTrend
    ? ((latestTrend.index - firstTrend.index) / firstTrend.index) * 100
    : 0;

  // Calculate Y-axis domain based on data range with padding
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    const indices = chartData.map((d) => d.index).filter((i) => i != null && !isNaN(i));
    if (indices.length === 0) return [0, 100];
    
    const minIndex = Math.min(...indices);
    const maxIndex = Math.max(...indices);
    const range = maxIndex - minIndex;
    
    // Add 10% padding above and below
    const padding = range * 0.1 || maxIndex * 0.1;
    const domainMin = Math.max(0, minIndex - padding);
    const domainMax = maxIndex + padding;
    
    return [domainMin, domainMax];
  }, [chartData]);

  // Calculate median index for reference line
  const medianIndex = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const indices = chartData
      .map((d) => d.index)
      .filter((i) => i != null && !isNaN(i))
      .sort((a, b) => a - b);
    
    if (indices.length === 0) return null;
    
    const mid = Math.floor(indices.length / 2);
    return indices.length % 2 === 0
      ? (indices[mid - 1] + indices[mid]) / 2
      : indices[mid];
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Price Trends</CardTitle>
            <CardDescription>Aggregate market price movements</CardDescription>
          </div>
          {latestTrend && (
            <div className="flex items-center gap-2">
              {overallChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={cn(
                  'text-sm font-semibold',
                  overallChange >= 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {overallChange >= 0 ? '+' : ''}
                {overallChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={timeframe} onValueChange={setTimeframe}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="1W" className="text-xs sm:text-sm">1W</TabsTrigger>
            <TabsTrigger value="1M" className="text-xs sm:text-sm">1M</TabsTrigger>
            <TabsTrigger value="3M" className="text-xs sm:text-sm">3M</TabsTrigger>
            <TabsTrigger value="6M" className="text-xs sm:text-sm">6M</TabsTrigger>
            <TabsTrigger value="1Y" className="text-xs sm:text-sm">1Y</TabsTrigger>
          </TabsList>
          <TabsContent value={timeframe} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="text-muted-foreground">Loading trends...</div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="text-muted-foreground">No trend data available</div>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={yAxisDomain}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value.toFixed(0)}
                    />
                    <Tooltip content={<CustomTrendsTooltip medianIndex={medianIndex} />} />
                    {medianIndex !== null && (
                      <ReferenceLine
                        y={medianIndex}
                        stroke="#888888"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                        label={{
                          value: `Median: ${medianIndex.toFixed(2)} 💡`,
                          position: 'right',
                          fill: '#666',
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="index"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                      name="Price Index"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};


