import express from 'express';
import alertsRoutes from './routes/alerts.routes';
import watchlistRoutes from './routes/watchlist.routes';
import watchlistsRoutes from './routes/watchlists.routes';
import statusRoutes from './routes/status.routes';
import priceRoutes from './routes/price.routes';
import symbolRoutes from './routes/symbol.routes';
import marketOverviewRoutes from './routes/market-overview.routes';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (allow all origins for open system)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Routes
app.use('/api/alerts', alertsRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/watchlists', watchlistsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/symbols', symbolRoutes);
app.use('/api/market-overview', marketOverviewRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, path: req.path, method: req.method });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

export default app;

