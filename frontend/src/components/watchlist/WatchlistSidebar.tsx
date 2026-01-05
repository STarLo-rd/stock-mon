import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { InlineEdit } from './InlineEdit';
import { useWatchlists, useCreateWatchlist, useUpdateWatchlistMeta, useDeleteWatchlist, useReorderWatchlists, useWatchlistLimits } from '@/hooks/usePrices';
import { useWatchlistContext } from '@/contexts/WatchlistContext';
import { useToast } from '@/hooks/use-toast';
import { Watchlist } from '@/services/api';
import { UpgradeModal } from '@/components/upgrade/UpgradeModal';

interface SortableWatchlistItemProps {
  watchlist: Watchlist;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableWatchlistItem({ watchlist, isSelected, onSelect, onDelete }: SortableWatchlistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: watchlist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const updateMutation = useUpdateWatchlistMeta();
  const { toast } = useToast();

  const handleSave = async (newName: string) => {
    try {
      await updateMutation.mutateAsync({ id: watchlist.id, type: watchlist.type, name: newName });
      toast({
        variant: 'success',
        title: 'Watchlist Renamed',
        description: `Watchlist renamed to "${newName}"`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Rename',
        description: error.response?.data?.error ?? 'Failed to rename watchlist',
      });
      throw error;
    }
  };

  const validateName = (name: string): string | null => {
    // Validation will be handled by backend, but we can add basic checks here
    if (name.length > 100) {
      return 'Name must be less than 100 characters';
    }
    return null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors
        ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
      `}
      onClick={onSelect}
      onDoubleClick={(e) => {
        // Prevent double-click from selecting
        e.stopPropagation();
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={watchlist.name}
          onSave={handleSave}
          className="text-sm font-medium"
          validate={validateName}
        />
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-70 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface WatchlistSidebarProps {
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
}

export function WatchlistSidebar({ type }: WatchlistSidebarProps) {
  const { data: watchlists = [], isLoading } = useWatchlists(type);
  const { data: limits } = useWatchlistLimits();
  const { selectedWatchlistId, setSelectedWatchlistId } = useWatchlistContext();
  const createMutation = useCreateWatchlist();
  const deleteMutation = useDeleteWatchlist();
  const reorderMutation = useReorderWatchlists();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [watchlistToDelete, setWatchlistToDelete] = useState<Watchlist | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-select first watchlist if none selected for this type
  React.useEffect(() => {
    if (!selectedWatchlistId && watchlists.length > 0) {
      const firstWatchlist = watchlists[0];
      // Only auto-select if the watchlist matches the current type
      if (firstWatchlist && firstWatchlist.type === type) {
        setSelectedWatchlistId(firstWatchlist.id);
      }
    }
  }, [watchlists, selectedWatchlistId, setSelectedWatchlistId, type]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = watchlists.findIndex((w) => w.id === active.id);
      const newIndex = watchlists.findIndex((w) => w.id === over.id);

      const newOrder = arrayMove(watchlists, oldIndex, newIndex);
      const watchlistIds = newOrder.map((w) => w.id);

      try {
        await reorderMutation.mutateAsync({ watchlistIds, type });
        toast({
          variant: 'success',
          title: 'Watchlists Reordered',
          description: 'Watchlist order updated successfully',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to Reorder',
          description: error.response?.data?.error ?? 'Failed to reorder watchlists',
        });
      }
    }
  };

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const handleCreate = async () => {
    if (!newWatchlistName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Name',
        description: 'Watchlist name cannot be empty',
      });
      return;
    }

    // Check limit before creating (configurable via env)
    const MAX_WATCHLISTS = limits?.maxWatchlistsPerType ?? 4;
    if (watchlists.length >= MAX_WATCHLISTS) {
      setUpgradeModalOpen(true);
      return;
    }

    try {
      const newWatchlist = await createMutation.mutateAsync({ name: newWatchlistName.trim(), type });
      setSelectedWatchlistId(newWatchlist.id);
      setNewWatchlistName('');
      setDialogOpen(false);
      toast({
        variant: 'success',
        title: 'Watchlist Created',
        description: `"${newWatchlist.name}" has been created`,
      });
    } catch (error: any) {
      // Check if it's a limit error
      if (error.response?.data?.limitReached) {
        setUpgradeModalOpen(true);
      } else {
      toast({
        variant: 'destructive',
        title: 'Failed to Create',
        description: error.response?.data?.error ?? 'Failed to create watchlist',
      });
      }
    }
  };

  const handleDeleteClick = (watchlist: Watchlist) => {
    setWatchlistToDelete(watchlist);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!watchlistToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: watchlistToDelete.id, type: watchlistToDelete.type });
      
      // If deleted watchlist was selected, select first available
      if (selectedWatchlistId === watchlistToDelete.id) {
        const remaining = watchlists.filter((w) => w.id !== watchlistToDelete.id);
        setSelectedWatchlistId(remaining.length > 0 ? remaining[0].id : null);
      }

      setDeleteDialogOpen(false);
      setWatchlistToDelete(null);
      
      toast({
        variant: 'success',
        title: 'Watchlist Deleted',
        description: `"${watchlistToDelete.name}" has been deleted`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Delete',
        description: error.response?.data?.error ?? 'Failed to delete watchlist',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r p-4">
        <div className="text-sm text-muted-foreground">Loading watchlists...</div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Watchlists</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Watchlist</DialogTitle>
                <DialogDescription>
                  Give your watchlist a name to organize your symbols.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Watchlist name..."
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreate();
                    }
                  }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newWatchlistName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {watchlists.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>No {type === 'MUTUAL_FUND' ? 'mutual fund' : type.toLowerCase()} watchlists yet</p>
            <p className="text-xs mt-2">Create one to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={watchlists.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {watchlists.map((watchlist) => (
                  <SortableWatchlistItem
                    key={watchlist.id}
                    watchlist={watchlist}
                    isSelected={selectedWatchlistId === watchlist.id}
                    onSelect={() => setSelectedWatchlistId(watchlist.id)}
                    onDelete={() => handleDeleteClick(watchlist)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Watchlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{watchlistToDelete?.name}"? This will also remove all symbols in this watchlist. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWatchlistToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        limitType="watchlist"
        currentCount={watchlists.length}
        maxLimit={limits?.maxWatchlistsPerType ?? 4}
      />
    </div>
  );
}

