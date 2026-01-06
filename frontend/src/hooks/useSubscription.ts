import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: string;
  maxWatchlists: number;
  maxAssetsPerWatchlist: number;
  prioritySupport: boolean;
}

export interface SubscriptionLimits {
  maxWatchlists: number;
  maxAssetsPerWatchlist: number;
  prioritySupport: boolean;
}

export interface Subscription {
  id: string;
  plan: {
    id: string;
    name: string;
    priceMonthly: string;
  } | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Hook to get all available subscription plans
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => {
      const response = await api.subscriptions.getPlans();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to get current user subscription
 */
export function useSubscription() {
  return useQuery({
    queryKey: ['subscriptions', 'current'],
    queryFn: async () => {
      const response = await api.subscriptions.getCurrent();
      return response.data; // Returns { subscription, limits }
    },
    staleTime: 0, // Don't cache - always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Alias for useSubscription (for compatibility)
 */
export function useCurrentSubscription() {
  return useSubscription();
}

/**
 * Hook to get current subscription limits
 */
export function useSubscriptionLimits() {
  return useQuery({
    queryKey: ['subscriptions', 'limits'],
    queryFn: async () => {
      const response = await api.subscriptions.getLimits();
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
  });
}

/**
 * Hook to upgrade subscription
 */
export function useUpgradeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, confirmDowngrade }: { planId: string; confirmDowngrade?: boolean }) => {
      const response = await api.subscriptions.create(planId, confirmDowngrade);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate subscription queries
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

/**
 * Hook to cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.subscriptions.cancel();
      return response;
    },
    onSuccess: () => {
      // Invalidate subscription queries
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

