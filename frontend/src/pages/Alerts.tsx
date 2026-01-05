import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAlerts } from '../hooks/usePrices';
import { AlertStats } from '../components/alerts/AlertStats';
import { AlertCharts } from '../components/alerts/AlertCharts';
import { AlertPagination } from '../components/alerts/AlertPagination';
import { DateRangePicker, DateRange } from '../components/ui/date-range-picker';
import { exportAlertsToCSV, exportAlertsToJSON } from '../utils/export';
import { Download, FileDown, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { useMarket } from '@/components/market-provider';
import { getAlertSeverityVariant } from '@/lib/utils';

/**
 * Alerts Page - Enhanced with statistics, charts, and advanced filtering
 * Automatically refetches every 30 seconds with smart caching
 */
const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { market: contextMarket } = useMarket();
  
  const [filters, setFilters] = useState({
    market: 'all' as 'all' | 'INDIA',
    threshold: 'all' as 'all' | '5' | '10' | '15' | '20',
    timeframe: 'all' as 'all' | 'day' | 'week' | 'month' | 'year',
    symbol: '',
    criticalOnly: false,
    dateRange: undefined as DateRange | undefined,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
  });

  const [sortConfig, setSortConfig] = useState<{
    column: keyof Alert | null;
    direction: 'asc' | 'desc';
  }>({
    column: 'timestamp',
    direction: 'desc',
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filters]);

  // Build query params from filters
  const queryParams = useMemo(() => {
    const params: any = { limit: 1000 }; // Increased limit for stats/charts
    
    // Market filter - use context market if 'all' is selected
    if (filters.market !== 'all') {
      params.market = filters.market;
    } else if (contextMarket) {
      params.market = contextMarket;
    }
    
    if (filters.threshold && filters.threshold !== 'all') {
      params.threshold = parseInt(filters.threshold);
    }
    if (filters.timeframe && filters.timeframe !== 'all') {
      params.timeframe = filters.timeframe;
    }
    if (filters.symbol) {
      params.symbol = filters.symbol;
    }
    if (filters.criticalOnly) {
      params.critical = true;
    }
    if (filters.dateRange?.from) {
      params.startDate = filters.dateRange.from.toISOString();
    }
    if (filters.dateRange?.to) {
      params.endDate = filters.dateRange.to.toISOString();
    }
    
    return params;
  }, [filters, contextMarket]);

  // Use React Query hook - automatically handles caching and refetching
  const { data: alertsData, isLoading: loading } = useAlerts(queryParams);
  const alerts = alertsData || [];

  // Filter and sort alerts client-side
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (filters.symbol) {
      filtered = filtered.filter((alert) =>
        alert.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
      );
    }
    
    // Apply sorting
    if (sortConfig.column) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.column!];
        const bValue = b[sortConfig.column!];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        let comparison = 0;
        
        // Handle Date objects
        if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        }
        // Handle numeric values
        else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        }
        // Handle string values (check if numeric strings)
        else if (typeof aValue === 'string' && typeof bValue === 'string') {
          const aNum = parseFloat(aValue);
          const bNum = parseFloat(bValue);
          // If both are valid numbers, compare numerically
          if (!isNaN(aNum) && !isNaN(bNum)) {
            comparison = aNum - bNum;
          } else {
            // Otherwise compare as strings
            comparison = aValue.localeCompare(bValue);
          }
        }
        // Handle boolean values
        else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [alerts, filters.symbol, sortConfig]);

  // Calculate pagination
  const paginatedAlerts = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredAlerts.slice(startIndex, endIndex);
  }, [filteredAlerts, pagination.page, pagination.pageSize]);

  const totalPages = Math.ceil(filteredAlerts.length / pagination.pageSize);

  // Use semantic badge variant instead of color class
  const getThresholdVariant = (threshold: number) => {
    return getAlertSeverityVariant(threshold);
  };

  /**
   * Format date without timezone conversion - displays UTC time as stored in DB
   * @param date - Date object or ISO string
   * @returns Formatted date string in DD/MM/YYYY, HH:MM:SS format
   */
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Format as UTC to avoid timezone conversion
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  };

  const getCurrencySymbol = (_alert: Alert): string => {
    return '₹';
  };

  const handleExportCSV = () => {
    exportAlertsToCSV(filteredAlerts);
  };

  const handleExportJSON = () => {
    exportAlertsToJSON(filteredAlerts);
  };

  /**
   * Handle column sorting
   * @param column - Column name to sort by
   */
  const handleSort = (column: keyof Alert) => {
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
  const getSortIcon = (column: keyof Alert) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 sm:text-display-sm font-bold tracking-tight">Alerts</h1>
          <p className="text-body-sm sm:text-body text-muted-foreground mt-2">
            View and filter crash alerts history with insights and analytics
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex-1 sm:flex-initial">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button variant="outline" onClick={handleExportJSON} className="flex-1 sm:flex-initial">
            <FileDown className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export JSON</span>
            <span className="sm:hidden">JSON</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <AlertStats alerts={filteredAlerts} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter alerts by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Market</label>
              <Select
                value={filters.market}
                onValueChange={(value: 'all' | 'INDIA') =>
                  setFilters({ ...filters, market: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All markets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All markets</SelectItem>
                  <SelectItem value="INDIA">India (NSE)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Threshold</label>
              <Select
                value={filters.threshold}
                onValueChange={(value: 'all' | '5' | '10' | '15' | '20') =>
                  setFilters({ ...filters, threshold: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All thresholds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All thresholds</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Timeframe</label>
              <Select
                value={filters.timeframe}
                onValueChange={(value: 'all' | 'day' | 'week' | 'month' | 'year') =>
                  setFilters({ ...filters, timeframe: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All timeframes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All timeframes</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Symbol</label>
              <Input
                placeholder="Filter by symbol"
                value={filters.symbol}
                onChange={(e) => setFilters({ ...filters, symbol: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(range) => setFilters({ ...filters, dateRange: range })}
              />
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="critical-only"
                checked={filters.criticalOnly}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, criticalOnly: checked === true })
                }
              />
              <label
                htmlFor="critical-only"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Critical alerts only (20%+)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredAlerts.length} alert${filteredAlerts.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-lg font-medium mb-2">No alerts found</div>
              <div className="text-sm">Try adjusting your filters to see more results</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => handleSort('symbol')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Symbol
                          {getSortIcon('symbol')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('dropPercentage')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Drop %
                          {getSortIcon('dropPercentage')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('threshold')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Threshold
                          {getSortIcon('threshold')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('timeframe')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Timeframe
                          {getSortIcon('timeframe')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('price')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Price
                          {getSortIcon('price')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('historicalPrice')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Historical
                          {getSortIcon('historicalPrice')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('timestamp')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Date
                          {getSortIcon('timestamp')}
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAlerts.map((alert) => (
                      <TableRow key={alert.id} className="hover:bg-accent">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {alert.symbol}
                            {alert.critical && (
                              <Badge variant="destructive" className="text-xs">
                                CRITICAL
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getThresholdVariant(alert.threshold)}>
                            -{parseFloat(alert.dropPercentage).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{alert.threshold}%</TableCell>
                        <TableCell className="capitalize">{alert.timeframe}</TableCell>
                        <TableCell>
                          {getCurrencySymbol(alert)}{parseFloat(alert.price).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getCurrencySymbol(alert)}{parseFloat(alert.historicalPrice).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(alert.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/symbol/${alert.symbol}`)}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <AlertPagination
                currentPage={pagination.page}
                totalPages={totalPages}
                totalItems={filteredAlerts.length}
                itemsPerPage={pagination.pageSize}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
                onPageSizeChange={(size) => setPagination({ page: 1, pageSize: size })}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <AlertCharts alerts={filteredAlerts} />
    </div>
  );
};

export default Alerts;
