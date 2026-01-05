import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useCurrentPrices } from '../../hooks/usePrices';

/**
 * Price Overview Component - Optimized with React Query
 * Automatically refetches prices every 30 seconds with smart caching
 */
export const PriceOverview: React.FC = () => {
  const navigate = useNavigate();
  
  // Use React Query hook - automatically handles caching, refetching, and deduplication
  const { data: prices = [], isLoading: loading } = useCurrentPrices();

  const handleSymbolClick = (symbol: string) => {
    navigate(`/symbol/${symbol}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Prices</CardTitle>
          <CardDescription>Real-time NAV and stock values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Prices</CardTitle>
        <CardDescription>Real-time NAV and stock values</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <span>No price data available</span>
                      <span className="text-xs">Prices will appear once market data is fetched</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                prices.map((item: any) => (
                  <TableRow
                    key={item.symbol}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSymbolClick(item.symbol)}
                  >
                    <TableCell className="font-medium">
                      {item.type === 'MUTUAL_FUND' && item.name ? (
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            Scheme Code: {item.symbol}
                          </span>
                        </div>
                      ) : (
                        item.symbol
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {item.price != null ? `₹${item.price.toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.source}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

