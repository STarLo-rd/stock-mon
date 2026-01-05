import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Check, Sparkles, ArrowRight, Plus, Settings, TrendingUp } from 'lucide-react';

interface CelebrationStepProps {
  onComplete: () => void;
  watchlistCount?: number;
  thresholds?: number[];
}

/**
 * CelebrationStep Component
 * Step 5: Completion celebration (Compact single-page design)
 */
export const CelebrationStep: React.FC<CelebrationStepProps> = ({
  onComplete,
  watchlistCount = 1,
  thresholds = [5, 10, 15, 20],
}) => {
  return (
    <Card className="w-full max-w-3xl mx-auto border-0 shadow-2xl bg-gradient-to-br from-green-50 via-white to-emerald-50 overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="space-y-4 text-center">
          {/* Compact Celebration */}
          <div className="flex justify-center relative">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center animate-bounce shadow-md">
                <span className="text-xl">🎉</span>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <div className="inline-block px-4 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              🎊 Setup Complete!
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              You're all set!
            </h2>
            <p className="text-lg text-gray-600 font-medium">
              Your crash alerts are now active
            </p>
          </div>

          {/* Compact Summary Cards */}
          <div className="grid gap-2 max-w-xl mx-auto">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200 shadow-sm">
              <div className="flex-shrink-0 bg-green-600 rounded-full p-2">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  {watchlistCount} Asset{watchlistCount > 1 ? 's' : ''} Tracked
                </p>
                <p className="text-xs text-gray-600">
                  Monitoring price movements 24/7
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
              <div className="flex-shrink-0 bg-orange-600 rounded-full p-2">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  Alert Thresholds Set
                </p>
                <p className="text-xs text-gray-600">
                  {thresholds.map((t) => `${t}%`).join(', ')} crash detection enabled
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="flex-shrink-0 bg-blue-600 rounded-full p-2">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  Notifications Ready
                </p>
                <p className="text-xs text-gray-600">
                  Instant email alerts when crashes happen
                </p>
              </div>
            </div>
          </div>

          {/* Compact Next Steps */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Maximize Your Success
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-xs"
                asChild
              >
                <Link to="/watchlist">
                  <Plus className="h-3 w-3" />
                  Add More Assets
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-xs"
                asChild
              >
                <Link to="/settings">
                  <Settings className="h-3 w-3" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* Compact Pro Tip */}
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-gray-700">
              <span className="text-sm">💎</span> <strong>Pro Tip:</strong> Add 5-10 stocks you're interested in buying to catch opportunities when they crash!
            </p>
          </div>

          {/* Main CTA */}
          <div className="pt-2">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-5 text-base font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all"
              onClick={onComplete}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Trust Signal */}
          <p className="text-xs text-gray-500 pt-2">
            ⏱️ Monitoring 24/7 • 🔔 First alert coming soon!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
