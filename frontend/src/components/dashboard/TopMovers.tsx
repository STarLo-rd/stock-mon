import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTopMovers } from '@/hooks/usePrices';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

/**
 * Top Movers Component
 * Displays top gainers and losers
 */
export const TopMovers: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1D');
  const { data, isLoading } = useTopMovers(timeframe);
  const navigate = useNavigate();

  const currencySymbol = '₹';
  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];

  const handleSymbolClick = (symbol: string) => {
    navigate(`/symbol/${symbol}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Top Movers</CardTitle>
            <CardDescription>Biggest price changes</CardDescription>
          </div>
          <Tabs value={timeframe} onValueChange={setTimeframe}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="1D" className="text-xs sm:text-sm">1D</TabsTrigger>
              <TabsTrigger value="1W" className="text-xs sm:text-sm">1W</TabsTrigger>
              <TabsTrigger value="1M" className="text-xs sm:text-sm">1M</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {/* Top Gainers */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h3 className="font-semibold text-sm sm:text-base">Top Gainers</h3>
              </div>
              {gainers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No gainers data</div>
              ) : (
                <div className="space-y-2">
                  {gainers.slice(0, 5).map((mover, index) => (
                    <div
                      key={mover.symbol}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSymbolClick(mover.symbol)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-6">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          {mover.type === 'MUTUAL_FUND' && mover.name ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-sm truncate">{mover.name}</span>
                              <span className="text-xs text-muted-foreground font-mono truncate">
                                Scheme Code: {mover.symbol}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-sm truncate">
                                {mover.symbol}
                              </div>
                              {mover.name && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {mover.name}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {currencySymbol}{mover.currentPrice.toFixed(2)}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              mover.changePercent >= 0
                                ? 'text-green-600 border-green-600'
                                : 'text-red-600 border-red-600'
                            )}
                          >
                            {mover.changePercent >= 0 ? '+' : ''}
                            {mover.changePercent.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Losers */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm sm:text-base">Top Losers</h3>
              </div>
              {losers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No losers data</div>
              ) : (
                <div className="space-y-2">
                  {losers.slice(0, 5).map((mover, index) => (
                    <div
                      key={mover.symbol}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSymbolClick(mover.symbol)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-6">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          {mover.type === 'MUTUAL_FUND' && mover.name ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-sm truncate">{mover.name}</span>
                              <span className="text-xs text-muted-foreground font-mono truncate">
                                Scheme Code: {mover.symbol}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-sm truncate">
                                {mover.symbol}
                              </div>
                              {mover.name && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {mover.name}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {currencySymbol}{mover.currentPrice.toFixed(2)}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              mover.changePercent >= 0
                                ? 'text-green-600 border-green-600'
                                : 'text-red-600 border-red-600'
                            )}
                          >
                            {mover.changePercent >= 0 ? '+' : ''}
                            {mover.changePercent.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


