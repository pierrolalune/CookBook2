import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Recipe, Ingredient } from '../types';
import { 
  RecipeSearchUtils, 
  AdvancedSearchFilters, 
  RecipeMatchResult, 
  SearchSuggestion 
} from '../utils/recipeSearchUtils';
import { SecureErrorHandler } from '../utils/errorHandler';

interface AdvancedSearchState {
  results: RecipeMatchResult[];
  suggestions: SearchSuggestion[];
  loading: boolean;
  error: string | null;
  filters: AdvancedSearchFilters;
  hasSearched: boolean;
  totalResults: number;
  makeableRecipes: RecipeMatchResult[];
}

interface UseAdvancedSearchActions {
  performSearch: (filters: AdvancedSearchFilters) => Promise<void>;
  findMakeableRecipes: () => Promise<void>;
  generateSuggestions: (query: string) => void;
  clearResults: () => void;
  clearCache: () => void;
  setFilters: (filters: AdvancedSearchFilters) => void;
  resetSearch: () => void;
  refreshResults: () => Promise<void>;
}

interface UseAdvancedRecipeSearchProps {
  recipes: Recipe[];
  availableIngredients: Ingredient[];
  onSearchComplete?: (results: RecipeMatchResult[]) => void;
  defaultFilters?: AdvancedSearchFilters;
  autoSearch?: boolean;
}

interface UseAdvancedRecipeSearchReturn {
  state: AdvancedSearchState;
  actions: UseAdvancedSearchActions;
}

export const useAdvancedRecipeSearch = ({
  recipes,
  availableIngredients,
  onSearchComplete,
  defaultFilters = {},
  autoSearch = false
}: UseAdvancedRecipeSearchProps): UseAdvancedRecipeSearchReturn => {
  const [state, setState] = useState<AdvancedSearchState>({
    results: [],
    suggestions: [],
    loading: false,
    error: null,
    filters: defaultFilters,
    hasSearched: false,
    totalResults: 0,
    makeableRecipes: []
  });

  // Ref to track current search to prevent stale results
  const currentSearchRef = useRef<number>(0);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<AdvancedSearchState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Perform advanced search
  const performSearch = useCallback(async (filters: AdvancedSearchFilters): Promise<void> => {
    try {
      // Increment search counter for stale result detection
      const searchId = ++currentSearchRef.current;
      
      updateState({ 
        loading: true, 
        error: null, 
        filters,
        hasSearched: false // Don't set to true until we have results
      });

      // Simulate async operation for better UX
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if this search is still current
      if (searchId !== currentSearchRef.current) {
        return; // Ignore stale results
      }

      const results = RecipeSearchUtils.searchRecipes(
        recipes,
        availableIngredients,
        filters
      );

      // Check again after search completes
      if (searchId !== currentSearchRef.current) {
        return; // Ignore stale results
      }

      updateState({
        results,
        totalResults: results.length,
        loading: false,
        error: null,
        hasSearched: true // Set to true only when we have results
      });

      // Callback for parent component
      onSearchComplete?.(results);

    } catch (error) {
      updateState({
        loading: false,
        error: SecureErrorHandler.getUserFriendlyMessage(error as Error)
      });

      SecureErrorHandler.logError(error as Error, {
        action: 'performAdvancedSearch',
        filters: JSON.stringify(filters)
      });
    }
  }, [recipes, availableIngredients, onSearchComplete, updateState]);

  // Find recipes user can make with available ingredients
  const findMakeableRecipes = useCallback(async (): Promise<void> => {
    try {
      updateState({ loading: true, error: null });

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      const makeableRecipes = RecipeSearchUtils.findMakeableRecipes(
        recipes,
        availableIngredients
      );

      updateState({
        makeableRecipes,
        results: makeableRecipes,
        totalResults: makeableRecipes.length,
        loading: false,
        hasSearched: true,
        filters: { availableIngredients: availableIngredients.map(ing => ing.id) }
      });

      onSearchComplete?.(makeableRecipes);

    } catch (error) {
      updateState({
        loading: false,
        error: SecureErrorHandler.getUserFriendlyMessage(error as Error)
      });

      SecureErrorHandler.logError(error as Error, {
        action: 'findMakeableRecipes'
      });
    }
  }, [recipes, availableIngredients, onSearchComplete, updateState]);

  // Generate search suggestions
  const generateSuggestions = useCallback((query: string): void => {
    try {
      if (query.length < 2) {
        updateState({ suggestions: [] });
        return;
      }

      const suggestions = RecipeSearchUtils.generateSearchSuggestions(
        recipes,
        availableIngredients,
        query
      );

      updateState({ suggestions });

    } catch (error) {
      SecureErrorHandler.logError(error as Error, {
        action: 'generateSuggestions',
        query
      });
    }
  }, [recipes, availableIngredients, updateState]);

  // Clear search results
  const clearResults = useCallback(() => {
    updateState({
      results: [],
      suggestions: [],
      hasSearched: false,
      totalResults: 0,
      makeableRecipes: [],
      error: null
    });
  }, [updateState]);

  // Clear search cache
  const clearCache = useCallback(() => {
    RecipeSearchUtils.clearCache();
  }, []);

  // Set filters without performing search
  const setFilters = useCallback((filters: AdvancedSearchFilters) => {
    updateState({ filters });
  }, [updateState]);

  // Reset search state completely
  const resetSearch = useCallback(() => {
    updateState({
      results: [],
      suggestions: [],
      loading: false,
      error: null,
      filters: defaultFilters,
      hasSearched: false,
      totalResults: 0,
      makeableRecipes: []
    });
    currentSearchRef.current = 0;
  }, [defaultFilters, updateState]);

  // Refresh current search results
  const refreshResults = useCallback(async (): Promise<void> => {
    if (state.hasSearched && state.filters) {
      await performSearch(state.filters);
    }
  }, [state.hasSearched, state.filters, performSearch]);

  // Auto-search when dependencies change (if enabled)
  useEffect(() => {
    if (autoSearch && recipes.length > 0 && Object.keys(state.filters).length > 0) {
      performSearch(state.filters);
    }
  }, [autoSearch, recipes.length, performSearch]); // Note: deliberately not including state.filters to avoid infinite loops

  // Cleanup: clean expired cache entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      RecipeSearchUtils.cleanExpiredCache();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Memoized actions object
  const actions: UseAdvancedSearchActions = useMemo(() => ({
    performSearch,
    findMakeableRecipes,
    generateSuggestions,
    clearResults,
    clearCache,
    setFilters,
    resetSearch,
    refreshResults
  }), [
    performSearch,
    findMakeableRecipes,
    generateSuggestions,
    clearResults,
    clearCache,
    setFilters,
    resetSearch,
    refreshResults
  ]);

  return {
    state,
    actions
  };
};

// Enhanced "What Can I Make?" functionality with manual ingredient selection
export const useWhatCanIMake = (
  recipes: Recipe[],
  availableIngredients: Ingredient[]
) => {
  const [makeableRecipes, setMakeableRecipes] = useState<RecipeMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [matchThreshold, setMatchThreshold] = useState(70);
  const [isManualMode, setIsManualMode] = useState(false);

  // Find recipes with all available ingredients (automatic mode)
  const findRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const results = RecipeSearchUtils.findMakeableRecipes(
        recipes,
        availableIngredients
      );

      setMakeableRecipes(results);
    } catch (err) {
      setError(SecureErrorHandler.getUserFriendlyMessage(err as Error));
      SecureErrorHandler.logError(err as Error, { action: 'whatCanIMake' });
    } finally {
      setLoading(false);
    }
  }, [recipes, availableIngredients]);

  // Find recipes with manually selected ingredients
  const findRecipesWithSelection = useCallback(async (
    ingredientIds: string[],
    threshold: number = 1,
    excludedIngredientIds: string[] = []
  ) => {
    try {
      setLoading(true);
      setError(null);
      setIsManualMode(true);
      setSelectedIngredientIds(ingredientIds);
      setMatchThreshold(threshold);

      // Get selected ingredients
      const selectedIngredients = availableIngredients.filter(ing => 
        ingredientIds.includes(ing.id)
      );

      // If no ingredients selected but has exclusions, use all available ingredients for filtering
      const searchIngredients = selectedIngredients.length > 0 
        ? selectedIngredients 
        : availableIngredients;

      if (selectedIngredients.length === 0 && excludedIngredientIds.length === 0) {
        setMakeableRecipes([]);
        return;
      }

      // Use advanced search with ingredient count threshold and exclusions
      const results = RecipeSearchUtils.searchRecipes(
        recipes,
        searchIngredients,
        { 
          matchThreshold: selectedIngredients.length > 0 ? threshold : 0, // Set threshold to 0 if only excluding
          excludedIngredients: excludedIngredientIds,
          useIngredientCount: selectedIngredients.length > 0 // Only use ingredient count if ingredients selected
        }
      );

      // Filter for recipes that meet the minimum ingredient count threshold
      const filteredResults = selectedIngredients.length > 0 
        ? results.filter(result => result.availableIngredients.length >= threshold)
        : results; // If only excluding, don't filter by ingredient count

      setMakeableRecipes(filteredResults);
    } catch (err) {
      setError(SecureErrorHandler.getUserFriendlyMessage(err as Error));
      SecureErrorHandler.logError(err as Error, { action: 'whatCanIMakeManual' });
    } finally {
      setLoading(false);
    }
  }, [recipes, availableIngredients]);

  // Reset to automatic mode
  const resetToAutoMode = useCallback(async () => {
    setIsManualMode(false);
    setSelectedIngredientIds([]);
    setMatchThreshold(70);
    await findRecipes();
  }, [findRecipes]);

  // Get ingredient suggestions based on current selection
  const getIngredientSuggestions = useCallback((currentSelectionIds: string[]) => {
    if (currentSelectionIds.length === 0) return [];

    const selectedIngredients = availableIngredients.filter(ing => 
      currentSelectionIds.includes(ing.id)
    );

    // Find recipes that use some of the selected ingredients
    const relatedRecipes = recipes.filter(recipe => 
      recipe.ingredients.some(ri => 
        selectedIngredients.some(selected => selected.id === ri.ingredientId)
      )
    );

    // Count frequency of ingredients in related recipes
    const ingredientFreq = new Map<string, number>();
    relatedRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ri => {
        if (!currentSelectionIds.includes(ri.ingredientId)) {
          const current = ingredientFreq.get(ri.ingredientId) || 0;
          ingredientFreq.set(ri.ingredientId, current + 1);
        }
      });
    });

    // Get top suggestions
    const suggestions = Array.from(ingredientFreq.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([ingredientId]) => 
        availableIngredients.find(ing => ing.id === ingredientId)
      )
      .filter(Boolean) as Ingredient[];

    return suggestions;
  }, [availableIngredients, recipes]);

  // Auto-run in automatic mode
  useEffect(() => {
    if (!isManualMode && recipes.length > 0 && availableIngredients.length > 0) {
      findRecipes();
    }
  }, [findRecipes, isManualMode]);

  return {
    // Results
    makeableRecipes,
    loading,
    error,
    
    // Mode management
    isManualMode,
    selectedIngredientIds,
    matchThreshold,
    
    // Actions
    refresh: findRecipes,
    findRecipesWithSelection,
    resetToAutoMode,
    getIngredientSuggestions,
    
    // Stats
    totalMakeable: makeableRecipes.length,
    perfectMatches: makeableRecipes.filter(r => r.matchPercentage === 100).length,
    partialMatches: makeableRecipes.filter(r => r.matchPercentage < 100).length,
  };
};

// Hook for search history management
export const useSearchSuggestions = (
  recipes: Recipe[],
  ingredients: Ingredient[]
) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const generateSuggestions = useCallback((query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const newSuggestions = RecipeSearchUtils.generateSearchSuggestions(
        recipes,
        ingredients,
        query
      );
      setSuggestions(newSuggestions);
    } catch (error) {
      SecureErrorHandler.logError(error as Error, {
        action: 'generateSearchSuggestions',
        query
      });
    }
  }, [recipes, ingredients]);

  const addToRecentSearches = useCallback((query: string) => {
    if (query.trim().length < 2) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(search => search !== query);
      return [query, ...filtered].slice(0, 10); // Keep last 10 searches
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return {
    suggestions,
    recentSearches,
    generateSuggestions,
    addToRecentSearches,
    clearRecentSearches
  };
};