import { Recipe, Ingredient, RecipeCategory, RecipeDifficulty } from '../types';
import { SeasonalUtils } from './seasonalUtils';
import { ValidationUtils } from './validation';
import { SecureErrorHandler } from './errorHandler';

export interface RecipeMatchResult {
  recipe: Recipe;
  matchPercentage: number;
  availableIngredients: string[];
  missingIngredients: RecipeIngredientMatch[];
  optionalMissing: RecipeIngredientMatch[];
  canMake: boolean;
  seasonalBonus: number;
}

export interface RecipeIngredientMatch {
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
  unit: string;
  optional: boolean;
  substitutions?: Ingredient[];
}

export interface AdvancedSearchFilters {
  searchQuery?: string;
  category?: RecipeCategory | 'favoris' | 'all';
  difficulty?: RecipeDifficulty | 'all';
  prepTimeMin?: number;
  prepTimeMax?: number;
  cookTimeMin?: number;
  cookTimeMax?: number;
  includedIngredients?: string[];
  excludedIngredients?: string[];
  availableIngredients?: string[];
  seasonalOnly?: boolean;
  favoritesOnly?: boolean;
  matchThreshold?: number; // 0-100, default 70
}

export interface SearchSuggestion {
  type: 'recipe' | 'ingredient' | 'category';
  value: string;
  label: string;
  count?: number;
}

export interface RecipeSearchCache {
  query: string;
  filters: AdvancedSearchFilters;
  results: RecipeMatchResult[];
  timestamp: number;
}

export class RecipeSearchUtils {
  private static readonly DEFAULT_MATCH_THRESHOLD = 70;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static searchCache: Map<string, RecipeSearchCache> = new Map();

  // Main search method
  static searchRecipes(
    recipes: Recipe[],
    availableIngredients: Ingredient[],
    filters: AdvancedSearchFilters = {}
  ): RecipeMatchResult[] {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(filters);
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.results;
      }

      let filteredRecipes = [...recipes];

      // Apply basic filters first
      filteredRecipes = this.applyBasicFilters(filteredRecipes, filters);

      // Calculate ingredient matches for remaining recipes
      const results = filteredRecipes.map(recipe => 
        this.calculateRecipeMatch(recipe, availableIngredients, filters)
      );

      // Sort by match score and seasonal bonus
      const sortedResults = results.sort((a, b) => {
        const scoreA = a.matchPercentage + a.seasonalBonus;
        const scoreB = b.matchPercentage + b.seasonalBonus;
        return scoreB - scoreA;
      });

      // Apply match threshold filter
      const threshold = filters.matchThreshold || this.DEFAULT_MATCH_THRESHOLD;
      const thresholdResults = sortedResults.filter(result => 
        result.matchPercentage >= threshold || result.canMake
      );

      // Cache results
      this.searchCache.set(cacheKey, {
        query: filters.searchQuery || '',
        filters,
        results: thresholdResults,
        timestamp: Date.now()
      });

      return thresholdResults;
    } catch (error) {
      SecureErrorHandler.logError(error as Error, { action: 'searchRecipes' });
      return [];
    }
  }

  // Find recipes user can make with available ingredients
  static findMakeableRecipes(
    recipes: Recipe[],
    availableIngredients: Ingredient[]
  ): RecipeMatchResult[] {
    const availableIngredientIds = new Set(availableIngredients.map(ing => ing.id));
    
    return recipes
      .map(recipe => this.calculateRecipeMatch(recipe, availableIngredients))
      .filter(result => result.canMake)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  // Calculate how well available ingredients match a recipe
  static calculateRecipeMatch(
    recipe: Recipe,
    availableIngredients: Ingredient[],
    filters: AdvancedSearchFilters = {}
  ): RecipeMatchResult {
    const availableIngredientIds = new Set(availableIngredients.map(ing => ing.id));
    const availableIngredientMap = new Map(availableIngredients.map(ing => [ing.id, ing]));

    const requiredIngredients = recipe.ingredients.filter(ri => !ri.optional);
    const optionalIngredients = recipe.ingredients.filter(ri => ri.optional);

    // Check available ingredients
    const availableMatches: string[] = [];
    const missingRequired: RecipeIngredientMatch[] = [];
    const missingOptional: RecipeIngredientMatch[] = [];

    // Process required ingredients
    for (const recipeIngredient of requiredIngredients) {
      if (availableIngredientIds.has(recipeIngredient.ingredientId)) {
        availableMatches.push(recipeIngredient.ingredientId);
      } else {
        const substitutions = this.findSubstitutions(
          recipeIngredient.ingredient,
          availableIngredients
        );
        
        missingRequired.push({
          ingredientId: recipeIngredient.ingredientId,
          ingredient: recipeIngredient.ingredient,
          quantity: recipeIngredient.quantity,
          unit: recipeIngredient.unit,
          optional: false,
          substitutions
        });
      }
    }

    // Process optional ingredients
    for (const recipeIngredient of optionalIngredients) {
      if (availableIngredientIds.has(recipeIngredient.ingredientId)) {
        availableMatches.push(recipeIngredient.ingredientId);
      } else {
        missingOptional.push({
          ingredientId: recipeIngredient.ingredientId,
          ingredient: recipeIngredient.ingredient,
          quantity: recipeIngredient.quantity,
          unit: recipeIngredient.unit,
          optional: true,
          substitutions: this.findSubstitutions(recipeIngredient.ingredient, availableIngredients)
        });
      }
    }

    // Calculate match percentage (only required ingredients count for "can make")
    const totalRequired = requiredIngredients.length;
    const availableRequired = requiredIngredients.filter(ri => 
      availableIngredientIds.has(ri.ingredientId)
    ).length;

    const matchPercentage = totalRequired > 0 ? (availableRequired / totalRequired) * 100 : 100;
    const canMake = missingRequired.length === 0; // Can make if no required ingredients are missing

    // Calculate seasonal bonus
    const seasonalBonus = this.calculateSeasonalBonus(recipe, availableIngredients);

    return {
      recipe,
      matchPercentage: Math.round(matchPercentage),
      availableIngredients: availableMatches,
      missingIngredients: missingRequired,
      optionalMissing: missingOptional,
      canMake,
      seasonalBonus
    };
  }

  // Find ingredient substitutions
  static findSubstitutions(
    targetIngredient: Ingredient,
    availableIngredients: Ingredient[]
  ): Ingredient[] {
    return availableIngredients.filter(ingredient => 
      ingredient.category === targetIngredient.category &&
      ingredient.subcategory === targetIngredient.subcategory &&
      ingredient.id !== targetIngredient.id
    ).slice(0, 3); // Limit to 3 substitutions
  }

  // Apply basic filters to recipes
  private static applyBasicFilters(
    recipes: Recipe[],
    filters: AdvancedSearchFilters
  ): Recipe[] {
    let filtered = [...recipes];

    // Text search
    if (filters.searchQuery) {
      const query = ValidationUtils.sanitizeSearchQuery(filters.searchQuery).toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients.some(ri => 
          ri.ingredient.name.toLowerCase().includes(query)
        )
      );
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (filters.category === 'favoris') {
        filtered = filtered.filter(recipe => recipe.isFavorite);
      } else {
        filtered = filtered.filter(recipe => recipe.category === filters.category);
      }
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
      filtered = filtered.filter(recipe => recipe.difficulty === filters.difficulty);
    }

    // Time filters
    if (filters.prepTimeMin !== undefined) {
      filtered = filtered.filter(recipe => 
        recipe.prepTime !== undefined && recipe.prepTime >= filters.prepTimeMin!
      );
    }

    if (filters.prepTimeMax !== undefined) {
      filtered = filtered.filter(recipe => 
        recipe.prepTime !== undefined && recipe.prepTime <= filters.prepTimeMax!
      );
    }

    if (filters.cookTimeMin !== undefined) {
      filtered = filtered.filter(recipe => 
        recipe.cookTime !== undefined && recipe.cookTime >= filters.cookTimeMin!
      );
    }

    if (filters.cookTimeMax !== undefined) {
      filtered = filtered.filter(recipe => 
        recipe.cookTime !== undefined && recipe.cookTime <= filters.cookTimeMax!
      );
    }

    // Excluded ingredients
    if (filters.excludedIngredients && filters.excludedIngredients.length > 0) {
      filtered = filtered.filter(recipe => 
        !recipe.ingredients.some(ri => 
          filters.excludedIngredients!.includes(ri.ingredientId)
        )
      );
    }

    // Favorites only
    if (filters.favoritesOnly) {
      filtered = filtered.filter(recipe => recipe.isFavorite);
    }

    // Seasonal only
    if (filters.seasonalOnly) {
      filtered = filtered.filter(recipe => 
        recipe.ingredients.some(ri => 
          SeasonalUtils.isIngredientInSeason(ri.ingredient)
        )
      );
    }

    return filtered;
  }

  // Calculate seasonal bonus for recipe scoring
  private static calculateSeasonalBonus(
    recipe: Recipe,
    availableIngredients: Ingredient[]
  ): number {
    const seasonalIngredients = recipe.ingredients.filter(ri => 
      SeasonalUtils.isIngredientInSeason(ri.ingredient)
    );
    
    const peakSeasonalIngredients = recipe.ingredients.filter(ri => 
      SeasonalUtils.isIngredientInPeakSeason(ri.ingredient)
    );

    let bonus = 0;
    bonus += seasonalIngredients.length * 2; // 2 points per seasonal ingredient
    bonus += peakSeasonalIngredients.length * 3; // 3 extra points per peak seasonal ingredient

    return Math.min(bonus, 15); // Cap bonus at 15 points
  }

  // Generate search suggestions
  static generateSearchSuggestions(
    recipes: Recipe[],
    ingredients: Ingredient[],
    query: string = ''
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    if (query.length < 2) {
      return suggestions;
    }

    // Recipe name suggestions
    const recipeMatches = recipes
      .filter(recipe => recipe.name.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map(recipe => ({
        type: 'recipe' as const,
        value: recipe.name,
        label: recipe.name,
        count: 1
      }));

    // Ingredient suggestions
    const ingredientMatches = ingredients
      .filter(ingredient => ingredient.name.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map(ingredient => ({
        type: 'ingredient' as const,
        value: ingredient.name,
        label: ingredient.name,
        count: this.countRecipesWithIngredient(recipes, ingredient.id)
      }));

    // Category suggestions
    const categories = [
      { id: 'entree', label: 'Entrées' },
      { id: 'plats', label: 'Plats' },
      { id: 'dessert', label: 'Desserts' }
    ];

    const categoryMatches = categories
      .filter(cat => cat.label.toLowerCase().includes(queryLower))
      .map(cat => ({
        type: 'category' as const,
        value: cat.id,
        label: cat.label,
        count: recipes.filter(r => r.category === cat.id).length
      }));

    return [...recipeMatches, ...ingredientMatches, ...categoryMatches];
  }

  // Helper method to count recipes containing an ingredient
  private static countRecipesWithIngredient(recipes: Recipe[], ingredientId: string): number {
    return recipes.filter(recipe => 
      recipe.ingredients.some(ri => ri.ingredientId === ingredientId)
    ).length;
  }

  // Generate cache key for search results
  private static generateCacheKey(filters: AdvancedSearchFilters): string {
    return JSON.stringify(filters);
  }

  // Clear search cache
  static clearCache(): void {
    this.searchCache.clear();
  }

  // Get cached results count
  static getCacheSize(): number {
    return this.searchCache.size;
  }

  // Clean expired cache entries
  static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.searchCache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        this.searchCache.delete(key);
      }
    }
  }
}