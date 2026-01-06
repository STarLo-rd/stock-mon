import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface DowngradeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
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
  currentPeriodEnd?: Date;
  isProcessing?: boolean;
}

export const DowngradeConfirmationDialog: React.FC<DowngradeConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  currentPlan,
  selectedPlan,
  featuresYouWillLose,
  currentPeriodEnd,
  isProcessing = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <DialogTitle className="text-2xl">Confirm Downgrade</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            You are about to downgrade from <span className="font-semibold">{currentPlan.name}</span> to{' '}
            <span className="font-semibold">{selectedPlan.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Features You Will Lose */}
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-sm mb-3 text-orange-900 dark:text-orange-100">
              You will lose access to:
            </h3>
            <ul className="space-y-2 text-sm">
              {featuresYouWillLose.watchlists > 0 && (
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium">{featuresYouWillLose.watchlists}</span> additional watchlist
                    {featuresYouWillLose.watchlists > 1 ? 's' : ''} (from {currentPlan.maxWatchlists} to{' '}
                    {selectedPlan.maxWatchlists})
                  </span>
                </li>
              )}
              {featuresYouWillLose.assetsPerWatchlist > 0 && (
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium">{featuresYouWillLose.assetsPerWatchlist}</span> asset slots per
                    watchlist (from {currentPlan.maxAssetsPerWatchlist} to {selectedPlan.maxAssetsPerWatchlist})
                  </span>
                </li>
              )}
              {featuresYouWillLose.prioritySupport && (
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
              )}
            </ul>
          </div>

          {/* Important Note */}
          {currentPeriodEnd && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Note:</span> Your current {currentPlan.name} plan will remain active
                until{' '}
                <span className="font-medium">{new Date(currentPeriodEnd).toLocaleDateString()}</span>. After that,
                your plan will switch to {selectedPlan.name}.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isProcessing ? 'Processing...' : 'Confirm Downgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
