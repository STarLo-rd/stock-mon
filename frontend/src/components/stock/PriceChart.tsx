import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  TooltipProps,
} from 'recharts';
import { useSymbolPrices } from '../../hooks/usePrices';

interface PriceChartProps {
  symbol: string;
}

/**
 * Custom tooltip component with investment advice
 */
interface CustomTooltipProps extends TooltipProps<number, string> {
  medianPrice: number | null;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, medianPrice }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const price = payload[0]?.value as number;
  if (price === undefined || medianPrice === null) {
    return (
      <div className="bg-white border border-gray-300 rounded p-2 shadow-lg">
        <p className="text-sm font-medium">{`Date: ${label}`}</p>
        <p className="text-sm">{`Price: ₹${price?.toFixed(2) ?? 'N/A'}`}</p>
      </div>
    );
  }

  const isNearMedian = Math.abs(price - medianPrice) / medianPrice < 0.05;
  const isBelowMedian = price <= medianPrice;

  let investmentAdvice = '';
  if (isBelowMedian) {
    investmentAdvice = '💡 Good entry point: Investing at or below median can yield higher returns';
  } else if (isNearMedian) {
    investmentAdvice = '💡 Consider investing: Price near median offers balanced opportunity';
  }

  return (
    <div className="bg-white border border-gray-300 rounded p-2 shadow-lg max-w-[220px]">
      <p className="text-sm font-medium mb-1">{`Date: ${label}`}</p>
      <p className="text-sm font-semibold mb-1">{`Price: ₹${price.toFixed(2)}`}</p>
      {investmentAdvice && (
        <p className="text-xs text-green-600 mt-2 pt-2 border-t border-gray-200">
          {investmentAdvice}
        </p>
      )}
    </div>
  );
};

/**
 * Price Chart Component - Optimized with React Query
 * Automatically refetches chart data when timeframe changes with smart caching
 */
export const PriceChart: React.FC<PriceChartProps> = ({ symbol }) => {
  const [timeframe, setTimeframe] = useState('1M');
  
  // Use React Query hook - automatically handles caching and refetching
  const { data: chartData = [], isLoading: loading } = useSymbolPrices(symbol, timeframe);

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const formattedChartData = chartData.map((item) => ({
    date: formatDate(item.timestamp),
    price: item.price,
    timestamp: item.timestamp,
  }));

  // Calculate Y-axis domain based on data range with padding
  const yAxisDomain = useMemo(() => {
    if (formattedChartData.length === 0) return [0, 100];
    
    const prices = formattedChartData.map((d) => d.price).filter((p) => p != null && !isNaN(p));
    if (prices.length === 0) return [0, 100];
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    
    // Add 10% padding above and below
    const padding = range * 0.1 || maxPrice * 0.1;
    const domainMin = Math.max(0, minPrice - padding);
    const domainMax = maxPrice + padding;
    
    return [domainMin, domainMax];
  }, [formattedChartData]);

  // Calculate median price for reference line
  const medianPrice = useMemo(() => {
    if (formattedChartData.length === 0) return null;
    
    const prices = formattedChartData
      .map((d) => d.price)
      .filter((p) => p != null && !isNaN(p))
      .sort((a, b) => a - b);
    
    if (prices.length === 0) return null;
    
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 === 0
      ? (prices[mid - 1] + prices[mid]) / 2
      : prices[mid];
  }, [formattedChartData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price History</CardTitle>
        <CardDescription>Historical price data for {symbol}</CardDescription>
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
            {loading ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
            ) : formattedChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="text-muted-foreground">No data available</div>
              </div>
            ) : (
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yAxisDomain}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip medianPrice={medianPrice} />} />
                  {medianPrice !== null && (
                    <ReferenceLine
                      y={medianPrice}
                      stroke="#888888"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: `Median: ₹${medianPrice.toFixed(2)} 💡`,
                        position: 'right',
                        fill: '#666',
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

