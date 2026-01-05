import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceInfoProps {
  symbolData: {
    symbol: string;
    market?: 'INDIA' | 'USA';
    currentPrice?: number;
    historicalPrices?: {
      day: number | null;
      week: number | null;
      month: number | null;
      threeMonth: number | null;
      sixMonth: number | null;
      year: number | null;
    };
  };
}

export const PriceInfo: React.FC<PriceInfoProps> = ({ symbolData }) => {
  const currentPrice = symbolData.currentPrice ?? 0;
  const historical = symbolData.historicalPrices;
  const currencySymbol = '₹';

  const calculateChange = (historicalPrice: number | null | undefined): { value: number; percent: number } | null => {
    if (!historicalPrice || historicalPrice === 0 || !currentPrice) return null;
    const change = currentPrice - historicalPrice;
    const percent = (change / historicalPrice) * 100;
    return { value: change, percent };
  };

  const dayChange = calculateChange(historical?.day);
  const weekChange = calculateChange(historical?.week);
  const monthChange = calculateChange(historical?.month);
  const threeMonthChange = calculateChange(historical?.threeMonth);
  const sixMonthChange = calculateChange(historical?.sixMonth);
  const yearChange = calculateChange(historical?.year);

  return (
    <div className="space-y-4">
      {/* Historical Comparisons Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {dayChange && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">vs Yesterday</CardTitle>
              {dayChange.value >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={cn(
                  "text-2xl font-bold",
                  dayChange.percent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {dayChange.percent >= 0 ? '+' : ''}{dayChange.percent.toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencySymbol}{historical?.day?.toFixed(2)}
                </div>
              </div>
              <p className={cn(
                "text-xs mt-1",
                dayChange.value >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {dayChange.value >= 0 ? '+' : ''}{currencySymbol}{dayChange.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {weekChange && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">vs 1 Week Ago</CardTitle>
              {weekChange.value >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={cn(
                  "text-2xl font-bold",
                  weekChange.percent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {weekChange.percent >= 0 ? '+' : ''}{weekChange.percent.toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencySymbol}{historical?.week?.toFixed(2)}
                </div>
              </div>
              <p className={cn(
                "text-xs mt-1",
                weekChange.value >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {weekChange.value >= 0 ? '+' : ''}{currencySymbol}{weekChange.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {monthChange && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">vs 1 Month Ago</CardTitle>
              {monthChange.value >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={cn(
                  "text-2xl font-bold",
                  monthChange.percent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {monthChange.percent >= 0 ? '+' : ''}{monthChange.percent.toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencySymbol}{historical?.month?.toFixed(2)}
                </div>
              </div>
              <p className={cn(
                "text-xs mt-1",
                monthChange.value >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {monthChange.value >= 0 ? '+' : ''}{currencySymbol}{monthChange.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {threeMonthChange && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">vs 3 Months Ago</CardTitle>
              {threeMonthChange.value >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={cn(
                  "text-2xl font-bold",
                  threeMonthChange.percent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {threeMonthChange.percent >= 0 ? '+' : ''}{threeMonthChange.percent.toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencySymbol}{historical?.threeMonth?.toFixed(2)}
                </div>
              </div>
              <p className={cn(
                "text-xs mt-1",
                threeMonthChange.value >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {threeMonthChange.value >= 0 ? '+' : ''}{currencySymbol}{threeMonthChange.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {sixMonthChange && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">vs 6 Months Ago</CardTitle>
              {sixMonthChange.value >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={cn(
                  "text-2xl font-bold",
                  sixMonthChange.percent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {sixMonthChange.percent >= 0 ? '+' : ''}{sixMonthChange.percent.toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencySymbol}{historical?.sixMonth?.toFixed(2)}
                </div>
              </div>
              <p className={cn(
                "text-xs mt-1",
                sixMonthChange.value >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {sixMonthChange.value >= 0 ? '+' : ''}{currencySymbol}{sixMonthChange.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {yearChange && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">vs 1 Year Ago</CardTitle>
              {yearChange.value >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={cn(
                  "text-2xl font-bold",
                  yearChange.percent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {yearChange.percent >= 0 ? '+' : ''}{yearChange.percent.toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {currencySymbol}{historical?.year?.toFixed(2)}
                </div>
              </div>
              <p className={cn(
                "text-xs mt-1",
                yearChange.value >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {yearChange.value >= 0 ? '+' : ''}{currencySymbol}{yearChange.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

