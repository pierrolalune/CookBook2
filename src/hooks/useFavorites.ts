import { useState, useEffect, useCallback, useMemo } from 'react';
import { FavoritesRepository } from '../repositories/FavoritesRepository';
import { useFavoritesContext } from '../contexts/FavoritesContext';

export const useFavorites = () => {
  // Try to use context if available
  try {
    const context = useFavoritesContext();
    
    return {
      favoriteIds: context.favoriteIds,
      loading: context.loading,
      error: context.error,
      actions: {
        toggleFavorite: context.toggleFavorite,
        addFavorite: context.addFavorite,
        removeFavorite: context.removeFavorite,
        isFavorite: context.isFavorite,
        getFavoriteCount: async () => context.favoriteIds.length,
        clearAllFavorites: async () => {
          // Clear all favorites in context
          const promises = context.favoriteIds.map(id => context.removeFavorite(id));
          await Promise.all(promises);
          return true;
        },
        loadFavorites: context.loadFavorites
      }
    };
  } catch (error) {
    // Fallback to local state if context is not available
    // This maintains backward compatibility
  }

  // Original implementation as fallback
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create repository once and memoize
  const repository = useMemo(() => new FavoritesRepository(), []);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const ids = await repository.getFavoriteIds();
      setFavoriteIds(ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading favorites');
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  const toggleFavorite = useCallback(async (ingredientId: string): Promise<boolean> => {
    try {
      const newFavoriteStatus = await repository.toggleFavorite(ingredientId);
      
      // Update local state immediately for better UX
      if (newFavoriteStatus) {
        setFavoriteIds(prev => [...prev, ingredientId]);
      } else {
        setFavoriteIds(prev => prev.filter(id => id !== ingredientId));
      }
      
      return newFavoriteStatus;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error toggling favorite');
      console.error('Error toggling favorite:', err);
      return false;
    }
  }, [repository]);

  const addFavorite = useCallback(async (ingredientId: string): Promise<boolean> => {
    try {
      await repository.addFavorite(ingredientId);
      
      // Update local state
      setFavoriteIds(prev => 
        prev.includes(ingredientId) ? prev : [...prev, ingredientId]
      );
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding favorite');
      console.error('Error adding favorite:', err);
      return false;
    }
  }, [repository]);

  const removeFavorite = useCallback(async (ingredientId: string): Promise<boolean> => {
    try {
      await repository.removeFavorite(ingredientId);
      
      // Update local state
      setFavoriteIds(prev => prev.filter(id => id !== ingredientId));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing favorite');
      console.error('Error removing favorite:', err);
      return false;
    }
  }, [repository]);

  const isFavorite = useCallback((ingredientId: string): boolean => {
    return favoriteIds.includes(ingredientId);
  }, [favoriteIds]);

  const getFavoriteCount = useCallback(async (): Promise<number> => {
    try {
      return await repository.getFavoriteCount();
    } catch (err) {
      console.error('Error getting favorite count:', err);
      return 0;
    }
  }, [repository]);

  const clearAllFavorites = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      await repository.clearAllFavorites();
      setFavoriteIds([]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error clearing favorites');
      console.error('Error clearing favorites:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [repository]);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favoriteIds,
    loading,
    error,
    actions: {
      toggleFavorite,
      addFavorite,
      removeFavorite,
      isFavorite,
      getFavoriteCount,
      clearAllFavorites,
      loadFavorites
    }
  };
};