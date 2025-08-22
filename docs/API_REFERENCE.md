# API Reference - Ingredient Search System

## Components

### MakeableRecipesModal

Main modal component for ingredient-based recipe search.

```typescript
interface MakeableRecipesModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (selectedIngredients: string[], matchThreshold: number) => void;
  availableIngredients: Ingredient[];
  initialSelectedIds?: string[];
}
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | ✅ | Controls modal visibility |
| `onClose` | `() => void` | ✅ | Callback when modal is closed |
| `onSearch` | `(string[], number) => void` | ✅ | Callback when search is executed |
| `availableIngredients` | `Ingredient[]` | ✅ | Available ingredients to select from |
| `initialSelectedIds` | `string[]` | ❌ | Pre-selected ingredient IDs |

#### Usage

```typescript
<MakeableRecipesModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onSearch={(ids, threshold) => handleSearch(ids, threshold)}
  availableIngredients={ingredients}
  initialSelectedIds={['ingredient-1', 'ingredient-2']}
/>
```

### SeasonalQuickSelect

Component for quick seasonal ingredient selection.

```typescript
interface SeasonalQuickSelectProps {
  seasonalIngredients: Ingredient[];
  onSelectSeasonal: () => void;
  selectedCount: number;
}
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `seasonalIngredients` | `Ingredient[]` | ✅ | Current seasonal ingredients |
| `onSelectSeasonal` | `() => void` | ✅ | Callback to select all seasonal ingredients |
| `selectedCount` | `number` | ✅ | Number of selected seasonal ingredients |

### IngredientSelector

Reusable ingredient selection component with categories.

```typescript
interface IngredientSelectorProps {
  ingredients: Ingredient[];
  selectedIds: string[];
  onToggleIngredient: (ingredientId: string) => void;
  showSeasonalBadges?: boolean;
  showCategories?: boolean;
}
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `ingredients` | `Ingredient[]` | ✅ | - | Ingredients to display |
| `selectedIds` | `string[]` | ✅ | - | Currently selected ingredient IDs |
| `onToggleIngredient` | `(string) => void` | ✅ | - | Callback when ingredient is toggled |
| `showSeasonalBadges` | `boolean` | ❌ | `false` | Show seasonal indicators |
| `showCategories` | `boolean` | ❌ | `true` | Group by categories |

## Hooks

### useWhatCanIMake

Enhanced hook for ingredient-based recipe matching.

```typescript
const useWhatCanIMake = (
  recipes: Recipe[],
  availableIngredients: Ingredient[]
) => {
  // Return value
  return {
    // Results
    makeableRecipes: RecipeMatchResult[];
    loading: boolean;
    error: string | null;
    
    // Mode management
    isManualMode: boolean;
    selectedIngredientIds: string[];
    matchThreshold: number;
    
    // Actions
    refresh: () => Promise<void>;
    findRecipesWithSelection: (ingredientIds: string[], threshold: number) => Promise<void>;
    resetToAutoMode: () => Promise<void>;
    getIngredientSuggestions: (currentSelectionIds: string[]) => Ingredient[];
    
    // Stats
    totalMakeable: number;
    perfectMatches: number;
    partialMatches: number;
  };
};
```

#### Methods

##### `findRecipesWithSelection`

Find recipes based on manually selected ingredients.

```typescript
findRecipesWithSelection(
  ingredientIds: string[],
  threshold: number = 70
): Promise<void>
```

**Parameters:**
- `ingredientIds`: Array of ingredient IDs to search with
- `threshold`: Match percentage threshold (10-100)

**Example:**
```typescript
const { findRecipesWithSelection } = useWhatCanIMake(recipes, ingredients);

// Find recipes with 50% match threshold
await findRecipesWithSelection(['ingredient-1', 'ingredient-2'], 50);
```

##### `getIngredientSuggestions`

Get suggested ingredients based on current selection.

```typescript
getIngredientSuggestions(currentSelectionIds: string[]): Ingredient[]
```

**Parameters:**
- `currentSelectionIds`: Currently selected ingredient IDs

**Returns:** Array of suggested ingredients

### useIngredientSelectionHistory

Hook for managing ingredient selection history.

```typescript
const useIngredientSelectionHistory = () => {
  return {
    // State
    history: IngredientSelection[];
    loading: boolean;
    error: string | null;
    
    // Actions
    saveSelection: (name: string, ingredientIds: string[], threshold: number) => Promise<void>;
    loadHistory: () => Promise<void>;
    deleteSelection: (id: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    applySelection: (selection: IngredientSelection) => void;
  };
};
```

#### Types

```typescript
interface IngredientSelection {
  id: string;
  name: string;
  ingredientIds: string[];
  matchThreshold: number;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}
```

## Utility Classes

### RecipeSearchUtils

Core utility class for recipe search and matching algorithms.

#### Static Methods

##### `searchRecipes`

Main search method with flexible filtering.

```typescript
static searchRecipes(
  recipes: Recipe[],
  availableIngredients: Ingredient[],
  filters: AdvancedSearchFilters = {}
): RecipeMatchResult[]
```

**Parameters:**
- `recipes`: Array of recipes to search
- `availableIngredients`: Available ingredients for matching
- `filters`: Search configuration options

**Returns:** Array of recipe match results

**Example:**
```typescript
const results = RecipeSearchUtils.searchRecipes(
  allRecipes,
  selectedIngredients,
  {
    matchThreshold: 60,
    seasonalOnly: true,
    difficulty: 'facile'
  }
);
```

##### `calculateRecipeMatch`

Calculate how well available ingredients match a recipe.

```typescript
static calculateRecipeMatch(
  recipe: Recipe,
  availableIngredients: Ingredient[],
  filters: AdvancedSearchFilters = {}
): RecipeMatchResult
```

**Parameters:**
- `recipe`: Recipe to analyze
- `availableIngredients`: Available ingredients
- `filters`: Additional filtering options

**Returns:** Detailed match result

##### `findSubstitutions`

Find ingredient substitutions for missing ingredients.

```typescript
static findSubstitutions(
  targetIngredient: Ingredient,
  availableIngredients: Ingredient[],
  options: {
    exactCategoryMatch?: boolean;
    includeSeasonalAlternatives?: boolean;
    maxSuggestions?: number;
  } = {}
): Array<{
  ingredient: Ingredient;
  substitutionType: 'exact' | 'category' | 'seasonal' | 'similar';
  confidenceScore: number;
  reason: string;
}>
```

**Parameters:**
- `targetIngredient`: Ingredient to find substitutions for
- `availableIngredients`: Available ingredients to consider
- `options`: Substitution configuration

**Returns:** Array of substitution suggestions with confidence scores

#### Cache Management

##### `clearCache`

Clear search result cache.

```typescript
static clearCache(): void
```

##### `cleanExpiredCache`

Remove expired cache entries.

```typescript
static cleanExpiredCache(): void
```

##### `getCacheSize`

Get current cache size.

```typescript
static getCacheSize(): number
```

## Types

### Core Types

```typescript
interface RecipeMatchResult {
  recipe: Recipe;
  matchPercentage: number;
  availableIngredients: string[];
  missingIngredients: RecipeIngredientMatch[];
  optionalMissing: RecipeIngredientMatch[];
  canMake: boolean;
  seasonalBonus: number;
}

interface RecipeIngredientMatch {
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
  unit: string;
  optional: boolean;
  substitutions?: Ingredient[];
}

interface AdvancedSearchFilters {
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
  matchThreshold?: number;
  allowSubstitutions?: boolean;
  prioritizeSeasonalIngredients?: boolean;
}
```

### Search Configuration

```typescript
interface SearchSuggestion {
  type: 'recipe' | 'ingredient' | 'category';
  value: string;
  label: string;
  count?: number;
}

interface RecipeSearchCache {
  query: string;
  filters: AdvancedSearchFilters;
  results: RecipeMatchResult[];
  timestamp: number;
}
```

## Constants

### Default Values

```typescript
const DEFAULT_MATCH_THRESHOLD = 70; // Default threshold percentage
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration
const MAX_SUGGESTIONS = 5; // Maximum substitution suggestions
```

### Threshold Descriptions

```typescript
const THRESHOLD_DESCRIPTIONS = {
  100: "Uniquement les recettes que vous pouvez faire complètement",
  70: "Recettes que vous pouvez presque faire", 
  40: "Recettes avec plusieurs ingrédients manquants",
  10: "Toutes les recettes contenant au moins un ingrédient"
};
```

## Error Handling

### Error Types

```typescript
enum SearchErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  COMPUTATION_ERROR = 'COMPUTATION_ERROR'
}

interface SearchError {
  type: SearchErrorType;
  message: string;
  context?: Record<string, any>;
}
```

### Error Recovery

```typescript
// Error boundary for search components
const SearchErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<SearchErrorFallback />}
      onError={(error, errorInfo) => {
        SecureErrorHandler.logError(error, { context: 'ingredient-search' });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Performance Guidelines

### Optimization Best Practices

1. **Use Memoization**: Wrap expensive calculations with `useMemo`
2. **Debounce Search**: Implement search debouncing for real-time filtering
3. **Lazy Loading**: Load ingredients and recipes on demand
4. **Cache Results**: Leverage built-in caching for repeated searches
5. **Batch Updates**: Group state updates to minimize re-renders

### Memory Management

```typescript
// Clear cache periodically
useEffect(() => {
  const interval = setInterval(() => {
    RecipeSearchUtils.cleanExpiredCache();
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(interval);
}, []);
```

### Performance Monitoring

```typescript
// Monitor search performance
const performanceMonitor = {
  startTime: Date.now(),
  endTime: 0,
  duration: 0,
  
  start() {
    this.startTime = Date.now();
  },
  
  end() {
    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
    console.log(`Search completed in ${this.duration}ms`);
  }
};
```