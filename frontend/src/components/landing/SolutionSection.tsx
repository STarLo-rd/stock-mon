import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Search, Settings, Bell, ArrowRight, Check, Coffee } from 'lucide-react';

/**
 * SolutionSection Component
 * Focus on mutual funds and 9-5 professional workflow
 */
export const SolutionSection: React.FC = () => {
  const steps = [
    {
      number: 1,
      icon: Search,
      title: 'Add Funds & Stocks to Watch',
      description: 'Browse 10 top mutual funds + NIFTY50 stocks. Build your personalized watchlist in minutes.',
    },
    {
      number: 2,
      icon: Settings,
      title: 'Set Dip Alerts',
      description: 'Choose crash thresholds: 5%, 10%, 15%, or 20%. We monitor 24/7 so you don\'t have to.',
    },
    {
      number: 3,
      icon: Bell,
      title: 'Get Instant Notifications',
      description: 'Receive alerts during market hours. Invest during your lunch break. Let compounding do the rest.',
    },
  ];

  return (
    <section id="solution-section" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-gray-200 bg-white shadow-sm">
              <Coffee className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Set It and Forget It
              </span>
            </div>
            <h2 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900 mb-6">
              3 Steps to Long-Term Wealth
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Perfect for fund & stock investors. Setup takes 2 minutes, works for decades.
            </p>
          </div>

          {/* Steps */}
          <div className="grid gap-8 md:grid-cols-3 mb-16">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Card
                  key={step.number}
                  className="border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-xl transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl">
                        {step.number}
                      </div>
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Benefits for 9-5 Professionals */}
          <Card className="border-2 border-blue-200 bg-blue-50 mb-12">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Why 9-5 Professionals Love This
                </h3>
                <p className="text-gray-600">Passive investing made active during opportunities</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white rounded-xl">
                  <div className="text-4xl font-bold text-blue-600 mb-2">0 hrs/day</div>
                  <p className="text-sm text-gray-600 font-medium">Market watching required</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl">
                  <div className="text-4xl font-bold text-blue-600 mb-2">2 min</div>
                  <p className="text-sm text-gray-600 font-medium">To act on alerts</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl">
                  <div className="text-4xl font-bold text-blue-600 mb-2">20-30 yrs</div>
                  <p className="text-sm text-gray-600 font-medium">Of compounding ahead</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <Button
              size="lg"
              className="text-lg px-10 py-7 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl font-semibold"
              asChild
            >
              <Link to="/signup">
                Start Building Wealth
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="mt-4 text-sm text-gray-500">
              Free forever for 10 top mutual funds + NIFTY50 stocks • No credit card required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
