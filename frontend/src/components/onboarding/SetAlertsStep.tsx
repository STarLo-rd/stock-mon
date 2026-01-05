import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ProgressBar } from './ProgressBar';
import { Checkbox } from '../ui/checkbox';
import { ArrowRight, ArrowLeft, Bell, TrendingDown, AlertTriangle } from 'lucide-react';

interface SetAlertsStepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
  onThresholdsChange?: (thresholds: number[]) => void;
}

/**
 * SetAlertsStep Component
 * Step 3: Set alert thresholds (Compact single-page design)
 */
export const SetAlertsStep: React.FC<SetAlertsStepProps> = ({
  onContinue,
  onBack,
  onSkip,
  currentStep,
  totalSteps,
  onThresholdsChange,
}) => {
  const [thresholds, setThresholds] = useState<number[]>([5, 10, 15, 20]); // All selected by default (free stage)

  const handleThresholdToggle = (threshold: number) => {
    setThresholds((prev) => {
      const newThresholds = prev.includes(threshold)
        ? prev.filter((t) => t !== threshold)
        : [...prev, threshold].sort((a, b) => a - b);
      
      if (onThresholdsChange) {
        onThresholdsChange(newThresholds);
      }
      
      return newThresholds;
    });
  };

  const thresholdConfig = [
    { value: 5, label: 'Mild correction', icon: TrendingDown, color: 'yellow', description: 'Small moves' },
    { value: 10, label: 'Major opportunity', icon: Bell, color: 'orange', description: 'Most popular' },
    { value: 15, label: 'Significant crash', icon: AlertTriangle, color: 'red', description: 'Large drops' },
    { value: 20, label: 'Critical crash', icon: AlertTriangle, color: 'red', description: 'Extreme' },
  ];

  return (
    <Card className="w-full max-w-3xl mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur">
      <CardContent className="p-6 md:p-8">
        <div className="space-y-4">
          {/* Compact Header */}
          <div className="text-center space-y-2">
            <div className="inline-block p-2 bg-orange-100 rounded-full">
              <Bell className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              When should we alert you?
            </h2>
            <p className="text-gray-600 text-sm">
              Choose crash thresholds that match your strategy
            </p>
          </div>

          {/* All Thresholds in Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {thresholdConfig.map((config) => (
              <div
                key={config.value}
                className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  thresholds.includes(config.value)
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => handleThresholdToggle(config.value)}
              >
                <Checkbox
                  checked={thresholds.includes(config.value)}
                  onCheckedChange={() => handleThresholdToggle(config.value)}
                  className="h-5 w-5"
                />
                <div className={`p-1.5 rounded-lg ${
                  config.color === 'yellow' ? 'bg-yellow-100' :
                  config.color === 'orange' ? 'bg-orange-100' : 'bg-red-100'
                }`}>
                  <config.icon className={`h-4 w-4 ${
                    config.color === 'yellow' ? 'text-yellow-600' :
                    config.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    {config.value}% drop
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {config.label} • {config.description}
                  </p>
                </div>
                {thresholds.includes(config.value) && (
                  <div className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Combined Info Box */}
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">🎁</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 font-semibold mb-1">
                  All thresholds enabled (Free Stage)
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  During our free launch, all thresholds are enabled. You can customize these later from settings.
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-2">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              size="lg"
              variant="outline"
              onClick={onBack}
              className="sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <div className="flex flex-1 gap-3">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg"
                onClick={onContinue}
                disabled={thresholds.length === 0}
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onSkip}
              >
                Skip
              </Button>
            </div>
          </div>

          {/* Helper text */}
          {thresholds.length === 0 && (
            <p className="text-xs text-center text-red-600">
              Please select at least one threshold to continue
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
