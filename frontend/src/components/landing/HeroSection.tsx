import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { ArrowRight, Play, TrendingDown, Bell, Zap, Check, Users } from 'lucide-react';
import { getLandingStats } from '../../data/landing-stats';

/**
 * HeroSection Component
 * Main hero section with headline, CTAs, and trust indicators
 * Enhanced with animations and engaging visuals
 */
export const HeroSection: React.FC = () => {
  const stats = getLandingStats();
  const [userCount, setUserCount] = useState(stats.userCount);

  // Animated counter for user count
  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSolution = () => {
    const element = document.getElementById('solution-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden min-h-screen flex items-center bg-white">
      {/* Subtle professional background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white">
        {/* Minimal grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        {/* Subtle accent glow - single color, professional */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-24">
        <div className="mx-auto max-w-6xl text-center">
          {/* Professional badge */}
          <div className="mb-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white shadow-sm animate-fade-in">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              For Fund & Stock Investors • 9-5 Professionals
            </span>
          </div>

          {/* Clean, professional headline */}
          <h1 className="text-6xl font-bold tracking-tight sm:text-7xl md:text-8xl animate-fade-in-up mb-8 text-gray-900">
            Buy the Dip,
            <br />
            <span className="text-blue-600">Build Wealth for Decades</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600 sm:text-2xl animate-fade-in-up animation-delay-200 font-normal">
            Get instant alerts when your <span className="text-gray-900 font-semibold">mutual funds or stocks</span> drop 5-20%.{' '}
            <span className="text-gray-900 font-semibold">Perfect for investors building long-term wealth.</span>
          </p>

          {/* Clean, professional demo mockup */}
          <div className="mt-16 flex justify-center animate-fade-in-up animation-delay-400">
            <div className="relative w-full max-w-5xl">
              {/* Subtle shadow */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-100 rounded-3xl"></div>

              <div className="relative rounded-3xl border border-gray-200 bg-white p-6 md:p-10 shadow-2xl">
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl relative overflow-hidden border border-gray-200">
                  {/* Demo visualization */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-6 p-8 w-full">
                      {/* Stock Example */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <div className="px-8 py-6 bg-white rounded-2xl shadow-xl border border-gray-200">
                            <div className="flex items-center gap-4">
                              <TrendingDown className="h-10 w-10 text-red-600" />
                              <div className="text-left">
                                <p className="text-sm text-gray-500 font-medium">TCS</p>
                                <p className="text-3xl font-bold text-red-600">-8.5%</p>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-8 w-8 text-gray-400" />
                          <div className="px-8 py-6 bg-blue-600 rounded-2xl shadow-xl">
                            <div className="flex items-center gap-4">
                              <Bell className="h-10 w-10 text-white" />
                              <div className="text-left text-white">
                                <p className="text-sm font-bold">Alert Sent!</p>
                                <p className="text-xs text-blue-100">Buy opportunity</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">Stock:</span> TCS drops 8% → Alert sent → You buy the dip
                        </p>
                      </div>

                      {/* Mutual Fund Example */}
                      <div className="space-y-3 pt-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <div className="px-8 py-6 bg-white rounded-2xl shadow-xl border border-gray-200">
                            <div className="flex items-center gap-4">
                              <TrendingDown className="h-10 w-10 text-red-600" />
                              <div className="text-left">
                                <p className="text-sm text-gray-500 font-medium">Parag Parikh Flexi Cap</p>
                                <p className="text-3xl font-bold text-red-600">-12.3%</p>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-8 w-8 text-gray-400" />
                          <div className="px-8 py-6 bg-blue-600 rounded-2xl shadow-xl">
                            <div className="flex items-center gap-4">
                              <Bell className="h-10 w-10 text-white" />
                              <div className="text-left text-white">
                                <p className="text-sm font-bold">Alert Sent!</p>
                                <p className="text-xs text-blue-100">Buy opportunity</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">Mutual Fund:</span> Fund drops 12% → Alert sent → You invest more
                        </p>
                      </div>

                      {/* Summary */}
                      <p className="text-base text-gray-600 pt-4">
                        <span className="font-semibold text-gray-900">Real-time monitoring:</span> Stocks & mutual funds drop → Instant alerts → You buy the dip
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional CTAs */}
          <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up animation-delay-600">
            <Button
              size="lg"
              className="w-full sm:w-auto text-lg px-10 py-7 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl font-semibold"
              asChild
            >
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-lg px-10 py-7 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 transition-all duration-200 rounded-xl font-semibold"
              onClick={scrollToSolution}
            >
              <Play className="mr-2 h-5 w-5" />
              See How It Works
            </Button>
          </div>

          {/* Clean trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm animate-fade-in-up animation-delay-800">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-gray-600">10 top mutual funds + All NIFTY50 stocks</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-gray-600">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-gray-900 font-semibold">
                {userCount.toLocaleString()}+ long-term investors
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(50px, 50px) scale(1.05);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-blob {
          animation: blob 20s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animation-delay-6000 {
          animation-delay: 6s;
        }

        .animate-gradient {
          background-size: 300% 300%;
          animation: gradient 6s ease infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
      `}</style>
    </section>
  );
};

