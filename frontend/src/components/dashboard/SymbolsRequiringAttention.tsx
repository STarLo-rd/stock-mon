import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Building2, BarChart3, AlertTriangle, Activity, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSymbolsRequiringAttention } from '../../hooks/usePrices';
import { cn } from '@/lib/utils';

/**
 * Symbols Requiring Attention Component
 * Shows symbols that need monitoring: approaching thresholds, recent alerts, high volatility
 */
type SortableColumn = 'symbol' | 'currentPrice' | 'changePercent' | 'severity';

interface SortConfig {
  column: SortableColumn | null;
  direction: 'asc' | 'desc';
}

export const SymbolsRequiringAttention: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'INDEX' | 'STOCK' | 'MUTUAL_FUND' | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc',
  });
  const navigate = useNavigate();

  const { data: symbols = [], isLoading } = useSymbolsRequiringAttention(selectedType);

  const handleSymbolClick = (symbol: string) => {
    navigate(`/symbol/${symbol}`);
  };

  const getSeverityVariant = (severity: 'low' | 'medium' | 'high'): 'critical' | 'warning' | 'caution' => {
    if (severity === 'high') return 'critical';
    if (severity === 'medium') return 'warning';
    return 'caution';
  };

  const getReasonIcon = (reason: string) => {
    if (reason === 'recent_alert') return <AlertTriangle className="h-4 w-4" />;
    if (reason === 'approaching_threshold') return <TrendingDown className="h-4 w-4" />;
    if (reason === 'high_volatility') return <Activity className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  const getReasonLabel = (reason: string) => {
    if (reason === 'recent_alert') return 'Alert';
    if (reason === 'approaching_threshold') return 'Warning';
    if (reason === 'high_volatility') return 'Volatile';
    return 'Move';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'INDEX') return <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    if (type === 'MUTUAL_FUND') return <BarChart3 className="h-5 w-5 text-purple-500 flex-shrink-0" />;
    return <Building2 className="h-5 w-5 text-green-600 flex-shrink-0" />;
  };

  /**
   * Handle column sorting
   * @param column - Column name to sort by
   */
  const handleSort = (column: SortableColumn) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  /**
   * Get sort icon for table header
   * @param column - Column name
   * @returns Sort icon component
   */
  const getSortIcon = (column: SortableColumn) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  /**
   * Get severity sort value for comparison
   */
  const getSeverityValue = (severity: 'low' | 'medium' | 'high'): number => {
    if (severity === 'high') return 3;
    if (severity === 'medium') return 2;
    return 1;
  };

  // Sort symbols based on sortConfig
  const sortedSymbols = useMemo(() => {
    if (!sortConfig.column) return symbols;

    return [...symbols].sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.column) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'currentPrice':
          comparison = a.currentPrice - b.currentPrice;
          break;
        case 'changePercent':
          comparison = a.changePercent - b.changePercent;
          break;
        case 'severity':
          comparison = getSeverityValue(a.severity) - getSeverityValue(b.severity);
          break;
        default:
          return 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [symbols, sortConfig]);

  return (
    <Card elevation={2}>
      <CardHeader>
        <CardTitle className="text-h4">Symbols Requiring Attention</CardTitle>
        <CardDescription className="text-body-sm">
          Symbols with recent alerts, approaching thresholds, or unusual activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedType ?? 'all'} onValueChange={(v) => setSelectedType(v === 'all' ? undefined : v as 'INDEX' | 'STOCK' | 'MUTUAL_FUND')}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="INDEX" className="text-xs sm:text-sm">Indices</TabsTrigger>
            <TabsTrigger value="MUTUAL_FUND" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Mutual Funds</span>
              <span className="sm:hidden">MF</span>
            </TabsTrigger>
            <TabsTrigger value="STOCK" className="text-xs sm:text-sm">Stocks</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedType ?? 'all'}>
            {isLoading ? (
              <div className="text-center text-muted-foreground py-12">Loading...</div>
            ) : symbols.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <div className="flex flex-col items-center gap-3">
                  <Activity className="h-10 w-10 opacity-50" />
                  <span className="text-body">No symbols requiring attention</span>
                  <span className="text-body-sm">All symbols are performing normally</span>
                </div>
              </div>
            ) : (
              <div className="max-h-[450px] overflow-y-auto -mx-1 px-1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="min-w-[140px]">
                        <button
                          onClick={() => handleSort('symbol')}
                          className="flex items-center justify-center mx-auto hover:text-foreground transition-colors"
                        >
                          Symbol
                          {getSortIcon('symbol')}
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[100px]">
                        <button
                          onClick={() => handleSort('currentPrice')}
                          className="flex items-center justify-center mx-auto hover:text-foreground transition-colors"
                        >
                          Price
                          {getSortIcon('currentPrice')}
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[100px]">
                        <button
                          onClick={() => handleSort('changePercent')}
                          className="flex items-center justify-center mx-auto hover:text-foreground transition-colors"
                        >
                          Change
                          {getSortIcon('changePercent')}
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[180px] text-center">Reason</TableHead>
                      <TableHead className="min-w-[100px]">
                        <button
                          onClick={() => handleSort('severity')}
                          className="flex items-center justify-center mx-auto hover:text-foreground transition-colors"
                        >
                          Severity
                          {getSortIcon('severity')}
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSymbols.map((symbol) => (
                      <TableRow
                        key={symbol.symbol}
                        className="cursor-pointer hover:bg-accent/60 transition-colors"
                        onClick={() => handleSymbolClick(symbol.symbol)}
                      >
                        <TableCell className="font-medium">
                          {symbol.type === 'MUTUAL_FUND' && symbol.name ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="flex-shrink-0 mt-0.5">
                                  {getTypeIcon(symbol.type)}
                                </div>
                                <span className="text-body-sm font-semibold break-words min-w-0 flex-1">{symbol.name}</span>
                              </div>
                              <span className="text-caption text-muted-foreground font-mono ml-8">
                                {symbol.symbol}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {getTypeIcon(symbol.type)}
                              <span className="text-body-sm">{symbol.symbol}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-body-sm">
                          ₹{symbol.currentPrice.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-mono px-2 py-1',
                              symbol.changePercent >= 0
                                ? 'text-green-600 border-green-600 bg-green-50 dark:bg-green-950/20'
                                : 'text-red-600 border-red-600 bg-red-50 dark:bg-red-950/20'
                            )}
                          >
                            {symbol.changePercent >= 0 ? '+' : ''}
                            {symbol.changePercent.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex-shrink-0">
                              {getReasonIcon(symbol.reason)}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-body-sm font-medium">{getReasonLabel(symbol.reason)}</span>
                              <span className="text-caption text-muted-foreground line-clamp-2">{symbol.details}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getSeverityVariant(symbol.severity)}
                            className="text-xs px-2.5 py-1"
                          >
                            {symbol.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
