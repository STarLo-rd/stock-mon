import React, { useEffect, useState } from 'react';
import { api, WatchlistItem } from '../services/api';

/**
 * @deprecated This component uses the old API signature and is not compatible with user-scoped authentication.
 * Use the Watchlist page component instead.
 */
const WatchlistManager: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [newType, setNewType] = useState<'INDEX' | 'STOCK'>('STOCK');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setError(null);
      // @ts-expect-error - Deprecated component, API signature changed
      const response = await api.watchlist.getAll('', true);
      setWatchlist(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load watchlist');
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    try {
      setError(null);
      // @ts-expect-error - Deprecated component, API signature changed
      await api.watchlist.add('', newSymbol.toUpperCase(), newType);
      setNewSymbol('');
      await loadWatchlist();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to add symbol');
    }
  };

  const handleRemove = async (symbol: string) => {
    if (!confirm(`Remove ${symbol} from watchlist?`)) return;

    try {
      setError(null);
      // @ts-expect-error - Deprecated component, API signature changed
      await api.watchlist.remove('', symbol);
      await loadWatchlist();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to remove symbol');
    }
  };

  const handleToggleActive = async (symbol: string, currentActive: boolean) => {
    try {
      setError(null);
      // @ts-expect-error - Deprecated component, API signature changed
      await api.watchlist.update('', symbol, { active: !currentActive });
      await loadWatchlist();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to update symbol');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '15px',
      }}
    >
      {error && (
        <div
          style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Symbol (e.g., RELIANCE)"
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as 'INDEX' | 'STOCK')}
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <option value="STOCK">Stock</option>
          <option value="INDEX">Index</option>
        </select>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      </form>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {watchlist.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No symbols in watchlist</p>
        ) : (
          watchlist.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <strong>{item.symbol}</strong>
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: '#666',
                    background: item.type === 'INDEX' ? '#e3f2fd' : '#f3e5f5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {item.type}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggleActive(item.symbol, item.active)}
                  style={{
                    padding: '4px 8px',
                    background: item.active ? '#4caf50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {item.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleRemove(item.symbol)}
                  style={{
                    padding: '4px 8px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WatchlistManager;

