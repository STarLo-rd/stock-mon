import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ProgressBar } from './ProgressBar';
import { Check, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationsStepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
}

/**
 * NotificationsStep Component
 * Step 4: Enable notifications (Low Friction)
 */
export const NotificationsStep: React.FC<NotificationsStepProps> = ({
  onContinue,
  onBack,
  onSkip,
  currentStep,
  totalSteps,
}) => {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const maskedEmail = email
    ? `${email.split('@')[0].slice(0, 3)}***@${email.split('@')[1]}`
    : 'your email';

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-gray-200 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Where should we send alerts?
            </h2>
            <p className="text-gray-600">
              Choose how you want to receive notifications
            </p>
          </div>

          {/* Email (Already Enabled) */}
          <div className="p-6 border-2 border-green-200 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <p className="font-semibold text-gray-900">Email</p>
                  <span className="text-xs px-2 py-1 bg-green-600 text-white rounded-full">
                    Enabled
                  </span>
                </div>
                <p className="text-sm text-gray-600">{maskedEmail}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Alerts will be sent to this address
                </p>
              </div>
            </div>
          </div>

          {/* Optional Channels */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              Want faster alerts? (Optional)
            </p>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                disabled
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-lg">📱</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Telegram</p>
                    <p className="text-xs text-gray-500">
                      Available in PRO tier
                    </p>
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                disabled
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-lg">💬</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">SMS</p>
                    <p className="text-xs text-gray-500">
                      Available in PRO tier
                    </p>
                  </div>
                </div>
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Email alerts are sufficient to get started. You can enable other
              channels later from settings.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="pt-4">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={onContinue}
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={onSkip}>
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

