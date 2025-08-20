import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Alert,
  Text 
} from 'react-native';
import { router } from 'expo-router';
import { useIngredients } from '../hooks/useIngredients';
import { useFavorites } from '../hooks/useFavorites';
import { useSeasonalIngredients } from '../hooks/useSeasonalIngredients';
import { SearchBar } from '../components/common/SearchBar';
import { CategoryChips, FilterCategory } from '../components/common/CategoryChips';
import { CategorySection } from '../components/ingredient/CategorySection';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { Ingredient, IngredientCategory } from '../types';
import { colors, spacing, commonStyles } from '../styles';

export const IngredientsScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
        filtered = filtered.filter(ing => seasonalActions.isIngredientInSeason(ing));
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
    if (selectedCategory !== 'all' || searchQuery.trim()) {
      // Show flat list for specific categories or search results
      return { [selectedCategory]: filteredIngredients };
    }

    // Group by category for "all" view
    const groups: { [key: string]: Ingredient[] } = {};
    
    // Special categories first
    const favorites = filteredIngredients.filter(ing => ing.isFavorite);
    const seasonal = filteredIngredients.filter(ing => seasonalActions.isIngredientInSeason(ing));
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

    // Regular categories
    const categoryOrder: IngredientCategory[] = [
      'fruits', 'legumes', 'peche', 'viande', 'produits_laitiers', 'epicerie'
    ];

    categoryOrder.forEach(category => {
      const categoryIngredients = filteredIngredients.filter(ing => 
        ing.category === category && !ing.isUserCreated
      );
      if (categoryIngredients.length > 0) {
        groups[category] = categoryIngredients;
      }
    });

    return groups;
  }, [filteredIngredients, selectedCategory, searchQuery, seasonalActions]);

  const handleIngredientPress = (ingredient: Ingredient) => {
    // TODO: Navigate to ingredient detail screen
    Alert.alert(
      ingredient.name,
      `Catégorie: ${ingredient.subcategory}\n${ingredient.description || 'Aucune description'}`,
      [{ text: 'OK' }]
    );
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
      Alert.alert('Erreur', 'Impossible de rafraîchir les données');
    }
    setRefreshing(false);
  };

  const getCategoryInfo = (categoryKey: string) => {
    const categoryMap: { [key: string]: { title: string; icon: string; headerStyle?: any } } = {
      favoris: { 
        title: '❤️ Mes Favoris', 
        icon: '❤️',
        headerStyle: { backgroundColor: colors.favoriteLight }
      },
      saison: { 
        title: '🌿 Produits de saison', 
        icon: '🌿' 
      },
      myproduct: { 
        title: '⭐ Mes produits', 
        icon: '⭐' 
      },
      fruits: { 
        title: '🍎 Fruits', 
        icon: '🍎' 
      },
      legumes: { 
        title: '🥬 Légumes', 
        icon: '🥬' 
      },
      peche: { 
        title: '🐟 Poisson', 
        icon: '🐟' 
      },
      viande: { 
        title: '🥩 Viande', 
        icon: '🥩' 
      },
      produits_laitiers: { 
        title: '🥛 Produits laitiers', 
        icon: '🥛' 
      },
      epicerie: { 
        title: '🛒 Épicerie', 
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
      <View style={styles.container}>
        <View style={styles.header}>
          <SearchBar 
            onSearch={handleSearch}
            value={searchQuery}
            placeholder="Rechercher un ingrédient..."
          />
          
          <CategoryChips
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            favoriteCount={favoriteIds.length}
            userIngredientCount={ingredients.filter(ing => ing.isUserCreated).length}
            seasonalCount={seasonalData.currentSeason.length}
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
          {Object.entries(groupedIngredients).map(([categoryKey, categoryIngredients]) => {
            const categoryInfo = getCategoryInfo(categoryKey);
            
            return (
              <CategorySection
                key={categoryKey}
                title={categoryInfo.title}
                icon={categoryInfo.icon}
                ingredients={categoryIngredients}
                onIngredientPress={handleIngredientPress}
                headerStyle={categoryInfo.headerStyle}
                initiallyExpanded={selectedCategory !== 'all' || Object.keys(groupedIngredients).length <= 3}
                emptyMessage={
                  selectedCategory === 'favoris' 
                    ? 'Aucun favori. Appuyez sur ❤️ pour ajouter des ingrédients favoris.'
                    : selectedCategory === 'myproduct'
                    ? 'Aucun produit personnel. Utilisez le bouton + pour en créer.'
                    : 'Aucun ingrédient dans cette catégorie.'
                }
              />
            );
          })}

          {Object.keys(groupedIngredients).length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim() 
                  ? `Aucun ingrédient trouvé pour "${searchQuery}"`
                  : 'Aucun ingrédient disponible'
                }
              </Text>
            </View>
          )}

          {/* Extra padding for floating button */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        <FloatingAddButton onPress={handleAddIngredient} />
      </View>
    </ScreenErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    backgroundColor: colors.backgroundLight,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  
  content: {
    flex: 1,
  },
  
  scrollContent: {
    padding: spacing.screenPadding,
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