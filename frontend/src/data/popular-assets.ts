/**
 * Popular Assets Data
 * Top stocks and mutual funds for onboarding quick selection
 */

export interface PopularAsset {
  symbol: string;
  name: string;
  type: 'STOCK' | 'MUTUAL_FUND';
}

export const popularStocks: PopularAsset[] = [
  { symbol: 'TCS', name: 'Tata Consultancy Services', type: 'STOCK' },
  { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'STOCK' },
  { symbol: 'INFY', name: 'Infosys', type: 'STOCK' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'STOCK' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'STOCK' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', type: 'STOCK' },
];

export const popularMutualFunds: PopularAsset[] = [
  { symbol: '122639', name: 'Parag Parikh Flexi Cap Fund', type: 'MUTUAL_FUND' },
  { symbol: '135800', name: 'Tata Digital India Fund', type: 'MUTUAL_FUND' },
  { symbol: '152712', name: 'Motilal Oswal Defence Index Fund', type: 'MUTUAL_FUND' },
  { symbol: '118763', name: 'Nippon India Power & Infra Fund', type: 'MUTUAL_FUND' },
  { symbol: '120546', name: 'Aditya Birla Sun Life Gold Fund', type: 'MUTUAL_FUND' },
];

export const allPopularAssets: PopularAsset[] = [
  ...popularStocks,
  ...popularMutualFunds,
];

