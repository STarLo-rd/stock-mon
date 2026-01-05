import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger from '../utils/logger';

/**
 * Extended Request interface with user information
 */
export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Require authentication middleware
 * Verifies JWT token and attaches userId to request
 * Returns 401 if token is missing or invalid
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Token is missing.',
      });
      return;
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid authentication token', { error: error?.message });
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please login again.',
      });
      return;
    }

    // Attach user information to request
    req.userId = user.id;
    req.userEmail = user.email;

    next();
  } catch (error) {
    logger.error('Error in authentication middleware', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches userId if token is valid, but doesn't fail if token is missing
 * Useful for public routes that show user-specific data when authenticated
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (!error && user) {
          req.userId = user.id;
          req.userEmail = user.email;
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    logger.debug('Optional auth error (non-critical)', { error });
    next();
  }
}

