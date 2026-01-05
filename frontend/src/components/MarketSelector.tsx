import React from 'react';
import { Globe } from 'lucide-react';

export const MarketSelector: React.FC = () => {
  return (
    <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/50">
      <Globe className="h-4 w-4 ml-2 text-muted-foreground" />
      <span className="text-sm font-medium px-2">India (NSE)</span>
    </div>
  );
};
