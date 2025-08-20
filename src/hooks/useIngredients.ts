import { useState, useEffect, useCallback, useContext } from 'react';
import { IngredientRepository } from '../repositories/IngredientRepository';
import { Ingredient, IngredientFilters, CreateIngredientInput, UpdateIngredientInput, IngredientCategory } from '../types';
import { useIngredientsContext } from '../contexts/IngredientsContext';

export const useIngredients = (initialFilters?: IngredientFilters) => {
  // Try to use context if available
  try {
    const context = useIngredientsContext();
    const [filters, setFilters] = useState<IngredientFilters>(initialFilters || {});
    
    // Filter ingredients based on local filters
    const filteredIngredients = useCallback(() => {
      let filtered = context.ingredients;
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(ing => 
          ing.name.toLowerCase().includes(query) ||
          ing.subcategory.toLowerCase().includes(query) ||
          ing.description?.toLowerCase().includes(query)
        );
      }
      
      if (filters.category) {
        filtered = filtered.filter(ing => ing.category === filters.category);
      }
      
      if (filters.favoritesOnly) {
        filtered = filtered.filter(ing => ing.isFavorite);
      }
      
      if (filters.userCreatedOnly) {
        filtered = filtered.filter(ing => ing.isUserCreated);
      }
      
      return filtered;
    }, [context.ingredients, filters]);
    
    return {
      ingredients: filteredIngredients(),
      loading: context.loading,
      error: context.error,
      filters,
      actions: {
        loadIngredients: context.loadIngredients,
        searchIngredients: async (query: string) => {
          setFilters(prev => ({ ...prev, searchQuery: query }));
        },
        filterByCategory: async (category: IngredientCategory | 'favoris' | 'myproduct' | 'saison') => {
          const newFilters: IngredientFilters = { ...filters };
          
          if (category === 'favoris') {
            newFilters.favoritesOnly = true;
            delete newFilters.category;
          } else if (category === 'myproduct') {
            newFilters.userCreatedOnly = true;
            delete newFilters.category;
          } else if (category === 'saison') {
            newFilters.currentSeason = true;
            delete newFilters.category;
          } else {
            newFilters.category = category;
          }
          
          setFilters(newFilters);
        },
        createIngredient: context.createIngredient,
        updateIngredient: context.updateIngredient,
        deleteIngredient: context.deleteIngredient,
        getIngredientById: async (id: string) => {
          return context.ingredients.find(ing => ing.id === id) || null;
        },
        refreshIngredients: context.refreshIngredients,
        clearFilters: () => {
          setFilters({});
        },
        setFilters
      }
    };
  } catch (error) {
    // Fallback to local state if context is not available
    // This maintains backward compatibility
  }
  
  // Original implementation as fallback
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<IngredientFilters>(initialFilters || {});

  const repository = new IngredientRepository();

  const loadIngredients = useCallback(async (searchFilters?: IngredientFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentFilters = searchFilters || filters;
      const data = await repository.findAll(currentFilters);
      setIngredients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading ingredients');
      console.error('Error loading ingredients:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const searchIngredients = useCallback(async (query: string) => {
    const searchFilters = { ...filters, searchQuery: query };
    await loadIngredients(searchFilters);
  }, [filters, loadIngredients]);

  const filterByCategory = useCallback(async (category: IngredientCategory | 'favoris' | 'myproduct' | 'saison') => {
    const newFilters: IngredientFilters = { ...filters, category };
    
    // Special handling for filter categories
    if (category === 'favoris') {
      newFilters.favoritesOnly = true;
      delete newFilters.category;
    } else if (category === 'myproduct') {
      newFilters.userCreatedOnly = true;
      delete newFilters.category;
    } else if (category === 'saison') {
      newFilters.currentSeason = true;
      delete newFilters.category;
    }
    
    setFilters(newFilters);
    await loadIngredients(newFilters);
  }, [filters, loadIngredients]);

  const createIngredient = useCallback(async (input: CreateIngredientInput): Promise<Ingredient | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const newIngredient = await repository.create(input);
      
      // Refresh the list to include the new ingredient
      await loadIngredients();
      
      return newIngredient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating ingredient');
      console.error('Error creating ingredient:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadIngredients]);

  const updateIngredient = useCallback(async (input: UpdateIngredientInput): Promise<Ingredient | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedIngredient = await repository.update(input);
      
      // Update the local state
      setIngredients(prev => 
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
      
      // Remove from local state
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting ingredient');
      console.error('Error deleting ingredient:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getIngredientById = useCallback(async (id: string): Promise<Ingredient | null> => {
    try {
      return await repository.findById(id);
    } catch (err) {
      console.error('Error getting ingredient by id:', err);
      return null;
    }
  }, []);

  const refreshIngredients = useCallback(() => {
    loadIngredients();
  }, [loadIngredients]);

  const clearFilters = useCallback(() => {
    setFilters({});
    loadIngredients({});
  }, [loadIngredients]);

  // Load ingredients on mount and when filters change
  useEffect(() => {
    loadIngredients();
  }, []); // Only run on mount, filters are handled separately

  return {
    ingredients,
    loading,
    error,
    filters,
    actions: {
      loadIngredients,
      searchIngredients,
      filterByCategory,
      createIngredient,
      updateIngredient,
      deleteIngredient,
      getIngredientById,
      refreshIngredients,
      clearFilters,
      setFilters
    }
  };
};