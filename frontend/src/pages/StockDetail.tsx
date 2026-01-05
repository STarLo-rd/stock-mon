import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PriceChart } from '../components/stock/PriceChart';
import { PriceInfo } from '../components/stock/PriceInfo';
import { AlertHistory } from '../components/stock/AlertHistory';
import { useSymbolData } from '../hooks/usePrices';

/**
 * Stock Detail Page - Optimized with React Query
 * Automatically refetches symbol data with smart caching
 */
const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  
  // Use React Query hook - automatically handles caching and refetching
  const { data: symbolData, isLoading: loading } = useSymbolData(symbol ?? '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!symbolData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              Symbol not found
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="self-start">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1">
          <div className="flex-1">
            {symbolData.type === 'MUTUAL_FUND' && symbolData.name ? (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{symbolData.name}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-mono">
                  Scheme Code: {symbolData.symbol}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{symbolData.symbol}</h1>
                {symbolData.name && (
                  <p className="text-base sm:text-lg text-muted-foreground mt-1">{symbolData.name}</p>
                )}
              </>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={
                symbolData.type === 'INDEX' ? 'default' :
                symbolData.type === 'MUTUAL_FUND' ? 'outline' :
                'secondary'
              }>
                {symbolData.type === 'MUTUAL_FUND' ? 'Mutual Fund' : symbolData.type}
              </Badge>
              <Badge variant={symbolData.active ? 'default' : 'secondary'}>
                {symbolData.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          {symbolData.currentPrice != null && (
            <div className="sm:ml-auto">
              <div className="text-2xl sm:text-3xl font-bold">
                ₹{symbolData.currentPrice.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {symbolData.type === 'MUTUAL_FUND' ? 'Current NAV' : 'Current Price'}
              </p>
            </div>
          )}
        </div>
      </div>

      {symbol && (
        <>
          <PriceInfo symbolData={symbolData} />
          <PriceChart symbol={symbol} />
          <AlertHistory symbol={symbol} />
        </>
      )}
    </div>
  );
};

export default StockDetail;

