import { createClient } from '@supabase/supabase-js';
import { config } from './index';

/**
 * Supabase client for server-side operations
 * Uses service role key for admin operations
 */
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase client for client-side operations
 * Uses anon key for regular operations
 */
export const supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

