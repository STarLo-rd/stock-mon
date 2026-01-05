import React from 'react';
import { MarketTrendsChart } from './MarketTrendsChart';
import { TopMovers } from './TopMovers';
import { MarketHealth } from './MarketHealth';

/**
 * Market Overview Component
 * Comprehensive view of market conditions and trends
 */
export const MarketOverview: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Market Health Indicators */}
      <MarketHealth />

      {/* Price Trends Chart */}
      <MarketTrendsChart />

      {/* Top Movers */}
      <TopMovers />
    </div>
  );
};

