import { useState, useCallback } from 'react';
import { ShoppingListRepository } from '../repositories/ShoppingListRepository';
import { SecureErrorHandler } from '../utils/errorHandler';
import {
  ShoppingListItem,
  UpdateShoppingListItemInput,
  ShoppingListFilters
} from '../types';

interface ShoppingListItemsState {
  items: ShoppingListItem[];
  loading: boolean;
  error: string | null;
}

interface ShoppingListItemsActions {
  loadItems: (listId: string, filters?: ShoppingListFilters) => Promise<void>;
  updateItem: (input: UpdateShoppingListItemInput) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleItemCompletion: (id: string) => Promise<void>;
  clearCompletedItems: (listId: string) => Promise<void>;
  updateItemsInMemory: (updatedItems: ShoppingListItem[]) => void;
  clearError: () => void;
}

export const useShoppingListItems = () => {
  const [state, setState] = useState<ShoppingListItemsState>({
    items: [],
    loading: false,
    error: null
  });

  const repository = new ShoppingListRepository();

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const loadItems = useCallback(async (listId: string, filters: ShoppingListFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const items = await repository.findItemsByListId(listId, filters);
      
      setState(prev => ({
        ...prev,
        items,
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'loadItems',
        resource: listId
      });
    }
  }, [repository, setLoading, setError]);

  const updateItem = useCallback(async (input: UpdateShoppingListItemInput): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await repository.updateItem(input);
      
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.id === input.id) {
            return {
              ...item,
              ...(input.quantity !== undefined && { quantity: input.quantity }),
              ...(input.unit !== undefined && { unit: input.unit }),
              ...(input.isCompleted !== undefined && { isCompleted: input.isCompleted }),
              ...(input.notes !== undefined && { notes: input.notes }),
              ...(input.orderIndex !== undefined && { orderIndex: input.orderIndex })
            };
          }
          return item;
        }),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'updateItem',
        resource: input.id
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await repository.deleteItem(id);
      
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'deleteItem',
        resource: id
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const toggleItemCompletion = useCallback(async (id: string): Promise<void> => {
    try {
      // Optimistic update for better UX
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id 
            ? { ...item, isCompleted: !item.isCompleted }
            : item
        )
      }));

      const newCompletionStatus = await repository.toggleItemCompletion(id);
      
      // Ensure the optimistic update matches the database result
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id 
            ? { ...item, isCompleted: newCompletionStatus }
            : item
        )
      }));
    } catch (error) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === id 
            ? { ...item, isCompleted: !item.isCompleted }
            : item
        )
      }));

      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'toggleItemCompletion',
        resource: id
      });
      
      throw error;
    }
  }, [repository, setError]);

  const clearCompletedItems = useCallback(async (listId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await repository.clearCompletedItems(listId);
      
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => !item.isCompleted),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'clearCompletedItems',
        resource: listId
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const updateItemsInMemory = useCallback((updatedItems: ShoppingListItem[]) => {
    setState(prev => ({
      ...prev,
      items: updatedItems
    }));
  }, []);

  // Computed values
  const completedItemsCount = state.items.filter(item => item.isCompleted).length;
  const totalItemsCount = state.items.length;
  const hasCompletedItems = completedItemsCount > 0;
  const allItemsCompleted = totalItemsCount > 0 && completedItemsCount === totalItemsCount;

  // Group items by category for display
  const itemsByCategory = state.items.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    completedItemsCount,
    totalItemsCount,
    hasCompletedItems,
    allItemsCompleted,
    itemsByCategory,
    actions: {
      loadItems,
      updateItem,
      deleteItem,
      toggleItemCompletion,
      clearCompletedItems,
      updateItemsInMemory,
      clearError
    }
  };
};