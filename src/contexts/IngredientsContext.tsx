import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { IngredientRepository } from '../repositories/IngredientRepository';
import { Ingredient, IngredientFilters, CreateIngredientInput, UpdateIngredientInput } from '../types';

interface IngredientsContextType {
  ingredients: Ingredient[];
  loading: boolean;
  error: string | null;
  loadIngredients: (filters?: IngredientFilters) => Promise<void>;
  createIngredient: (input: CreateIngredientInput) => Promise<Ingredient | null>;
  updateIngredient: (input: UpdateIngredientInput) => Promise<Ingredient | null>;
  deleteIngredient: (id: string) => Promise<boolean>;
  refreshIngredients: () => Promise<void>;
  syncFavorites: (favoriteIds: string[]) => void;
}

const IngredientsContext = createContext<IngredientsContextType | undefined>(undefined);

export const IngredientsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rawIngredients, setRawIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  
  const repository = new IngredientRepository();

  // Sync ingredients with favorites
  const ingredients = React.useMemo(() => {
    return rawIngredients.map(ingredient => ({
      ...ingredient,
      isFavorite: favoriteIds.includes(ingredient.id)
    }));
  }, [rawIngredients, favoriteIds]);

  // Function to sync favorites from FavoritesContext
  const syncFavorites = useCallback((newFavoriteIds: string[]) => {
    setFavoriteIds(newFavoriteIds);
  }, []);

  const loadIngredients = useCallback(async (filters?: IngredientFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await repository.findAll(filters || {});
      setRawIngredients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading ingredients');
      console.error('Error loading ingredients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createIngredient = useCallback(async (input: CreateIngredientInput): Promise<Ingredient | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const newIngredient = await repository.create(input);
      
      // Add to local state immediately
      setRawIngredients(prev => [...prev, newIngredient]);
      
      return newIngredient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating ingredient');
      console.error('Error creating ingredient:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateIngredient = useCallback(async (input: UpdateIngredientInput): Promise<Ingredient | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedIngredient = await repository.update(input);
      
      // Update local state immediately
      setRawIngredients(prev => 
        prev.map(ingredient => 
          ingredient.id === input.id ? updatedIngredient : ingredient
        )
      );
      
      return updatedIngredient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating ingredient');
      console.error('Error updating ingredient:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteIngredient = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await repository.delete(id);
      
      // Remove from local state immediately
      setRawIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting ingredient');
      console.error('Error deleting ingredient:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshIngredients = useCallback(async () => {
    await loadIngredients();
  }, [loadIngredients]);

  // Load ingredients on mount
  useEffect(() => {
    loadIngredients();
  }, []);

  const value: IngredientsContextType = {
    ingredients,
    loading,
    error,
    loadIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    refreshIngredients,
    syncFavorites,
  };

  return (
    <IngredientsContext.Provider value={value}>
      {children}
    </IngredientsContext.Provider>
  );
};

export const useIngredientsContext = (): IngredientsContextType => {
  const context = useContext(IngredientsContext);
  if (!context) {
    throw new Error('useIngredientsContext must be used within IngredientsProvider');
  }
  return context;
};