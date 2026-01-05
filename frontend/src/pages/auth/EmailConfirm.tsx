import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export const EmailConfirm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get tokens from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || error || 'Email confirmation failed');
          return;
        }

        if (accessToken && refreshToken) {
          // Set session with tokens from email confirmation
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus('error');
            setMessage(sessionError.message || 'Failed to confirm email');
            return;
          }

          // Refresh session to get updated user data
          await refreshSession();

          setStatus('success');
          setMessage('Email confirmed successfully! Redirecting to dashboard...');

          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          // Check if user is already confirmed
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email_confirmed_at) {
            setStatus('success');
            setMessage('Your email is already confirmed. Redirecting...');
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Invalid confirmation link. Please check your email for a valid link.');
          }
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'An error occurred during email confirmation');
      }
    };

    handleEmailConfirmation();
  }, [navigate, refreshSession]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Email Confirmation</CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Please wait...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-center text-muted-foreground">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-center text-muted-foreground">{message}</p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-center text-destructive">{message}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => navigate('/login')}>
                    Go to Login
                  </Button>
                  <Button onClick={() => navigate('/signup')}>
                    Sign Up Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

