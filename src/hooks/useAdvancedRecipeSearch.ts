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
    console.log('updateState called with:', updates);
    setState(prev => {
      const newState = { ...prev, ...updates };
      console.log('State updated from:', { hasSearched: prev.hasSearched, results: prev.results.length }, 'to:', { hasSearched: newState.hasSearched, results: newState.results.length });
      return newState;
    });
  }, []);

  // Perform advanced search
  const performSearch = useCallback(async (filters: AdvancedSearchFilters): Promise<void> => {
    try {
      console.log('performSearch started with filters:', filters);
      // Increment search counter for stale result detection
      const searchId = ++currentSearchRef.current;
      
      console.log('Setting loading state (hasSearched will be set after results)');
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

      console.log('Search completed, updating results:', results.length, 'recipes found');
      updateState({
        results,
        totalResults: results.length,
        loading: false,
        error: null,
        hasSearched: true // Set to true only when we have results
      });

      // Callback for parent component
      onSearchComplete?.(results);

      // Log search analytics (non-blocking)
      if (__DEV__) {
        console.log('Advanced search performed:', {
          action: 'advancedSearch',
          resultsCount: results.length,
          filtersUsed: Object.keys(filters).length
        });
      }

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

// Specialized hook for "What Can I Make?" functionality
export const useWhatCanIMake = (
  recipes: Recipe[],
  availableIngredients: Ingredient[]
) => {
  const [makeableRecipes, setMakeableRecipes] = useState<RecipeMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (recipes.length > 0 && availableIngredients.length > 0) {
      findRecipes();
    }
  }, [findRecipes]);

  return {
    makeableRecipes,
    loading,
    error,
    refresh: findRecipes,
    totalMakeable: makeableRecipes.length
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