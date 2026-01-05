const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const ONBOARDING_STEP_KEY = 'onboarding_current_step';

/**
 * Simplified hook to manage onboarding state
 * Does NOT fetch data - just manages localStorage state
 */
export function useOnboardingStatus() {
  return {
    isCompleted: () => localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true',
    markCompleted: () => {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      localStorage.removeItem(ONBOARDING_STEP_KEY);
    },
    getCurrentStep: () => {
      const step = localStorage.getItem(ONBOARDING_STEP_KEY);
      return step ? parseInt(step, 10) : 1;
    },
    setCurrentStep: (step: number) => {
      localStorage.setItem(ONBOARDING_STEP_KEY, step.toString());
    },
    reset: () => {
      localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      localStorage.removeItem(ONBOARDING_STEP_KEY);
    },
  };
}

