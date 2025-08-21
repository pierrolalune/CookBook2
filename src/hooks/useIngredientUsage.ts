import { useState, useEffect, useCallback } from 'react';
import { IngredientUsageStats } from '../types';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { SecureErrorHandler } from '../utils/errorHandler';

export interface IngredientUsageDisplay {
  ingredientId: string;
  usageText: string;
  usageCount: number;
  lastUsedText?: string;
  isPopular: boolean;
  isRecentlyUsed: boolean;
}

interface UseIngredientUsageReturn {
  usageStats: { [ingredientId: string]: IngredientUsageStats };
  loading: boolean;
  error: string | null;
  getUsageDisplay: (ingredientId: string) => IngredientUsageDisplay | null;
  loadUsageForIngredients: (ingredientIds: string[]) => Promise<void>;
  refreshUsageStats: () => Promise<void>;
  clearUsageCache: () => void;
}

export const useIngredientUsage = (ingredientIds?: string[]): UseIngredientUsageReturn => {
  const [usageStats, setUsageStats] = useState<{ [ingredientId: string]: IngredientUsageStats }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = new RecipeRepository();

  // Load usage statistics for specific ingredients
  const loadUsageForIngredients = useCallback(async (ids: string[]): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const statsPromises = ids
        .filter(id => !usageStats[id]) // Only load stats we don't already have
        .map(async (id) => {
          try {
            const stats = await repository.getIngredientUsageStats(id);
            return { id, stats };
          } catch (error) {
            console.error(`Failed to load stats for ingredient ${id}:`, error);
            return { id, stats: null };
          }
        });

      if (statsPromises.length === 0) {
        setLoading(false);
        return;
      }

      const results = await Promise.all(statsPromises);
      
      const newStats: { [ingredientId: string]: IngredientUsageStats } = {};
      results.forEach(({ id, stats }) => {
        if (stats) {
          newStats[id] = stats;
        }
      });

      setUsageStats(prev => ({ ...prev, ...newStats }));
      setLoading(false);
    } catch (err) {
      const errorMessage = SecureErrorHandler.getUserFriendlyMessage(err as Error);
      setError(errorMessage);
      setLoading(false);
    }
  }, [repository, usageStats]);

  // Refresh all usage statistics
  const refreshUsageStats = useCallback(async (): Promise<void> => {
    const allIds = Object.keys(usageStats);
    if (allIds.length === 0) return;

    // Clear cache and reload
    setUsageStats({});
    await loadUsageForIngredients(allIds);
  }, [usageStats, loadUsageForIngredients]);

  // Clear usage cache
  const clearUsageCache = useCallback((): void => {
    setUsageStats({});
  }, []);

  // Generate usage display information
  const getUsageDisplay = useCallback((ingredientId: string): IngredientUsageDisplay | null => {
    const stats = usageStats[ingredientId];
    if (!stats) {
      return null;
    }

    const { totalUsesInRecipes, recipeCount, lastUsedInRecipe } = stats;

    // Generate usage text
    let usageText: string;
    if (totalUsesInRecipes === 0) {
      usageText = "Jamais utilisé";
    } else if (totalUsesInRecipes === 1) {
      usageText = "Utilisé 1 fois";
    } else {
      usageText = `Utilisé ${totalUsesInRecipes} fois`;
    }

    // Add recipe count if different from usage count
    if (recipeCount > 0 && recipeCount !== totalUsesInRecipes) {
      if (recipeCount === 1) {
        usageText += " dans 1 recette";
      } else {
        usageText += ` dans ${recipeCount} recettes`;
      }
    }

    // Generate last used text
    let lastUsedText: string | undefined;
    if (lastUsedInRecipe) {
      const now = new Date();
      const lastUsed = new Date(lastUsedInRecipe);
      const daysDiff = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        lastUsedText = "Utilisé aujourd'hui";
      } else if (daysDiff === 1) {
        lastUsedText = "Utilisé hier";
      } else if (daysDiff < 7) {
        lastUsedText = `Utilisé il y a ${daysDiff} jours`;
      } else if (daysDiff < 30) {
        const weeks = Math.floor(daysDiff / 7);
        lastUsedText = weeks === 1 ? "Utilisé il y a 1 semaine" : `Utilisé il y a ${weeks} semaines`;
      } else if (daysDiff < 365) {
        const months = Math.floor(daysDiff / 30);
        lastUsedText = months === 1 ? "Utilisé il y a 1 mois" : `Utilisé il y a ${months} mois`;
      } else {
        lastUsedText = "Utilisé il y a plus d'un an";
      }
    }

    // Determine popularity and recency
    const isPopular = totalUsesInRecipes >= 5; // Popular if used 5+ times
    const isRecentlyUsed = Boolean(lastUsedInRecipe && 
      (new Date().getTime() - new Date(lastUsedInRecipe).getTime()) < (7 * 24 * 60 * 60 * 1000)); // Within last 7 days

    return {
      ingredientId,
      usageText,
      usageCount: totalUsesInRecipes,
      lastUsedText,
      isPopular,
      isRecentlyUsed
    };
  }, [usageStats]);

  // Auto-load usage stats for provided ingredient IDs
  useEffect(() => {
    if (ingredientIds && ingredientIds.length > 0) {
      loadUsageForIngredients(ingredientIds);
    }
  }, [ingredientIds?.join(','), loadUsageForIngredients]);

  return {
    usageStats,
    loading,
    error,
    getUsageDisplay,
    loadUsageForIngredients,
    refreshUsageStats,
    clearUsageCache
  };
};

// Hook for tracking popular ingredients based on usage
export const usePopularIngredients = () => {
  const [popularIngredients, setPopularIngredients] = useState<{
    ingredientId: string;
    usageCount: number;
    recipeCount: number;
  }[]>([]);
  const [loading, setLoading] = useState(false);

  const repository = new RecipeRepository();

  const loadPopularIngredients = useCallback(async (limit: number = 10): Promise<void> => {
    try {
      setLoading(true);
      
      // This would typically be a specialized repository method
      // For now, we'll simulate getting all recipes and calculating popularity
      const recipes = await repository.findAll();
      
      // Count ingredient usage across all recipes
      const ingredientCounts: { [ingredientId: string]: { usageCount: number, recipeCount: number } } = {};
      
      recipes.forEach(recipe => {
        const seenIngredients = new Set<string>();
        recipe.ingredients.forEach(ingredient => {
          const id = ingredient.ingredientId;
          
          if (!ingredientCounts[id]) {
            ingredientCounts[id] = { usageCount: 0, recipeCount: 0 };
          }
          
          ingredientCounts[id].usageCount += 1;
          
          if (!seenIngredients.has(id)) {
            ingredientCounts[id].recipeCount += 1;
            seenIngredients.add(id);
          }
        });
      });

      // Sort by usage count and take top items
      const popular = Object.entries(ingredientCounts)
        .map(([ingredientId, counts]) => ({
          ingredientId,
          usageCount: counts.usageCount,
          recipeCount: counts.recipeCount
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);

      setPopularIngredients(popular);
      setLoading(false);
    } catch (error) {
      console.error('Error loading popular ingredients:', error);
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadPopularIngredients();
  }, [loadPopularIngredients]);

  return {
    popularIngredients,
    loading,
    refresh: loadPopularIngredients
  };
};

// Hook for ingredient usage trends
export const useIngredientTrends = () => {
  const [trends, setTrends] = useState({
    trending: [] as string[], // ingredient IDs that are trending up
    declining: [] as string[], // ingredient IDs that are declining
    loading: false
  });

  const repository = new RecipeRepository();

  const loadTrends = useCallback(async (): Promise<void> => {
    try {
      setTrends(prev => ({ ...prev, loading: true }));
      
      // This would be implemented with more sophisticated analytics
      // For now, we'll use a simple approach based on recent usage
      const allRecipes = await repository.findAll();
      
      // Get recent recipes (last 30 days) vs older recipes
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRecipes = allRecipes.filter(recipe => 
        new Date(recipe.createdAt) >= thirtyDaysAgo
      );
      
      const olderRecipes = allRecipes.filter(recipe => 
        new Date(recipe.createdAt) < thirtyDaysAgo
      );

      // Count ingredient usage in recent vs older recipes
      const recentUsage: { [ingredientId: string]: number } = {};
      const olderUsage: { [ingredientId: string]: number } = {};

      recentRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          recentUsage[ingredient.ingredientId] = (recentUsage[ingredient.ingredientId] || 0) + 1;
        });
      });

      olderRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          olderUsage[ingredient.ingredientId] = (olderUsage[ingredient.ingredientId] || 0) + 1;
        });
      });

      // Calculate trends (simplified algorithm)
      const trending: string[] = [];
      const declining: string[] = [];

      Object.keys(recentUsage).forEach(ingredientId => {
        const recentCount = recentUsage[ingredientId] || 0;
        const olderCount = olderUsage[ingredientId] || 0;
        
        // Simple trend calculation based on growth rate
        if (recentCount > olderCount * 1.5 && recentCount >= 2) {
          trending.push(ingredientId);
        } else if (olderCount > recentCount * 2 && olderCount >= 3) {
          declining.push(ingredientId);
        }
      });

      setTrends({
        trending: trending.slice(0, 5), // Top 5 trending
        declining: declining.slice(0, 5), // Top 5 declining
        loading: false
      });
    } catch (error) {
      console.error('Error loading ingredient trends:', error);
      setTrends(prev => ({ ...prev, loading: false }));
    }
  }, [repository]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return {
    ...trends,
    refresh: loadTrends
  };
};