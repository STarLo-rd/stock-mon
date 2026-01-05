import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Star, TrendingUp, Bell, Users } from 'lucide-react';
import { getLandingStats } from '../../data/landing-stats';

/**
 * SocialProofSection Component
 * Focus on long-term investors testimonials
 */
export const SocialProofSection: React.FC = () => {
  const stats = getLandingStats();

  const testimonials = [
    {
      quote: 'Got alert when Parag Parikh Flexi Cap dropped 15% during COVID. Invested ₹2L. Now worth ₹6.5L. Best decision ever.',
      profit: '225% returns in 4 years',
      author: 'Rajesh Kumar',
      location: 'Bangalore • Software Engineer',
      rating: 5,
    },
    {
      quote: 'As a 9-5 professional, I can\'t watch markets. This app does it for me. Caught 3 major dips last year in my SIP funds. Compounding at 14% now instead of 11%.',
      author: 'Priya Sharma',
      location: 'Mumbai • Marketing Manager',
      rating: 5,
    },
    {
      quote: 'Infosys dropped 12% in Oct 2023. Got instant alert, bought 200 shares at ₹1,380. Sold at ₹1,920 when it recovered. Made ₹1.08L in 10 months.',
      profit: '39% returns in 10 months',
      author: 'Amit Patel',
      location: 'Pune • Financial Analyst',
      rating: 5,
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-gray-200 bg-white shadow-sm">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Trusted by Long-Term Investors
              </span>
            </div>
            <h2 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900 mb-6">
              Join {stats.userCount.toLocaleString()}+ Wealth Builders
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Fund & stock investors. Real wealth. Real compounding.
            </p>
          </div>

          {/* Testimonials */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-lg text-gray-900 mb-4 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  {testimonial.profit && (
                    <p className="text-xl font-bold text-green-600 mb-4">
                      {testimonial.profit}
                    </p>
                  )}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats */}
          <Card className="border-2 border-gray-200 bg-white shadow-xl">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full border border-gray-200 bg-gray-50">
                  <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">LIVE STATS</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">
                  Building Wealth Together
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <Bell className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {stats.alertsSentToday}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    opportunities found today
                  </div>
                </div>

                <div className="text-center">
                  <TrendingUp className="h-10 w-10 text-green-600 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {stats.potentialProfitsThisWeek}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    potential wealth added
                  </div>
                </div>

                <div className="text-center">
                  <Star className="h-10 w-10 text-yellow-500 fill-yellow-500 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {stats.rating}/5
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    average rating
                  </div>
                </div>

                <div className="text-center">
                  <Users className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {stats.userCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    long-term investors
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
