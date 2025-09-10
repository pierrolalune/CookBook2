import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  RefreshControl, 
  Text,
  Animated 
} from 'react-native';
import { router } from 'expo-router';
import { useIngredients } from '../hooks/useIngredients';
import { useFavorites } from '../hooks/useFavorites';
import { useSeasonalIngredients } from '../hooks/useSeasonalIngredients';
import { GradientHeader } from '../components/common/GradientHeader';
import { CategoryGrid } from '../components/ingredient/CategoryGrid';
import { IngredientListView } from '../components/ingredient/IngredientListView';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { IngredientDetailModal } from '../components/ingredient/IngredientDetailModal';
import { AddToShoppingListModal } from '../components/shoppingList/AddToShoppingListModal';
import { Ingredient, IngredientCategory } from '../types';
import { colors, spacing, commonStyles } from '../styles';
import { SeasonalUtils } from '../utils/seasonalUtils';

type ViewMode = 'grid' | 'category';
type FilterCategory = IngredientCategory | 'all' | 'favoris' | 'myproduct' | 'saison' | 'seasonal';

export const IngredientsScreen: React.FC = () => {
  // View state management
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentCategory, setCurrentCategory] = useState<{
    key: string;
    name: string;
    icon: string;
  } | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterPill, setSelectedFilterPill] = useState('all');
  const [categoryFilterId, setCategoryFilterId] = useState('all');
  
  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Shopping cart modal state
  const [addToCartModalVisible, setAddToCartModalVisible] = useState(false);
  const [ingredientForCart, setIngredientForCart] = useState<Ingredient | null>(null);
  

  const { 
    ingredients, 
    loading, 
    error, 
    actions: ingredientActions 
  } = useIngredients();

  const { 
    favoriteIds, 
    actions: favoriteActions 
  } = useFavorites();

  const { 
    seasonalData, 
    actions: seasonalActions 
  } = useSeasonalIngredients();

  // Get base ingredients with favorites
  const baseIngredients = useMemo(() => {
    return ingredients.map(ingredient => ({
      ...ingredient,
      isFavorite: favoriteIds.includes(ingredient.id)
    }));
  }, [ingredients, favoriteIds]);

  // Get filtered ingredients for main grid view
  const filteredIngredientsForGrid = useMemo(() => {
    let filtered = baseIngredients;

    // Apply search filter if in grid mode and have search query
    if (viewMode === 'grid' && searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(ingredient => 
        ingredient.name.toLowerCase().includes(searchLower) ||
        ingredient.subcategory.toLowerCase().includes(searchLower) ||
        ingredient.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filter pill selection if in grid mode
    if (viewMode === 'grid' && selectedFilterPill !== 'all') {
      switch (selectedFilterPill) {
        case 'favoris':
          filtered = filtered.filter(ing => favoriteIds.includes(ing.id));
          break;
        case 'myproduct':
          filtered = filtered.filter(ing => ing.isUserCreated);
          break;
      }
    }

    return filtered;
  }, [baseIngredients, viewMode, searchQuery, selectedFilterPill, favoriteIds]);

  // Get ingredients for different categories (used by CategoryGrid)
  const categoryIngredients = useMemo(() => {
    const sourceIngredients = viewMode === 'grid' ? filteredIngredientsForGrid : baseIngredients;
    
    return {
      all: sourceIngredients,
      seasonal: sourceIngredients.filter(ing => ing.seasonal && seasonalActions.isIngredientInSeason(ing)),
      favorites: sourceIngredients.filter(ing => favoriteIds.includes(ing.id)),
      userCreated: sourceIngredients.filter(ing => ing.isUserCreated),
      byCategory: (category: IngredientCategory) => sourceIngredients.filter(ing => ing.category === category)
    };
  }, [filteredIngredientsForGrid, baseIngredients, viewMode, seasonalActions, favoriteIds]);

  // Get current view ingredients based on category and filters
  const currentViewIngredients = useMemo(() => {
    if (!currentCategory) return [];

    let baseIngredients: Ingredient[] = [];

    switch (currentCategory.key) {
      case 'seasonal':
        baseIngredients = categoryIngredients.seasonal;
        break;
      case 'myproduct':
        baseIngredients = categoryIngredients.userCreated;
        break;
      case 'favoris':
        baseIngredients = categoryIngredients.favorites;
        break;
      default:
        baseIngredients = categoryIngredients.byCategory(currentCategory.key as IngredientCategory);
    }

    // Apply subcategory filter if selected
    if (categoryFilterId && categoryFilterId !== 'all') {
      // Handle seasonal filters
      if (currentCategory.key === 'seasonal') {
        switch (categoryFilterId) {
          case 'pic':
            baseIngredients = baseIngredients.filter(ing => {
              const seasonStatus = SeasonalUtils.getDetailedSeasonStatus(ing);
              return seasonStatus === 'peak-season';
            });
            break;
          case 'debut':
            baseIngredients = baseIngredients.filter(ing => {
              const seasonStatus = SeasonalUtils.getDetailedSeasonStatus(ing);
              return seasonStatus === 'beginning-of-season';
            });
            break;
          case 'fin':
            baseIngredients = baseIngredients.filter(ing => {
              const seasonStatus = SeasonalUtils.getDetailedSeasonStatus(ing);
              return seasonStatus === 'end-of-season';
            });
            break;
        }
      } else {
        // Handle subcategory filters
        baseIngredients = baseIngredients.filter(ing => ing.subcategory === categoryFilterId);
      }
    }

    return baseIngredients;
  }, [currentCategory, categoryIngredients, categoryFilterId, seasonalActions]);

  // Define filter pills for main view
  const mainFilterPills = [
    { id: 'all', label: 'Tous', icon: '📋' },
    { id: 'favoris', label: 'Favoris', icon: '❤️' },
    { id: 'myproduct', label: 'Mes produits', icon: '⭐' },
  ];

  // Get category filters for detail view
  const getCategoryFilters = useCallback((categoryKey: string) => {
    const defaultFilters = [{ id: 'all', label: 'Tous' }];
    
    if (categoryKey === 'seasonal') {
      return [
        { id: 'all', label: 'Tous' },
        { id: 'debut', label: 'Début de saison' },
        { id: 'pic', label: 'Pic de saison' },
        { id: 'fin', label: 'Fin de saison' },
      ];
    }

    if (categoryKey === 'favoris' || categoryKey === 'myproduct') {
      return defaultFilters;
    }

    // For regular categories, get unique subcategories from ingredients in this category
    let categoryIngredients: Ingredient[] = [];
    switch (categoryKey) {
      case 'seasonal':
        categoryIngredients = baseIngredients.filter(ing => ing.seasonal && seasonalActions.isIngredientInSeason(ing));
        break;
      case 'favoris':
        categoryIngredients = baseIngredients.filter(ing => favoriteIds.includes(ing.id));
        break;
      case 'myproduct':
        categoryIngredients = baseIngredients.filter(ing => ing.isUserCreated);
        break;
      default:
        categoryIngredients = baseIngredients.filter(ing => ing.category === categoryKey);
    }

    // Get unique subcategories
    const subcategories = [...new Set(categoryIngredients.map(ing => ing.subcategory))]
      .sort()
      .map(subcategory => ({
        id: subcategory,
        label: subcategory
      }));

    return subcategories.length > 1 ? [defaultFilters[0], ...subcategories] : defaultFilters;
  }, [baseIngredients, seasonalActions, favoriteIds]);

  // Navigation handlers
  const handleCategoryPress = (categoryKey: string, categoryName: string) => {
    const categoryInfo = getCategoryInfo(categoryKey);
    setCurrentCategory({
      key: categoryKey,
      name: categoryName,
      icon: categoryInfo.icon,
    });
    setViewMode('category');
    setCategoryFilterId('all');
    setSearchQuery('');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setCurrentCategory(null);
    setSearchQuery('');
  };

  // UI handlers
  const handleIngredientPress = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedIngredient(null);
  };

  const handleAddIngredient = () => {
    router.push('/add-ingredient');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleMainFilterPill = (pillId: string) => {
    setSelectedFilterPill(pillId);
    // Clear search when switching to specific filter pills for better UX
    if (pillId !== 'all' && searchQuery.trim()) {
      setSearchQuery('');
    }
  };

  const handleCategoryFilter = (filterId: string) => {
    setCategoryFilterId(filterId);
  };

  const handleFavoritePress = async (ingredient: Ingredient) => {
    try {
      await favoriteActions.toggleFavorite(ingredient.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAddToCart = (ingredient: Ingredient) => {
    setIngredientForCart(ingredient);
    setAddToCartModalVisible(true);
  };

  const handleCloseAddToCartModal = () => {
    setAddToCartModalVisible(false);
    setIngredientForCart(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        ingredientActions.refreshIngredients(),
        favoriteActions.loadFavorites()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    setRefreshing(false);
  };

  // Category info mapping
  const getCategoryInfo = (categoryKey: string) => {
    const categoryMap: { [key: string]: { title: string; icon: string } } = {
      seasonal: { title: 'Produits de saison', icon: '🌿' },
      favoris: { title: 'Favoris', icon: '❤️' },
      fruits: { title: 'Fruits', icon: '🍎' },
      legumes: { title: 'Légumes', icon: '🥬' },
      peche: { title: 'Poisson', icon: '🐟' },
      viande: { title: 'Viande', icon: '🥩' },
      produits_laitiers: { title: 'Produits laitiers', icon: '🥛' },
      epicerie: { title: 'Épicerie', icon: '🛒' },
      myproduct: { title: 'Mes produits', icon: '⭐' },
    };
    return categoryMap[categoryKey] || { title: categoryKey, icon: '📋' };
  };

  // Error handling
  if (error) {
    return (
      <View style={[commonStyles.container, commonStyles.center]}>
        <Text style={commonStyles.textBody}>Erreur: {error}</Text>
      </View>
    );
  }

  // Render main grid view
  const renderGridView = () => (
    <>
      <GradientHeader
        title="Mes Ingrédients"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={setSearchQuery}
        pills={mainFilterPills}
        activePillId={selectedFilterPill}
        onPillPress={handleMainFilterPill}
      />
      {searchQuery.trim() ? (
        <IngredientListView
          ingredients={filteredIngredientsForGrid}
          favoriteIds={favoriteIds}
          onIngredientPress={handleIngredientPress}
          onFavoritePress={handleFavoritePress}
          onAddToCartPress={handleAddToCart}
          searchQuery={searchQuery}
        />
      ) : (
        <CategoryGrid
          ingredients={categoryIngredients.all}
          favoriteIds={favoriteIds}
          seasonalIngredients={categoryIngredients.seasonal}
          userCreatedIngredients={categoryIngredients.userCreated}
          onCategoryPress={handleCategoryPress}
        />
      )}
    </>
  );

  // Render category detail view
  const renderCategoryView = () => {
    if (!currentCategory) return null;

    const categoryFilters = getCategoryFilters(currentCategory.key);

    return (
      <>
        <GradientHeader
          title={currentCategory.name}
          categoryIcon={currentCategory.icon}
          categoryCount={`${currentViewIngredients.length} produits disponibles`}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
          showBackButton
          onBackPress={handleBackToGrid}
        />
        <IngredientListView
          ingredients={currentViewIngredients}
          favoriteIds={favoriteIds}
          onIngredientPress={handleIngredientPress}
          onFavoritePress={handleFavoritePress}
          onAddToCartPress={handleAddToCart}
          searchQuery={searchQuery}
          filters={categoryFilters}
          activeFilterId={categoryFilterId}
          onFilterChange={handleCategoryFilter}
        />
      </>
    );
  };

  return (
    <ScreenErrorBoundary>
      <View style={styles.container}>
        {viewMode === 'grid' ? renderGridView() : renderCategoryView()}

        <FloatingAddButton onPress={handleAddIngredient} />

        <IngredientDetailModal
          ingredient={selectedIngredient}
          visible={modalVisible}
          onClose={handleCloseModal}
        />

        <AddToShoppingListModal
          visible={addToCartModalVisible}
          onClose={handleCloseAddToCartModal}
          ingredient={ingredientForCart || undefined}
          mode="ingredient"
        />
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  viewContainer: {
    flex: 1,
  },
});