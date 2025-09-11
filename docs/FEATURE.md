Overview**

The recipe sharing system provides native device integration for sharing recipes via WhatsApp, SMS, Email, and other apps. Built with Expo-compatible libraries for seamless integration.

#### **Key Features**

- **Native Integration**: Uses device's native sharing capabilities
- **Multiple Formats**: Text and PDF export formats
- **Bulk Sharing**: Share multiple recipes as concatenated collections
- **Smart File Naming**: Uses recipe names instead of UUIDs
- **Professional PDFs**: Styled layouts with proper formatting
- **Expo Compatible**: Works with managed Expo workflow

#### **Architecture**

**ShareModal Component:**

```typescript
interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  recipe?: Recipe;
  recipes?: Recipe[];
  mode?: 'single' | 'multiple';
}
```

**RecipeExporter Class:**

- `shareRecipe(recipe, format)` - Share single recipe
- `shareMultipleRecipes(recipes, format)` - Share recipe collection
- `exportToPDF(recipe)` - Generate PDF with expo-print
- `exportToText(recipe)` - Generate formatted text

**File Naming Strategy:**

- Single: `Tarte_aux_pommes.pdf`
- Two recipes: `Coq_au_Vin_et_Ratatouille.pdf`
- Multiple: `Collection_5_recettes.pdf`

#### **Implementation Details**

**PDF Generation:**

```typescript
// Uses expo-print for Expo compatibility
const { uri } = await Print.printToFileAsync({
  html: htmlContent,
  width: 595, // A4 width
  height: 842, // A4 height
});

// Copy to desired location with proper name
await FileSystem.copyAsync({
  from: uri,
  to: finalPath
});
```

**Native Sharing:**

```typescript
// Uses expo-sharing for device integration
await Sharing.shareAsync(filePath, {
  mimeType: 'application/pdf',
  dialogTitle: `Partager la recette: ${recipe.name}`,
  UTI: 'com.adobe.pdf'
});
```

**Multiple Recipe Concatenation:**

- Creates unified PDF with collection header
- Each recipe on separate page section
- Professional styling throughout
- Proper page breaks between recipes

#### **User Experience**

**ShareModal Features:**

- **Centered Design**: Modal appears in center of screen
- **Fade Animation**: Smooth appearance transition
- **Loading States**: Shows progress during export/share
- **Error Handling**: User-friendly error messages
- **Touch Feedback**: Visual response to user interactions

**Sharing Options:**

1. **📱 Partager en texte** - Share via messaging apps
2. **📄 Partager en PDF** - Share professional PDF

### Core Features Implemented

#### 🥕 **Ingredient Management**

- **CRUD Operations**: Create, Read, Update, Delete ingredients
- **Categories**: Fruits, Légumes, Viande, Produits laitiers, Épicerie, Pêche
- **Search & Filter**: Real-time search with category filtering
- **User-Created Ingredients**: Personal ingredient additions
- **Bulk Import**: XML data loading capability

**Implementation:**

- `IngredientRepository` for data operations
- `useIngredients` hook for state management
- `IngredientsScreen` for main interface
- `AddIngredientScreen` for ingredient creation

#### ❤️ **Favorites System**

- **Toggle Favorites**: Heart icon for quick favoriting
- **Favorites Category**: Dedicated view for favorite ingredients
- **Persistence**: SQLite storage for favorites
- **Count Tracking**: Live favorite counts in UI

**Implementation:**

- `FavoritesRepository` for data operations
- `useFavorites` hook for state management
- Heart toggle in `IngredientCard` component

#### 🌿 **Seasonal Intelligence**

- **Seasonal Awareness**: Month-based seasonal data
- **Peak Seasons**: Highlight peak availability periods
- **Current Season Filter**: "Produits de saison" category
- **Visual Indicators**: Seasonal badges on ingredients

**Implementation:**

- `SeasonalUtils` for seasonal calculations
- `useSeasonalIngredients` hook for state management
- Seasonal badges in UI components

#### 🔍 **Search & Navigation**

- **Real-time Search**: Instant ingredient filtering
- **Category Chips**: Quick category switching
- **Collapsible Sections**: Organized ingredient display
- **Expo Router**: Type-safe navigation system

**Implementation:**

- `SearchBar` component with debounced search
- `CategoryChips` for category filtering
- `CategorySection` with expand/collapse functionality

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

**Implementation:**

- `RecipeRepository` for data operations
- `useRecipes` hook for state management
- `RecipesScreen` for recipe listing
- `AddRecipeScreen` for recipe creation
- `RecipeDetailScreen` for viewing recipes
- `EditRecipeScreen` for recipe updates

#### ❤️ **Recipe Favorites System** (NEW)

- **Recipe Favorites**: Heart toggle for marking favorite recipes
- **Favorites Filter**: Dedicated "Favoris" category with live count
- **Separate from Ingredient Favorites**: Independent favorites system
- **Optimistic Updates**: Immediate UI response with database sync
- **Performance Optimized**: Fast in-memory updates for instant UI feedback
- **Real-time Updates**: Hearts and filters update without delays
- **Persistent Storage**: SQLite storage with foreign key constraints

**Implementation:**

- `RecipeFavoritesRepository` for data operations
- `useRecipeFavorites` hook with callback system for real-time updates
- `updateRecipeFavoriteStatus` method for fast in-memory updates
- Updated `RecipeCard` with functional heart (❤️/🤍) and callback prop
- Enhanced `RecipesScreen` with favorites filter and optimized refresh strategy
- Updated `Recipe` interface with `isFavorite` field

#### 📸 **Photo Management**

- **Multiple Photos per Recipe**: Up to 10 photos per recipe
- **Camera Integration**: Take photos directly
- **Gallery Selection**: Choose from photo library
- **Photo Carousel**: Swipeable photo viewing
- **Photo Reordering**: Organize photo display order
- **File Management**: Automatic cleanup on deletion

**Implementation:**

- `PhotoManager` utility class
- `useRecipePhotos` hook for state management
- `RecipePhotoManager` component
- `PhotoCarousel` for display
- expo-image-picker integration
- expo-file-system for storage

#### 📤 **Recipe Sharing & Export**

- **Native Sharing Integration**: Share via WhatsApp, SMS, Email, and other device apps
- **Multiple Export Formats**: Professional PDF and Text formats
- **Single Recipe Sharing**: Share individual recipes with proper file naming
- **Bulk Recipe Sharing**: Concatenated collections of multiple recipes
- **Professional PDF Generation**: Formatted recipe cards with styling
- **Expo-Compatible**: Uses expo-print and expo-sharing for full compatibility

**Dependencies:**

- `expo-print` v14.1.4 - PDF generation
- `expo-sharing` v13.1.5 - Native device sharing
- `expo-file-system` - File management and storage

**Implementation:**

- `RecipeExporter` utility class with expo-print integration
- `useRecipeSharing` hook for state management
- `ShareModal` component with centered design
- Professional HTML templates for PDF styling
- Smart file naming with recipe-based names

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

### UI Components Architecture

#### **Common Components** (`src/components/common/`)

1. **`ErrorBoundary.tsx`**
   
   - Generic error boundary with fallback UI
   - `ScreenErrorBoundary` for screen-level errors
   - `withErrorBoundary` HOC for component wrapping
   - Development vs production error display

2. **`SearchBar.tsx`**
   
   - Debounced search input
   - Clear functionality
   - Accessibility support
   - Custom styling

3. **`CategoryChips.tsx`**
   
   - Horizontal scrollable category filters
   - Active state management
   - Count badges for each category
   - Touch-friendly design

4. **`FloatingAddButton.tsx`**
   
   - Fixed position action button
   - Navigation to add screen
   - Material Design styling

#### **Ingredient Components** (`src/components/ingredient/`)

1. **`IngredientCard.tsx`**
   
   - Individual ingredient display
   - Heart toggle for favorites
   - Seasonal badges
   - Touch feedback and navigation

2. **`CategorySection.tsx`**
   
   - Collapsible ingredient sections
   - Animated expand/collapse
   - Empty state handling
   - Category icons and counts

#### **Recipe Components** (`src/components/recipe/`)

1. **`RecipeCard.tsx`**
   
   - Recipe list item display
   - Photo thumbnail
   - Difficulty and time indicators
   - Category badge
   - Touch navigation to detail

2. **`RecipeForm.tsx`**
   
   - Complete recipe creation/edit form
   - Dynamic ingredient management
   - Step-by-step instruction builder
   - Real-time validation
   - Photo integration

3. **`RecipePhotoManager.tsx`**
   
   - Multiple photo upload (up to 10)
   - Camera and gallery integration
   - Photo reordering
   - Delete functionality
   - Thumbnail previews

4. **`PhotoCarousel.tsx`**
   
   - Swipeable photo viewing
   - Full-screen mode
   - Image loading states
   - Pinch-to-zoom support

5. **`IngredientSelectorModal.tsx`**
   
   - Smart ingredient search
   - Category filtering
   - Quantity and unit input
   - Optional ingredient toggle
   - Recent ingredients section

6. **`ShareModal.tsx`**
   
   - Centered modal design with fade animation
   - Text and PDF sharing options
   - Single and multiple recipe modes
   - Native share integration
   - Clean, simplified UI

### State Management Pattern

#### **Custom Hooks Architecture**

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
