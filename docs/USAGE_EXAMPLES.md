# Usage Examples - Ingredient Search System

## Basic Usage Examples

### 1. Simple Ingredient Selection

```typescript
import { MakeableRecipesModal } from '../components/recipe/MakeableRecipesModal';
import { useIngredients } from '../hooks/useIngredients';
import { useWhatCanIMake } from '../hooks/useAdvancedRecipeSearch';

const MyRecipeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { ingredients } = useIngredients();
  const { recipes } = useRecipes();
  const whatCanIMake = useWhatCanIMake(recipes, ingredients);

  const handleOpenSearch = () => {
    setModalVisible(true);
  };

  const handleIngredientSearch = (selectedIngredientIds: string[], threshold: number) => {
    console.log('Searching with ingredients:', selectedIngredientIds);
    console.log('Match threshold:', threshold);
    
    // Execute the search
    whatCanIMake.findRecipesWithSelection(selectedIngredientIds, threshold);
  };

  return (
    <View>
      <TouchableOpacity onPress={handleOpenSearch}>
        <Text>Find Recipes with My Ingredients</Text>
      </TouchableOpacity>

      <MakeableRecipesModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSearch={handleIngredientSearch}
        availableIngredients={ingredients}
      />

      {/* Display results */}
      {whatCanIMake.makeableRecipes.map(result => (
        <RecipeCard 
          key={result.recipe.id} 
          recipe={result.recipe}
          matchPercentage={result.matchPercentage}
          canMake={result.canMake}
        />
      ))}
    </View>
  );
};
```

### 2. Seasonal Ingredient Quick Selection

```typescript
const SeasonalRecipeFinderExample = () => {
  const { ingredients } = useIngredients();
  const seasonalIngredients = useMemo(() => 
    SeasonalUtils.getSeasonalIngredients(ingredients)
  , [ingredients]);

  const handleSeasonalSearch = () => {
    const seasonalIds = seasonalIngredients.map(ing => ing.id);
    
    // Search with all seasonal ingredients at 40% threshold
    // This will show recipes that use any seasonal ingredients
    whatCanIMake.findRecipesWithSelection(seasonalIds, 40);
  };

  return (
    <View>
      <TouchableOpacity onPress={handleSeasonalSearch}>
        <Text>🌿 Find Seasonal Recipes</Text>
        <Text>({seasonalIngredients.length} seasonal ingredients available)</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 3. Advanced Search with Filters

```typescript
const AdvancedSearchExample = () => {
  const handleAdvancedSearch = () => {
    const selectedIngredients = ingredients.filter(ing => 
      ['tomato-id', 'onion-id', 'garlic-id'].includes(ing.id)
    );

    const results = RecipeSearchUtils.searchRecipes(
      recipes,
      selectedIngredients,
      {
        matchThreshold: 60,
        difficulty: 'facile',
        prepTimeMax: 30,
        seasonalOnly: false,
        allowSubstitutions: true
      }
    );

    console.log(`Found ${results.length} recipes matching criteria`);
    return results;
  };

  return (
    <TouchableOpacity onPress={handleAdvancedSearch}>
      <Text>Advanced Search Example</Text>
    </TouchableOpacity>
  );
};
```

## Real-World Scenarios

### Scenario 1: Weekly Meal Planning

```typescript
const WeeklyMealPlannerExample = () => {
  const [weeklyIngredients, setWeeklyIngredients] = useState<string[]>([]);
  const [mealPlan, setMealPlan] = useState<RecipeMatchResult[]>([]);

  const planWeeklyMeals = async () => {
    // User selects ingredients they have for the week
    const results = RecipeSearchUtils.searchRecipes(
      recipes,
      availableIngredients.filter(ing => weeklyIngredients.includes(ing.id)),
      {
        matchThreshold: 50, // Flexible threshold for variety
        prepTimeMax: 45,    // Reasonable cooking time
        difficulty: 'moyen' // Not too complex for daily cooking
      }
    );

    // Group by days and select diverse recipes
    const plannedMeals = selectDiverseRecipes(results, 7);
    setMealPlan(plannedMeals);
  };

  const selectDiverseRecipes = (results: RecipeMatchResult[], count: number) => {
    // Algorithm to select diverse recipes (different categories, ingredients)
    const selected: RecipeMatchResult[] = [];
    const usedCategories = new Set<string>();
    const usedIngredients = new Set<string>();

    for (const result of results) {
      if (selected.length >= count) break;

      // Prefer recipes from different categories
      if (!usedCategories.has(result.recipe.category)) {
        selected.push(result);
        usedCategories.add(result.recipe.category);
        result.recipe.ingredients.forEach(ing => 
          usedIngredients.add(ing.ingredientId)
        );
        continue;
      }

      // Or recipes that use different ingredients
      const newIngredients = result.recipe.ingredients.filter(ing => 
        !usedIngredients.has(ing.ingredientId)
      );
      
      if (newIngredients.length >= 2) {
        selected.push(result);
        newIngredients.forEach(ing => 
          usedIngredients.add(ing.ingredientId)
        );
      }
    }

    return selected;
  };

  return (
    <View>
      <Text>Weekly Meal Planner</Text>
      {/* Ingredient selection UI */}
      <IngredientSelector
        ingredients={availableIngredients}
        selectedIds={weeklyIngredients}
        onToggleIngredient={(id) => {
          setWeeklyIngredients(prev => 
            prev.includes(id) 
              ? prev.filter(i => i !== id)
              : [...prev, id]
          );
        }}
      />
      
      <TouchableOpacity onPress={planWeeklyMeals}>
        <Text>Plan This Week's Meals</Text>
      </TouchableOpacity>

      {/* Display meal plan */}
      {mealPlan.map((result, index) => (
        <View key={result.recipe.id}>
          <Text>Day {index + 1}: {result.recipe.name}</Text>
          <Text>Match: {result.matchPercentage}%</Text>
        </View>
      ))}
    </View>
  );
};
```

### Scenario 2: Pantry Cleanup Assistant

```typescript
const PantryCleanupExample = () => {
  const findRecipesToUseExpiringIngredients = () => {
    // Simulate ingredients that are expiring soon
    const expiringIngredients = ['aging-vegetables', 'leftover-herbs', 'dairy-products'];
    
    const availableExpiring = availableIngredients.filter(ing => 
      expiringIngredients.some(expiring => 
        ing.name.toLowerCase().includes(expiring.toLowerCase())
      )
    );

    // Very low threshold to find ANY recipe using these ingredients
    const results = RecipeSearchUtils.searchRecipes(
      recipes,
      availableExpiring,
      {
        matchThreshold: 15, // Very inclusive
        prepTimeMax: 60,    // Allow more complex recipes
        allowSubstitutions: true
      }
    );

    // Sort by how many expiring ingredients each recipe uses
    const sortedResults = results.sort((a, b) => {
      const aExpiringCount = a.availableIngredients.filter(id =>
        availableExpiring.some(ing => ing.id === id)
      ).length;
      
      const bExpiringCount = b.availableIngredients.filter(id =>
        availableExpiring.some(ing => ing.id === id)
      ).length;
      
      return bExpiringCount - aExpiringCount;
    });

    return sortedResults;
  };

  return (
    <View>
      <Text>🗑️ Pantry Cleanup Assistant</Text>
      <Text>Find recipes to use ingredients before they expire</Text>
      
      <TouchableOpacity onPress={() => {
        const results = findRecipesToUseExpiringIngredients();
        console.log(`Found ${results.length} recipes to help clean up pantry`);
      }}>
        <Text>Find Cleanup Recipes</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Scenario 3: Dietary Restriction Helper

```typescript
const DietaryRestrictionExample = () => {
  const findVegetarianRecipes = (selectedIngredients: string[]) => {
    // Define ingredients that make a recipe non-vegetarian
    const nonVegetarianIngredients = [
      'beef', 'pork', 'chicken', 'fish', 'seafood', 'meat'
    ];

    // Get non-vegetarian ingredient IDs
    const nonVegIds = availableIngredients
      .filter(ing => 
        nonVegetarianIngredients.some(nonVeg =>
          ing.name.toLowerCase().includes(nonVeg) ||
          ing.category.toLowerCase().includes('viande') ||
          ing.category.toLowerCase().includes('poisson')
        )
      )
      .map(ing => ing.id);

    const results = RecipeSearchUtils.searchRecipes(
      recipes,
      availableIngredients.filter(ing => selectedIngredients.includes(ing.id)),
      {
        matchThreshold: 60,
        excludedIngredients: nonVegIds, // Exclude non-vegetarian ingredients
        allowSubstitutions: true
      }
    );

    return results;
  };

  const findGlutenFreeOptions = (selectedIngredients: string[]) => {
    const glutenIngredients = ['wheat', 'flour', 'bread', 'pasta'];
    
    const glutenIds = availableIngredients
      .filter(ing =>
        glutenIngredients.some(gluten =>
          ing.name.toLowerCase().includes(gluten)
        )
      )
      .map(ing => ing.id);

    return RecipeSearchUtils.searchRecipes(
      recipes,
      availableIngredients.filter(ing => selectedIngredients.includes(ing.id)),
      {
        matchThreshold: 50,
        excludedIngredients: glutenIds,
        allowSubstitutions: true
      }
    );
  };

  return (
    <View>
      <Text>🥗 Dietary Restriction Helper</Text>
      
      <TouchableOpacity onPress={() => {
        const vegetarianResults = findVegetarianRecipes(selectedIngredientIds);
        console.log(`Found ${vegetarianResults.length} vegetarian recipes`);
      }}>
        <Text>Find Vegetarian Recipes</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => {
        const glutenFreeResults = findGlutenFreeOptions(selectedIngredientIds);
        console.log(`Found ${glutenFreeResults.length} gluten-free recipes`);
      }}>
        <Text>Find Gluten-Free Recipes</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## Integration Examples

### Integration with Shopping List

```typescript
const ShoppingListIntegration = () => {
  const generateShoppingList = (recipeResults: RecipeMatchResult[]) => {
    const missingIngredients = new Map<string, {
      ingredient: Ingredient;
      recipes: string[];
      totalQuantity: number;
    }>();

    recipeResults.forEach(result => {
      result.missingIngredients.forEach(missing => {
        const existing = missingIngredients.get(missing.ingredientId);
        
        if (existing) {
          existing.recipes.push(result.recipe.name);
          existing.totalQuantity += missing.quantity;
        } else {
          missingIngredients.set(missing.ingredientId, {
            ingredient: missing.ingredient,
            recipes: [result.recipe.name],
            totalQuantity: missing.quantity
          });
        }
      });
    });

    return Array.from(missingIngredients.values());
  };

  const optimizeShoppingList = (shoppingList: any[]) => {
    // Group by store sections/categories for efficient shopping
    const grouped = shoppingList.reduce((acc, item) => {
      const category = item.ingredient.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    return grouped;
  };

  return (
    <View>
      <Text>📝 Smart Shopping List Generator</Text>
      <Text>Based on missing ingredients from selected recipes</Text>
    </View>
  );
};
```

### Integration with Meal Prep

```typescript
const MealPrepIntegration = () => {
  const calculateMealPrepEfficiency = (recipes: RecipeMatchResult[]) => {
    // Find recipes that share common ingredients for batch cooking
    const ingredientUsage = new Map<string, number>();
    
    recipes.forEach(result => {
      result.recipe.ingredients.forEach(ing => {
        const current = ingredientUsage.get(ing.ingredientId) || 0;
        ingredientUsage.set(ing.ingredientId, current + 1);
      });
    });

    // Suggest prep order based on ingredient sharing
    const sharedIngredients = Array.from(ingredientUsage.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a);

    return {
      totalRecipes: recipes.length,
      sharedIngredients: sharedIngredients.length,
      prepEfficiency: sharedIngredients.length / recipes.length,
      recommendations: generatePrepRecommendations(sharedIngredients)
    };
  };

  const generatePrepRecommendations = (sharedIngredients: [string, number][]) => {
    return sharedIngredients.map(([ingredientId, count]) => {
      const ingredient = availableIngredients.find(ing => ing.id === ingredientId);
      return {
        ingredient: ingredient?.name,
        usedInRecipes: count,
        recommendation: `Prep ${ingredient?.name} in bulk for ${count} recipes`
      };
    });
  };

  return (
    <View>
      <Text>👨‍🍳 Meal Prep Optimization</Text>
      <Text>Find recipes that share ingredients for efficient batch cooking</Text>
    </View>
  );
};
```

## Testing Examples

### Unit Testing

```typescript
// Example test file: __tests__/RecipeSearchUtils.test.ts
describe('RecipeSearchUtils', () => {
  const mockRecipes: Recipe[] = [
    {
      id: '1',
      name: 'Tomato Pasta',
      ingredients: [
        { ingredientId: 'tomato', ingredient: mockTomato, quantity: 2, unit: 'pieces', optional: false },
        { ingredientId: 'pasta', ingredient: mockPasta, quantity: 100, unit: 'g', optional: false },
        { ingredientId: 'basil', ingredient: mockBasil, quantity: 1, unit: 'bunch', optional: true }
      ]
    }
  ];

  const mockAvailableIngredients: Ingredient[] = [
    mockTomato,
    mockPasta
    // Missing basil (optional)
  ];

  test('should calculate correct match percentage with optional ingredients', () => {
    const result = RecipeSearchUtils.calculateRecipeMatch(
      mockRecipes[0],
      mockAvailableIngredients
    );

    expect(result.matchPercentage).toBe(67); // 2 out of 3 ingredients
    expect(result.canMake).toBe(true); // All required ingredients available
    expect(result.missingIngredients).toHaveLength(0); // No missing required
    expect(result.optionalMissing).toHaveLength(1); // Missing basil (optional)
  });

  test('should filter by threshold correctly', () => {
    const results = RecipeSearchUtils.searchRecipes(
      mockRecipes,
      mockAvailableIngredients,
      { matchThreshold: 70 }
    );

    // Should not include recipes below 70% match
    expect(results).toHaveLength(0);
  });

  test('should include recipes with smart threshold logic', () => {
    const results = RecipeSearchUtils.searchRecipes(
      mockRecipes,
      mockAvailableIngredients,
      { matchThreshold: 50 } // 67% match should pass
    );

    expect(results).toHaveLength(1);
    expect(results[0].recipe.name).toBe('Tomato Pasta');
  });
});
```

### Integration Testing

```typescript
// Example test file: __tests__/MakeableRecipesModal.test.tsx
describe('MakeableRecipesModal Integration', () => {
  test('should handle full ingredient selection flow', async () => {
    const mockOnSearch = jest.fn();
    
    render(
      <MakeableRecipesModal
        visible={true}
        onClose={() => {}}
        onSearch={mockOnSearch}
        availableIngredients={mockIngredients}
      />
    );

    // Select ingredients
    fireEvent.press(screen.getByText('Tomate'));
    fireEvent.press(screen.getByText('Oignon'));
    
    // Adjust threshold
    const slider = screen.getByTestId('threshold-slider');
    fireEvent(slider, 'onValueChange', 60);
    
    // Execute search
    fireEvent.press(screen.getByText('Trouver des recettes'));
    
    expect(mockOnSearch).toHaveBeenCalledWith(
      ['tomato-id', 'onion-id'],
      60
    );
  });

  test('should handle seasonal quick select', async () => {
    const mockOnSearch = jest.fn();
    
    render(
      <MakeableRecipesModal
        visible={true}
        onClose={() => {}}
        onSearch={mockOnSearch}
        availableIngredients={mockSeasonalIngredients}
      />
    );

    // Use seasonal quick select
    fireEvent.press(screen.getByText('Ingrédients de saison'));
    fireEvent.press(screen.getByText('Trouver des recettes'));
    
    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.arrayContaining(['seasonal-ingredient-1', 'seasonal-ingredient-2']),
      expect.any(Number)
    );
  });
});
```

## Performance Examples

### Optimized Search Implementation

```typescript
const OptimizedSearchExample = () => {
  // Debounced search for real-time filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecipeMatchResult[]>([]);
  
  const debouncedSearch = useMemo(
    () => debounce((query: string, ingredients: string[]) => {
      if (query.length < 2 && ingredients.length === 0) {
        setSearchResults([]);
        return;
      }

      const results = RecipeSearchUtils.searchRecipes(
        recipes,
        availableIngredients.filter(ing => ingredients.includes(ing.id)),
        {
          searchQuery: query,
          matchThreshold: 40
        }
      );

      setSearchResults(results);
    }, 300),
    [recipes, availableIngredients]
  );

  useEffect(() => {
    debouncedSearch(searchQuery, selectedIngredientIds);
  }, [searchQuery, selectedIngredientIds, debouncedSearch]);

  return (
    <View>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search recipes..."
      />
      
      {/* Display real-time results */}
      <FlatList
        data={searchResults}
        keyExtractor={item => item.recipe.id}
        renderItem={({ item }) => (
          <RecipeCard recipe={item.recipe} matchPercentage={item.matchPercentage} />
        )}
      />
    </View>
  );
};
```

These examples demonstrate various ways to integrate and use the ingredient search system in different scenarios, from basic usage to complex real-world applications.