import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingList, 
  ShoppingListFilters, 
  CreateShoppingListInput, 
  UpdateShoppingListInput,
  Recipe
} from '../types';
import { ShoppingListRepository } from '../repositories/ShoppingListRepository';
import { SecureErrorHandler } from '../utils/errorHandler';
import { ShoppingListUtils } from '../utils/shoppingListUtils';

interface ShoppingListsState {
  shoppingLists: ShoppingList[];
  loading: boolean;
  error: string | null;
}

interface UseShoppingListsActions {
  loadShoppingLists: (filters?: ShoppingListFilters) => Promise<void>;
  createShoppingList: (input: CreateShoppingListInput) => Promise<ShoppingList>;
  updateShoppingList: (input: UpdateShoppingListInput) => Promise<ShoppingList>;
  deleteShoppingList: (id: string) => Promise<void>;
  duplicateShoppingList: (id: string, newName?: string) => Promise<ShoppingList>;
  generateFromRecipes: (recipeIds: string[], listName?: string) => Promise<ShoppingList>;
  refreshShoppingLists: () => Promise<void>;
  clearError: () => void;
  getShoppingListById: (id: string) => ShoppingList | undefined;
}

interface UseShoppingListsReturn {
  shoppingLists: ShoppingList[];
  loading: boolean;
  error: string | null;
  actions: UseShoppingListsActions;
}

export const useShoppingLists = (): UseShoppingListsReturn => {
  const [state, setState] = useState<ShoppingListsState>({
    shoppingLists: [],
    loading: false,
    error: null
  });

  // Create repository once and memoize
  const repository = useMemo(() => new ShoppingListRepository(), []);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<ShoppingListsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Load shopping lists with optional filters
  const loadShoppingLists = useCallback(async (filters?: ShoppingListFilters) => {
    try {
      updateState({ loading: true, error: null });
      const shoppingLists = await repository.findAll(filters);
      updateState({ shoppingLists, loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ 
        error: errorMessage, 
        loading: false,
        shoppingLists: [] // Clear lists on error
      });
      SecureErrorHandler.logError(error as Error, { 
        action: 'loadShoppingLists', 
        resource: 'shopping_lists',
        filters: JSON.stringify(filters)
      });
    }
  }, [repository, updateState]);

  // Create new shopping list
  const createShoppingList = useCallback(async (input: CreateShoppingListInput): Promise<ShoppingList> => {
    try {
      updateState({ loading: true, error: null });
      
      const created = await repository.create(input);
      
      // Add to current list and sort by updated_at desc
      setState(prev => ({
        ...prev,
        shoppingLists: [created, ...prev.shoppingLists]
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        loading: false
      }));
      
      return created;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'createShoppingList', 
        resource: 'shopping_lists'
      });
      throw error;
    }
  }, [repository]);

  // Update shopping list
  const updateShoppingList = useCallback(async (input: UpdateShoppingListInput): Promise<ShoppingList> => {
    try {
      updateState({ loading: true, error: null });
      
      const updated = await repository.update(input);
      
      // Update in current list
      setState(prev => ({
        ...prev,
        shoppingLists: prev.shoppingLists.map(list => 
          list.id === input.id ? updated : list
        ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        loading: false
      }));
      
      return updated;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'updateShoppingList', 
        resource: 'shopping_lists'
      });
      throw error;
    }
  }, [repository]);

  // Delete shopping list
  const deleteShoppingList = useCallback(async (id: string): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      await repository.delete(id);
      
      // Remove from current list
      setState(prev => ({
        ...prev,
        shoppingLists: prev.shoppingLists.filter(list => list.id !== id),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'deleteShoppingList', 
        resource: 'shopping_lists'
      });
      throw error;
    }
  }, [repository]);

  // Duplicate shopping list
  const duplicateShoppingList = useCallback(async (id: string, newName?: string): Promise<ShoppingList> => {
    try {
      updateState({ loading: true, error: null });
      
      const duplicated = await repository.duplicate(id, newName);
      
      // Add to current list
      setState(prev => ({
        ...prev,
        shoppingLists: [duplicated, ...prev.shoppingLists]
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        loading: false
      }));
      
      return duplicated;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'duplicateShoppingList', 
        resource: 'shopping_lists'
      });
      throw error;
    }
  }, [repository]);

  // Generate shopping list from recipes
  const generateFromRecipes = useCallback(async (recipeIds: string[], listName?: string): Promise<ShoppingList> => {
    try {
      updateState({ loading: true, error: null });
      
      const generated = await repository.generateFromRecipes(recipeIds, listName);
      
      // Add to current list
      setState(prev => ({
        ...prev,
        shoppingLists: [generated, ...prev.shoppingLists]
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        loading: false
      }));
      
      return generated;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ error: errorMessage, loading: false });
      SecureErrorHandler.logError(error as Error, { 
        action: 'generateFromRecipes', 
        resource: 'shopping_lists'
      });
      throw error;
    }
  }, [repository]);

  // Refresh shopping lists (reload current data)
  const refreshShoppingLists = useCallback(async (): Promise<void> => {
    await loadShoppingLists();
  }, [loadShoppingLists]);

  // Get shopping list by ID from current state
  const getShoppingListById = useCallback((id: string): ShoppingList | undefined => {
    return state.shoppingLists.find(list => list.id === id);
  }, [state.shoppingLists]);

  // Actions object
  const actions: UseShoppingListsActions = useMemo(() => ({
    loadShoppingLists,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList,
    duplicateShoppingList,
    generateFromRecipes,
    refreshShoppingLists,
    clearError,
    getShoppingListById
  }), [
    loadShoppingLists,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList,
    duplicateShoppingList,
    generateFromRecipes,
    refreshShoppingLists,
    clearError,
    getShoppingListById
  ]);

  return {
    shoppingLists: state.shoppingLists,
    loading: state.loading,
    error: state.error,
    actions
  };
}