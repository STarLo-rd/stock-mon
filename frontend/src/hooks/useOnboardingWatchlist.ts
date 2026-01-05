import { useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateWatchlist, useWatchlist, useWatchlists, useRemoveFromWatchlist } from './usePrices';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { useMarket } from '../components/market-provider';
import { toast } from './use-toast';

/**
 * Custom hook for managing watchlist operations during onboarding
 * Simplifies watchlist state management and provides clean API
 */
export function useOnboardingWatchlist(assetType: 'STOCK' | 'MUTUAL_FUND') {
  const { market } = useMarket();
  const queryClient = useQueryClient();

  // Fetch existing watchlists for the current asset type
  const { data: existingWatchlists = [], isLoading: loadingWatchlists, error: watchlistError } = useWatchlists(assetType);

  // Find the watchlist matching the current asset type
  const currentWatchlist = useMemo(() => {
    return existingWatchlists.find(w => w.type === assetType) ?? null;
  }, [existingWatchlists, assetType]);

  const watchlistId = currentWatchlist?.id ?? null;

  // Fetch watchlist items
  // Query automatically runs when watchlistId is set (enabled: !!watchlistId)
  const { 
    data: watchlistItems = [], 
    isLoading: loadingItems,
    refetch: refetchItems
  } = useWatchlist(watchlistId, false);

  const createWatchlistMutation = useCreateWatchlist();
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  // Optimistic add mutation with proper cache updates
  const addToWatchlistMutation = useMutation({
    mutationFn: async ({
      watchlistId: targetWatchlistId,
      symbol,
      type,
      name,
    }: {
      watchlistId: string;
      symbol: string;
      type: 'STOCK' | 'MUTUAL_FUND';
      name?: string;
    }) => {
      const response = await api.watchlist.add(
        targetWatchlistId,
        symbol,
        type,
        undefined,
        market,
        name
      );
      return response.data;
    },
    onMutate: async ({ watchlistId: targetWatchlistId, symbol, name, type }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['watchlist', targetWatchlistId] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(['watchlist', targetWatchlistId, false, market]);

      // Optimistically update cache
      queryClient.setQueryData(['watchlist', targetWatchlistId, false, market], (old: any[] = []) => {
        // Check if item already exists
        if (old.some(item => item.symbol === symbol)) {
          return old;
        }
        // Add new item optimistically with proper structure
        return [...old, {
          id: `temp-${Date.now()}`,
          symbol,
          name: name ?? symbol,
          exchange: '',
          type,
          active: true,
          watchlistId: targetWatchlistId,
          order: old.length,
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
      });

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['watchlist', variables.watchlistId, false, market],
          context.previousItems
        );
      }
      
      const errorData = (err as any).response?.data;
      const errorMsg = errorData?.error ?? 'Failed to add asset';
      
      if (errorData?.limitReached) {
        toast({
          variant: 'destructive',
          title: '⚠️ Limit Reached',
          description: `${errorMsg} You can remove some existing items to add new ones.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: '❌ Error',
          description: errorMsg,
        });
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({
        queryKey: ['watchlist', variables.watchlistId],
      });
      queryClient.invalidateQueries({
        queryKey: ['watchlists', variables.type, market],
      });
      queryClient.invalidateQueries({
        queryKey: ['onboarding-item-count'],
      });

      toast({
        variant: 'success',
        title: '✅ Asset Added',
        description: 'Your asset has been added successfully!',
      });
    },
  });

  // Optimistic remove mutation
  const removeAssetMutation = useMutation({
    mutationFn: async ({ watchlistId: targetWatchlistId, symbol }: { watchlistId: string; symbol: string }) => {
      await removeFromWatchlistMutation.mutateAsync({
        watchlistId: targetWatchlistId,
        symbol,
      });
    },
    onMutate: async ({ watchlistId: targetWatchlistId, symbol }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', targetWatchlistId] });

      const previousItems = queryClient.getQueryData(['watchlist', targetWatchlistId, false, market]);

      queryClient.setQueryData(['watchlist', targetWatchlistId, false, market], (old: any[] = []) => {
        return old.filter(item => item.symbol !== symbol);
      });

      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['watchlist', variables.watchlistId, false, market],
          context.previousItems
        );
      }
      
      toast({
        variant: 'destructive',
        title: '❌ Error',
        description: (err as any).response?.data?.error ?? 'Failed to remove asset',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['watchlist', variables.watchlistId],
      });
      queryClient.invalidateQueries({
        queryKey: ['onboarding-item-count'],
      });

      toast({
        variant: 'success',
        title: '✅ Removed',
        description: 'Asset removed from your watchlist',
      });
    },
  });

  /**
   * Get or create watchlist for the current asset type
   */
  const getOrCreateWatchlist = async (): Promise<string> => {
    if (currentWatchlist) {
      return currentWatchlist.id;
    }

    // Create new watchlist
    const watchlist = await createWatchlistMutation.mutateAsync({
      name: assetType === 'MUTUAL_FUND' ? 'My Mutual Funds' : 'My Watchlist',
      type: assetType,
    });

    return watchlist.id;
  };

  /**
   * Add asset to watchlist
   */
  const addAsset = async (symbol: string, name?: string) => {
    const targetWatchlistId = await getOrCreateWatchlist();
    
    await addToWatchlistMutation.mutateAsync({
      watchlistId: targetWatchlistId,
      symbol,
      type: assetType,
      name,
    });

    return targetWatchlistId;
  };

  /**
   * Remove asset from watchlist
   */
  const removeAsset = async (symbol: string) => {
    if (!watchlistId) return;
    
    await removeAssetMutation.mutateAsync({
      watchlistId,
      symbol,
    });
  };

  const isProcessing = 
    addToWatchlistMutation.isPending || 
    createWatchlistMutation.isPending || 
    removeAssetMutation.isPending;

  const hasAssets = watchlistItems.length > 0;

  return {
    watchlistId,
    watchlistItems,
    loadingWatchlists,
    loadingItems,
    watchlistError,
    hasAssets,
    isProcessing,
    addAsset,
    removeAsset,
    refetchItems,
  };
}

