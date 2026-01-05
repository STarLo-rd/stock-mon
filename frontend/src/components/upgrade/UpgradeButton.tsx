import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { UpgradeModal } from './UpgradeModal';
import { useState } from 'react';

interface UpgradeButtonProps {
  limitType?: 'watchlist' | 'watchlist_item';
  currentCount?: number;
  maxLimit?: number;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Upgrade Button Component
 * Shows upgrade button with modal
 */
export const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  limitType,
  currentCount,
  maxLimit,
  variant = 'default',
  size = 'default',
  className,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setModalOpen(true)}
      >
        <Crown className="mr-2 h-4 w-4" />
        Upgrade to Premium
      </Button>
      <UpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        limitType={limitType}
        currentCount={currentCount}
        maxLimit={maxLimit}
      />
    </>
  );
};

