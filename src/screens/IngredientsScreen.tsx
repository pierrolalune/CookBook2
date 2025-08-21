import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Text 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useIngredients } from '../hooks/useIngredients';
import { useFavorites } from '../hooks/useFavorites';
import { useSeasonalIngredients } from '../hooks/useSeasonalIngredients';
import { SearchBar } from '../components/common/SearchBar';
import { CategoryChips, FilterCategory } from '../components/common/CategoryChips';
import { CategorySection } from '../components/ingredient/CategorySection';
import { SubCategorySection } from '../components/ingredient/SubCategorySection';
import { IngredientCard } from '../components/ingredient/IngredientCard';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { IngredientDetailModal } from '../components/ingredient/IngredientDetailModal';
import { Ingredient, IngredientCategory } from '../types';
import { colors, spacing, commonStyles } from '../styles';
import { SeasonalUtils } from '../utils/seasonalUtils';

export const IngredientsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  // Update ingredient favorites when favoriteIds change
  const ingredientsWithFavorites = useMemo(() => {
    return ingredients.map(ingredient => ({
      ...ingredient,
      isFavorite: favoriteIds.includes(ingredient.id)
    }));
  }, [ingredients, favoriteIds]);

  // Filter ingredients based on selected category and search query
  const filteredIngredients = useMemo(() => {
    let filtered = ingredientsWithFavorites;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ingredient => 
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.subcategory.toLowerCase().includes(query) ||
        ingredient.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (selectedCategory) {
      case 'favoris':
        filtered = filtered.filter(ing => ing.isFavorite);
        break;
      case 'myproduct':
        filtered = filtered.filter(ing => ing.isUserCreated);
        break;
      case 'saison':
        // Only show ingredients with seasonal data that are currently in season
        filtered = filtered.filter(ing => ing.seasonal && seasonalActions.isIngredientInSeason(ing));
        break;
      case 'all':
        break;
      default:
        filtered = filtered.filter(ing => ing.category === selectedCategory);
        break;
    }

    return filtered;
  }, [ingredientsWithFavorites, selectedCategory, searchQuery, seasonalActions]);

  // Group ingredients by category for display
  const groupedIngredients = useMemo(() => {
    // Show grouped view for 'all', 'favoris', 'myproduct', and 'saison' categories
    if ((selectedCategory === 'all' || selectedCategory === 'favoris' || selectedCategory === 'myproduct' || selectedCategory === 'saison') && !searchQuery.trim()) {
      const groups: { [key: string]: Ingredient[] } = {};
      
      if (selectedCategory === 'all') {
        // Special categories first for "all" view
        const favorites = filteredIngredients.filter(ing => ing.isFavorite);
        // Only show seasonal ingredients that have seasonal data and are in season
        const seasonal = filteredIngredients.filter(ing => ing.seasonal && seasonalActions.isIngredientInSeason(ing));
        const userCreated = filteredIngredients.filter(ing => ing.isUserCreated);
        
        if (favorites.length > 0) {
          groups['favoris'] = favorites;
        }
        
        if (seasonal.length > 0) {
          groups['saison'] = seasonal;
        }

        if (userCreated.length > 0) {
          groups['myproduct'] = userCreated;
        }
      }

      // Regular categories for all views
      const categoryOrder: IngredientCategory[] = [
        'fruits', 'legumes', 'peche', 'viande', 'produits_laitiers', 'epicerie'
      ];

      categoryOrder.forEach(category => {
        let categoryIngredients: Ingredient[];
        
        if (selectedCategory === 'all') {
          // For "all" view, exclude user created from regular categories
          categoryIngredients = filteredIngredients.filter(ing => 
            ing.category === category && !ing.isUserCreated
          );
        } else {
          // For "favoris", "myproduct", and "saison", show all ingredients in each category
          categoryIngredients = filteredIngredients.filter(ing => 
            ing.category === category
          );
        }
        
        if (categoryIngredients.length > 0) {
          groups[category] = categoryIngredients;
        }
      });

      return groups;
    }
    
    // For other specific categories or search, return flat list
    return null;
  }, [filteredIngredients, selectedCategory, searchQuery, seasonalActions]);

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

  const handleCategorySelect = (category: FilterCategory) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when changing categories
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

  // Group ingredients by subcategory for main food categories
  const groupIngredientsBySubcategory = (ingredients: Ingredient[]): { [key: string]: Ingredient[] } => {
    const groups: { [key: string]: Ingredient[] } = {};
    
    ingredients.forEach(ingredient => {
      const subcategory = ingredient.subcategory;
      if (!groups[subcategory]) {
        groups[subcategory] = [];
      }
      groups[subcategory].push(ingredient);
    });

    // Sort subcategories alphabetically
    const sortedGroups: { [key: string]: Ingredient[] } = {};
    Object.keys(groups)
      .sort()
      .forEach(key => {
        sortedGroups[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name));
      });

    return sortedGroups;
  };

  const getCategoryInfo = (categoryKey: string) => {
    const categoryMap: { [key: string]: { title: string; icon: string; headerStyle?: any } } = {
      favoris: { 
        title: 'Mes Favoris', 
        icon: '❤️',
        headerStyle: { backgroundColor: colors.favoriteLight }
      },
      saison: { 
        title: 'Produits de saison', 
        icon: '🌿' 
      },
      myproduct: { 
        title: 'Mes produits', 
        icon: '⭐' 
      },
      fruits: { 
        title: 'Fruits', 
        icon: '🍎' 
      },
      legumes: { 
        title: 'Légumes', 
        icon: '🥬' 
      },
      peche: { 
        title: 'Poisson', 
        icon: '🐟' 
      },
      viande: { 
        title: 'Viande', 
        icon: '🥩' 
      },
      produits_laitiers: { 
        title: 'Produits laitiers', 
        icon: '🥛' 
      },
      epicerie: { 
        title: 'Épicerie', 
        icon: '🛒' 
      },
    };
    return categoryMap[categoryKey] || { title: categoryKey, icon: '📋' };
  };

  if (error) {
    return (
      <View style={[commonStyles.container, commonStyles.center]}>
        <Text style={commonStyles.textBody}>Erreur: {error}</Text>
      </View>
    );
  }

  return (
    <ScreenErrorBoundary>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
        <View style={styles.header}>
          <SearchBar 
            onSearch={handleSearch}
            value={searchQuery}
            placeholder="Rechercher un ingrédient..."
          />
          
          <CategoryChips
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            favoriteCount={0}
            userIngredientCount={0}
            seasonalCount={0}
          />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Grouped categories view with collapsible sections */}
          {(selectedCategory === 'all' || selectedCategory === 'favoris' || selectedCategory === 'myproduct' || selectedCategory === 'saison') && groupedIngredients && !searchQuery.trim() ? (
            Object.entries(groupedIngredients).map(([categoryKey, categoryIngredients]) => {
              const categoryInfo = getCategoryInfo(categoryKey);
              
              return (
                <CategorySection
                  key={categoryKey}
                  title={categoryInfo.title}
                  icon={categoryInfo.icon}
                  ingredients={categoryIngredients}
                  onIngredientPress={handleIngredientPress}
                  headerStyle={categoryInfo.headerStyle}
                  initiallyExpanded={false}
                  compact={true}
                  showCount={true}
                  emptyMessage={
                    categoryKey === 'favoris' 
                      ? 'Aucun favori. Appuyez sur ❤️ pour ajouter des ingrédients favoris.'
                      : categoryKey === 'myproduct'
                      ? 'Aucun produit personnel. Utilisez le bouton + pour en créer.'
                      : 'Aucun ingrédient dans cette catégorie.'
                  }
                />
              );
            })
          ) : (
            /* Specific category view or search results */
            <>
              {/* Main food categories with subcategory grouping */}
              {!searchQuery.trim() && ['fruits', 'legumes', 'peche', 'viande', 'produits_laitiers', 'epicerie'].includes(selectedCategory) ? (
                <>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryHeaderIcon}>
                      {getCategoryInfo(selectedCategory).icon}
                    </Text>
                    <Text style={styles.categoryHeaderTitle}>
                      {getCategoryInfo(selectedCategory).title}
                    </Text>
                  </View>
                  
                  {(() => {
                    const subcategoryGroups = groupIngredientsBySubcategory(filteredIngredients);
                    
                    if (Object.keys(subcategoryGroups).length === 0) {
                      return (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyStateText}>
                            Aucun ingrédient dans cette catégorie.
                          </Text>
                        </View>
                      );
                    }

                    return Object.entries(subcategoryGroups).map(([subcategory, ingredients]) => (
                      <SubCategorySection
                        key={subcategory}
                        title={subcategory}
                        ingredients={ingredients}
                        onIngredientPress={handleIngredientPress}
                        initiallyExpanded={false}
                      />
                    ));
                  })()}
                </>
              ) : (
                /* Flat list for search results or special categories */
                <>
                  {selectedCategory !== 'all' && selectedCategory !== 'favoris' && selectedCategory !== 'myproduct' && selectedCategory !== 'saison' && (
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryHeaderIcon}>
                        {getCategoryInfo(selectedCategory).icon}
                      </Text>
                      <Text style={styles.categoryHeaderTitle}>
                        {getCategoryInfo(selectedCategory).title}
                      </Text>
                    </View>
                  )}
                  <View style={styles.flatListContainer}>
                    {filteredIngredients.map((ingredient) => (
                      <IngredientCard
                        key={ingredient.id}
                        ingredient={ingredient}
                        onPress={handleIngredientPress}
                        showSeasonalBadge={true}
                      />
                    ))}
                  </View>
                  {filteredIngredients.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        {searchQuery.trim() 
                          ? `Aucun ingrédient trouvé pour "${searchQuery}"`
                          : selectedCategory === 'favoris'
                          ? 'Aucun favori. Appuyez sur ❤️ pour ajouter des ingrédients favoris.'
                          : selectedCategory === 'myproduct'
                          ? 'Aucun produit personnel. Utilisez le bouton + pour en créer.'
                          : 'Aucun ingrédient dans cette catégorie.'
                        }
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* Extra padding for floating button */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        <FloatingAddButton onPress={handleAddIngredient} />

        <IngredientDetailModal
          ingredient={selectedIngredient}
          visible={modalVisible}
          onClose={handleCloseModal}
        />
        </View>
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  content: {
    flex: 1,
  },
  
  header: {
    backgroundColor: colors.backgroundLight,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  
  scrollContent: {
    padding: spacing.screenPadding,
  },
  
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  
  categoryHeaderIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  
  categoryHeaderTitle: {
    ...commonStyles.textH2,
    color: colors.textPrimary,
  },
  
  flatListContainer: {
    paddingHorizontal: spacing.screenPadding,
  },
  
  emptyState: {
    padding: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  emptyStateText: {
    ...commonStyles.textCaption,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  bottomPadding: {
    height: 100, // Space for floating action button
  },
});