import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ArrowRight, Clock, CreditCard, Lock } from 'lucide-react';
import { getLandingStats } from '../../data/landing-stats';

/**
 * FinalCTASection Component
 * Focus on long-term wealth building
 */
export const FinalCTASection: React.FC = () => {
  const stats = getLandingStats();

  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Card className="border-2 border-gray-200 bg-gray-50 shadow-xl">
            <CardContent className="p-12 md:p-16">
              {/* Main Content */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-orange-200 bg-orange-50">
                  <div className="h-2 w-2 rounded-full bg-orange-600 animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-600">
                    {stats.stocksDownNow} funds & stocks are down 5%+ right now
                  </span>
                </div>

                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                  Start Building Wealth
                  <br />
                  <span className="text-blue-600">That Lasts Generations</span>
                </h2>

                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
                  Join {stats.userCount.toLocaleString()}+ investors who never miss dips in funds & stocks
                </p>

                <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-10">
                  <span className="font-semibold">Remember:</span> Just 1% extra annual return from buying dips compounds to{' '}
                  <span className="font-bold text-green-600">₹90 lakhs more wealth</span> over 30 years.
                </p>

                <Button
                  size="lg"
                  className="text-xl px-12 py-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl font-semibold"
                  asChild
                >
                  <Link to="/signup">
                    Start Your Wealth Journey
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Link>
                </Button>

                <p className="text-sm text-gray-600 mt-4">
                  Free forever • 10 top mutual funds + NIFTY50 stocks • No credit card required
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t-2 border-gray-200">
                <div className="flex flex-col items-center text-center">
                  <Clock className="h-10 w-10 text-blue-600 mb-3" />
                  <p className="text-base font-semibold text-gray-900">2-minute setup</p>
                  <p className="text-sm text-gray-600 mt-1">Works for decades</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <CreditCard className="h-10 w-10 text-green-600 mb-3" />
                  <p className="text-base font-semibold text-gray-900">100% free</p>
                  <p className="text-sm text-gray-600 mt-1">For 10 top mutual funds & NIFTY50</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Lock className="h-10 w-10 text-blue-600 mb-3" />
                  <p className="text-base font-semibold text-gray-900">Bank-grade security</p>
                  <p className="text-sm text-gray-600 mt-1">Your data is safe</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final message */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">Next market dip could be tomorrow.</span>{' '}
              Don't let decades of compounding slip away.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
