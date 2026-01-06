import React from 'react';
import { Badge } from '../ui/badge';
import { useSubscription } from '../../hooks/useSubscription';

interface PlanBadgeProps {
  planName?: string;
}

/**
 * Plan Badge Component
 * Small badge showing user's current plan
 */
export const PlanBadge: React.FC<PlanBadgeProps> = ({ planName: planNameProp }) => {
  const { data: subscriptionData } = useSubscription();

  // Use prop if provided, otherwise fetch from subscription data (now uses consistent API structure)
  const planName = planNameProp || subscriptionData?.subscription?.plan?.name || 'FREE';

  const variant = planName === 'FREE' ? 'secondary' :
                  planName === 'PREMIUM' ? 'default' :
                  planName === 'PRO' ? 'default' :
                  'default';

  return (
    <Badge variant={variant}>
      {planName}
    </Badge>
  );
};


