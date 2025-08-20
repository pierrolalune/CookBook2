import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { FavoritesRepository } from '../repositories/FavoritesRepository';

interface FavoritesContextType {
  favoriteIds: string[];
  loading: boolean;
  error: string | null;
  toggleFavorite: (ingredientId: string) => Promise<boolean>;
  addFavorite: (ingredientId: string) => Promise<boolean>;
  removeFavorite: (ingredientId: string) => Promise<boolean>;
  isFavorite: (ingredientId: string) => boolean;
  loadFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const value: FavoritesContextType = {
    favoriteIds,
    loading,
    error,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isFavorite,
    loadFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavoritesContext = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider');
  }
  return context;
};