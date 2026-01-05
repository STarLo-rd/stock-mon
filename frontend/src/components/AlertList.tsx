import React from 'react';
import { Alert } from '../services/api';

interface AlertListProps {
  alerts: Alert[];
}

const AlertList: React.FC<AlertListProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <div
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#666',
        }}
      >
        No alerts yet
      </div>
    );
  }

  const getThresholdColor = (threshold: number): string => {
    if (threshold >= 20) return '#d32f2f';
    if (threshold >= 15) return '#f57c00';
    if (threshold >= 10) return '#fbc02d';
    return '#388e3c';
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxHeight: '500px',
        overflowY: 'auto',
      }}
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          style={{
            padding: '15px',
            borderBottom: '1px solid #eee',
            borderLeft: `4px solid ${getThresholdColor(alert.threshold)}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div>
              {alert.type === 'MUTUAL_FUND' && alert.name ? (
                <div>
                  <strong style={{ fontSize: '16px' }}>{alert.name}</strong>
                  <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>{alert.symbol}</div>
                </div>
              ) : (
                <strong style={{ fontSize: '16px' }}>{alert.symbol}</strong>
              )}
              {alert.critical && (
                <span
                  style={{
                    marginLeft: '8px',
                    background: '#d32f2f',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}
                >
                  CRITICAL
                </span>
              )}
            </div>
            <span
              style={{
                background: getThresholdColor(alert.threshold),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              -{parseFloat(alert.dropPercentage).toFixed(2)}%
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Threshold: {alert.threshold}% | Timeframe: {alert.timeframe}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Price: ₹{parseFloat(alert.price).toFixed(2)} (was ₹{parseFloat(alert.historicalPrice).toFixed(2)})
          </div>
          <div style={{ fontSize: '11px', color: '#999' }}>{formatDate(alert.timestamp)}</div>
        </div>
      ))}
    </div>
  );
};

export default AlertList;

