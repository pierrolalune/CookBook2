import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingListItem, 
  CreateShoppingListItemInput, 
  UpdateShoppingListItemInput
} from '../types';
import { ShoppingListItemRepository } from '../repositories/ShoppingListItemRepository';
import { SecureErrorHandler } from '../utils/errorHandler';
import { ShoppingListUtils } from '../utils/shoppingListUtils';

interface ShoppingListItemsState {
  items: ShoppingListItem[];
  loading: boolean;
  error: string | null;
}

interface UseShoppingListItemsActions {
  loadItems: (shoppingListId: string) => Promise<void>;
  updateItem: (input: UpdateShoppingListItemInput) => Promise<ShoppingListItem>;
  deleteItem: (id: string) => Promise<void>;
  toggleItemCompletion: (id: string) => Promise<void>;
  clearCompletedItems: (shoppingListId: string) => Promise<void>;
  uncheckAllItems: (shoppingListId: string) => Promise<void>;
  updateItemsInMemory: (updatedItems: ShoppingListItem[]) => void;
  clearError: () => void;
}

interface UseShoppingListItemsReturn {
  items: ShoppingListItem[];
  loading: boolean;
  error: string | null;
  completedItemsCount: number;
  totalItemsCount: number;
  hasCompletedItems: boolean;
  allItemsCompleted: boolean;
  itemsByCategory: { [category: string]: ShoppingListItem[] };
  actions: UseShoppingListItemsActions;
}

export const useShoppingListItems = (): UseShoppingListItemsReturn => {
  const [state, setState] = useState<ShoppingListItemsState>({
    items: [],
    loading: false,
    error: null
  });

  // Create repository once and memoize
  const repository = useMemo(() => new ShoppingListItemRepository(), []);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<ShoppingListItemsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Load items for a shopping list
  const loadItems = useCallback(async (shoppingListId: string) => {
    try {
      updateState({ loading: true, error: null });
      const items = await repository.findByShoppingListId(shoppingListId);
      updateState({ items, loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ 
        error: errorMessage, 
        loading: false,
        items: [] // Clear items on error
      });
      SecureErrorHandler.logError(error as Error, { 
        action: 'loadItems', 
        resource: 'shopping_list_items'
      });
    }
  }, [repository, updateState]);

  // Update item (with optimistic updates)
  const updateItem = useCallback(async (input: UpdateShoppingListItemInput): Promise<ShoppingListItem> => {
    try {
      // Optimistic update for completion toggle
      if (input.isCompleted !== undefined) {
        setState(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === input.id 
              ? { ...item, isCompleted: input.isCompleted! }
              : item
          )
        }));
      }

      const updated = await repository.update(input);
      
      // Update with actual data from database
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === input.id ? updated : item
        ),
        error: null
      }));
      
      return updated;
    } catch (error) {
      // Revert optimistic update on error
      await loadItems(state.items[0]?.shoppingListId || '');
      
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage });
      SecureErrorHandler.logError(error as Error, { 
        action: 'updateItem', 
        resource: 'shopping_list_items'
      });
      throw error;
    }
  }, [repository, state.items, loadItems]);

  // Delete item
  const deleteItem = useCallback(async (id: string): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      await repository.delete(id);
      
      // Remove from current list
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'deleteItem', 
        resource: 'shopping_list_items'
      });
      throw error;
    }
  }, [repository]);

  // Toggle item completion (optimistic updates)
  const toggleItemCompletion = useCallback(async (id: string): Promise<void> => {
    try {
      const currentItem = state.items.find(item => item.id === id);
      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Optimistic update
      const newCompletionStatus = !currentItem.isCompleted;
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id 
            ? { ...item, isCompleted: newCompletionStatus }
            : item
        )
      }));

      // Update in database
      await repository.toggleCompleted(id);
    } catch (error) {
      // Revert optimistic update on error
      await loadItems(state.items[0]?.shoppingListId || '');
      
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage });
      SecureErrorHandler.logError(error as Error, { 
        action: 'toggleItemCompletion', 
        resource: 'shopping_list_items'
      });
      throw error;
    }
  }, [repository, state.items, loadItems]);

  // Clear completed items
  const clearCompletedItems = useCallback(async (shoppingListId: string): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      await repository.clearCompleted(shoppingListId);
      
      // Remove completed items from current list
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => !item.isCompleted),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'clearCompletedItems', 
        resource: 'shopping_list_items'
      });
      throw error;
    }
  }, [repository]);

  // Uncheck all completed items
  const uncheckAllItems = useCallback(async (shoppingListId: string): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      // Get all completed item IDs
      const completedItemIds = state.items.filter(item => item.isCompleted).map(item => item.id);
      
      if (completedItemIds.length === 0) {
        updateState({ loading: false });
        return;
      }

      // Optimistic update
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.isCompleted ? { ...item, isCompleted: false } : item
        ),
        loading: false
      }));

      // Update in database
      await repository.bulkUpdateCompleted(completedItemIds, false);
    } catch (error) {
      // Revert optimistic update on error
      await loadItems(shoppingListId);
      
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'uncheckAllItems', 
        resource: 'shopping_list_items'
      });
      throw error;
    }
  }, [repository, state.items, loadItems]);

  // Update items in memory (for external updates like reordering)
  const updateItemsInMemory = useCallback((updatedItems: ShoppingListItem[]) => {
    updateState({ items: updatedItems });
  }, [updateState]);

  // Computed values
  const completedItemsCount = useMemo(() => 
    state.items.filter(item => item.isCompleted).length, 
    [state.items]
  );

  const totalItemsCount = useMemo(() => 
    state.items.length, 
    [state.items]
  );

  const hasCompletedItems = useMemo(() => 
    completedItemsCount > 0, 
    [completedItemsCount]
  );

  const allItemsCompleted = useMemo(() => 
    totalItemsCount > 0 && completedItemsCount === totalItemsCount, 
    [totalItemsCount, completedItemsCount]
  );

  const itemsByCategory = useMemo(() => 
    ShoppingListUtils.groupItemsByCategory(state.items), 
    [state.items]
  );

  // Actions object
  const actions: UseShoppingListItemsActions = useMemo(() => ({
    loadItems,
    updateItem,
    deleteItem,
    toggleItemCompletion,
    clearCompletedItems,
    uncheckAllItems,
    updateItemsInMemory,
    clearError
  }), [
    loadItems,
    updateItem,
    deleteItem,
    toggleItemCompletion,
    clearCompletedItems,
    uncheckAllItems,
    updateItemsInMemory,
    clearError
  ]);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    completedItemsCount,
    totalItemsCount,
    hasCompletedItems,
    allItemsCompleted,
    itemsByCategory,
    actions
  };
}