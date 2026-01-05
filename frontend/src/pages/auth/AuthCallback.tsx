import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          navigate('/login?error=oauth_failed');
          return;
        }

        if (accessToken && refreshToken) {
          // Set the session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            navigate('/login?error=session_failed');
            return;
          }

          // Seeding is now handled automatically in the backend OAuth callback
          // No need to manually trigger seeding here

          // Success - redirect to dashboard
          navigate('/dashboard');
        } else {
          // No tokens in URL, might be a regular page load
          // Check if user is already authenticated
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            navigate('/dashboard');
          } else {
            navigate('/login');
          }
        }
      } catch (err) {
        console.error('Callback error:', err);
        navigate('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Completing authentication...</div>
    </div>
  );
};

