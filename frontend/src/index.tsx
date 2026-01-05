import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './components/theme-provider';
import './index.css';

/**
 * Entry Point - React Query Provider is configured in App.tsx
 * PriceContext removed - using React Query hooks instead
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="market-monitor-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

