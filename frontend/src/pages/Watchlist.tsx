import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Trash2, Power, TrendingUp, Building2, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWatchlist, useCurrentPrices, useAddToWatchlist, useRemoveFromWatchlist, useUpdateWatchlistItem, useWatchlists, useWatchlistLimits } from '../hooks/usePrices';
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete';
import { useSymbolSearch } from '../hooks/useSymbolSearch';
import { useToast } from '../hooks/use-toast';
import { useWatchlistContext } from '../contexts/WatchlistContext';
import { WatchlistSidebar } from '../components/watchlist/WatchlistSidebar';
import { api } from '../services/api';
import { UpgradeModal } from '../components/upgrade/UpgradeModal';

/**
 * Watchlist Page - Type-Specific Watchlists
 * TradingView-style: Type tabs at top, watchlists sidebar, symbols table
 */
const Watchlist: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [symbolToDelete, setSymbolToDelete] = useState<{ symbol: string; name?: string } | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [newSymbolDisplay, setNewSymbolDisplay] = useState('');
  const [actualSymbol, setActualSymbol] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const navigate = useNavigate();

  const { selectedType, setSelectedType, selectedWatchlistId, setSelectedWatchlistId } = useWatchlistContext();

  // Get watchlists for current type (used for display name)
  const { data: watchlists = [] } = useWatchlists(selectedType);

  // Use React Query hooks
  const { data: watchlist = [], isLoading: watchlistLoading } = useWatchlist(selectedWatchlistId);
  const { data: pricesData = [], isLoading: pricesLoading } = useCurrentPrices();
  const { data: limits } = useWatchlistLimits();
  
  // Convert prices array to Map for easy lookup
  const prices = useMemo(() => {
    const priceMap = new Map<string, number>();
    pricesData.forEach((item) => {
      if (item.price && item.price > 0) {
        priceMap.set(item.symbol, item.price);
      }
    });
    return priceMap;
  }, [pricesData]);

  // Mutations
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const updateMutation = useUpdateWatchlistItem();
  const { toast } = useToast();

  const loading = watchlistLoading || pricesLoading;

  // Calculate statistics for current watchlist
  const stats = useMemo(() => {
    return {
      total: watchlist.length,
      active: watchlist.filter(item => item.active).length,
      inactive: watchlist.filter(item => !item.active).length,
    };
  }, [watchlist]);

  // Filter watchlist by status
  const filteredWatchlist = useMemo(() => {
    return watchlist.filter(item => {
      const statusMatch = filter === 'all' ||
        (filter === 'active' && item.active) ||
        (filter === 'inactive' && !item.active);
      
      return statusMatch;
    });
  }, [watchlist, filter]);

  // Symbol search for autocomplete - use selectedType
  const { data: searchResults = [], isLoading: searching } = useSymbolSearch(newSymbol, selectedType);
  
  const [addError, setAddError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const handleSymbolSelect = (option: AutocompleteOption) => {
    // For mutual funds, display the name but keep the symbol (scheme code) for submission
    if (option.type === 'MUTUAL_FUND' && option.name) {
      setNewSymbolDisplay(option.name);
      setActualSymbol(option.symbol);
    } else {
      setNewSymbolDisplay(option.symbol);
      setActualSymbol(option.symbol);
    }
    setNewSymbol(option.symbol);
    setSelectedName(option.name ?? null);
    setAddError(null);
  };

  const handleAdd = async () => {
    if (!selectedWatchlistId) {
      toast({
        variant: 'destructive',
        title: 'No Watchlist Selected',
        description: 'Please select a watchlist first',
      });
      return;
    }

    const symbolToSubmit = actualSymbol || newSymbol;
    
    if (!symbolToSubmit.trim()) {
      setAddError('Please enter a symbol');
      return;
    }

    // Check limit before adding (configurable via env)
    const MAX_ITEMS = limits?.maxItemsPerWatchlist ?? 8;
    if (watchlist.length >= MAX_ITEMS) {
      setUpgradeModalOpen(true);
      return;
    }

    setIsValidating(true);
    setAddError(null);

    try {
      // Validate symbol first
      const validation = await api.symbols.validate(symbolToSubmit.toUpperCase(), selectedType);
      if (!validation.valid) {
        setAddError(validation.error || 'Invalid symbol');
        setIsValidating(false);
        return;
      }

      // Get name from search results if available
      const selectedResult = searchResults.find(r => r.symbol === symbolToSubmit.toUpperCase());
      const nameToUse = selectedName || selectedResult?.name;

      // Add to watchlist
      await addMutation.mutateAsync({
        watchlistId: selectedWatchlistId,
        symbol: symbolToSubmit.toUpperCase(),
        type: selectedType,
        name: nameToUse,
      });
      
      // Show success toast
      const displayName = nameToUse || symbolToSubmit.toUpperCase();
      toast({
        variant: 'success',
        title: 'Symbol Added',
        description: `${displayName} has been added to your watchlist successfully.`,
      });
      
      setNewSymbol('');
      setNewSymbolDisplay('');
      setActualSymbol('');
      setSelectedName(null);
      setAddError(null);
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to add symbol:', error);
      // Check if it's a limit error
      if (error.response?.data?.limitReached) {
        setUpgradeModalOpen(true);
      } else if (error.response?.data?.requiresUpgrade) {
        // Subscription restriction - show upgrade modal
        setUpgradeModalOpen(true);
        const errorMessage = error.response?.data?.error ?? 'This asset is not available in your current plan';
        toast({
          variant: 'destructive',
          title: 'Upgrade Required',
          description: errorMessage,
        });
      } else {
        const errorMessage = error.response?.data?.error ?? 'Failed to add symbol';
        setAddError(errorMessage);
        
        toast({
          variant: 'destructive',
          title: 'Failed to Add Symbol',
          description: errorMessage,
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveClick = (symbol: string, name?: string) => {
    setSymbolToDelete({ symbol, name });
    setDeleteDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!selectedWatchlistId || !symbolToDelete) return;

    try {
      await removeMutation.mutateAsync({
        watchlistId: selectedWatchlistId,
        symbol: symbolToDelete.symbol,
      });
      
      const displayName = symbolToDelete.name || symbolToDelete.symbol;
      toast({
        variant: 'success',
        title: 'Symbol Removed',
        description: `${displayName} has been removed from your watchlist.`,
      });
      
      setDeleteDialogOpen(false);
      setSymbolToDelete(null);
    } catch (error: any) {
      console.error('Failed to remove symbol:', error);
      
      toast({
        variant: 'destructive',
        title: 'Failed to Remove',
        description: error.response?.data?.error ?? 'Failed to remove symbol from watchlist.',
      });
      
      setDeleteDialogOpen(false);
      setSymbolToDelete(null);
    }
  };

  const handleToggleActive = async (symbol: string, currentActive: boolean) => {
    if (!selectedWatchlistId) return;

    try {
      await updateMutation.mutateAsync({
        watchlistId: selectedWatchlistId,
        symbol,
        active: !currentActive,
      });
    } catch (error: any) {
      console.error('Failed to update symbol:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Update',
        description: error.response?.data?.error ?? 'Failed to update symbol',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Type Tabs at Top */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as 'INDEX' | 'STOCK' | 'MUTUAL_FUND')}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="INDEX" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Indices</span>
                <span className="sm:hidden">Idx</span>
              </TabsTrigger>
              <TabsTrigger value="MUTUAL_FUND" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Mutual Funds</span>
                <span className="sm:hidden">MF</span>
              </TabsTrigger>
              <TabsTrigger value="STOCK" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                Stocks
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile, visible on desktop */}
        <div className="hidden lg:block">
          <WatchlistSidebar type={selectedType} />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Mobile watchlist selector - visible on mobile, hidden on desktop */}
          <div className="lg:hidden mb-4">
            <Card>
              <CardContent className="pt-6">
                <Select
                  value={selectedWatchlistId ?? ''}
                  onValueChange={(value) => setSelectedWatchlistId(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a watchlist">
                      {watchlists.find(w => w.id === selectedWatchlistId)?.name || 'Select a watchlist'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {watchlists.map((watchlist) => (
                      <SelectItem key={watchlist.id} value={watchlist.id}>
                        {watchlist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
          
          {!selectedWatchlistId ? (
            <div className="flex items-center justify-center h-full">
              <Card className="w-full max-w-md">
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    No watchlist selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {watchlists.length === 0 
                      ? 'Create a new watchlist to get started'
                      : 'Select a watchlist from above or create a new one'}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-h1 sm:text-display-sm font-bold tracking-tight">
                    {watchlists.find(w => w.id === selectedWatchlistId)?.name || 'Watchlist'}
                  </h1>
                  <p className="text-body-sm sm:text-body text-muted-foreground mt-2">
                    {stats.total} {stats.total === 1 ? 'symbol' : 'symbols'} • {stats.active} active
                  </p>
                </div>
                <Dialog 
                  open={dialogOpen} 
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                      setNewSymbol('');
                      setNewSymbolDisplay('');
                      setActualSymbol('');
                      setSelectedName(null);
                      setAddError(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Symbol
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add {selectedType === 'MUTUAL_FUND' ? 'Mutual Fund' : selectedType === 'INDEX' ? 'Index' : 'Stock'} to Watchlist</DialogTitle>
                      <DialogDescription>
                        Add a new {selectedType === 'MUTUAL_FUND' ? 'mutual fund' : selectedType.toLowerCase()} to monitor for crash alerts.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Symbol</label>
                        <Autocomplete
                          value={newSymbolDisplay || newSymbol}
                          onChange={(value) => {
                            setNewSymbolDisplay(value);
                            setNewSymbol(value);
                            const matchesOption = searchResults.some(
                              opt => opt.symbol === value || (opt.name && opt.name === value)
                            );
                            if (!matchesOption) {
                              setActualSymbol('');
                            }
                            setAddError(null);
                          }}
                          onSelect={handleSymbolSelect}
                          options={searchResults}
                          loading={searching}
                          placeholder={`Search ${selectedType === 'INDEX' ? 'indices' : selectedType === 'MUTUAL_FUND' ? 'mutual funds' : 'stocks'}...`}
                        />
                        {addError && (
                          <p className="text-sm text-destructive mt-1">{addError}</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAdd} disabled={isValidating || !newSymbol.trim()}>
                        {isValidating ? 'Adding...' : 'Add'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Status Filter */}
              <Card>
                <CardContent className="pt-6">
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'active' | 'inactive')}>
                    <TabsList>
                      <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                      <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
                      <TabsTrigger value="inactive">Inactive ({stats.inactive})</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Symbols Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Symbols</CardTitle>
                  <CardDescription>
                    {filteredWatchlist.length} {filter === 'all' ? '' : filter} symbols
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Current Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWatchlist.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              {watchlist.length === 0 ? (
                                <div>
                                  <p className="mb-2">No symbols in this watchlist</p>
                                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Symbol
                                  </Button>
                                </div>
                              ) : (
                                `No ${filter === 'all' ? '' : filter} symbols found`
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredWatchlist.map((item) => (
                            <TableRow 
                              key={item.id} 
                              className={`hover:bg-muted/50 transition-colors ${
                                item.type === 'INDEX' ? 'bg-blue-50/30 dark:bg-blue-950/10' :
                                item.type === 'MUTUAL_FUND' ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                              }`}
                            >
                              <TableCell className="font-medium">
                                <div className="flex flex-col gap-1">
                                  {item.type === 'MUTUAL_FUND' && item.name ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-purple-500" />
                                        <span className="font-semibold">{item.name}</span>
                                      </div>
                                      <span className="text-sm text-muted-foreground ml-6 font-mono">
                                        Scheme Code: {item.symbol}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        {item.type === 'INDEX' ? (
                                          <TrendingUp className="h-4 w-4 text-blue-500" />
                                        ) : (
                                          <Building2 className="h-4 w-4 text-green-600" />
                                        )}
                                        <span className="font-semibold">{item.symbol}</span>
                                      </div>
                                      {item.name && (
                                        <span className="text-sm text-muted-foreground ml-6 truncate max-w-md" title={item.name}>
                                          {item.name}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono">
                                {prices.has(item.symbol) ? (
                                  <span className="font-semibold">₹{prices.get(item.symbol)!.toFixed(2)}</span>
                                ) : (
                                  <span className="text-muted-foreground">Loading...</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.active ? 'default' : 'secondary'}>
                                  {item.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/symbol/${item.symbol}`);
                                    }}
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleActive(item.symbol, item.active);
                                    }}
                                    title={item.active ? 'Deactivate' : 'Activate'}
                                  >
                                    <Power className={`h-4 w-4 ${item.active ? 'text-green-600' : 'text-gray-400'}`} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveClick(item.symbol, item.name);
                                    }}
                                    title="Remove"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Delete Confirmation Dialog */}
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove from Watchlist?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove{' '}
                      <span className="font-semibold">
                        {symbolToDelete?.name || symbolToDelete?.symbol}
                      </span>
                      {symbolToDelete?.name && (
                        <span className="text-xs text-muted-foreground block mt-1 font-mono">
                          ({symbolToDelete.symbol})
                        </span>
                      )}
                      {' '}from your watchlist? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSymbolToDelete(null)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveConfirm}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        limitType="watchlist_item"
        currentCount={watchlist.length}
        maxLimit={limits?.maxItemsPerWatchlist ?? 8}
      />
    </div>
  );
};

export default Watchlist;
