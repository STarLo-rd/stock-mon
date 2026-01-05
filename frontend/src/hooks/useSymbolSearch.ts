import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface SymbolSuggestion {
  symbol: string;
  name?: string;
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  exchange: string;
}

/**
 * Custom debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for searching symbols with debouncing
 * Only searches if query length >= 2
 */
export function useSymbolSearch(query: string, type?: 'INDEX' | 'STOCK' | 'MUTUAL_FUND') {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['symbols', 'search', debouncedQuery, type],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }
      const response = await api.symbols.search(debouncedQuery, type);
      return response.data || [];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}

