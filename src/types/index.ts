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