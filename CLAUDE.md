# CookBookP - React Native Cookbook App

> 📋 **IMPORTANT**: Check `PROJECT_STATE.md` for current implementation status and known issues.

## Overview

React Native cookbook app with Expo, TypeScript, SQLite. Clean architecture with repositories and hooks.

## Architecture

**Tech Stack**: React Native/Expo, TypeScript, SQLite, Expo Router, React Hooks

**Clean Architecture Pattern**:

```
📁 src/
├── 📁 components/          # UI Components
│   ├── 📁 common/         # Reusable UI components
│   │   ├── ErrorBoundary.tsx    # Error handling wrapper
│   │   ├── SearchBar.tsx        # Search functionality
│   │   ├── CategoryChips.tsx    # Category filter chips
│   │   └── FloatingAddButton.tsx # Add ingredient FAB
│   ├── 📁 ingredient/     # Ingredient-specific components
│   │   ├── IngredientCard.tsx   # Individual ingredient display
│   │   └── CategorySection.tsx  # Collapsible ingredient sections
│   └── 📁 recipe/         # Recipe-specific components
│       ├── RecipeCard.tsx       # Recipe list item
│       ├── RecipeForm.tsx       # Recipe creation/edit form
│       ├── RecipePhotoManager.tsx # Photo upload/management
│       ├── PhotoCarousel.tsx    # Photo viewing carousel
│       ├── IngredientSelectorModal.tsx # Ingredient selection
│       └── ShareModal.tsx       # Export/sharing options
├── 📁 hooks/              # Custom React Hooks
│   ├── useIngredients.ts       # Ingredient state management
│   ├── useFavorites.ts         # Ingredient favorites state management
│   ├── useRecipeFavorites.ts   # Recipe favorites state management
│   ├── useSeasonalIngredients.ts # Seasonal logic
│   ├── useRecipes.ts           # Recipe state management
│   ├── useRecipeIngredients.ts # Recipe-ingredient linking
│   ├── useRecipePhotos.ts      # Photo management
│   └── useRecipeSharing.ts     # Export/sharing logic
├── 📁 repositories/       # Data Access Layer
│   ├── IngredientRepository.ts # Ingredient CRUD operations
│   ├── FavoritesRepository.ts  # Ingredient favorites CRUD operations
│   ├── RecipeFavoritesRepository.ts # Recipe favorites CRUD operations
│   └── RecipeRepository.ts     # Recipe CRUD operations
├── 📁 database/           # Database Layer
│   ├── index.ts          # Database initialization
│   └── schema.ts         # Database schema & migrations
├── 📁 utils/              # Utility Functions
│   ├── validation.ts     # Input validation & sanitization
│   ├── errorHandler.ts   # Secure error handling
│   ├── seasonalUtils.ts  # Seasonal logic utilities
│   ├── xmlParser.ts      # XML data parsing
│   ├── photoManager.ts   # Photo handling utilities
│   └── recipeExporter.ts # Recipe export utilities
├── 📁 screens/            # Screen Components
│   ├── IngredientsScreen.tsx   # Main ingredients list
│   ├── AddIngredientScreen.tsx # Add ingredient form
│   ├── RecipesScreen.tsx       # Recipe listing
│   ├── AddRecipeScreen.tsx     # Create new recipe
│   ├── RecipeDetailScreen.tsx  # View recipe details
│   └── EditRecipeScreen.tsx    # Edit existing recipe
├── 📁 styles/             # Styling System
└── 📁 types/              # TypeScript Definitions
    ├── index.ts          # Core types (Ingredient, Recipe, etc.)
    └── database.ts       # Database-specific types
```

### Data Flow: Screens → Hooks → Repositories → SQLite

**Key Layers:**
- **Screens**: Route components with `ScreenErrorBoundary`
- **Hooks**: Business logic and state management
- **Components**: Reusable UI with `ErrorBoundary`
- **Repositories**: Data access with validation
- **Utils**: Validation, error handling, seasonal logic

### Database Architecture

**SQLite Schema:**
```sql
-- Ingredients table
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  units TEXT NOT NULL,              -- JSON array
  seasonal_months TEXT,             -- JSON array (nullable)
  seasonal_peak_months TEXT,        -- JSON array (nullable)
  seasonal_season TEXT,             -- String (nullable)
  is_user_created INTEGER DEFAULT 0, -- Boolean as integer
  description TEXT,
  tags TEXT,                        -- JSON array (nullable)
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Favorites table
CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE
);

-- Recipes table
CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prep_time INTEGER,                -- minutes
  cook_time INTEGER,                -- minutes
  servings INTEGER,
  difficulty TEXT,                   -- 'facile', 'moyen', 'difficile'
  category TEXT NOT NULL,            -- 'entrees', 'plats', 'desserts'
  photo_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Recipe ingredients junction table
CREATE TABLE recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  optional INTEGER DEFAULT 0,        -- Boolean as integer
  order_index INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients (id)
);

-- Recipe instructions table
CREATE TABLE recipe_instructions (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  duration INTEGER,                  -- minutes (optional)
  estimated_time INTEGER,            -- minutes (optional)
  temperature INTEGER,               -- celsius (optional)
  notes TEXT,                        -- additional notes (optional)
  created_at TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);

-- Recipe usage tracking
CREATE TABLE recipe_usage (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  used_at TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);

-- Recipe photos table
CREATE TABLE recipe_photos (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  photo_uri TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
);
```

### Security Layers

1. **Input Validation**: `ValidationUtils` - sanitization, UUID validation
2. **Database**: Parameterized queries only, no concatenation
3. **Error Handling**: `SecureErrorHandler` - info redaction, user-friendly messages
4. **Components**: `ErrorBoundary` - error isolation and recovery


## Features

### Core Features


#### 🥕 **Ingredient Management**
- **CRUD Operations**: Create, Read, Update, Delete ingredients
- **Categories**: Fruits, Légumes, Viande, Produits laitiers, Épicerie, Pêche
- **Search & Filter**: Real-time search with category filtering
- **User-Created Ingredients**: Personal ingredient additions
- **Bulk Import**: XML data loading capability


#### ❤️ **Favorites System**
- **Toggle Favorites**: Heart icon for quick favoriting
- **Favorites Category**: Dedicated view for favorite ingredients
- **Persistence**: SQLite storage for favorites
- **Count Tracking**: Live favorite counts in UI


#### 🌿 **Seasonal Intelligence**
- **Seasonal Awareness**: Month-based seasonal data
- **Peak Seasons**: Highlight peak availability periods
- **Current Season Filter**: "Produits de saison" category
- **Visual Indicators**: Seasonal badges on ingredients


#### 🔍 **Search & Navigation**
- **Real-time Search**: Instant ingredient filtering
- **Category Chips**: Quick category switching
- **Collapsible Sections**: Organized ingredient display
- **Expo Router**: Type-safe navigation system


#### 🍽️ **Recipe Management** (NEW)
- **Recipe CRUD**: Create, read, update, delete recipes
- **Multi-ingredient Support**: Link multiple ingredients with quantities
- **Step-by-step Instructions**: Ordered cooking instructions with timing
- **Difficulty Levels**: Facile, Moyen, Difficile
- **Categories**: Entrées, Plats, Desserts
- **Prep & Cook Times**: Track preparation and cooking duration
- **Servings Management**: Adjustable portion sizes
- **Recipe Duplication**: Clone existing recipes
- **Usage Tracking**: Track when recipes are used


#### ❤️ **Recipe Favorites System** (NEW)
- **Recipe Favorites**: Heart toggle for marking favorite recipes
- **Favorites Filter**: Dedicated "Favoris" category with live count
- **Separate from Ingredient Favorites**: Independent favorites system
- **Optimistic Updates**: Immediate UI response with database sync
- **Performance Optimized**: Fast in-memory updates for instant UI feedback
- **Real-time Updates**: Hearts and filters update without delays
- **Persistent Storage**: SQLite storage with foreign key constraints


#### 📸 **Photo Management**
- **Multiple Photos per Recipe**: Up to 10 photos per recipe
- **Camera Integration**: Take photos directly
- **Gallery Selection**: Choose from photo library
- **Photo Carousel**: Swipeable photo viewing
- **Photo Reordering**: Organize photo display order
- **File Management**: Automatic cleanup on deletion


#### 📤 **Recipe Sharing & Export**
- **Native Sharing Integration**: Share via WhatsApp, SMS, Email, and other device apps
- **Multiple Export Formats**: Professional PDF and Text formats
- **Single Recipe Sharing**: Share individual recipes with proper file naming
- **Bulk Recipe Sharing**: Concatenated collections of multiple recipes
- **Professional PDF Generation**: Formatted recipe cards with styling
- **Expo-Compatible**: Uses expo-print and expo-sharing for full compatibility


#### 🛒 **Advanced Recipe Features**
- **Ingredient Selector Modal**: Smart ingredient selection
- **Quantity Management**: Precise measurements with units
- **Optional Ingredients**: Mark ingredients as optional
- **Instruction Enhancements**: 
  - Estimated time per step
  - Temperature settings
  - Additional notes
- **Recipe Search**: Search by name, ingredient, or category
- **Bulk Operations**: Select and manage multiple recipes
- **Recipe Statistics**: Usage tracking and analytics


## Custom Hooks

1. **`useIngredients`** - Ingredient state management
   ```typescript
   const { 
     ingredients, 
     loading, 
     error, 
     actions: {
       loadIngredients,
       createIngredient,
       updateIngredient,
       deleteIngredient,
       refreshIngredients
     }
   } = useIngredients();
   ```

2. **`useFavorites`** - Ingredient favorites state management
   ```typescript
   const { 
     favoriteIds, 
     loading, 
     actions: {
       toggleFavorite,
       addFavorite,
       removeFavorite,
       loadFavorites
     }
   } = useFavorites();
   ```

3. **`useRecipeFavorites`** - Recipe favorites state management
   ```typescript
   const { 
     favoriteIds, 
     loading, 
     error,
     actions: {
       toggleFavorite,
       addFavorite,
       removeFavorite,
       isFavorite,
       getFavoriteCount,
       clearFavorites
     }
   } = useRecipeFavorites({ 
     onFavoriteChange: (recipeId, isFavorite) => {
       // Optional callback for real-time UI updates
       console.log(`Recipe ${recipeId} favorite status: ${isFavorite}`);
     }
   });
   ```

4. **`useSeasonalIngredients`** - Seasonal logic
   ```typescript
   const { 
     seasonalData: {
       currentSeason,
       currentMonth,
       seasonalIngredients,
       upcomingSeasonalIngredients
     },
     actions: {
       isIngredientInSeason,
       getUpcomingSeasonalIngredients,
       getCurrentSeasonName
     }
   } = useSeasonalIngredients();
   ```

5. **`useRecipes`** - Recipe state management
   ```typescript
   const { 
     recipes, 
     loading, 
     error,
     actions: {
       loadRecipes,
       createRecipe,
       updateRecipe,
       deleteRecipe,
       duplicateRecipe,
       searchRecipes,
       filterByCategory,
       updateRecipeFavoriteStatus // Fast in-memory favorite updates
     }
   } = useRecipes();
   ```

6. **`useRecipeIngredients`** - Recipe-ingredient linking
   ```typescript
   const { 
     selectedIngredients,
     actions: {
       addIngredient,
       removeIngredient,
       updateQuantity,
       updateUnit,
       toggleOptional,
       reorderIngredients,
       clearIngredients
     }
   } = useRecipeIngredients();
   ```

7. **`useRecipePhotos`** - Photo management
   ```typescript
   const { 
     photos,
     loading,
     actions: {
       loadPhotos,
       addPhoto,
       deletePhoto,
       reorderPhotos
     }
   } = useRecipePhotos();
   ```

8. **`useRecipeSharing`** - Export and sharing
   ```typescript
   const { 
     loading,
     error,
     lastExportPath,
     actions: {
       shareRecipe,
       shareMultipleRecipes,
       exportRecipe,
       exportMultipleRecipes,
       cleanupOldExports,
       initializeExportSystem
     }
   } = useRecipeSharing();
   ```

9. **`useShoppingLists`** - Shopping list state management (NEW - January 2025)
   ```typescript
   const { 
     shoppingLists,
     loading,
     error,
     actions: {
       loadShoppingLists,
       createShoppingList,
       updateShoppingList,
       deleteShoppingList,
       duplicateShoppingList,
       generateFromRecipes,
       generateFromIngredients,
       clearError,
       refreshShoppingLists
     }
   } = useShoppingLists();
   ```

10. **`useShoppingListItems`** - Shopping list items management (NEW - January 2025)
    ```typescript
    const { 
      items,
      loading,
      error,
      completedItemsCount,
      totalItemsCount,
      hasCompletedItems,
      allItemsCompleted,
      itemsByCategory,
      actions: {
        loadItems,
        updateItem,
        deleteItem,
        toggleItemCompletion,
        clearCompletedItems,
        updateItemsInMemory,
        clearError
      }
    } = useShoppingListItems();
    ```


## Key Principles

- **No Mock Data**: Real database only
- **Type Safety**: Full TypeScript
- **Security First**: Multi-layered approach
- **Performance**: Optimized queries/rendering

## 🔒 Security Requirements (MANDATORY)

**These security rules MUST be followed in all code changes:**

- [ ] **No SQL string concatenation with user input** - Always use parameterized queries
- [ ] **All user inputs validated** - Use `ValidationUtils` for all input sanitization
- [ ] **No 'any' types** - Replace with proper TypeScript interfaces
- [ ] **Secure error handling** - Use `SecureErrorHandler` to prevent information leakage
- [ ] **No duplicated utility functions** - Consolidate shared logic in utils
- [ ] **Components wrapped in ErrorBoundary** - Use `ErrorBoundary` or `ScreenErrorBoundary`
- [ ] **TypeScript compilation passes** - Run `npx tsc --noEmit` before commits

### Security Implementation Guidelines

1. **Database Operations**
   ```typescript
   // ❌ NEVER DO THIS
   const query = `SELECT * FROM ingredients WHERE name = '${userInput}'`;
   
   // ✅ ALWAYS DO THIS
   const query = 'SELECT * FROM ingredients WHERE name = ?';
   await db.getAllAsync(query, [userInput]);
   ```

2. **Input Validation**
   ```typescript
   // ❌ NEVER DO THIS
   const ingredient = await repository.create(rawInput);
   
   // ✅ ALWAYS DO THIS
   const validation = ValidationUtils.validateCreateIngredientInput(rawInput);
   if (!validation.isValid) {
     throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
   }
   ```

3. **Error Handling**
   ```typescript
   // ❌ NEVER DO THIS
   } catch (error) {
     console.error('Database error:', error);
     throw error;
   }
   
   // ✅ ALWAYS DO THIS
   } catch (error) {
     SecureErrorHandler.handleDatabaseError(
       error as Error,
       'operation',
       'resource'
     );
   }
   ```

4. **Component Error Boundaries**
   ```typescript
   // ❌ NEVER DO THIS
   export const MyScreen = () => {
     return <View>...</View>;
   };
   
   // ✅ ALWAYS DO THIS
   export const MyScreen = () => {
     return (
       <ScreenErrorBoundary>
         <View>...</View>
       </ScreenErrorBoundary>
     );
   };
   ```

**⚠️ CRITICAL**: Any code that violates these security rules will be rejected and must be fixed immediately.

## Pragmatic Rules

- **KISS**: Simplest working solution
- **YAGNI**: Build only what's needed now
- **DRY**: Abstract after 3+ repetitions
- **Documentation**: Update PROJECT_STATE.md for all changes

## Standards

- **Files**: One export, max 3 folder levels
- **Functions**: <20 lines, <3 params
- **Components**: <150 lines, minimal props
- **Errors**: Fail fast, no silent errors

## Code Review

**Security (MANDATORY):**
- [ ] No SQL concatenation
- [ ] Inputs validated
- [ ] No 'any' types
- [ ] ErrorBoundary used
- [ ] `npx tsc --noEmit` passes

**Quality:**
- [ ] Simple, readable code
- [ ] PROJECT_STATE.md updated

## Commands

```bash
npm start              # Dev server
npm test               # Tests
npx tsc --noEmit       # Type check (MUST pass)
bash scripts/check-no-mocks.sh  # Mock check (MUST pass)
```

## Implementation Status

**Completed:**
- ✅ Ingredient management (CRUD, favorites, seasonal)
- ✅ Recipe system (CRUD, photos, sharing, export)
- ✅ Shopping lists (generation, check-off, export)
- ✅ Security (validation, error handling, no SQL injection)
- ✅ Clean architecture (hooks, repositories, utils)


## Documentation

- **PROJECT_STATE.md**: Current status and issues
- **docs/**: API reference, algorithms, examples

---

*🚨 REMEMBER: Mock data outside tests is absolutely forbidden in this application.*
