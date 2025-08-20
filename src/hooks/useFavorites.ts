import { useState, useEffect, useCallback } from 'react';
import { FavoritesRepository } from '../repositories/FavoritesRepository';

export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = new FavoritesRepository();

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
  }, []);

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
  }, []);

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
  }, []);

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
  }, []);

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
  }, []);

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
  }, []);

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