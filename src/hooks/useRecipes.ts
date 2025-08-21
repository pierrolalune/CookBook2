import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Recipe, 
  RecipeFilters, 
  CreateRecipeInput, 
  UpdateRecipeInput,
  RecipeCategory,
  RecipeDifficulty,
  RecipeUsageStats
} from '../types';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { SecureErrorHandler } from '../utils/errorHandler';

interface RecipesState {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
}

interface UseRecipesActions {
  loadRecipes: (filters?: RecipeFilters) => Promise<void>;
  createRecipe: (input: CreateRecipeInput) => Promise<Recipe>;
  updateRecipe: (input: UpdateRecipeInput) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  duplicateRecipe: (id: string, newName?: string) => Promise<Recipe>;
  getRecipeById: (id: string) => Promise<Recipe | null>;
  refreshRecipes: () => Promise<void>;
  recordUsage: (recipeId: string) => Promise<void>;
  getUsageStats: (recipeId: string) => Promise<RecipeUsageStats | null>;
  searchRecipes: (query: string) => Promise<void>;
  filterByCategory: (category: RecipeCategory) => Promise<void>;
  filterByDifficulty: (difficulty: RecipeDifficulty) => Promise<void>;
  filterByIngredients: (ingredientIds: string[]) => Promise<void>;
  clearFilters: () => Promise<void>;
}

interface UseRecipesReturn {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  actions: UseRecipesActions;
}

export const useRecipes = (): UseRecipesReturn => {
  const [state, setState] = useState<RecipesState>({
    recipes: [],
    loading: false,
    error: null
  });

  const currentFiltersRef = useRef<RecipeFilters | undefined>(undefined);
  
  // Create repository once and memoize
  const repository = useMemo(() => new RecipeRepository(), []);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<RecipesState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load recipes with filters
  const loadRecipes = useCallback(async (filters?: RecipeFilters): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      currentFiltersRef.current = filters;
      
      const recipes = await repository.findAll(filters);
      updateState({ recipes, loading: false });
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
    }
  }, [repository, updateState]);

  // Create new recipe
  const createRecipe = useCallback(async (input: CreateRecipeInput): Promise<Recipe> => {
    try {
      updateState({ loading: true, error: null });
      
      const newRecipe = await repository.create(input);
      
      // Add to current list if it matches current filters
      setState(prev => ({
        ...prev,
        recipes: [newRecipe, ...prev.recipes],
        loading: false
      }));
      
      return newRecipe;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error;
    }
  }, [repository, updateState]);

  // Update existing recipe
  const updateRecipe = useCallback(async (input: UpdateRecipeInput): Promise<Recipe> => {
    try {
      updateState({ loading: true, error: null });
      
      const updatedRecipe = await repository.update(input);
      
      // Update in current list
      setState(prev => ({
        ...prev,
        recipes: prev.recipes.map(recipe => 
          recipe.id === updatedRecipe.id ? updatedRecipe : recipe
        ),
        loading: false
      }));
      
      return updatedRecipe;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error;
    }
  }, [repository, updateState]);

  // Delete recipe
  const deleteRecipe = useCallback(async (id: string): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      
      await repository.delete(id);
      
      // Remove from current list
      setState(prev => ({
        ...prev,
        recipes: prev.recipes.filter(recipe => recipe.id !== id),
        loading: false
      }));
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error;
    }
  }, [repository, updateState]);

  // Duplicate recipe
  const duplicateRecipe = useCallback(async (id: string, newName?: string): Promise<Recipe> => {
    try {
      updateState({ loading: true, error: null });
      
      const duplicatedRecipe = await repository.duplicate(id, newName);
      
      // Add to current list
      setState(prev => ({
        ...prev,
        recipes: [duplicatedRecipe, ...prev.recipes],
        loading: false
      }));
      
      return duplicatedRecipe;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error;
    }
  }, [repository, updateState]);

  // Get single recipe by ID
  const getRecipeById = useCallback(async (id: string): Promise<Recipe | null> => {
    try {
      updateState({ loading: true, error: null });
      
      const recipe = await repository.findById(id);
      updateState({ loading: false });
      
      return recipe;
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      return null;
    }
  }, [repository, updateState]);

  // Refresh recipes (reload with current filters)
  const refreshRecipes = useCallback(async (): Promise<void> => {
    await loadRecipes(currentFiltersRef.current);
  }, [loadRecipes]);

  // Record recipe usage
  const recordUsage = useCallback(async (recipeId: string): Promise<void> => {
    try {
      await repository.recordUsage(recipeId);
    } catch (error) {
      // Don't update UI state for usage tracking errors, just log
      SecureErrorHandler.logError(error as Error, { action: 'recordUsage', recipeId });
    }
  }, [repository]);

  // Get usage statistics
  const getUsageStats = useCallback(async (recipeId: string): Promise<RecipeUsageStats | null> => {
    try {
      return await repository.getRecipeUsageStats(recipeId);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'getUsageStats', recipeId });
      return null;
    }
  }, [repository]);

  // Search recipes
  const searchRecipes = useCallback(async (query: string): Promise<void> => {
    const filters: RecipeFilters = { ...currentFiltersRef.current, searchQuery: query };
    await loadRecipes(filters);
  }, [loadRecipes]);

  // Filter by category
  const filterByCategory = useCallback(async (category: RecipeCategory): Promise<void> => {
    const filters: RecipeFilters = { ...currentFiltersRef.current, category };
    await loadRecipes(filters);
  }, [loadRecipes]);

  // Filter by difficulty
  const filterByDifficulty = useCallback(async (difficulty: RecipeDifficulty): Promise<void> => {
    const filters: RecipeFilters = { ...currentFiltersRef.current, difficulty };
    await loadRecipes(filters);
  }, [loadRecipes]);

  // Filter by ingredients
  const filterByIngredients = useCallback(async (ingredientIds: string[]): Promise<void> => {
    const filters: RecipeFilters = { ...currentFiltersRef.current, ingredientIds };
    await loadRecipes(filters);
  }, [loadRecipes]);

  // Clear all filters
  const clearFilters = useCallback(async (): Promise<void> => {
    await loadRecipes();
  }, [loadRecipes]);

  // Auto-load recipes on mount
  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const actions: UseRecipesActions = useMemo(() => ({
    loadRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    getRecipeById,
    refreshRecipes,
    recordUsage,
    getUsageStats,
    searchRecipes,
    filterByCategory,
    filterByDifficulty,
    filterByIngredients,
    clearFilters
  }), [
    loadRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    getRecipeById,
    refreshRecipes,
    recordUsage,
    getUsageStats,
    searchRecipes,
    filterByCategory,
    filterByDifficulty,
    filterByIngredients,
    clearFilters
  ]);

  return {
    recipes: state.recipes,
    loading: state.loading,
    error: state.error,
    actions
  };
};

// Additional specialized hooks for specific use cases

// Hook for recipe categories with counts
export const useRecipeCategories = () => {
  const [categories, setCategories] = useState<{
    category: RecipeCategory;
    count: number;
    label: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create repository once and memoize
  const repository = useMemo(() => new RecipeRepository(), []);

  const loadCategoryCounts = useCallback(async () => {
    try {
      setLoading(true);
      
      const categoryLabels: { [key in RecipeCategory]: string } = {
        entree: 'Entrées',
        plats: 'Plats',
        dessert: 'Desserts'
      };

      const counts = await Promise.all(
        (Object.keys(categoryLabels) as RecipeCategory[]).map(async (category) => {
          const recipes = await repository.findByCategory(category);
          return {
            category,
            count: recipes.length,
            label: categoryLabels[category]
          };
        })
      );

      setCategories(counts);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      SecureErrorHandler.logError(error as Error, { action: 'loadCategoryCounts' });
    }
  }, [repository]);

  useEffect(() => {
    loadCategoryCounts();
  }, [loadCategoryCounts]);

  return { categories, loading, refresh: loadCategoryCounts };
};

// Hook for recipe statistics
export const useRecipeStats = () => {
  const [stats, setStats] = useState({
    totalRecipes: 0,
    averagePrepTime: 0,
    averageCookTime: 0,
    mostUsedIngredients: [] as string[],
    mostPopularCategory: '' as RecipeCategory | '',
    loading: false
  });

  // Create repository once and memoize
  const repository = useMemo(() => new RecipeRepository(), []);

  const loadStats = useCallback(async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      const allRecipes = await repository.findAll();
      
      const totalRecipes = allRecipes.length;
      const recipesWithPrepTime = allRecipes.filter(r => r.prepTime);
      const recipesWithCookTime = allRecipes.filter(r => r.cookTime);
      
      const averagePrepTime = recipesWithPrepTime.length > 0 
        ? recipesWithPrepTime.reduce((sum, r) => sum + (r.prepTime || 0), 0) / recipesWithPrepTime.length
        : 0;
        
      const averageCookTime = recipesWithCookTime.length > 0
        ? recipesWithCookTime.reduce((sum, r) => sum + (r.cookTime || 0), 0) / recipesWithCookTime.length
        : 0;

      // Count categories
      const categoryCounts = allRecipes.reduce((acc, recipe) => {
        acc[recipe.category] = (acc[recipe.category] || 0) + 1;
        return acc;
      }, {} as { [key in RecipeCategory]: number });

      const mostPopularCategory = Object.entries(categoryCounts)
        .reduce((max, [category, count]) => 
          count > max.count ? { category: category as RecipeCategory, count } : max, 
          { category: '' as RecipeCategory, count: 0 }
        ).category;

      // Count ingredient usage
      const ingredientCounts = allRecipes
        .flatMap(recipe => recipe.ingredients)
        .reduce((acc, ingredient) => {
          const name = ingredient.ingredient.name;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

      const mostUsedIngredients = Object.entries(ingredientCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name);

      setStats({
        totalRecipes,
        averagePrepTime: Math.round(averagePrepTime),
        averageCookTime: Math.round(averageCookTime),
        mostUsedIngredients,
        mostPopularCategory,
        loading: false
      });
    } catch (error) {
      setStats(prev => ({ ...prev, loading: false }));
      SecureErrorHandler.logError(error as Error, { action: 'loadStats' });
    }
  }, [repository]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { ...stats, refresh: loadStats };
};