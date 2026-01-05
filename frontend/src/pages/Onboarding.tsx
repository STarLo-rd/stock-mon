import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeStep } from '../components/onboarding/WelcomeStep';
import { AddAssetStep } from '../components/onboarding/AddAssetStep';
import { SetAlertsStep } from '../components/onboarding/SetAlertsStep';
import { NotificationsStep } from '../components/onboarding/NotificationsStep';
import { CelebrationStep } from '../components/onboarding/CelebrationStep';
import { useOnboardingStatus } from '../hooks/useOnboarding';
import { useMarket } from '../components/market-provider';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const TOTAL_STEPS = 5;

/**
 * Onboarding Page
 * Psychology-driven onboarding flow for new users
 */
const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { market } = useMarket();
  const { setCurrentStep, getCurrentStep, markCompleted } = useOnboardingStatus();
  const [currentStep, setStep] = useState(getCurrentStep());
  const [selectedThresholds, setSelectedThresholds] = useState<number[]>([5, 10, 15, 20]); // All selected by default
  
  // Only fetch watchlists when on step 2 (AddAssetStep) or step 5 (CelebrationStep)
  // This prevents unnecessary API calls on other steps
  // Note: AddAssetStep will fetch its own watchlists, so we only need them here for step 5
  const shouldFetchWatchlists = currentStep === 5;
  
  // Use React Query directly with enabled flag to prevent unnecessary calls
  const { data: stockWatchlists = [] } = useQuery({
    queryKey: ['watchlists', 'STOCK', market],
    queryFn: async () => {
      const response = await api.watchlists.getAll('STOCK', market);
      return response.data;
    },
    enabled: shouldFetchWatchlists,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  
  const { data: mfWatchlists = [] } = useQuery({
    queryKey: ['watchlists', 'MUTUAL_FUND', market],
    queryFn: async () => {
      const response = await api.watchlists.getAll('MUTUAL_FUND', market);
      return response.data;
    },
    enabled: shouldFetchWatchlists,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  
  const allWatchlists = [...stockWatchlists, ...mfWatchlists];
  
  // Query to count total items across all watchlists
  // Only enabled when needed (step 5) and watchlists are available
  const { data: totalItems = 0 } = useQuery({
    queryKey: ['onboarding-item-count', allWatchlists.map(w => w.id).join(','), market],
    queryFn: async () => {
      if (allWatchlists.length === 0) return 0;
      
      const counts = await Promise.all(
        allWatchlists.map(async (watchlist) => {
          try {
            const itemsResponse = await api.watchlist.getAll(watchlist.id, false, market);
            return itemsResponse.data?.length ?? 0;
          } catch {
            return 0;
          }
        })
      );
      
      return counts.reduce((sum, count) => sum + count, 0);
    },
    enabled: currentStep === 5 && allWatchlists.length > 0, // Only fetch on celebration step
    staleTime: 30000, // Cache for 30 seconds
  });

  // Save step to localStorage
  useEffect(() => {
    setCurrentStep(currentStep);
  }, [currentStep, setCurrentStep]);

  const handleContinue = () => {
    if (currentStep < TOTAL_STEPS) {
      setStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < TOTAL_STEPS) {
      setStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    markCompleted();
    navigate('/dashboard');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <WelcomeStep
            onContinue={handleContinue}
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
          />
        );
      case 2:
        return (
          <AddAssetStep
            onContinue={handleContinue}
            onBack={handleBack}
            onSkip={handleSkip}
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
          />
        );
      case 3:
        return (
          <SetAlertsStep
            onContinue={handleContinue}
            onBack={handleBack}
            onSkip={handleSkip}
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onThresholdsChange={setSelectedThresholds}
          />
        );
      case 4:
        return (
          <NotificationsStep
            onContinue={handleContinue}
            onBack={handleBack}
            onSkip={handleSkip}
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
          />
        );
      case 5:
        return (
          <CelebrationStep
            onComplete={handleComplete}
            watchlistCount={Math.max(totalItems, 1)}
            thresholds={selectedThresholds}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {renderStep()}
      </div>
    </div>
  );
};

export default Onboarding;

