import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabaseClient } from '../config/supabase';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import { seedDefaultWatchlistsForUser } from '../services/user-seed.service';
import logger from '../utils/logger';

const router = Router();

// Apply stricter rate limiting to all auth routes
router.use(authRateLimiter);

/**
 * POST /api/auth/signup
 * Sign up with email and password
 * Body: { email, password }
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    
    const { data, error } = await supabaseAdmin.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: `${frontendUrl}/auth/confirm`,
      },
    });

    if (error) {
      logger.error('Signup error', { error: error.message, email });
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    if (!data.user) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }

    logger.info('User signed up', { userId: data.user.id, email });

    // Seed default watchlists for new user (synchronous - wait for completion)
    // This ensures watchlists are ready when user first logs in
    try {
      await seedDefaultWatchlistsForUser(data.user.id, 'INDIA');
      logger.info('Default watchlists seeded successfully for new user', { userId: data.user.id });
    } catch (error) {
      logger.error('Error seeding default watchlists for new user', {
        userId: data.user.id,
        error,
      });
      // Don't fail signup if seeding fails, but log the error
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: data.session,
      },
    });
  } catch (error) {
    logger.error('Error in signup', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 * Body: { email, password }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      logger.warn('Login error', { error: error.message, email });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    if (!data.user || !data.session) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create session',
      });
    }

    logger.info('User logged in', { userId: data.user.id, email });

    res.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: data.session,
      },
    });
  } catch (error) {
    logger.error('Error in login', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 * Requires authentication
 */
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      await supabaseAdmin.auth.signOut(token);
    }

    logger.info('User logged out', { userId: req.userId });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Error in logout', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 * Body: { refresh_token }
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      logger.warn('Token refresh error', { error: error?.message });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    res.json({
      success: true,
      data: {
        session: data.session,
      },
    });
  } catch (error) {
    logger.error('Error in token refresh', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 * Body: { email }
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password`,
      }
    );

    if (error) {
      logger.error('Password reset email error', { error: error.message, email });
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    logger.info('Password reset email sent', { email });

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Error in forgot password', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token from email
 * Note: This endpoint is typically handled by Supabase directly via email link
 * The frontend will handle the password reset flow after user clicks email link
 * Body: { password }
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required. Please use the link from your email.',
      });
    }

    // Verify user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      logger.error('Password reset token verification error', { error: userError?.message });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
    });

    if (updateError) {
      logger.error('Password update error', { error: updateError.message });
      return res.status(400).json({
        success: false,
        error: 'Failed to update password',
      });
    }

    logger.info('Password reset successful', { userId: user.id });

    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    logger.error('Error in reset password', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/user
 * Get current authenticated user info
 * Requires authentication
 */
router.get('/user', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_confirmed_at !== null,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting user info', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password with current password verification
 * Requires authentication
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long',
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (verifyError) {
      logger.warn('Password change failed: incorrect current password', { userId: user.id });
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      logger.error('Password update error', { error: updateError.message, userId: user.id });
      return res.status(400).json({
        success: false,
        error: 'Failed to update password',
      });
    }

    logger.info('Password changed successfully', { userId: user.id });

    res.json({
      success: true,
      message: 'Password has been changed successfully',
    });
  } catch (error) {
    logger.error('Error in change password', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 * Redirects to Supabase Google OAuth URL
 */
router.get('/google', async (req: Request, res: Response) => {
  try {
    const redirectTo = req.query.redirect_to as string || 
      `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/auth/callback`;

    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error || !data.url) {
      logger.error('Google OAuth initiation error', { error: error?.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to initiate Google OAuth',
      });
    }

    res.redirect(data.url);
  } catch (error) {
    logger.error('Error in Google OAuth initiation', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 * This endpoint receives the OAuth callback from Google via Supabase
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is missing',
      });
    }

    // Exchange code for session
    const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code as string);

    if (error || !data.session) {
      logger.error('Google OAuth callback error', { error: error?.message });
      return res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?error=oauth_failed`);
    }

    // Check if this is a new user (created less than 5 seconds ago)
    if (data.user) {
      const createdAt = new Date(data.user.created_at);
      const now = new Date();
      const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;

      // If user was created less than 5 seconds ago, seed default watchlists (synchronous)
      if (secondsSinceCreation < 5) {
        try {
          await seedDefaultWatchlistsForUser(data.user.id, 'INDIA');
          logger.info('Default watchlists seeded successfully for new OAuth user', {
            userId: data.user.id,
          });
        } catch (error) {
          logger.error('Error seeding default watchlists for new OAuth user', {
            userId: data.user.id,
            error,
          });
          // Don't fail OAuth flow if seeding fails
        }
      }
    }

    // Redirect to frontend with session
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`);
  } catch (error) {
    logger.error('Error in Google OAuth callback', { error });
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

/**
 * POST /api/auth/seed-defaults
 * Manually trigger seeding of default watchlists for current user
 * Requires authentication
 * Useful for users who signed up before seeding was implemented
 */
router.post('/seed-defaults', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Seed default watchlists (non-blocking)
    seedDefaultWatchlistsForUser(userId, 'INDIA').catch((error) => {
      logger.error('Error seeding default watchlists', { userId, error });
    });

    res.json({
      success: true,
      message: 'Default watchlists seeding initiated',
    });
  } catch (error) {
    logger.error('Error in seed defaults', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;

