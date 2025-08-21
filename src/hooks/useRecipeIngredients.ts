import { useState, useCallback } from 'react';
import { 
  Ingredient,
  RecipeIngredient,
  CreateRecipeIngredientInput,
  UpdateRecipeIngredientInput,
  IngredientCategory,
  IngredientUsageStats
} from '../types';
import { IngredientRepository } from '../repositories/IngredientRepository';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { useFavorites } from './useFavorites';
import { SecureErrorHandler } from '../utils/errorHandler';

export interface RecipeIngredientItem extends CreateRecipeIngredientInput {
  tempId?: string; // For UI tracking before save
  ingredient?: Ingredient; // Full ingredient data for display
}

interface RecipeIngredientsState {
  availableIngredients: Ingredient[];
  selectedIngredients: RecipeIngredientItem[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: IngredientCategory | 'favoris' | 'myproduct' | 'all';
}

interface UseRecipeIngredientsActions {
  loadAvailableIngredients: () => Promise<void>;
  searchIngredients: (query: string) => Promise<void>;
  filterByCategory: (category: IngredientCategory | 'favoris' | 'myproduct' | 'all') => Promise<void>;
  addIngredientToRecipe: (ingredient: Ingredient, quantity: number, unit: string, optional?: boolean) => void;
  updateRecipeIngredient: (tempId: string, updates: Partial<RecipeIngredientItem>) => void;
  removeRecipeIngredient: (tempId: string) => void;
  clearSelectedIngredients: () => void;
  setSelectedIngredients: (ingredients: RecipeIngredientItem[]) => void;
  getIngredientUsageStats: (ingredientId: string) => Promise<IngredientUsageStats | null>;
  reorderIngredients: (fromIndex: number, toIndex: number) => void;
  duplicateIngredient: (tempId: string) => void;
}

interface UseRecipeIngredientsReturn {
  availableIngredients: Ingredient[];
  selectedIngredients: RecipeIngredientItem[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: IngredientCategory | 'favoris' | 'myproduct' | 'all';
  actions: UseRecipeIngredientsActions;
  // Computed values
  favoriteIngredients: Ingredient[];
  userCreatedIngredients: Ingredient[];
  filteredIngredients: Ingredient[];
  totalSelectedCount: number;
  hasUnsavedChanges: boolean;
}

export const useRecipeIngredients = (initialIngredients?: RecipeIngredientItem[]): UseRecipeIngredientsReturn => {
  const [state, setState] = useState<RecipeIngredientsState>({
    availableIngredients: [],
    selectedIngredients: initialIngredients || [],
    loading: false,
    error: null,
    searchQuery: '',
    selectedCategory: 'all'
  });

  const ingredientRepository = new IngredientRepository();
  const recipeRepository = new RecipeRepository();
  const { favoriteIds } = useFavorites();

  // Helper function to update state
  const updateState = useCallback((updates: Partial<RecipeIngredientsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Generate temporary ID for UI tracking
  const generateTempId = useCallback((): string => {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Load available ingredients
  const loadAvailableIngredients = useCallback(async (): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      const ingredients = await ingredientRepository.findAll();
      updateState({ availableIngredients: ingredients, loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
    }
  }, [ingredientRepository, updateState]);

  // Search ingredients
  const searchIngredients = useCallback(async (query: string): Promise<void> => {
    try {
      updateState({ loading: true, error: null, searchQuery: query });
      
      let ingredients: Ingredient[];
      if (query.trim()) {
        ingredients = await ingredientRepository.search(query);
      } else {
        ingredients = await ingredientRepository.findAll();
      }
      
      updateState({ availableIngredients: ingredients, loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
    }
  }, [ingredientRepository, updateState]);

  // Filter by category
  const filterByCategory = useCallback(async (category: IngredientCategory | 'favoris' | 'myproduct' | 'all'): Promise<void> => {
    try {
      updateState({ loading: true, error: null, selectedCategory: category });
      
      let ingredients: Ingredient[];
      
      switch (category) {
        case 'favoris':
          ingredients = await ingredientRepository.findFavorites();
          break;
        case 'myproduct':
          ingredients = await ingredientRepository.findUserCreated();
          break;
        case 'all':
          ingredients = await ingredientRepository.findAll();
          break;
        default:
          ingredients = await ingredientRepository.findByCategory(category);
          break;
      }
      
      updateState({ availableIngredients: ingredients, loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
    }
  }, [ingredientRepository, updateState]);

  // Add ingredient to recipe
  const addIngredientToRecipe = useCallback((
    ingredient: Ingredient, 
    quantity: number, 
    unit: string, 
    optional: boolean = false
  ): void => {
    const tempId = generateTempId();
    const orderIndex = state.selectedIngredients.length;
    
    const newRecipeIngredient: RecipeIngredientItem = {
      tempId,
      ingredientId: ingredient.id,
      ingredient,
      quantity,
      unit,
      optional,
      orderIndex
    };

    setState(prev => ({
      ...prev,
      selectedIngredients: [...prev.selectedIngredients, newRecipeIngredient]
    }));
  }, [state.selectedIngredients, generateTempId]);

  // Update recipe ingredient
  const updateRecipeIngredient = useCallback((tempId: string, updates: Partial<RecipeIngredientItem>): void => {
    setState(prev => ({
      ...prev,
      selectedIngredients: prev.selectedIngredients.map(ingredient =>
        ingredient.tempId === tempId ? { ...ingredient, ...updates } : ingredient
      )
    }));
  }, []);

  // Remove recipe ingredient
  const removeRecipeIngredient = useCallback((tempId: string): void => {
    setState(prev => ({
      ...prev,
      selectedIngredients: prev.selectedIngredients
        .filter(ingredient => ingredient.tempId !== tempId)
        .map((ingredient, index) => ({ ...ingredient, orderIndex: index }))
    }));
  }, []);

  // Clear selected ingredients
  const clearSelectedIngredients = useCallback((): void => {
    updateState({ selectedIngredients: [] });
  }, [updateState]);

  // Set selected ingredients (for editing existing recipes)
  const setSelectedIngredients = useCallback((ingredients: RecipeIngredientItem[]): void => {
    const ingredientsWithTempIds = ingredients.map(ingredient => ({
      ...ingredient,
      tempId: ingredient.tempId || generateTempId()
    }));
    updateState({ selectedIngredients: ingredientsWithTempIds });
  }, [updateState, generateTempId]);

  // Get ingredient usage statistics
  const getIngredientUsageStats = useCallback(async (ingredientId: string): Promise<IngredientUsageStats | null> => {
    try {
      return await recipeRepository.getIngredientUsageStats(ingredientId);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'getIngredientUsageStats', ingredientId });
      return null;
    }
  }, [recipeRepository]);

  // Reorder ingredients
  const reorderIngredients = useCallback((fromIndex: number, toIndex: number): void => {
    setState(prev => {
      const newIngredients = [...prev.selectedIngredients];
      const [movedItem] = newIngredients.splice(fromIndex, 1);
      newIngredients.splice(toIndex, 0, movedItem);
      
      // Update order indexes
      const reorderedIngredients = newIngredients.map((ingredient, index) => ({
        ...ingredient,
        orderIndex: index
      }));

      return {
        ...prev,
        selectedIngredients: reorderedIngredients
      };
    });
  }, []);

  // Duplicate ingredient
  const duplicateIngredient = useCallback((tempId: string): void => {
    const originalIngredient = state.selectedIngredients.find(ing => ing.tempId === tempId);
    if (!originalIngredient) return;

    const newTempId = generateTempId();
    const duplicatedIngredient: RecipeIngredientItem = {
      ...originalIngredient,
      tempId: newTempId,
      orderIndex: state.selectedIngredients.length
    };

    setState(prev => ({
      ...prev,
      selectedIngredients: [...prev.selectedIngredients, duplicatedIngredient]
    }));
  }, [state.selectedIngredients, generateTempId]);

  // Computed values
  const favoriteIngredients = state.availableIngredients.filter(ingredient => 
    favoriteIds.includes(ingredient.id)
  );

  const userCreatedIngredients = state.availableIngredients.filter(ingredient => 
    ingredient.isUserCreated
  );

  const filteredIngredients = (() => {
    let ingredients = state.availableIngredients;

    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      ingredients = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.subcategory.toLowerCase().includes(query) ||
        ingredient.description?.toLowerCase().includes(query)
      );
    }

    return ingredients;
  })();

  const totalSelectedCount = state.selectedIngredients.length;
  
  const hasUnsavedChanges = state.selectedIngredients.length > 0 && 
    state.selectedIngredients.some(ingredient => ingredient.tempId);

  const actions: UseRecipeIngredientsActions = {
    loadAvailableIngredients,
    searchIngredients,
    filterByCategory,
    addIngredientToRecipe,
    updateRecipeIngredient,
    removeRecipeIngredient,
    clearSelectedIngredients,
    setSelectedIngredients,
    getIngredientUsageStats,
    reorderIngredients,
    duplicateIngredient
  };

  return {
    availableIngredients: state.availableIngredients,
    selectedIngredients: state.selectedIngredients,
    loading: state.loading,
    error: state.error,
    searchQuery: state.searchQuery,
    selectedCategory: state.selectedCategory,
    actions,
    favoriteIngredients,
    userCreatedIngredients,
    filteredIngredients,
    totalSelectedCount,
    hasUnsavedChanges
  };
};

// Specialized hook for ingredient selector modal
export interface IngredientSelectorModalState {
  isVisible: boolean;
  selectedIngredient: Ingredient | null;
  quantity: number;
  unit: string;
  optional: boolean;
  step: 'select' | 'quantity';
}

export const useIngredientSelector = () => {
  const [modalState, setModalState] = useState<IngredientSelectorModalState>({
    isVisible: false,
    selectedIngredient: null,
    quantity: 1,
    unit: '',
    optional: false,
    step: 'select'
  });

  const openModal = useCallback(() => {
    setModalState({
      isVisible: true,
      selectedIngredient: null,
      quantity: 1,
      unit: '',
      optional: false,
      step: 'select'
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const selectIngredient = useCallback((ingredient: Ingredient) => {
    setModalState(prev => ({
      ...prev,
      selectedIngredient: ingredient,
      unit: ingredient.units[0] || 'pièce(s)', // Default to first available unit
      step: 'quantity'
    }));
  }, []);

  const updateQuantity = useCallback((quantity: number) => {
    setModalState(prev => ({ ...prev, quantity }));
  }, []);

  const updateUnit = useCallback((unit: string) => {
    setModalState(prev => ({ ...prev, unit }));
  }, []);

  const toggleOptional = useCallback(() => {
    setModalState(prev => ({ ...prev, optional: !prev.optional }));
  }, []);

  const goBackToSelection = useCallback(() => {
    setModalState(prev => ({ ...prev, step: 'select' }));
  }, []);

  const reset = useCallback(() => {
    setModalState({
      isVisible: false,
      selectedIngredient: null,
      quantity: 1,
      unit: '',
      optional: false,
      step: 'select'
    });
  }, []);

  return {
    modalState,
    actions: {
      openModal,
      closeModal,
      selectIngredient,
      updateQuantity,
      updateUnit,
      toggleOptional,
      goBackToSelection,
      reset
    }
  };
};

// Hook for ingredient units management
export const useIngredientUnits = () => {
  const commonUnits = [
    'pièce(s)',
    'kg',
    'g',
    'L',
    'ml',
    'cl',
    'c. à soupe',
    'c. à café',
    'tasse(s)',
    'pincée(s)',
    'gousse(s)',
    'tranche(s)',
    'filet(s)',
    'boîte(s)',
    'paquet(s)'
  ];

  const getUnitsForIngredient = useCallback((ingredient: Ingredient): string[] => {
    // Combine ingredient-specific units with common units, removing duplicates
    const allUnits = [...new Set([...ingredient.units, ...commonUnits])];
    return allUnits.sort();
  }, [commonUnits]);

  const getDefaultUnit = useCallback((ingredient: Ingredient): string => {
    return ingredient.units[0] || 'pièce(s)';
  }, []);

  const validateUnit = useCallback((unit: string, ingredient: Ingredient): boolean => {
    const validUnits = getUnitsForIngredient(ingredient);
    return validUnits.includes(unit);
  }, [getUnitsForIngredient]);

  return {
    commonUnits,
    getUnitsForIngredient,
    getDefaultUnit,
    validateUnit
  };
};