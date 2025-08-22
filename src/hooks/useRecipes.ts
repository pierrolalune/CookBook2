import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Recipe, 
  RecipeFilters, 
  CreateRecipeInput, 
  UpdateRecipeInput,
  RecipeCategory,
  RecipeDifficulty,
  RecipeUsageStats,
  Ingredient
} from '../types';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { RecipeFavoritesRepository } from '../repositories/RecipeFavoritesRepository';
import { SecureErrorHandler } from '../utils/errorHandler';
import { RecipeSearchUtils, AdvancedSearchFilters, RecipeMatchResult } from '../utils/recipeSearchUtils';
import { SeasonalUtils } from '../utils/seasonalUtils';

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
  filterByCategory: (category: RecipeCategory | 'favoris') => Promise<void>;
  filterByDifficulty: (difficulty: RecipeDifficulty) => Promise<void>;
  filterByIngredients: (ingredientIds: string[]) => Promise<void>;
  filterByFavorites: () => Promise<void>;
  clearFilters: () => Promise<void>;
  updateRecipeFavoriteStatus: (recipeId: string, isFavorite: boolean) => void;
  
  // Advanced search methods
  advancedSearch: (filters: AdvancedSearchFilters, availableIngredients: Ingredient[]) => Promise<RecipeMatchResult[]>;
  findMakeableRecipes: (availableIngredients: Ingredient[]) => Promise<RecipeMatchResult[]>;
  getRecipesWithIngredients: (ingredientIds: string[]) => Promise<Recipe[]>;
  getSeasonalRecipes: (currentMonth?: number) => Promise<Recipe[]>;
  getRecipesByTimeRange: (prepTimeMin?: number, prepTimeMax?: number, cookTimeMin?: number, cookTimeMax?: number) => Promise<Recipe[]>;
  getRecipeStatistics: () => Promise<{
    totalRecipes: number;
    averagePrepTime: number;
    averageCookTime: number;
    recipesByCategory: { [key: string]: number };
    recipesByDifficulty: { [key: string]: number };
    mostUsedIngredients: { ingredient: string; count: number }[];
  }>;
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
  const filterByCategory = useCallback(async (category: RecipeCategory | 'favoris'): Promise<void> => {
    const filters: RecipeFilters = { 
      ...currentFiltersRef.current, 
      category: category === 'favoris' ? category : category,
      favoritesOnly: category === 'favoris' 
    };
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

  // Filter by favorites
  const filterByFavorites = useCallback(async (): Promise<void> => {
    const filters: RecipeFilters = { ...currentFiltersRef.current, favoritesOnly: true, category: 'favoris' };
    await loadRecipes(filters);
  }, [loadRecipes]);

  // Clear all filters
  const clearFilters = useCallback(async (): Promise<void> => {
    await loadRecipes();
  }, [loadRecipes]);
  
  // Advanced search with ingredient matching
  const advancedSearch = useCallback(async (
    filters: AdvancedSearchFilters, 
    availableIngredients: Ingredient[]
  ): Promise<RecipeMatchResult[]> => {
    try {
      updateState({ loading: true, error: null });
      
      // Get all recipes or apply basic filters first
      let recipesToSearch = state.recipes;
      if (recipesToSearch.length === 0) {
        recipesToSearch = await repository.findAll();
      }
      
      // Use RecipeSearchUtils for advanced matching
      const results = RecipeSearchUtils.searchRecipes(
        recipesToSearch,
        availableIngredients,
        filters
      );
      
      updateState({ loading: false });
      return results;
      
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error;
    }
  }, [state.recipes, repository, updateState]);
  
  // Find recipes user can make with available ingredients
  const findMakeableRecipes = useCallback(async (availableIngredients: Ingredient[]): Promise<RecipeMatchResult[]> => {
    try {
      updateState({ loading: true, error: null });
      
      let recipesToSearch = state.recipes;
      if (recipesToSearch.length === 0) {
        recipesToSearch = await repository.findAll();
      }
      
      const results = RecipeSearchUtils.findMakeableRecipes(
        recipesToSearch,
        availableIngredients
      );
      
      updateState({ loading: false });
      return results;
      
    } catch (error) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(error as Error);
      updateState({ loading: false, error: errorMessage });
      throw error;
    }
  }, [state.recipes, repository, updateState]);
  
  // Get recipes that contain specific ingredients
  const getRecipesWithIngredients = useCallback(async (ingredientIds: string[]): Promise<Recipe[]> => {
    try {
      const allRecipes = state.recipes.length > 0 ? state.recipes : await repository.findAll();
      
      return allRecipes.filter(recipe => 
        ingredientIds.some(ingredientId => 
          recipe.ingredients.some(ri => ri.ingredientId === ingredientId)
        )
      );
      
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'getRecipesWithIngredients' });
      return [];
    }
  }, [state.recipes, repository]);
  
  // Get seasonal recipes
  const getSeasonalRecipes = useCallback(async (currentMonth?: number): Promise<Recipe[]> => {
    try {
      const month = currentMonth || SeasonalUtils.getCurrentMonth();
      const allRecipes = state.recipes.length > 0 ? state.recipes : await repository.findAll();
      
      return allRecipes.filter(recipe => 
        recipe.ingredients.some(ri => 
          ri.ingredient.seasonal && 
          ri.ingredient.seasonal.months.includes(month)
        )
      );
      
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'getSeasonalRecipes' });
      return [];
    }
  }, [state.recipes, repository]);
  
  // Get recipes by time range
  const getRecipesByTimeRange = useCallback(async (
    prepTimeMin?: number, 
    prepTimeMax?: number, 
    cookTimeMin?: number, 
    cookTimeMax?: number
  ): Promise<Recipe[]> => {
    try {
      const allRecipes = state.recipes.length > 0 ? state.recipes : await repository.findAll();
      
      return allRecipes.filter(recipe => {
        let matches = true;
        
        if (prepTimeMin !== undefined && recipe.prepTime !== undefined) {
          matches = matches && recipe.prepTime >= prepTimeMin;
        }
        
        if (prepTimeMax !== undefined && recipe.prepTime !== undefined) {
          matches = matches && recipe.prepTime <= prepTimeMax;
        }
        
        if (cookTimeMin !== undefined && recipe.cookTime !== undefined) {
          matches = matches && recipe.cookTime >= cookTimeMin;
        }
        
        if (cookTimeMax !== undefined && recipe.cookTime !== undefined) {
          matches = matches && recipe.cookTime <= cookTimeMax;
        }
        
        return matches;
      });
      
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'getRecipesByTimeRange' });
      return [];
    }
  }, [state.recipes, repository]);
  
  // Get comprehensive recipe statistics
  const getRecipeStatistics = useCallback(async () => {
    try {
      const allRecipes = state.recipes.length > 0 ? state.recipes : await repository.findAll();
      
      const totalRecipes = allRecipes.length;
      
      // Calculate average times
      const recipesWithPrepTime = allRecipes.filter(r => r.prepTime !== undefined);
      const recipesWithCookTime = allRecipes.filter(r => r.cookTime !== undefined);
      
      const averagePrepTime = recipesWithPrepTime.length > 0 
        ? recipesWithPrepTime.reduce((sum, r) => sum + (r.prepTime || 0), 0) / recipesWithPrepTime.length
        : 0;
        
      const averageCookTime = recipesWithCookTime.length > 0
        ? recipesWithCookTime.reduce((sum, r) => sum + (r.cookTime || 0), 0) / recipesWithCookTime.length
        : 0;
      
      // Count by category
      const recipesByCategory = allRecipes.reduce((acc, recipe) => {
        acc[recipe.category] = (acc[recipe.category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      // Count by difficulty
      const recipesByDifficulty = allRecipes.reduce((acc, recipe) => {
        const difficulty = recipe.difficulty || 'unknown';
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      // Count ingredient usage
      const ingredientCounts = allRecipes
        .flatMap(recipe => recipe.ingredients)
        .reduce((acc, ri) => {
          const name = ri.ingredient.name;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
      
      const mostUsedIngredients = Object.entries(ingredientCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([ingredient, count]) => ({ ingredient, count }));
      
      return {
        totalRecipes,
        averagePrepTime: Math.round(averagePrepTime * 10) / 10,
        averageCookTime: Math.round(averageCookTime * 10) / 10,
        recipesByCategory,
        recipesByDifficulty,
        mostUsedIngredients
      };
      
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'getRecipeStatistics' });
      return {
        totalRecipes: 0,
        averagePrepTime: 0,
        averageCookTime: 0,
        recipesByCategory: {},
        recipesByDifficulty: {},
        mostUsedIngredients: []
      };
    }
  }, [state.recipes, repository]);

  // Update recipe favorite status in memory (fast update)
  const updateRecipeFavoriteStatus = useCallback((recipeId: string, isFavorite: boolean): void => {
    setState(prev => ({
      ...prev,
      recipes: prev.recipes.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, isFavorite }
          : recipe
      )
    }));
  }, []);

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
    filterByFavorites,
    clearFilters,
    updateRecipeFavoriteStatus,
    advancedSearch,
    findMakeableRecipes,
    getRecipesWithIngredients,
    getSeasonalRecipes,
    getRecipesByTimeRange,
    getRecipeStatistics
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
    filterByFavorites,
    clearFilters,
    updateRecipeFavoriteStatus,
    advancedSearch,
    findMakeableRecipes,
    getRecipesWithIngredients,
    getSeasonalRecipes,
    getRecipesByTimeRange,
    getRecipeStatistics
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
    category: RecipeCategory | 'favoris';
    count: number;
    label: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create repositories once and memoize
  const repository = useMemo(() => new RecipeRepository(), []);
  const favoritesRepository = useMemo(() => new RecipeFavoritesRepository(), []);

  const loadCategoryCounts = useCallback(async () => {
    try {
      setLoading(true);
      
      const categoryLabels: { [key in RecipeCategory | 'favoris']: string } = {
        favoris: 'Favoris',
        entree: 'Entrées',
        plats: 'Plats',
        dessert: 'Desserts'
      };

      // Get favorites count
      const favoritesCount = await favoritesRepository.getFavoriteCount();

      // Get regular category counts
      const regularCategories = ['entree', 'plats', 'dessert'] as RecipeCategory[];
      const regularCounts = await Promise.all(
        regularCategories.map(async (category) => {
          const recipes = await repository.findByCategory(category);
          return {
            category,
            count: recipes.length,
            label: categoryLabels[category]
          };
        })
      );

      // Combine favorites with regular categories
      const allCounts = [
        {
          category: 'favoris' as const,
          count: favoritesCount,
          label: categoryLabels.favoris
        },
        ...regularCounts
      ];

      setCategories(allCounts);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      SecureErrorHandler.logError(error as Error, { action: 'loadCategoryCounts' });
    }
  }, [repository, favoritesRepository]);

  useEffect(() => {
    loadCategoryCounts();
  }, [loadCategoryCounts]);

  return { categories, loading, refresh: loadCategoryCounts };
};

// Hook for recipe-ingredient relationships
export const useRecipeIngredientAnalysis = () => {
  const [analysis, setAnalysis] = useState<{
    ingredientPopularity: { ingredient: string; recipeCount: number; percentage: number }[];
    categoryDistribution: { category: string; count: number; percentage: number }[];
    seasonalTrends: { month: number; recipeCount: number; seasonalIngredients: number }[];
    loading: boolean;
  }>({
    ingredientPopularity: [],
    categoryDistribution: [],
    seasonalTrends: [],
    loading: false
  });

  const repository = useMemo(() => new RecipeRepository(), []);

  const analyzeRecipeIngredients = useCallback(async () => {
    try {
      setAnalysis(prev => ({ ...prev, loading: true }));
      
      const allRecipes = await repository.findAll();
      const totalRecipes = allRecipes.length;
      
      if (totalRecipes === 0) {
        setAnalysis({
          ingredientPopularity: [],
          categoryDistribution: [],
          seasonalTrends: [],
          loading: false
        });
        return;
      }
      
      // Analyze ingredient popularity
      const ingredientCounts = allRecipes
        .flatMap(recipe => recipe.ingredients)
        .reduce((acc, ri) => {
          const name = ri.ingredient.name;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
      
      const ingredientPopularity = Object.entries(ingredientCounts)
        .map(([ingredient, count]) => ({
          ingredient,
          recipeCount: count,
          percentage: Math.round((count / totalRecipes) * 100)
        }))
        .sort((a, b) => b.recipeCount - a.recipeCount)
        .slice(0, 20);
      
      // Analyze category distribution
      const categoryCounts = allRecipes.reduce((acc, recipe) => {
        acc[recipe.category] = (acc[recipe.category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      const categoryDistribution = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category,
          count,
          percentage: Math.round((count / totalRecipes) * 100)
        }))
        .sort((a, b) => b.count - a.count);
      
      // Analyze seasonal trends (if recipes have seasonal ingredients)
      const seasonalTrends = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const recipesWithSeasonalIngredients = allRecipes.filter(recipe => 
          recipe.ingredients.some(ri => 
            ri.ingredient.seasonal && 
            ri.ingredient.seasonal.months.includes(month)
          )
        );
        
        const seasonalIngredientCount = recipesWithSeasonalIngredients
          .flatMap(recipe => recipe.ingredients)
          .filter(ri => 
            ri.ingredient.seasonal && 
            ri.ingredient.seasonal.months.includes(month)
          ).length;
        
        return {
          month,
          recipeCount: recipesWithSeasonalIngredients.length,
          seasonalIngredients: seasonalIngredientCount
        };
      });
      
      setAnalysis({
        ingredientPopularity,
        categoryDistribution,
        seasonalTrends,
        loading: false
      });
      
    } catch (error) {
      setAnalysis(prev => ({ ...prev, loading: false }));
      SecureErrorHandler.logError(error as Error, { action: 'analyzeRecipeIngredients' });
    }
  }, [repository]);

  useEffect(() => {
    analyzeRecipeIngredients();
  }, [analyzeRecipeIngredients]);

  return { ...analysis, refresh: analyzeRecipeIngredients };
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

// Hook for recipe search suggestions
export const useRecipeSearchSuggestions = () => {
  const [suggestions, setSuggestions] = useState<{
    recipes: string[];
    ingredients: string[];
    categories: string[];
  }>({ recipes: [], ingredients: [], categories: [] });
  
  const repository = useMemo(() => new RecipeRepository(), []);
  
  const generateSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions({ recipes: [], ingredients: [], categories: [] });
      return;
    }
    
    try {
      const allRecipes = await repository.findAll();
      const queryLower = query.toLowerCase();
      
      // Recipe name suggestions
      const recipeMatches = allRecipes
        .filter(recipe => recipe.name.toLowerCase().includes(queryLower))
        .slice(0, 5)
        .map(recipe => recipe.name);
      
      // Ingredient suggestions
      const allIngredients = Array.from(
        new Set(
          allRecipes
            .flatMap(recipe => recipe.ingredients)
            .map(ri => ri.ingredient.name)
        )
      );
      
      const ingredientMatches = allIngredients
        .filter(ingredient => ingredient.toLowerCase().includes(queryLower))
        .slice(0, 5);
      
      // Category suggestions
      const categories = ['Entrées', 'Plats', 'Desserts'];
      const categoryMatches = categories
        .filter(cat => cat.toLowerCase().includes(queryLower));
      
      setSuggestions({
        recipes: recipeMatches,
        ingredients: ingredientMatches,
        categories: categoryMatches
      });
      
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'generateRecipeSearchSuggestions' });
    }
  }, [repository]);
  
  return { suggestions, generateSuggestions };
};