import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

/**
 * ProgressBar Component
 * Visual progress indicator for onboarding steps
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  className = '',
}) => {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

