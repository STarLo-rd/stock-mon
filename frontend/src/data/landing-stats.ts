/**
 * Landing Page Statistics Data
 * Mock data structured for easy migration to API endpoint
 * 
 * Future: Replace with API call to /api/public/stats
 */

export interface LandingStats {
  userCount: number;
  alertsSentToday: number;
  potentialProfitsThisWeek: string; // Formatted currency string
  rating: number;
  reviewCount: number;
  stocksDownNow: number; // Stocks currently down 5%+
}

/**
 * Mock landing page statistics
 * TODO: Replace with real API call
 */
export const getLandingStats = (): LandingStats => {
  return {
    userCount: 2547,
    alertsSentToday: 127,
    potentialProfitsThisWeek: '₹12.4 Cr',
    rating: 4.8,
    reviewCount: 324,
    stocksDownNow: 34,
  };
};

/**
 * Format number with Indian number system (lakhs, crores)
 */
export const formatIndianNumber = (num: number): string => {
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(1)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

