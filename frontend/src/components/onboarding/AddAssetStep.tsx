import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ProgressBar } from './ProgressBar';
import { Autocomplete } from '../ui/autocomplete';
import { useSymbolSearch } from '../../hooks/useSymbolSearch';
import { popularStocks, popularMutualFunds, PopularAsset } from '../../data/popular-assets';
import { Check, Plus, ArrowRight, ArrowLeft, TrendingUp, Loader2, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { useOnboardingWatchlist } from '../../hooks/useOnboardingWatchlist';

interface AddAssetStepProps {
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
}

/**
 * AddAssetStep Component
 * Step 2: Quick win - add first stock/fund (Endowed Progress)
 * Simplified architecture with custom hook for watchlist management
 */
export const AddAssetStep: React.FC<AddAssetStepProps> = ({
  onContinue,
  onBack,
  onSkip,
  currentStep,
  totalSteps,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [assetType, setAssetType] = useState<'STOCK' | 'MUTUAL_FUND'>('STOCK');

  const {
    watchlistId,
    watchlistItems,
    loadingWatchlists,
    loadingItems,
    watchlistError,
    hasAssets,
    isProcessing,
    addAsset,
    removeAsset,
  } = useOnboardingWatchlist(assetType);

  const { data: searchResults = [] } = useSymbolSearch(searchQuery, assetType);

  /**
   * Handle popular asset click
   */
  const handlePopularAssetClick = async (asset: PopularAsset) => {
    try {
      await addAsset(asset.symbol, asset.name);
    } catch (error) {
      // Error handled by hook
    }
  };

  /**
   * Handle search result selection
   */
  const handleSearchSelect = async (option: any) => {
    try {
      await addAsset(option.symbol, option.name);
      setSearchQuery('');
    } catch (error) {
      // Error handled by hook
    }
  };

  /**
   * Handle asset removal
   */
  const handleRemoveAsset = async (symbol: string) => {
    await removeAsset(symbol);
  };

  /**
   * Check if asset is already in watchlist
   */
  const isAssetInWatchlist = (symbol: string): boolean => {
    return watchlistItems.some((item) => item.symbol === symbol);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur">
      <CardContent className="p-8 md:p-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-block p-3 bg-blue-100 rounded-full mb-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Add your first asset to watch
            </h2>
            <p className="text-gray-600 text-lg">
              Choose from popular options or search for your favorite
            </p>
          </div>

          {/* Loading State */}
          {loadingWatchlists && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading watchlists...</span>
            </div>
          )}

          {/* Error State */}
          {watchlistError && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">
                Unable to load watchlists. Please refresh and try again.
              </p>
            </div>
          )}

          {!loadingWatchlists && !watchlistError && (
            <>
              {/* Asset Type Toggle */}
              <div className="flex gap-3 justify-center">
                <Button
                  variant={assetType === 'STOCK' ? 'default' : 'outline'}
                  onClick={() => setAssetType('STOCK')}
                  className={assetType === 'STOCK' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 px-8' : 'px-8'}
                  disabled={isProcessing}
                >
                  📈 Stocks
                </Button>
                <Button
                  variant={assetType === 'MUTUAL_FUND' ? 'default' : 'outline'}
                  onClick={() => setAssetType('MUTUAL_FUND')}
                  className={assetType === 'MUTUAL_FUND' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 px-8' : 'px-8'}
                  disabled={isProcessing}
                >
                  💼 Mutual Funds
                </Button>
              </div>

              {/* Success Message - Show when we have items */}
              {hasAssets && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-green-600 rounded-full p-2">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-center mb-3">
                        <p className="font-bold text-green-900 text-lg mb-1">
                          🎉 Congratulations!
                        </p>
                        <p className="text-green-800 text-sm">
                          You're watching {watchlistItems.length} {assetType === 'STOCK' ? 'stock' : 'mutual fund'}{watchlistItems.length > 1 ? 's' : ''} in your watchlist
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {watchlistItems.slice(0, 5).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-green-200 text-sm shadow-sm"
                            >
                              <span className="font-medium text-gray-900">
                                {item.name ?? item.symbol}
                              </span>
                              <button
                                onClick={() => handleRemoveAsset(item.symbol)}
                                disabled={isProcessing}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded p-0.5 transition-colors"
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {watchlistItems.length > 5 && (
                            <div className="px-3 py-1.5 bg-white rounded-lg border border-green-200 text-sm text-gray-600">
                              +{watchlistItems.length - 5} more
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-green-700 text-center">
                          💡 Continue to add more assets or proceed to the next step
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Popular Choices */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  Popular choices:
                </p>
                <div className={`grid gap-3 ${assetType === 'MUTUAL_FUND' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                  {(assetType === 'STOCK' ? popularStocks : popularMutualFunds).map(
                    (asset) => {
                      const isSelected = isAssetInWatchlist(asset.symbol);
                      const displayText = assetType === 'MUTUAL_FUND' ? asset.name : asset.symbol;
                      
                      return (
                        <Button
                          key={asset.symbol}
                          variant={isSelected ? 'default' : 'outline'}
                          size="lg"
                          onClick={() => !isSelected && handlePopularAssetClick(asset)}
                          disabled={isSelected || isProcessing}
                          className={
                            isSelected
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg'
                              : 'hover:bg-gray-50 hover:border-blue-300 transition-all'
                          }
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="truncate text-left">{displayText}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="truncate text-left">{displayText}</span>
                            </>
                          )}
                        </Button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Or search:</p>
                <Autocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={handleSearchSelect}
                  options={searchResults.map((result) => ({
                    symbol: result.symbol,
                    name: result.name,
                    type: result.type,
                    exchange: result.exchange,
                  }))}
                  loading={false}
                  placeholder={`Search ${assetType === 'STOCK' ? 'stocks' : 'mutual funds'}...`}
                />
              </div>


              {/* Show empty state when no watchlist exists yet */}
              {!watchlistId && !loadingWatchlists && (
                <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="text-center py-4">
                    <p className="text-blue-900 font-medium mb-2">
                      📋 Ready to create your watchlist
                    </p>
                    <p className="text-sm text-gray-600">
                      Select an asset above to create your {assetType === 'STOCK' ? 'stocks' : 'mutual funds'} watchlist
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

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
              disabled={isProcessing}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
            <div className="flex flex-1 gap-3">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg"
                onClick={onContinue}
                disabled={!hasAssets || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onSkip}
                disabled={isProcessing}
              >
                Skip
              </Button>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-center text-gray-500">
            💡 Tip: You can add more assets later from your dashboard
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
