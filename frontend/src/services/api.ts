import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Alert {
  id: string;
  symbol: string;
  market?: 'INDIA' | 'USA';
  dropPercentage: string;
  threshold: number;
  timeframe: string;
  price: string;
  historicalPrice: string;
  timestamp: Date;
  notified: boolean;
  critical: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  order: number;
  market: 'INDIA';
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name?: string;
  exchange: string;
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  active: boolean;
  watchlistId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStatus {
  status: string;
  timestamp: string;
  market: {
    type: string;
    open: boolean;
  };
  watchlist: {
    total: number;
    active: number;
  };
  alerts: {
    total: number;
    critical: number;
    today: number;
  };
  services: {
    database: string;
    redis: string;
  };
}

export interface TopMover {
  symbol: string;
  name?: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
}

export interface MarketTrend {
  date: string;
  index: number;
  changePercent: number;
}

export interface MarketHealth {
  alertFrequency: number;
  recoveryRate: number;
  volatility: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  totalAlerts: number;
  criticalAlerts: number;
}

export interface SymbolRequiringAttention {
  symbol: string;
  name?: string;
  type: string;
  currentPrice: number;
  changePercent: number;
  reason: 'approaching_threshold' | 'recent_alert' | 'high_volatility' | 'significant_move';
  details: string;
  severity: 'low' | 'medium' | 'high';
}

export const api = {
  alerts: {
    getAll: async (params?: {
      symbol?: string;
      threshold?: number;
      timeframe?: string;
      startDate?: string;
      endDate?: string;
      critical?: boolean;
      limit?: number;
      offset?: number;
      market?: 'INDIA' | 'USA';
    }): Promise<{ success: boolean; data: Alert[]; pagination: any }> => {
      const response = await apiClient.get('/api/alerts', { params });
      return response.data;
    },
    getToday: async (market?: 'INDIA' | 'USA', limit?: number): Promise<{ success: boolean; data: Alert[]; pagination: any }> => {
      const params: any = {};
      if (market) params.market = market;
      if (limit) params.limit = limit;
      const response = await apiClient.get('/api/alerts/today', { params });
      return response.data;
    },
    getById: async (id: string): Promise<{ success: boolean; data: Alert }> => {
      const response = await apiClient.get(`/api/alerts/${id}`);
      return response.data;
    },
  },
  watchlists: {
    getAll: async (type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: Watchlist[] }> => {
      const response = await apiClient.get('/api/watchlists', { params: { type, market } });
      return response.data;
    },
    create: async (name: string, type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: Watchlist }> => {
      const response = await apiClient.post('/api/watchlists', { name, type, market });
      return response.data;
    },
    update: async (id: string, data: { name?: string; order?: number }, type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: Watchlist }> => {
      const response = await apiClient.patch(`/api/watchlists/${id}`, data, { params: { type, market } });
      return response.data;
    },
    delete: async (id: string, type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean }> => {
      const response = await apiClient.delete(`/api/watchlists/${id}`, { params: { type, market } });
      return response.data;
    },
    reorder: async (watchlistIds: string[], type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean }> => {
      const response = await apiClient.post('/api/watchlists/reorder', { watchlistIds }, { params: { type, market } });
      return response.data;
    },
  },
  watchlist: {
    getAll: async (watchlistId: string, active?: boolean, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: WatchlistItem[] }> => {
      const params: any = { watchlistId, market };
      if (active !== undefined) {
        params.active = active.toString();
      }
      const response = await apiClient.get('/api/watchlist', { params });
      return response.data;
    },
    add: async (watchlistId: string, symbol: string, type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', exchange?: string, market: 'INDIA' | 'USA' = 'INDIA', name?: string): Promise<{ success: boolean; data: WatchlistItem }> => {
      const response = await apiClient.post('/api/watchlist', { watchlistId, symbol, type, exchange, market, name });
      return response.data;
    },
    remove: async (watchlistId: string, symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean }> => {
      const response = await apiClient.delete(`/api/watchlist/${symbol}`, { params: { watchlistId, market } });
      return response.data;
    },
    update: async (watchlistId: string, symbol: string, data: { active?: boolean; order?: number }, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: WatchlistItem }> => {
      const response = await apiClient.patch(`/api/watchlist/${symbol}`, data, { params: { watchlistId, market } });
      return response.data;
    },
    reorder: async (watchlistId: string, symbolIds: string[], market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean }> => {
      const response = await apiClient.post('/api/watchlist/reorder', { symbolIds }, { params: { watchlistId, market } });
      return response.data;
    },
  },
  status: {
    get: async (market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: SystemStatus }> => {
      const response = await apiClient.get('/api/status', { params: { market } });
      return response.data;
    },
  },
  prices: {
    getCurrent: async (market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: Array<{ symbol: string; price: number; source: string }> }> => {
      const response = await apiClient.get('/api/prices/current', { params: { market } });
      return response.data;
    },
    getHistory: async (symbol: string, params?: { limit?: number; startDate?: string; endDate?: string; market?: 'INDIA' | 'USA' }): Promise<{ success: boolean; data: Array<{ symbol: string; price: number; timestamp: Date }> }> => {
      const response = await apiClient.get(`/api/prices/${symbol}`, { params });
      return response.data;
    },
  },
  symbols: {
    get: async (symbol: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: any }> => {
      const response = await apiClient.get(`/api/symbols/${symbol}`, { params: { market } });
      return response.data;
    },
    getPrices: async (symbol: string, timeframe?: string, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: Array<{ timestamp: Date; price: number }> }> => {
      const response = await apiClient.get(`/api/symbols/${symbol}/prices`, { params: { timeframe, market } });
      return response.data;
    },
    getAlerts: async (symbol: string, limit?: number, market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: Alert[] }> => {
      const response = await apiClient.get(`/api/symbols/${symbol}/alerts`, { params: { limit, market } });
      return response.data;
    },
    search: async (query: string, type?: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', market?: 'INDIA' | 'USA'): Promise<{ success: boolean; data: Array<{ symbol: string; name?: string; type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND'; exchange: string }> }> => {
      const response = await apiClient.get('/api/symbols/search', { params: { q: query, type, market } });
      return response.data;
    },
    validate: async (symbol: string, type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND', market?: 'INDIA' | 'USA'): Promise<{ success: boolean; valid: boolean; error?: string }> => {
      const response = await apiClient.post('/api/symbols/validate', { symbol, type, market });
      return response.data;
    },
  },
  marketOverview: {
    getTrends: async (market: 'INDIA' | 'USA' = 'INDIA', timeframe: string = '1M'): Promise<{ success: boolean; data: MarketTrend[] }> => {
      const response = await apiClient.get('/api/market-overview/trends', { params: { market, timeframe } });
      return response.data;
    },
    getTopMovers: async (market: 'INDIA' | 'USA' = 'INDIA', timeframe: string = '1D'): Promise<{ success: boolean; data: { gainers: TopMover[]; losers: TopMover[] } }> => {
      const response = await apiClient.get('/api/market-overview/top-movers', { params: { market, timeframe } });
      return response.data;
    },
    getHealth: async (market: 'INDIA' | 'USA' = 'INDIA'): Promise<{ success: boolean; data: MarketHealth }> => {
      const response = await apiClient.get('/api/market-overview/health', { params: { market } });
      return response.data;
    },
    getSymbolsRequiringAttention: async (market: 'INDIA' | 'USA' = 'INDIA', type?: 'INDEX' | 'STOCK' | 'MUTUAL_FUND'): Promise<{ success: boolean; data: SymbolRequiringAttention[] }> => {
      const params: any = { market };
      if (type) params.type = type;
      const response = await apiClient.get('/api/market-overview/symbols-requiring-attention', { params });
      return response.data;
    },
  },
};

