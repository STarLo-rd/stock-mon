import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSymbolAlerts } from '../../hooks/usePrices';
import { AlertPagination } from '../alerts/AlertPagination';
import { DateRangePicker, DateRange } from '../ui/date-range-picker';
import { Alert } from '../../services/api';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface AlertHistoryProps {
  symbol: string;
}

/**
 * Alert History Component - Enhanced with filters and pagination
 * Automatically refetches alerts when symbol changes with smart caching
 */
export const AlertHistory: React.FC<AlertHistoryProps> = ({ symbol }) => {
  // Fetch more alerts to allow filtering
  const { data: alerts = [], isLoading: loading } = useSymbolAlerts(symbol, 1000);

  const [filters, setFilters] = useState({
    threshold: 'all' as 'all' | '5' | '10' | '15' | '20',
    timeframe: 'all' as 'all' | 'day' | 'week' | 'month' | 'year',
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

  // Filter alerts client-side
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    // Filter by threshold
    if (filters.threshold !== 'all') {
      filtered = filtered.filter((alert) => alert.threshold === parseInt(filters.threshold));
    }

    // Filter by timeframe
    if (filters.timeframe !== 'all') {
      filtered = filtered.filter((alert) => alert.timeframe === filters.timeframe);
    }

    // Filter by date range
    if (filters.dateRange?.from) {
      filtered = filtered.filter((alert) => {
        const alertDate = new Date(alert.timestamp);
        return alertDate >= filters.dateRange!.from!;
      });
    }
    if (filters.dateRange?.to) {
      filtered = filtered.filter((alert) => {
        const alertDate = new Date(alert.timestamp);
        return alertDate <= filters.dateRange!.to!;
      });
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
  }, [alerts, filters, sortConfig]);

  // Calculate pagination
  const paginatedAlerts = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredAlerts.slice(startIndex, endIndex);
  }, [filteredAlerts, pagination.page, pagination.pageSize]);

  const totalPages = Math.ceil(filteredAlerts.length / pagination.pageSize);

  const getThresholdColor = (threshold: number): string => {
    if (threshold >= 20) return 'bg-red-500';
    if (threshold >= 15) return 'bg-orange-500';
    if (threshold >= 10) return 'bg-yellow-500';
    return 'bg-green-500';
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
    <Card>
      <CardHeader>
        <CardTitle>Alert History</CardTitle>
        <CardDescription>
          {loading ? 'Loading...' : `${filteredAlerts.length} alert${filteredAlerts.length !== 1 ? 's' : ''} found for ${symbol}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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
              <label className="text-sm font-medium">Date Range</label>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(range) => setFilters({ ...filters, dateRange: range })}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
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
                        onClick={() => handleSort('timestamp')}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Date
                        {getSortIcon('timestamp')}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge className={cn(getThresholdColor(alert.threshold))}>
                          -{parseFloat(alert.dropPercentage).toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{alert.threshold}%</TableCell>
                      <TableCell className="capitalize">{alert.timeframe}</TableCell>
                      <TableCell>
                        {getCurrencySymbol(alert)}{parseFloat(alert.price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(alert.timestamp)}
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
  );
};

