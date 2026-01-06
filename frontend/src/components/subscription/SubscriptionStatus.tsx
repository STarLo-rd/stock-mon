import React from 'react';
import { useSubscription, useCancelSubscription } from '../../hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Calendar, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

/**
 * Subscription Status Component
 * Displays current subscription information and allows cancellation
 */
export const SubscriptionStatus: React.FC = () => {
  const { data: subscriptionData, isLoading, error } = useSubscription();
  const cancelMutation = useCancelSubscription();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-red-600">Failed to load subscription information</p>
        </CardContent>
      </Card>
    );
  }

  // Use consistent API structure
  const subscription = subscriptionData?.subscription;
  const plan = subscription?.plan;
  const limits = subscriptionData?.limits;

  const planName = plan?.name || 'FREE';
  const isFree = planName === 'FREE';

  const handleCancel = async () => {
    setCancelError(null);
    try {
      await cancelMutation.mutateAsync();
      setCancelDialogOpen(false);
    } catch (error: any) {
      setCancelError(error?.response?.data?.error || error?.message || 'Failed to cancel subscription');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subscription</span>
          <Badge variant={isFree ? 'secondary' : 'default'}>{planName}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Current Plan</p>
          <p className="text-lg font-semibold">
            {planName} - ₹{parseFloat(plan?.priceMonthly || '0').toFixed(0)}/month
          </p>
        </div>

        {limits && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Limits</p>
            <ul className="text-sm space-y-1">
              <li>• {limits.maxWatchlists} watchlists</li>
              <li>• {limits.maxAssetsPerWatchlist} assets per watchlist</li>
              {limits.prioritySupport && <li>• Priority support</li>}
            </ul>
          </div>
        )}

        {subscription && !isFree && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Renews on:</span>
              <span className="font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  Your subscription will be cancelled at the end of the current billing period.
                </p>
              </div>
            )}

            {!subscription.cancelAtPeriodEnd && (
              <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until {formatDate(subscription.currentPeriodEnd)}.
                      After that, you'll be moved to the FREE plan. You can resubscribe anytime.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {cancelError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-700">{cancelError}</p>
                    </div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}

        {!isFree && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = '/upgrade')}
          >
            Change Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

