import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Zap, Check } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType?: 'watchlist' | 'watchlist_item';
  currentCount?: number;
  maxLimit?: number;
}

/**
 * Upgrade Modal Component
 * Shows premium features and upgrade options
 * Payment gateway integration will be added later
 */
export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onOpenChange,
  limitType,
  currentCount,
  maxLimit,
}) => {
  const getLimitMessage = () => {
    if (limitType === 'watchlist') {
      return `You've reached the limit of ${maxLimit} watchlists. Upgrade to Premium for unlimited watchlists!`;
    }
    if (limitType === 'watchlist_item') {
      return `This watchlist has reached the limit of ${maxLimit} items. Upgrade to Premium for unlimited items per watchlist!`;
    }
    return 'Upgrade to Premium to unlock all features!';
  };

  const premiumFeatures = [
    {
      icon: <Sparkles className="h-5 w-5 text-yellow-500" />,
      title: 'Unlimited Watchlists',
      description: 'Create as many watchlists as you need for each category',
    },
    {
      icon: <Zap className="h-5 w-5 text-blue-500" />,
      title: 'Unlimited Items',
      description: 'Add unlimited symbols to each watchlist',
    },
    {
      icon: <Crown className="h-5 w-5 text-purple-500" />,
      title: 'Priority Support',
      description: 'Get priority customer support and faster response times',
    },
    {
      icon: <Check className="h-5 w-5 text-green-500" />,
      title: 'Advanced Analytics',
      description: 'Access to advanced market analytics and insights',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <DialogTitle className="text-2xl">Upgrade to Premium</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {getLimitMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500 mb-2">
                Premium Plan
              </div>
              <div className="text-sm text-muted-foreground">
                Coming soon - Payment gateway integration in progress
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-3">Premium Features:</h3>
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5">{feature.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{feature.title}</div>
                  <div className="text-sm text-muted-foreground">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            onClick={() => {
              // TODO: Integrate payment gateway here
              alert('Payment gateway integration coming soon!');
            }}
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Premium
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

