import express from 'express';
import alertsRoutes from './routes/alerts.routes';
import watchlistRoutes from './routes/watchlist.routes';
import watchlistsRoutes from './routes/watchlists.routes';
import statusRoutes from './routes/status.routes';
import priceRoutes from './routes/price.routes';
import symbolRoutes from './routes/symbol.routes';
import marketOverviewRoutes from './routes/market-overview.routes';
import authRoutes from './routes/auth.routes';
import { globalRateLimiter } from './middleware/rate-limit.middleware';
import logger from './utils/logger';

const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
// Set to true if behind a reverse proxy (nginx, load balancer, etc.)
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : 1);

// CORS middleware (must be before other middleware to handle preflight requests)
// Allow requests from frontend and Supabase
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow requests from frontend and Supabase
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
  
  // When credentials are required, we must specify the exact origin (cannot use *)
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (origin) {
    // For other origins, allow but without credentials
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'false');
  } else {
    // No origin header (e.g., same-origin request or Postman)
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting (applies to all routes)
app.use(globalRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/watchlists', watchlistsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/symbols', symbolRoutes);
app.use('/api/market-overview', marketOverviewRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, path: req.path, method: req.method });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

export default app;

