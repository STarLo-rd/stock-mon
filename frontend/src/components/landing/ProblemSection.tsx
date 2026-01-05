import React from 'react';
import { Card, CardContent } from '../ui/card';
import { TrendingDown, TrendingUp, AlertCircle, Calculator } from 'lucide-react';

/**
 * ProblemSection Component
 * Focus on long-term compounding and missed opportunities
 */
export const ProblemSection: React.FC = () => {
  const missedOpportunities = [
    {
      asset: 'Parag Parikh Flexi Cap Fund',
      type: 'Mutual Fund',
      date: 'March 2020',
      crash: '35%',
      recovery: '120%',
      timeframe: '2 years',
      investment: '₹1,00,000',
      missedWealth: '₹2,20,000',
      currentValue: '₹3,20,000',
    },
    {
      asset: 'HDFC Top 100 Fund',
      type: 'Mutual Fund',
      date: 'Sept 2022',
      crash: '18%',
      recovery: '45%',
      timeframe: '18 months',
      investment: '₹50,000',
      missedWealth: '₹22,500',
      currentValue: '₹72,500',
    },
    {
      asset: 'Infosys (INFY)',
      type: 'Stock',
      date: 'Oct 2023',
      crash: '12%',
      recovery: '38%',
      timeframe: '10 months',
      investment: '₹75,000',
      missedWealth: '₹28,500',
      currentValue: '₹1,03,500',
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-orange-200 bg-white shadow-sm">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">
                The Cost of Missing Dips
              </span>
            </div>
            <h2 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900 mb-6">
              How Much Wealth Did You{' '}
              <span className="text-red-600">Leave on the Table?</span>
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Missing market dips in mutual funds & stocks costs you decades of compounding. Here are real examples from the past 4 years.
            </p>
          </div>

          {/* Missed Opportunities */}
          <div className="space-y-6">
            {missedOpportunities.map((opp, index) => (
              <Card
                key={index}
                className="border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-[1fr_2fr] gap-8 items-center">
                    {/* Visual Chart Representation */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                      <div className="relative w-full h-32">
                        <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-center gap-1">
                          {/* Down bars */}
                          <div className="flex-1 bg-red-500/80 rounded-t" style={{ height: '100%' }}></div>
                          <div className="flex-1 bg-red-500/70 rounded-t" style={{ height: '75%' }}></div>
                          <div className="flex-1 bg-red-500/60 rounded-t" style={{ height: '50%' }}></div>
                          <div className="flex-1 bg-red-600 rounded-t" style={{ height: '30%' }}></div>
                          {/* Recovery bars */}
                          <div className="flex-1 bg-green-500/60 rounded-t" style={{ height: '40%' }}></div>
                          <div className="flex-1 bg-green-500/70 rounded-t" style={{ height: '60%' }}></div>
                          <div className="flex-1 bg-green-500/80 rounded-t" style={{ height: '85%' }}></div>
                          <div className="flex-1 bg-green-600 rounded-t" style={{ height: '100%' }}></div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <span className="text-2xl font-bold text-red-600">{opp.crash}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-600">{opp.recovery}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <div className="mb-4">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-2xl font-bold text-gray-900">{opp.asset}</h3>
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            {opp.type}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            {opp.date}
                          </span>
                        </div>
                        <p className="text-gray-600">
                          Crashed <span className="font-semibold text-red-600">{opp.crash}</span> during {opp.date}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                          <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Recovered <span className="font-bold text-green-600">{opp.recovery}</span> in {opp.timeframe}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {opp.investment} invested at the dip is now worth {opp.currentValue}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-200">
                          <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-base font-bold text-red-600">
                              You missed {opp.missedWealth} in wealth creation
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              That's {opp.missedWealth} that won't compound for the next 20 years
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Compounding Insight */}
          <div className="mt-16">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-xl">
              <CardContent className="p-8 md:p-12">
                <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
                  <div className="flex-shrink-0">
                    <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center">
                      <Calculator className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      The Power of Buying Dips: 1% Extra Returns = Massive Wealth
                    </h3>
                    <div className="space-y-3 text-gray-700">
                      <p className="text-lg">
                        <span className="font-bold text-blue-600">₹10,000/month SIP</span> for 30 years:
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600">At 12% returns (regular SIP)</p>
                          <p className="text-3xl font-bold text-gray-900">₹3.5 Cr</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                          <p className="text-sm text-gray-600">At 13% returns (buying dips)</p>
                          <p className="text-3xl font-bold text-green-600">₹4.4 Cr</p>
                          <p className="text-sm font-semibold text-green-600 mt-1">₹90L MORE!</p>
                        </div>
                      </div>
                      <p className="text-base text-gray-600 mt-4">
                        Just <span className="font-bold">1% extra annual return</span> from buying dips compounds to{' '}
                        <span className="font-bold text-green-600">₹90 lakhs more wealth</span> over 30 years.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 9-5 Professional Insight */}
          <div className="mt-8 text-center">
            <Card className="border-2 border-gray-200 bg-white shadow-lg inline-block max-w-4xl">
              <CardContent className="p-8">
                <p className="text-lg text-gray-700">
                  <span className="font-bold text-gray-900">For 9-5 professionals:</span> You can't watch the market all day.{' '}
                  <span className="font-semibold text-blue-600">We do it for you.</span>{' '}
                  Get alerts when opportunities appear, invest during your lunch break, and let compounding work for decades.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
