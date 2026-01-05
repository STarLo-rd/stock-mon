import React from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { ProblemSection } from '../components/landing/ProblemSection';
import { SolutionSection } from '../components/landing/SolutionSection';
import { SocialProofSection } from '../components/landing/SocialProofSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { FAQSection } from '../components/landing/FAQSection';
import { FinalCTASection } from '../components/landing/FinalCTASection';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

/**
 * Landing Page Component
 * Main landing page with all sections for unauthenticated users
 */
const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">📈 Market Crash Monitor</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <SocialProofSection />
        <FeaturesSection />
        <FAQSection />
        <FinalCTASection />
      </main>

      {/* Footer - Professional Design */}
      <footer className="border-t border-gray-200 bg-gray-50">
        {/* Trust Signals Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Security & Privacy */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🔒</span> Security & Privacy
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Data encrypted with AES-256</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>No access to your brokerage account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>We NEVER ask for trading passwords</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>GDPR compliant</span>
                </li>
              </ul>
            </div>

            {/* Disclaimer */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">⚖️</span> Important Disclaimer
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  We provide <span className="font-semibold text-gray-900">alerts only</span>, not investment advice.
                </p>
                <p>
                  Past performance doesn't guarantee future results. All investment decisions are your responsibility.
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  <span className="font-semibold">Market data source:</span> NSE India (real-time pricing)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm text-gray-600">
                  © {new Date().getFullYear()} Market Crash Monitor. All rights reserved.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <Link to="/login" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Sign Up
                </Link>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

