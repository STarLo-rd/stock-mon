import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Crown, Sparkles, Zap, Check, Star, ArrowRight } from 'lucide-react';
import { useUpgradeSubscription, useSubscription, useSubscriptionPlans } from '../../hooks/useSubscription';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType?: 'watchlist' | 'watchlist_item';
  currentCount?: number;
  maxLimit?: number;
}

/**
 * Upgrade Modal Component
 * Dynamically shows upgrade options based on user's current plan
 * Marketing-focused presentation with plan comparison
 */
export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onOpenChange,
  limitType,
  currentCount,
  maxLimit,
}) => {
  const navigate = useNavigate();
  const upgradeMutation = useUpgradeSubscription();
  const { data: subscriptionData, isLoading: subscriptionLoading, error: subscriptionError } = useSubscription();
  const { data: plansData, isLoading: plansLoading, error: plansError } = useSubscriptionPlans();

  // Get current plan (default to FREE if loading or no data)
  const currentPlan = subscriptionData?.subscription?.plan?.name || 'FREE';
  const isFree = currentPlan === 'FREE';
  const isPro = currentPlan === 'PRO';

  // Get plan details
  const premiumPlan = plansData?.find(p => p.name === 'PREMIUM');
  const proPlan = plansData?.find(p => p.name === 'PRO');

  // Don't render if still loading or if PRO user
  if (!open) {
    return null;
  }

  // Show loading state
  if (subscriptionLoading || plansLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground">Loading upgrade options...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state if subscription or plans failed to load
  if (subscriptionError || plansError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Unable to Load Plans</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              We couldn't load upgrade options. Please try again or visit the upgrade page.
            </p>
            <Button onClick={() => navigate('/upgrade')} className="w-full">
              Go to Upgrade Page
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const getLimitMessage = () => {
    if (limitType === 'watchlist') {
      return `You've reached the limit of ${maxLimit} watchlists for this category. Upgrade to unlock more!`;
    }
    if (limitType === 'watchlist_item') {
      return `This watchlist has reached the limit of ${maxLimit} items. Upgrade to add more symbols!`;
    }
    return 'Upgrade to unlock more features!';
  };

  const handleUpgrade = (planId?: string) => {
    onOpenChange(false);
    if (planId) {
      navigate(`/upgrade?plan=${planId}`);
    } else {
      navigate('/upgrade');
    }
  };

  // For PRO users, show a message that they're already on the best plan
  if (isPro) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <DialogTitle className="text-2xl">You're Already on Pro!</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              You're already on our highest tier plan with all features unlocked.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-6 text-center">
              <p className="text-muted-foreground">
                You have access to all premium features including 15 watchlists per category and 40 items per watchlist.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Dynamic title based on current plan
  const modalTitle = isFree ? 'Upgrade Your Plan' : 'Upgrade to Pro';

  // Premium plan features
  const premiumFeatures = [
    {
      icon: <Sparkles className="h-4 w-4 text-yellow-500" />,
      text: '8 watchlists per category',
    },
    {
      icon: <Zap className="h-4 w-4 text-blue-500" />,
      text: '15 items per watchlist',
    },
    {
      icon: <Crown className="h-4 w-4 text-purple-500" />,
      text: 'Priority support',
    },
    {
      icon: <Check className="h-4 w-4 text-green-500" />,
      text: 'Advanced analytics',
    },
  ];

  // PRO plan features
  const proFeatures = [
    {
      icon: <Star className="h-4 w-4 text-yellow-500" />,
      text: '15 watchlists per category',
    },
    {
      icon: <Zap className="h-4 w-4 text-blue-500" />,
      text: '40 items per watchlist',
    },
    {
      icon: <Crown className="h-4 w-4 text-purple-500" />,
      text: 'Priority support',
    },
    {
      icon: <Check className="h-4 w-4 text-green-500" />,
      text: 'Advanced analytics',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <DialogTitle className="text-2xl">{modalTitle}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {getLimitMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isFree ? (
            // Show both PREMIUM and PRO plans for FREE users
            <div className="grid md:grid-cols-2 gap-4">
              {/* Premium Plan Card */}
              <div className="border-2 border-blue-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    POPULAR
                  </div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    Premium Plan
                  </div>
                  <div className="text-3xl font-bold mb-2">
                    ₹{premiumPlan?.priceMonthly || '199'}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Perfect for active investors
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  {premiumFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {feature.icon}
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                  onClick={() => premiumPlan && handleUpgrade(premiumPlan.id)}
                  disabled={upgradeMutation.isPending}
                >
                  Upgrade to Premium
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* PRO Plan Card */}
              <div className="border-2 border-purple-300 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <span>MOST POWERFUL</span>
                  </div>
                </div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    Pro Plan
                  </div>
                  <div className="text-3xl font-bold mb-2">
                    ₹{proPlan?.priceMonthly || '499'}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    For serious investors
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  {proFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {feature.icon}
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={() => proPlan && handleUpgrade(proPlan.id)}
                  disabled={upgradeMutation.isPending}
                >
                  Upgrade to Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            // Show only PRO plan for PREMIUM users
            <div className="border-2 border-purple-300 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 relative max-w-md mx-auto">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span>MOST POWERFUL</span>
                </div>
              </div>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  Pro Plan
                </div>
                <div className="text-3xl font-bold mb-2">
                  ₹{proPlan?.priceMonthly || '499'}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  For serious investors
                </div>
              </div>
              <div className="space-y-2 mb-6">
                {proFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {feature.icon}
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                onClick={() => proPlan && handleUpgrade(proPlan.id)}
                disabled={upgradeMutation.isPending}
              >
                Upgrade to Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Payment gateway integration in progress. Plans will be available soon.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
