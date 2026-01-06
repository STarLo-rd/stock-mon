import React, { useState } from 'react';
import { useSubscriptionPlans, useSubscription, useUpgradeSubscription } from '../hooks/useSubscription';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Check, Crown, Zap, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DowngradeConfirmationDialog } from '../components/subscription/DowngradeConfirmationDialog';

interface DowngradeData {
  currentPlan: {
    name: string;
    priceMonthly: string;
    maxWatchlists: number;
    maxAssetsPerWatchlist: number;
    prioritySupport: boolean;
  };
  selectedPlan: {
    name: string;
    priceMonthly: string;
    maxWatchlists: number;
    maxAssetsPerWatchlist: number;
    prioritySupport: boolean;
  };
  featuresYouWillLose: {
    watchlists: number;
    assetsPerWatchlist: number;
    prioritySupport: boolean;
  };
  currentPeriodEnd: Date;
  planId: string;
}

/**
 * Upgrade Page
 * Shows all subscription plans and allows users to upgrade/downgrade
 */
const Upgrade: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: currentSubscription } = useSubscription();
  const upgradeMutation = useUpgradeSubscription();

  // State for per-plan processing
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // State for downgrade confirmation dialog
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const [downgradeData, setDowngradeData] = useState<DowngradeData | null>(null);

  // State for error handling
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Poll subscription status after payment
  const pollSubscriptionUpdate = async (expectedPlanName: string, maxAttempts: number = 10): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Wait before checking (1 second intervals)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Force refetch current subscription
        const response = await upgradeMutation.mutateAsync({ planId: '', confirmDowngrade: false }).catch(() => null);

        // Check if plan has been updated
        const currentPlan = currentSubscription?.subscription?.plan?.name;
        if (currentPlan === expectedPlanName) {
          return true;
        }
      } catch (error) {
        // Continue polling even on error
      }
    }
    return false;
  };

  const handleUpgrade = async (planId: string, confirmDowngrade: boolean = false) => {
    setError(null);
    setProcessingPlanId(planId);

    try {
      const result = await upgradeMutation.mutateAsync({ planId, confirmDowngrade });

      // Get the plan we're upgrading to
      const selectedPlan = plans?.find((p) => p.id === planId);
      const expectedPlanName = selectedPlan?.name || '';

      // Handle FREE plan - no Razorpay needed
      if (result.isFree || !result.razorpayKey) {
        // For FREE plan, immediately invalidate and redirect
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s for webhook
        window.location.href = '/dashboard?subscription=success&plan=free';
        return;
      }

      // Open Razorpay Checkout for paid plans
      if (result.subscriptionId && result.razorpayKey) {
        const options = {
          key: result.razorpayKey,
          subscription_id: result.subscriptionId,
          name: 'Market Crash Monitor',
          description: 'Subscription Payment',
          image: '/logo.png',
          handler: async function (response: any) {
            // Payment successful - wait longer for webhook to process
            setProcessingPlanId(planId); // Keep processing state

            // Wait minimum 5 seconds for webhook
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Force a full page reload to clear all React Query cache
            // This ensures we get fresh data from the server
            window.location.href = '/dashboard?subscription=success';
          },
          prefill: {
            email: result.userEmail,
            contact: '9999999999',
          },
          readonly: {
            email: true,
          },
          theme: {
            color: '#3B82F6',
          },
          modal: {
            ondismiss: function () {
              setProcessingPlanId(null);
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      }
    } catch (error: any) {
      setProcessingPlanId(null);

      // Handle downgrade confirmation required
      if (error?.response?.data?.error === 'DOWNGRADE_CONFIRMATION_REQUIRED') {
        const downgradeInfo = error.response.data.data;
        setDowngradeData({
          ...downgradeInfo,
          planId,
        });
        setDowngradeDialogOpen(true);
        return;
      }

      // Handle other errors
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to process subscription. Please try again.';
      setError(errorMessage);
    }
  };

  const handleDowngradeConfirm = async () => {
    if (!downgradeData) return;

    setDowngradeDialogOpen(false);
    await handleUpgrade(downgradeData.planId, true);
    setDowngradeData(null);
  };

  // Get current plan name from consistent API structure
  const currentPlanName = currentSubscription?.subscription?.plan?.name || 'FREE';

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-gray-900 mb-4">Choose Your Plan</h1>
            <p className="text-xl text-gray-600">Upgrade to unlock more features and grow your portfolio</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <span className="sr-only">Dismiss</span>×
                </button>
              </div>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid gap-8 lg:grid-cols-3 max-w-7xl mx-auto">
            {plans?.map((plan) => {
              const isCurrentPlan = plan.name === currentPlanName;
              const isPopular = plan.name === 'PREMIUM';
              const isPro = plan.name === 'PRO';
              const isProcessing = processingPlanId === plan.id;
              const anyProcessing = processingPlanId !== null;

              return (
                <Card
                  key={plan.id}
                  className={`border-2 ${
                    isPopular
                      ? 'border-blue-500 shadow-lg relative'
                      : isPro
                      ? 'border-purple-600 shadow-xl relative'
                      : 'border-gray-200'
                  } bg-white hover:shadow-xl transition-all duration-300`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        <span>POPULAR</span>
                      </div>
                    </div>
                  )}
                  {isPro && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span>MOST POWERFUL</span>
                      </div>
                    </div>
                  )}

                  <CardHeader className="pb-8 pt-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {plan.name === 'FREE' && 'Perfect for beginners'}
                        {plan.name === 'PREMIUM' && 'For active investors'}
                        {plan.name === 'PRO' && 'For serious investors'}
                      </p>
                    </div>
                    <div className="mt-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-gray-900">
                          ₹{parseFloat(plan.priceMonthly).toFixed(0)}
                        </span>
                        <span className="text-gray-600 text-lg">/month</span>
                      </div>
                      {plan.priceMonthly !== '0.00' && (
                        <p className="text-sm text-blue-600 font-medium mt-2">
                          ₹{(parseFloat(plan.priceMonthly) / 30).toFixed(2)}/day
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{plan.maxWatchlists} watchlists</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{plan.maxAssetsPerWatchlist} assets per watchlist</span>
                      </li>
                      {plan.prioritySupport && (
                        <li className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">Priority support</span>
                        </li>
                      )}
                    </ul>

                    <Button
                      className={`w-full ${
                        isCurrentPlan
                          ? 'bg-gray-300 cursor-not-allowed'
                          : isPopular
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : isPro
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                          : 'bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300'
                      }`}
                      size="lg"
                      disabled={isCurrentPlan || anyProcessing}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isCurrentPlan
                        ? 'Current Plan'
                        : isProcessing
                        ? 'Processing...'
                        : anyProcessing
                        ? plan.name
                        : plan.priceMonthly === '0.00'
                        ? 'Switch to Free'
                        : `Upgrade to ${plan.name}`}
                    </Button>
                    {plan.priceMonthly !== '0.00' && (
                      <p className="text-center text-xs text-gray-600">7-day money-back guarantee</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Downgrade Confirmation Dialog */}
      {downgradeData && (
        <DowngradeConfirmationDialog
          open={downgradeDialogOpen}
          onOpenChange={setDowngradeDialogOpen}
          onConfirm={handleDowngradeConfirm}
          currentPlan={downgradeData.currentPlan}
          selectedPlan={downgradeData.selectedPlan}
          featuresYouWillLose={downgradeData.featuresYouWillLose}
          currentPeriodEnd={downgradeData.currentPeriodEnd}
          isProcessing={processingPlanId !== null}
        />
      )}
    </div>
  );
};

export default Upgrade;

