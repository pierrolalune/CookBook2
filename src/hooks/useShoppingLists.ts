import { useState, useEffect, useCallback } from 'react';
import { ShoppingListRepository } from '../repositories/ShoppingListRepository';
import { SecureErrorHandler } from '../utils/errorHandler';
import {
  ShoppingList,
  CreateShoppingListInput,
  UpdateShoppingListInput,
  ShoppingListFilters,
  Recipe,
  ShoppingListGenerationOptions,
  AggregatedShoppingItem,
  CreateShoppingListItemInput
} from '../types';

interface ShoppingListsState {
  shoppingLists: ShoppingList[];
  loading: boolean;
  error: string | null;
}

interface ShoppingListsActions {
  loadShoppingLists: (filters?: ShoppingListFilters) => Promise<void>;
  createShoppingList: (input: CreateShoppingListInput) => Promise<ShoppingList>;
  updateShoppingList: (input: UpdateShoppingListInput) => Promise<ShoppingList>;
  deleteShoppingList: (id: string) => Promise<void>;
  duplicateShoppingList: (id: string, newName?: string) => Promise<ShoppingList>;
  generateFromRecipes: (recipes: Recipe[], options?: ShoppingListGenerationOptions) => Promise<ShoppingList>;
  generateFromIngredients: (ingredientIds: string[], options?: ShoppingListGenerationOptions) => Promise<ShoppingList>;
  clearError: () => void;
  refreshShoppingLists: () => Promise<void>;
}

export const useShoppingLists = () => {
  const [state, setState] = useState<ShoppingListsState>({
    shoppingLists: [],
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

  const loadShoppingLists = useCallback(async (filters: ShoppingListFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const shoppingLists = await repository.findAll(filters);
      
      setState(prev => ({
        ...prev,
        shoppingLists,
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'loadShoppingLists'
      });
    }
  }, [repository, setLoading, setError]);

  const createShoppingList = useCallback(async (input: CreateShoppingListInput): Promise<ShoppingList> => {
    try {
      setLoading(true);
      setError(null);

      const newShoppingList = await repository.create(input);
      
      setState(prev => ({
        ...prev,
        shoppingLists: [newShoppingList, ...prev.shoppingLists],
        loading: false
      }));

      return newShoppingList;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'createShoppingList'
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const updateShoppingList = useCallback(async (input: UpdateShoppingListInput): Promise<ShoppingList> => {
    try {
      setLoading(true);
      setError(null);

      const updatedShoppingList = await repository.update(input);
      
      setState(prev => ({
        ...prev,
        shoppingLists: prev.shoppingLists.map(list => 
          list.id === updatedShoppingList.id ? updatedShoppingList : list
        ),
        loading: false
      }));

      return updatedShoppingList;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'updateShoppingList',
        resource: input.id
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const deleteShoppingList = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await repository.delete(id);
      
      setState(prev => ({
        ...prev,
        shoppingLists: prev.shoppingLists.filter(list => list.id !== id),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'deleteShoppingList',
        resource: id
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const duplicateShoppingList = useCallback(async (id: string, newName?: string): Promise<ShoppingList> => {
    try {
      setLoading(true);
      setError(null);

      const originalList = await repository.findById(id);
      if (!originalList) {
        throw new Error('Shopping list not found');
      }

      const duplicatedName = newName || `${originalList.name} (Copie)`;
      
      const duplicateInput: CreateShoppingListInput = {
        name: duplicatedName,
        description: originalList.description,
        items: originalList.items.map(item => ({
          ingredientId: item.ingredientId,
          customName: item.customName,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          notes: item.notes,
          orderIndex: item.orderIndex
        }))
      };

      const duplicatedList = await repository.create(duplicateInput);
      
      setState(prev => ({
        ...prev,
        shoppingLists: [duplicatedList, ...prev.shoppingLists],
        loading: false
      }));

      return duplicatedList;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'duplicateShoppingList',
        resource: id
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const generateFromRecipes = useCallback(async (
    recipes: Recipe[], 
    options: ShoppingListGenerationOptions = {}
  ): Promise<ShoppingList> => {
    try {
      setLoading(true);
      setError(null);

      const {
        includeOptionalIngredients = false,
        aggregateIdenticalIngredients = true,
        listName,
        listDescription
      } = options;

      // Aggregate ingredients from all recipes
      const ingredientMap = new Map<string, AggregatedShoppingItem>();

      recipes.forEach(recipe => {
        recipe.ingredients.forEach(recipeIngredient => {
          // Skip optional ingredients if not included
          if (recipeIngredient.optional && !includeOptionalIngredients) {
            return;
          }

          const key = recipeIngredient.ingredientId;
          
          if (ingredientMap.has(key) && aggregateIdenticalIngredients) {
            const existing = ingredientMap.get(key)!;
            
            // For now, we'll add quantities if units match, otherwise keep separate
            if (existing.unit === recipeIngredient.unit) {
              existing.totalQuantity += recipeIngredient.quantity;
              existing.recipes.push(recipe.name);
            } else {
              // Create a new entry with different unit
              const newKey = `${key}_${recipeIngredient.unit}`;
              ingredientMap.set(newKey, {
                ingredientId: recipeIngredient.ingredientId,
                ingredient: recipeIngredient.ingredient,
                totalQuantity: recipeIngredient.quantity,
                unit: recipeIngredient.unit,
                category: recipeIngredient.ingredient.category,
                recipes: [recipe.name]
              });
            }
          } else {
            ingredientMap.set(key, {
              ingredientId: recipeIngredient.ingredientId,
              ingredient: recipeIngredient.ingredient,
              totalQuantity: recipeIngredient.quantity,
              unit: recipeIngredient.unit,
              category: recipeIngredient.ingredient.category,
              recipes: [recipe.name]
            });
          }
        });
      });

      // Convert aggregated ingredients to shopping list items
      const items: CreateShoppingListItemInput[] = Array.from(ingredientMap.values())
        .sort((a, b) => {
          // Sort by category first, then by name
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          const nameA = a.ingredient?.name || a.customName || '';
          const nameB = b.ingredient?.name || b.customName || '';
          return nameA.localeCompare(nameB);
        })
        .map((item, index) => ({
          ingredientId: item.ingredientId,
          customName: item.customName,
          quantity: item.totalQuantity,
          unit: item.unit,
          category: item.category,
          notes: item.recipes.length > 1 
            ? `Pour: ${item.recipes.join(', ')}`
            : `Pour: ${item.recipes[0]}`,
          orderIndex: index
        }));

      // Generate list name if not provided
      const generatedName = listName || (
        recipes.length === 1 
          ? `Liste pour ${recipes[0].name}`
          : `Liste pour ${recipes.length} recettes`
      );

      const generatedDescription = listDescription || 
        `Liste générée automatiquement à partir de ${recipes.length} recette${recipes.length > 1 ? 's' : ''}: ${recipes.map(r => r.name).join(', ')}`;

      const createInput: CreateShoppingListInput = {
        name: generatedName,
        description: generatedDescription,
        items
      };

      const newShoppingList = await repository.create(createInput);
      
      setState(prev => ({
        ...prev,
        shoppingLists: [newShoppingList, ...prev.shoppingLists],
        loading: false
      }));

      return newShoppingList;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'generateFromRecipes'
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const generateFromIngredients = useCallback(async (
    ingredientIds: string[],
    options: ShoppingListGenerationOptions = {}
  ): Promise<ShoppingList> => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll create a simple list with default quantities
      // In a real implementation, you might want to load the actual ingredients
      // and use their default units, or ask the user for quantities
      
      const items: CreateShoppingListItemInput[] = ingredientIds.map((ingredientId, index) => ({
        ingredientId,
        quantity: 1, // Default quantity
        unit: 'unité', // Default unit
        category: 'epicerie', // Default category, will be updated when ingredient is loaded
        orderIndex: index
      }));

      const listName = options.listName || 'Ma liste de courses';
      const listDescription = options.listDescription || 
        `Liste créée à partir de ${ingredientIds.length} ingrédient${ingredientIds.length > 1 ? 's' : ''}`;

      const createInput: CreateShoppingListInput = {
        name: listName,
        description: listDescription,
        items
      };

      const newShoppingList = await repository.create(createInput);
      
      setState(prev => ({
        ...prev,
        shoppingLists: [newShoppingList, ...prev.shoppingLists],
        loading: false
      }));

      return newShoppingList;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      setError(errorMessage);
      setLoading(false);
      
      SecureErrorHandler.logError(error as Error, {
        action: 'generateFromIngredients'
      });
      
      throw error;
    }
  }, [repository, setLoading, setError]);

  const refreshShoppingLists = useCallback(async () => {
    await loadShoppingLists();
  }, [loadShoppingLists]);

  // Load shopping lists on mount
  useEffect(() => {
    loadShoppingLists();
  }, []);

  return {
    shoppingLists: state.shoppingLists,
    loading: state.loading,
    error: state.error,
    actions: {
      loadShoppingLists,
      createShoppingList,
      updateShoppingList,
      deleteShoppingList,
      duplicateShoppingList,
      generateFromRecipes,
      generateFromIngredients,
      clearError,
      refreshShoppingLists
    }
  };
};