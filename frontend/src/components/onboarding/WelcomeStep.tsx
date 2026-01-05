import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ProgressBar } from './ProgressBar';
import { Target, ArrowRight, TrendingDown, Bell, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface WelcomeStepProps {
  onContinue: () => void;
  currentStep: number;
  totalSteps: number;
}

/**
 * WelcomeStep Component
 * Step 1: Welcome with goal setting (Peak-End Rule - Start Strong)
 */
export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  onContinue,
  currentStep,
  totalSteps,
}) => {
  const { user } = useAuth();
  const userName = user?.email?.split('@')[0] ?? 'there';

  return (
    <Card className="w-full max-w-3xl mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur">
      <CardContent className="p-8 md:p-12">
        <div className="text-center space-y-8">
          {/* Welcome Message with gradient */}
          <div className="space-y-4">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              🎉 Welcome to Market Crash Monitor
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Welcome, {userName}!
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 font-medium">
              Let's set up your first alert in 2 minutes
            </p>
          </div>

          {/* Goal Statement with icon */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-xl"></div>
            <div className="relative flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg">
              <Target className="h-10 w-10 text-blue-600" />
              <div className="text-left">
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  Your Goal
                </p>
                <p className="text-base md:text-lg text-gray-700">
                  Never miss a buying opportunity again
                </p>
              </div>
            </div>
          </div>

          {/* Quick Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-xl border border-green-200 space-y-2">
              <TrendingDown className="h-8 w-8 text-green-600" />
              <p className="text-sm font-semibold text-gray-900">Catch Market Dips</p>
              <p className="text-xs text-gray-600 text-center">Get alerted when stocks drop 5-20%</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
              <Bell className="h-8 w-8 text-amber-600" />
              <p className="text-sm font-semibold text-gray-900">Instant Alerts</p>
              <p className="text-xs text-gray-600 text-center">Email + Telegram notifications</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
              <Shield className="h-8 w-8 text-purple-600" />
              <p className="text-sm font-semibold text-gray-900">100% Free</p>
              <p className="text-xs text-gray-600 text-center">NIFTY50 stocks forever</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-6">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          {/* Continue Button with animation */}
          <div className="pt-4">
            <Button
              size="lg"
              className="w-full sm:w-auto px-10 py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              onClick={onContinue}
            >
              Let's Get Started
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>

          {/* Trust Signal */}
          <p className="text-xs text-gray-500 pt-2">
            ⏱️ Setup takes 2 minutes • 💳 No credit card required
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

