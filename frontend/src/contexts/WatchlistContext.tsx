import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMarket } from '@/components/market-provider';

interface WatchlistContextType {
  selectedType: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  setSelectedType: (type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND') => void;
  selectedWatchlistId: string | null;
  setSelectedWatchlistId: (id: string | null) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'market-monitor-selected-watchlist';
const TYPE_STORAGE_KEY_PREFIX = 'market-monitor-selected-type';

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { market } = useMarket();
  const storageKey = `${STORAGE_KEY_PREFIX}-${market}`;
  const typeStorageKey = `${TYPE_STORAGE_KEY_PREFIX}-${market}`;
  
  const [selectedType, setSelectedTypeState] = useState<'INDEX' | 'STOCK' | 'MUTUAL_FUND'>(() => {
    // Initialize from localStorage, default to MUTUAL_FUND
    const stored = localStorage.getItem(typeStorageKey);
    return (stored as 'INDEX' | 'STOCK' | 'MUTUAL_FUND') || 'MUTUAL_FUND';
  });

  const [selectedWatchlistId, setSelectedWatchlistIdState] = useState<string | null>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem(storageKey);
    return stored || null;
  });

  // Update localStorage when selected type changes
  useEffect(() => {
    localStorage.setItem(typeStorageKey, selectedType);
  }, [selectedType, typeStorageKey]);

  // Update localStorage when selected watchlist changes
  useEffect(() => {
    if (selectedWatchlistId) {
      localStorage.setItem(storageKey, selectedWatchlistId);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [selectedWatchlistId, storageKey]);

  // Reset selected watchlist when market changes
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setSelectedWatchlistIdState(stored || null);
  }, [market, storageKey]);

  // Clear selected watchlist when type changes (watchlists are type-specific)
  // This ensures we don't try to select a watchlist from a different type
  useEffect(() => {
    setSelectedWatchlistIdState(null);
    localStorage.removeItem(storageKey);
  }, [selectedType, storageKey]);

  const setSelectedType = (type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND') => {
    setSelectedTypeState(type);
  };

  const setSelectedWatchlistId = (id: string | null) => {
    setSelectedWatchlistIdState(id);
  };

  return (
    <WatchlistContext.Provider value={{ selectedType, setSelectedType, selectedWatchlistId, setSelectedWatchlistId }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlistContext must be used within a WatchlistProvider');
  }
  return context;
}

