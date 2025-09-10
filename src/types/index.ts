export interface SeasonalData {
  months: number[];
  peak_months: number[];
  season: string;
}

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  subcategory: string;
  units: string[];
  seasonal?: SeasonalData;
  isUserCreated: boolean;
  isFavorite: boolean;
  description?: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IngredientCategory = 
  | 'fruits' 
  | 'legumes' 
  | 'viande' 
  | 'produits_laitiers' 
  | 'epicerie' 
  | 'peche'
  | 'autres';

export interface IngredientFilters {
  category?: IngredientCategory | 'favoris' | 'myproduct' | 'saison';
  searchQuery?: string;
  currentSeason?: boolean;
  favoritesOnly?: boolean;
  userCreatedOnly?: boolean;
}

export interface CreateIngredientInput {
  name: string;
  category: IngredientCategory;
  subcategory: string;
  units: string[];
  seasonal?: SeasonalData;
  description?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateIngredientInput extends Partial<CreateIngredientInput> {
  id: string;
}

// Recipe types
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  servings?: number;
  difficulty?: RecipeDifficulty;
  category: RecipeCategory;
  photoUri?: string;
  isFavorite: boolean;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
  unit: string;
  optional: boolean;
  orderIndex: number;
  createdAt: Date;
}

export interface RecipeInstruction {
  id: string;
  recipeId: string;
  stepNumber: number;
  instruction: string;
  duration?: number; // in minutes
  estimatedTime?: number; // in minutes
  temperature?: number; // in celsius
  notes?: string;
  createdAt: Date;
}

export interface RecipeUsage {
  id: string;
  recipeId: string;
  usedAt: Date;
}

export type RecipeCategory = 'entree' | 'plats' | 'dessert';

export type RecipeDifficulty = 'facile' | 'moyen' | 'difficile';

export interface RecipeFilters {
  category?: RecipeCategory | 'favoris';
  difficulty?: RecipeDifficulty;
  searchQuery?: string;
  maxPrepTime?: number;
  maxCookTime?: number;
  ingredientIds?: string[]; // Filter by specific ingredients
  favoritesOnly?: boolean;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  category: RecipeCategory;
  photoUri?: string;
  ingredients: CreateRecipeIngredientInput[];
  instructions: CreateRecipeInstructionInput[];
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  id: string;
}

export interface CreateRecipeIngredientInput {
  ingredientId: string;
  quantity: number;
  unit: string;
  optional?: boolean;
  orderIndex?: number;
}

export interface UpdateRecipeIngredientInput extends Partial<CreateRecipeIngredientInput> {
  id: string;
}

export interface CreateRecipeInstructionInput {
  stepNumber: number;
  instruction: string;
  duration?: number;
  estimatedTime?: number;
  temperature?: number;
  notes?: string;
}

export interface UpdateRecipeInstructionInput extends Partial<CreateRecipeInstructionInput> {
  id: string;
}

export interface RecipeUsageStats {
  recipeId: string;
  totalUses: number;
  lastUsed?: Date;
  averageUsesPerMonth: number;
}

export interface IngredientUsageStats {
  ingredientId: string;
  totalUsesInRecipes: number;
  recipeCount: number;
  lastUsedInRecipe?: Date;
}

// Database row interfaces for SQLite results
export interface RecipeRow {
  id: string;
  name: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: string | null;
  category: string;
  photo_uri: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  optional: number; // SQLite boolean as integer
  order_index: number;
  created_at: string;
}

export interface RecipeInstructionRow {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
  duration: number | null;
  estimated_time: number | null;
  temperature: number | null;
  notes: string | null;
  created_at: string;
}

export interface RecipeUsageRow {
  id: string;
  recipe_id: string;
  used_at: string;
}

export interface ShoppingListRow {
  id: string;
  name: string;
  description: string | null;
  created_from_recipes: number; // SQLite boolean as integer
  is_completed: number; // SQLite boolean as integer
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItemRow {
  id: string;
  shopping_list_id: string;
  ingredient_id: string | null;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  is_completed: number; // SQLite boolean as integer
  notes: string | null;
  order_index: number;
  created_at: string;
}

export interface DatabaseSchema {
  ingredients: {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    units: string; // JSON array
    seasonal_months: string | null; // JSON array
    seasonal_peak_months: string | null; // JSON array
    seasonal_season: string | null;
    is_user_created: number; // SQLite boolean as integer
    description: string | null;
    tags: string | null; // JSON array
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  favorites: {
    id: string;
    ingredient_id: string;
    created_at: string;
  };
  recipes: {
    id: string;
    name: string;
    description: string | null;
    prep_time: number | null;
    cook_time: number | null;
    servings: number | null;
    difficulty: string | null;
    category: string;
    photo_uri: string | null;
    created_at: string;
    updated_at: string;
  };
  recipe_ingredients: {
    id: string;
    recipe_id: string;
    ingredient_id: string;
    quantity: number;
    unit: string;
    optional: number;
    order_index: number;
    created_at: string;
  };
  recipe_instructions: {
    id: string;
    recipe_id: string;
    step_number: number;
    instruction: string;
    duration: number | null;
    estimated_time: number | null;
    temperature: number | null;
    notes: string | null;
    created_at: string;
  };
  recipe_usage: {
    id: string;
    recipe_id: string;
    used_at: string;
  };
  recipe_favorites: {
    id: string;
    recipe_id: string;
    created_at: string;
  };
  shopping_lists: {
    id: string;
    name: string;
    description: string | null;
    created_from_recipes: number;
    is_completed: number;
    created_at: string;
    updated_at: string;
  };
  shopping_list_items: {
    id: string;
    shopping_list_id: string;
    ingredient_id: string | null;
    ingredient_name: string;
    quantity: number | null;
    unit: string | null;
    category: string;
    is_completed: number;
    notes: string | null;
    order_index: number;
    created_at: string;
  };
}

export type DetailedSeasonStatus = 
  | 'beginning-of-season'
  | 'peak-season'
  | 'end-of-season'
  | 'in-season'
  | 'out-of-season'
  | 'year-round';

// Shopping List types
export interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  createdFromRecipes: boolean;
  isCompleted: boolean;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  ingredientId?: string;
  ingredient?: Ingredient;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  availableUnits?: string[];
  category: string;
  isCompleted: boolean;
  notes?: string;
  orderIndex: number;
  createdAt: Date;
}

export interface CreateShoppingListInput {
  name: string;
  description?: string;
  createdFromRecipes?: boolean;
  items?: CreateShoppingListItemInput[];
}

export interface UpdateShoppingListInput extends Partial<CreateShoppingListInput> {
  id: string;
  isCompleted?: boolean;
}

export interface CreateShoppingListItemInput {
  ingredientId?: string;
  ingredientName: string;
  quantity?: number;
  unit?: string;
  category: string;
  notes?: string;
  orderIndex?: number;
}

export interface UpdateShoppingListItemInput extends Partial<CreateShoppingListItemInput> {
  id: string;
  isCompleted?: boolean;
}

export interface ShoppingListFilters {
  searchQuery?: string;
  completedOnly?: boolean;
  fromRecipesOnly?: boolean;
}

export interface SeasonalUtility {
  getCurrentMonth(): number;
  getCurrentSeason(): string;
  isIngredientInSeason(ingredient: Ingredient): boolean;
  getSeasonalIngredients(ingredients: Ingredient[]): Ingredient[];
  getSeasonForMonth(month: number): string;
}

// Re-export database types
export * from './database';