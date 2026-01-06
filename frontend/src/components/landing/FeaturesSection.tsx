import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Check, Crown, TrendingUp, Zap } from 'lucide-react';

/**
 * FeaturesSection Component
 * Displays three subscription tiers: FREE, PREMIUM, and PRO
 */
export const FeaturesSection: React.FC = () => {
  const freeFeatures = [
    'NIFTY50 stocks',
    'Top 10 mutual funds',
    'Top 5 indices',
    '4 watchlists',
    '8 assets per watchlist',
    'Email + Telegram alerts',
    'Daily market summary',
  ];

  const premiumFeatures = [
    'Everything in FREE',
    'NIFTY50 + Midcap150 stocks',
    'Top 20 mutual funds',
    '8 watchlists',
    'Up to 15 assets per watchlist',
    'Email + Telegram alerts',
    'Priority support',
  ];

  const proFeatures = [
    'Everything in PREMIUM',
    'Any stocks (Nifty50, Midcap, Smallcap)',
    'Any mutual funds (3,000+ funds)',
    'Up to 15 watchlists',
    'Up to 30 assets per watchlist',
    'Email + Telegram alerts',
    'Priority support',
  ];

  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-gray-200 bg-white shadow-sm">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Complete Coverage
              </span>
            </div>
            <h2 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900 mb-6">
              Choose Your Plan. Scale Your Wealth.
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Start free with NIFTY50 stocks, upgrade as your portfolio grows
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-8 lg:grid-cols-3 max-w-7xl mx-auto">
            {/* FREE Tier */}
            <Card className="border-2 border-gray-200 bg-white hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">FREE</h3>
                  <p className="text-sm text-gray-600 mt-1">Perfect for beginners</p>
                </div>
                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-gray-900">₹0</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <p className="text-sm text-green-600 font-medium mt-2">
                    Free forever
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {freeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400"
                  size="lg"
                  asChild
                >
                  <Link to="/signup">Start Free</Link>
                </Button>
              </CardContent>
            </Card>

            {/* PREMIUM Tier */}
            <Card className="border-2 border-blue-500 bg-white shadow-lg relative hover:shadow-xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  <span>POPULAR</span>
                </div>
              </div>

              <CardHeader className="pb-8 pt-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">PREMIUM</h3>
                  <p className="text-sm text-gray-600 mt-1">For active investors</p>
                </div>
                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-gray-900">₹199</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mt-2">
                    ₹6.63/day
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {premiumFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  size="lg"
                  asChild
                >
                  <Link to="/signup">Upgrade to PREMIUM</Link>
                </Button>
                <p className="text-center text-xs text-gray-600">
                  7-day money-back guarantee
                </p>
              </CardContent>
            </Card>

            {/* PRO Tier */}
            <Card className="border-2 border-purple-600 bg-white shadow-xl relative hover:shadow-2xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  <span>MOST POWERFUL</span>
                </div>
              </div>

              <CardHeader className="pb-8 pt-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">PRO</h3>
                  <p className="text-sm text-gray-600 mt-1">For serious investors</p>
                </div>
                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-gray-900">₹499</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <p className="text-sm text-purple-600 font-medium mt-2">
                    ₹16.63/day
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                  size="lg"
                  asChild
                >
                  <Link to="/signup">Upgrade to PRO</Link>
                </Button>
                <p className="text-center text-xs text-gray-600">
                  7-day money-back guarantee • Cancel anytime
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
