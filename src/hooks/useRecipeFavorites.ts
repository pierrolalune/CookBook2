import { useState, useCallback, useEffect } from 'react';
import { RecipeFavoritesRepository } from '../repositories/RecipeFavoritesRepository';

interface RecipeFavoritesState {
  favoriteIds: string[];
  loading: boolean;
  error: string | null;
}

interface RecipeFavoritesActions {
  loadFavorites: () => Promise<void>;
  toggleFavorite: (recipeId: string) => Promise<boolean>;
  addFavorite: (recipeId: string) => Promise<boolean>;
  removeFavorite: (recipeId: string) => Promise<boolean>;
  isFavorite: (recipeId: string) => boolean;
  getFavoriteCount: () => number;
  clearFavorites: () => Promise<void>;
}

export interface UseRecipeFavoritesResult {
  favoriteIds: string[];
  loading: boolean;
  error: string | null;
  actions: RecipeFavoritesActions;
}

interface UseRecipeFavoritesOptions {
  onFavoriteChange?: (recipeId: string, isFavorite: boolean) => void;
}

export const useRecipeFavorites = (options?: UseRecipeFavoritesOptions): UseRecipeFavoritesResult => {
  const [state, setState] = useState<RecipeFavoritesState>({
    favoriteIds: [],
    loading: false,
    error: null,
  });

  const repository = new RecipeFavoritesRepository();

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setFavoriteIds = useCallback((favoriteIds: string[]) => {
    setState(prev => ({ ...prev, favoriteIds }));
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const ids = await repository.getFavoriteIds();
      setFavoriteIds(ids);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading recipe favorites';
      setError(errorMessage);
      console.error('Error loading recipe favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setFavoriteIds]);

  const toggleFavorite = useCallback(async (recipeId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Optimistic update
      const wasFavorite = state.favoriteIds.includes(recipeId);
      const newFavoriteIds = wasFavorite
        ? state.favoriteIds.filter(id => id !== recipeId)
        : [...state.favoriteIds, recipeId];
      
      setFavoriteIds(newFavoriteIds);
      
      // Update database
      const newFavoriteStatus = await repository.toggleFavorite(recipeId);
      
      // Verify optimistic update was correct
      if (newFavoriteStatus !== !wasFavorite) {
        // Revert if mismatch
        setFavoriteIds(state.favoriteIds);
      }
      
      // Notify about favorite change
      options?.onFavoriteChange?.(recipeId, newFavoriteStatus);
      
      return newFavoriteStatus;
    } catch (err) {
      // Revert optimistic update on error
      setFavoriteIds(state.favoriteIds);
      const errorMessage = err instanceof Error ? err.message : 'Error toggling recipe favorite';
      setError(errorMessage);
      console.error('Error toggling recipe favorite:', err);
      return false;
    }
  }, [state.favoriteIds, setError, setFavoriteIds]);

  const addFavorite = useCallback(async (recipeId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Optimistic update
      if (!state.favoriteIds.includes(recipeId)) {
        setFavoriteIds([...state.favoriteIds, recipeId]);
      }
      
      await repository.addFavorite(recipeId);
      
      // Notify about favorite change
      options?.onFavoriteChange?.(recipeId, true);
      
      return true;
    } catch (err) {
      // Revert optimistic update on error
      setFavoriteIds(state.favoriteIds.filter(id => id !== recipeId));
      const errorMessage = err instanceof Error ? err.message : 'Error adding recipe favorite';
      setError(errorMessage);
      console.error('Error adding recipe favorite:', err);
      return false;
    }
  }, [state.favoriteIds, setError, setFavoriteIds]);

  const removeFavorite = useCallback(async (recipeId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Optimistic update
      setFavoriteIds(state.favoriteIds.filter(id => id !== recipeId));
      
      await repository.removeFavorite(recipeId);
      
      // Notify about favorite change
      options?.onFavoriteChange?.(recipeId, false);
      
      return true;
    } catch (err) {
      // Revert optimistic update on error
      if (!state.favoriteIds.includes(recipeId)) {
        setFavoriteIds([...state.favoriteIds, recipeId]);
      }
      const errorMessage = err instanceof Error ? err.message : 'Error removing recipe favorite';
      setError(errorMessage);
      console.error('Error removing recipe favorite:', err);
      return false;
    }
  }, [state.favoriteIds, setError, setFavoriteIds]);

  const isFavorite = useCallback((recipeId: string): boolean => {
    return state.favoriteIds.includes(recipeId);
  }, [state.favoriteIds]);

  const getFavoriteCount = useCallback((): number => {
    return state.favoriteIds.length;
  }, [state.favoriteIds]);

  const clearFavorites = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Optimistic update
      const oldFavoriteIds = state.favoriteIds;
      setFavoriteIds([]);
      
      await repository.clearAllFavorites();
    } catch (err) {
      // Revert optimistic update on error
      setFavoriteIds(state.favoriteIds);
      const errorMessage = err instanceof Error ? err.message : 'Error clearing recipe favorites';
      setError(errorMessage);
      console.error('Error clearing recipe favorites:', err);
    }
  }, [state.favoriteIds, setError, setFavoriteIds]);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const actions: RecipeFavoritesActions = {
    loadFavorites,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isFavorite,
    getFavoriteCount,
    clearFavorites,
  };

  return {
    favoriteIds: state.favoriteIds,
    loading: state.loading,
    error: state.error,
    actions,
  };
};