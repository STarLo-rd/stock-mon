import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Check, Crown, TrendingUp } from 'lucide-react';

/**
 * FeaturesSection Component
 * Focus on mutual funds availability
 */
export const FeaturesSection: React.FC = () => {
  const freeFeatures = [
    '10 top mutual funds',
    'NIFTY50 stocks + major indices',
    'Email alerts for dips',
    'Daily market summary',
    'Unlimited watchlist size',
  ];

  const proFeatures = [
    'Everything in FREE',
    'All mutual funds (3,000+ funds)',
    'Real-time alerts (every 5 min)',
    'SMS + Telegram + Push notifications',
    'Recovery alerts (when to book profits)',
    'Custom stocks beyond NIFTY50',
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
              10 Top Mutual Funds. All Major Stocks.
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Start with top funds for free, upgrade to monitor your entire portfolio
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
            {/* FREE Tier */}
            <Card className="border-2 border-gray-200 bg-white hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">FREE</h3>
                  <p className="text-sm text-gray-600 mt-1">Perfect for most investors</p>
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
                <ul className="space-y-4">
                  {freeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
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

            {/* PRO Tier */}
            <Card className="border-2 border-blue-600 bg-white shadow-xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  <span>FOR SERIOUS INVESTORS</span>
                </div>
              </div>

              <CardHeader className="pb-8 pt-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">PRO</h3>
                  <p className="text-sm text-gray-600 mt-1">Real-time alerts, faster wealth</p>
                </div>
                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-gray-900">₹299</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mt-2">
                    ₹9.96/day • Cost of 1 coffee = 30 years of compounding
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
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

          {/* Fund Coverage Highlight */}
          <div className="mt-16 text-center">
            <Card className="border-2 border-gray-200 bg-gray-50 inline-block max-w-4xl">
              <CardContent className="p-8">
                <p className="text-lg text-gray-700">
                  <span className="font-bold text-gray-900">FREE tier:</span> 10 top mutual funds + All NIFTY50 stocks.{' '}
                  <span className="font-bold text-gray-900">PRO tier:</span> All mutual funds (Equity, Debt, Hybrid, Index, ELSS, Sectoral) + All NIFTY50 stocks (Reliance, TCS, Infosys, HDFC Bank & more).{' '}
                  <span className="font-semibold text-blue-600">Upgrade to monitor everything.</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
