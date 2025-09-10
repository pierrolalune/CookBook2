import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Recipe, RecipeCategory } from '../types';
import { colors, spacing, typography } from '../styles';
import { useRecipes, useRecipeCategories } from '../hooks/useRecipes';
import { useRecipeBulkSharing } from '../hooks/useRecipeSharing';
import { useRecipeFavorites } from '../hooks/useRecipeFavorites';
import { useAdvancedRecipeSearch, useWhatCanIMake } from '../hooks/useAdvancedRecipeSearch';
import { useIngredients } from '../hooks/useIngredients';
import { SearchBar } from '../components/common/SearchBar';
import { CategoryChips } from '../components/common/CategoryChips';
import { FloatingAddButton } from '../components/common/FloatingAddButton';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { ShareModal } from '../components/recipe/ShareModal';
import { AdvancedSearchModal } from '../components/recipe/AdvancedSearchModal';
import { MakeableRecipesModal } from '../components/recipe/MakeableRecipesModal';
import { RecipeMatchAnalyzer } from '../components/recipe/RecipeMatchAnalyzer';
import { ScreenErrorBoundary } from '../components/common/ErrorBoundary';
import { AdvancedSearchFilters, RecipeMatchResult } from '../utils/recipeSearchUtils';

interface RecipeCategoryChip {
  id: string;
  label: string;
  icon: string;
  count?: number;
  value: RecipeCategory | 'favoris' | 'all';
}

export const RecipesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'favoris' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // Advanced search state
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
  const [makeableModalVisible, setMakeableModalVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced' | 'makeable'>('basic');
  
  // Set search mode
  const loggedSetSearchMode = useCallback((mode: 'basic' | 'advanced' | 'makeable') => {
    setSearchMode(mode);
  }, []);
  const [showMatchAnalysis, setShowMatchAnalysis] = useState(false);

  const { recipes, loading, error, actions } = useRecipes();
  const { categories, loading: categoriesLoading, refresh: refreshCategories } = useRecipeCategories();
  const bulkSharing = useRecipeBulkSharing();
  
  // Get available ingredients for advanced search
  const { ingredients: availableIngredients } = useIngredients();
  
  // Advanced search functionality
  const advancedSearch = useAdvancedRecipeSearch({
    recipes,
    availableIngredients,
    onSearchComplete: (results) => {
      if (results.length === 0) {
        Alert.alert('Aucun résultat', 'Aucune recette ne correspond à vos critères de recherche.');
      }
    }
  });
  
  // "What can I make?" functionality
  const whatCanIMake = useWhatCanIMake(recipes, availableIngredients);
  
  // Create fast update callback for favorites
  const handleFavoriteChange = useCallback((recipeId: string, isFavorite: boolean) => {
    // Fast update: Update recipe in memory immediately
    actions.updateRecipeFavoriteStatus(recipeId, isFavorite);
    // Refresh categories to update favorite count (this is lightweight)
    refreshCategories();
  }, [actions, refreshCategories]);

  // Create category chips
  const categoryChips: RecipeCategoryChip[] = useMemo(() => {
    const categoryIcons = {
      favoris: '❤️',
      entree: '🥗',
      plats: '🍽️', 
      dessert: '🍰',
      all: '📋'
    };
    
    const chips: RecipeCategoryChip[] = [
      { id: 'all', label: 'Toutes', icon: categoryIcons.all, value: 'all' }
    ];

    categories.forEach(cat => {
      chips.push({
        id: cat.category,
        label: cat.label,
        icon: categoryIcons[cat.category as keyof typeof categoryIcons] || '📝',
        count: cat.count,
        value: cat.category
      });
    });

    return chips;
  }, [categories]);

  // Enhanced filtering logic with advanced search support
  const filteredRecipes = useMemo(() => {
    // Advanced search mode - use search results directly
    if (searchMode === 'advanced' && advancedSearch.state.hasSearched) {
      return advancedSearch.state.results.map(result => result.recipe);
    }
    
    // "What can I make?" mode - use makeable recipes
    if (searchMode === 'makeable') {
      return whatCanIMake.makeableRecipes.map(result => result.recipe);
    }
    
    // Basic search mode - original logic
    let filtered = recipes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe =>
        recipe.name.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => 
          ing.ingredient.name.toLowerCase().includes(query)
        )
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'favoris') {
        filtered = filtered.filter(recipe => recipe.isFavorite);
      } else {
        filtered = filtered.filter(recipe => recipe.category === selectedCategory);
      }
    }

    return filtered;
  }, [recipes, searchQuery, selectedCategory, searchMode, advancedSearch.state.hasSearched, advancedSearch.state.results, whatCanIMake.makeableRecipes]);
  
  // Get match results for display when in advanced mode
  const matchResults = useMemo(() => {
    if (searchMode === 'advanced' && advancedSearch.state.hasSearched) {
      return advancedSearch.state.results;
    }
    if (searchMode === 'makeable') {
      return whatCanIMake.makeableRecipes;
    }
    return [];
  }, [searchMode, advancedSearch.state.hasSearched, advancedSearch.state.results, whatCanIMake.makeableRecipes]);

  // Group recipes by category for display
  const groupedRecipes = useMemo(() => {
    if (selectedCategory !== 'all') {
      return [{ category: selectedCategory, recipes: filteredRecipes }];
    }

    const groups: { category: RecipeCategory | 'favoris' | 'all', recipes: Recipe[] }[] = [];
    const categoryOrder: (RecipeCategory | 'favoris' | 'all')[] = ['entree', 'plats', 'dessert'];

    categoryOrder.forEach(category => {
      const categoryRecipes = filteredRecipes.filter(recipe => recipe.category === category);
      if (categoryRecipes.length > 0) {
        groups.push({ category, recipes: categoryRecipes });
      }
    });

    return groups;
  }, [filteredRecipes, selectedCategory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await actions.refreshRecipes();
    } catch (error) {
      console.error('Error refreshing recipes:', error);
    } finally {
      setRefreshing(false);
    }
  }, [actions]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Temporarily disable automatic reset to basic search
    // if (searchMode !== 'basic') {
    //   loggedSetSearchMode('basic');
    //   setShowMatchAnalysis(false);
    // }
  }, [searchMode, loggedSetSearchMode]);
  
  // Advanced search handlers
  const handleAdvancedSearch = useCallback((filters: AdvancedSearchFilters) => {
    console.log('Starting advanced search with filters:', filters);
    loggedSetSearchMode('advanced');
    setShowMatchAnalysis(true);
    advancedSearch.actions.performSearch(filters);
  }, [advancedSearch.actions, loggedSetSearchMode]);
  
  const handleWhatCanIMake = useCallback(() => {
    // Open ingredient selection modal instead of automatic mode
    setMakeableModalVisible(true);
  }, []);

  // Handle ingredient selection from makeable modal
  const handleMakeableSearch = useCallback((selectedIngredientIds: string[], matchThreshold: number, excludedIngredients?: string[]) => {
    loggedSetSearchMode('makeable');
    setShowMatchAnalysis(true);
    // Use the enhanced hook with manual selection
    whatCanIMake.findRecipesWithSelection(selectedIngredientIds, matchThreshold, excludedIngredients);
  }, [loggedSetSearchMode, whatCanIMake]);
  
  const handleResetSearch = useCallback(() => {
    loggedSetSearchMode('basic');
    setShowMatchAnalysis(false);
    setSearchQuery('');
    setSelectedCategory('all');
    advancedSearch.actions.clearResults();
  }, [advancedSearch.actions, loggedSetSearchMode]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId as RecipeCategory | 'favoris' | 'all');
    // Temporarily disable automatic reset to basic search
    // if (searchMode !== 'basic') {
    //   loggedSetSearchMode('basic');
    //   setShowMatchAnalysis(false);
    //   advancedSearch.actions.clearResults();
    // }
  }, [searchMode, advancedSearch.actions, loggedSetSearchMode]);

  const handleRecipePress = useCallback((recipe: Recipe) => {
    if (selectionMode) {
      bulkSharing.actions.toggleRecipe(recipe);
    } else {
      router.push({
        pathname: '/recipe/[id]',
        params: { id: recipe.id }
      });
    }
  }, [selectionMode, bulkSharing.actions]);

  const handleRecipeLongPress = useCallback((recipe: Recipe) => {
    if (selectionMode) {
      return; // No long press in selection mode
    }
    
    Alert.alert(
      recipe.name,
      'Que souhaitez-vous faire ?',
      [
        {
          text: 'Voir',
          onPress: () => handleRecipePress(recipe)
        },
        {
          text: 'Modifier',
          onPress: () => router.push({
            pathname: '/recipe/[id]/edit',
            params: { id: recipe.id }
          })
        },
        {
          text: 'Dupliquer',
          onPress: () => handleDuplicateRecipe(recipe)
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => handleDeleteRecipe(recipe)
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  }, [handleRecipePress]);

  const handleDuplicateRecipe = useCallback(async (recipe: Recipe) => {
    try {
      await actions.duplicateRecipe(recipe.id, `${recipe.name} (Copie)`);
      Alert.alert('Succès', 'Recette dupliquée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de dupliquer la recette');
    }
  }, [actions]);

  const handleDeleteRecipe = useCallback(async (recipe: Recipe) => {
    try {
      await actions.deleteRecipe(recipe.id);
      Alert.alert('Succès', 'Recette supprimée');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer la recette');
    }
  }, [actions]);

  const handleEditRecipe = useCallback((recipe: Recipe) => {
    router.push({
      pathname: '/recipe/[id]/edit',
      params: { id: recipe.id }
    });
  }, []);

  const handleAddRecipe = useCallback(() => {
    router.push('/add-recipe');
  }, []);

  // Selection mode handlers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        // Exiting selection mode, clear selection
        bulkSharing.actions.clearSelection();
      }
      return !prev;
    });
  }, [bulkSharing.actions]);

  const handleSelectAll = useCallback(() => {
    filteredRecipes.forEach(recipe => {
      if (!bulkSharing.selectedRecipes.find(r => r.id === recipe.id)) {
        bulkSharing.actions.addRecipe(recipe);
      }
    });
  }, [filteredRecipes, bulkSharing.selectedRecipes, bulkSharing.actions]);

  const handleBulkShare = useCallback(() => {
    if (bulkSharing.selectedCount === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une recette');
      return;
    }
    setShareModalVisible(true);
  }, [bulkSharing.selectedCount]);


  // Toggle category collapse
  const toggleCategoryCollapse = useCallback((category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // Render recipe with match analysis if in advanced mode
  const renderRecipeItem = useCallback((recipe: Recipe, matchResult?: RecipeMatchResult) => {
    const commonProps = {
      recipe,
      onPress: handleRecipePress,
      onLongPress: handleRecipeLongPress,
      onEdit: handleEditRecipe,
      onDelete: handleDeleteRecipe,
      showUsageStats: true,
      selectionMode,
      selected: bulkSharing.selectedRecipes.some(r => r.id === recipe.id),
      onFavoriteChange: handleFavoriteChange
    };
    
    if (showMatchAnalysis && matchResult) {
      // Check if we're in exclusion-only mode
      const exclusionOnlyMode = searchMode === 'makeable' && 
        whatCanIMake.selectedIngredientIds.length === 0 && 
        whatCanIMake.excludedIngredientIds.length > 0;
        
      return (
        <RecipeMatchAnalyzer
          key={`match-${recipe.id}`}
          matchResult={matchResult}
          onRecipePress={(recipeId) => {
            router.push({
              pathname: '/recipe/[id]',
              params: { id: recipeId }
            });
          }}
          showDetails={true}
          exclusionOnlyMode={exclusionOnlyMode}
        />
      );
    }
    
    return <RecipeCard key={recipe.id} {...commonProps} />;
  }, [handleRecipePress, handleRecipeLongPress, handleEditRecipe, handleDeleteRecipe, selectionMode, bulkSharing.selectedRecipes, handleFavoriteChange, showMatchAnalysis, router, searchMode, whatCanIMake.selectedIngredientIds, whatCanIMake.excludedIngredientIds]);
  
  const renderCategorySection = ({ item }: { item: { category: RecipeCategory | 'favoris' | 'all', recipes: Recipe[] } }) => {
    const categoryLabels = {
      favoris: 'Favoris',
      entree: 'Entrées',
      plats: 'Plats',
      dessert: 'Desserts',
      all: 'Toutes les recettes'
    };

    const categoryKey = item.category;
    const isCollapsed = collapsedCategories.has(categoryKey);

    return (
      <View style={styles.categorySection}>
        {selectedCategory === 'all' && (
          <TouchableOpacity 
            style={styles.categoryHeader}
            onPress={() => toggleCategoryCollapse(categoryKey)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryTitle}>
              {categoryLabels[item.category]} ({item.recipes.length})
            </Text>
            <Ionicons 
              name={isCollapsed ? 'chevron-down' : 'chevron-up'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        
        {!isCollapsed && item.recipes.map((recipe) => {
          const matchResult = matchResults.find(mr => mr.recipe.id === recipe.id);
          return renderRecipeItem(recipe, matchResult);
        })}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🍽️</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Essayez avec d\'autres mots-clés'
          : 'Commencez par créer votre première recette'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={styles.emptyButton} onPress={handleAddRecipe}>
          <Text style={styles.emptyButtonText}>Créer une recette</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Erreur de chargement</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  if (error && !recipes.length) {
    return (
      <ScreenErrorBoundary>
        <View style={styles.container}>
          {renderErrorState()}
        </View>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {selectionMode ? (
            <>
              <View style={styles.selectionHeader}>
                <TouchableOpacity
                  style={styles.cancelSelectionButton}
                  onPress={toggleSelectionMode}
                >
                  <Text style={styles.cancelSelectionText}>Annuler</Text>
                </TouchableOpacity>
                
                <Text style={styles.selectionTitle}>
                  {bulkSharing.selectedCount} sélectionnée{bulkSharing.selectedCount > 1 ? 's' : ''}
                </Text>
                
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={handleSelectAll}
                >
                  <Text style={styles.selectAllText}>Tout</Text>
                </TouchableOpacity>
              </View>
              
              {bulkSharing.selectedCount > 0 && (
                <View style={styles.selectionActions}>
                  <TouchableOpacity
                    style={[styles.selectionActionButton, styles.singleActionButton]}
                    onPress={handleBulkShare}
                  >
                    <Text style={styles.selectionActionText}>📤 Partager</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={[styles.titleRow, { justifyContent: 'flex-end' }]}>
                <TouchableOpacity
                  style={styles.selectionModeButton}
                  onPress={toggleSelectionMode}
                >
                  <Text style={styles.selectionModeText}>Sélectionner</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Search and Filters Section */}
        <View style={styles.searchAndFiltersSection}>
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Rechercher une recette..."
            />
            
            {/* Advanced search buttons */}
            <View style={styles.advancedSearchButtons}>
              <TouchableOpacity
                style={[
                  styles.advancedButton,
                  searchMode === 'advanced' && styles.advancedButtonActive
                ]}
                onPress={() => setAdvancedSearchVisible(true)}
              >
                <Ionicons 
                  name="options" 
                  size={16} 
                  color={searchMode === 'advanced' ? colors.textWhite : colors.primary} 
                />
                <Text style={[
                  styles.advancedButtonText,
                  searchMode === 'advanced' && styles.advancedButtonTextActive
                ]}>Avancé</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.advancedButton,
                  searchMode === 'makeable' && styles.advancedButtonActive
                ]}
                onPress={handleWhatCanIMake}
                disabled={availableIngredients.length === 0}
              >
                <Ionicons 
                  name={whatCanIMake.isManualMode ? "restaurant" : "checkmark-circle"} 
                  size={16} 
                  color={searchMode === 'makeable' ? colors.textWhite : colors.success} 
                />
                <Text style={[
                  styles.advancedButtonText,
                  searchMode === 'makeable' && styles.advancedButtonTextActive,
                  availableIngredients.length === 0 && styles.disabledText
                ]}>
                  {whatCanIMake.isManualMode 
                    ? (whatCanIMake.selectedIngredientIds.length === 0 && whatCanIMake.excludedIngredientIds.length > 0 
                       ? 'Exclusions' 
                       : 'Mes ingrédients')
                    : 'Réalisable'}
                </Text>
                {whatCanIMake.isManualMode && ((whatCanIMake.selectedIngredientIds.length > 0 || whatCanIMake.excludedIngredientIds.length > 0) || searchMode === 'makeable') && (
                  <View style={styles.selectionCountBadge}>
                    <Text style={styles.selectionCountText}>
                      {whatCanIMake.selectedIngredientIds.length === 0 && whatCanIMake.excludedIngredientIds.length > 0
                        ? whatCanIMake.excludedIngredientIds.length
                        : whatCanIMake.selectedIngredientIds.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {searchMode !== 'basic' && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetSearch}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                  <Text style={styles.resetButtonText}>Effacer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Search status indicator */}
          {searchMode !== 'basic' && (
            <View style={styles.searchStatus}>
              {searchMode === 'advanced' && (
                <View style={styles.statusItem}>
                  <Ionicons name="search" size={14} color={colors.primary} />
                  <Text style={styles.statusText}>
                    {advancedSearch.state.loading ? 'Recherche...' : 
                     `${advancedSearch.state.totalResults} résultat${advancedSearch.state.totalResults > 1 ? 's' : ''} trouvé${advancedSearch.state.totalResults > 1 ? 's' : ''}`
                    }
                  </Text>
                </View>
              )}
              
              {searchMode === 'makeable' && (
                <View style={styles.statusItem}>
                  <Ionicons name="restaurant" size={14} color={colors.success} />
                  <Text style={styles.statusText}>
                    {whatCanIMake.loading ? 'Analyse...' : 
                     // Check if we're in exclusion-only mode
                     whatCanIMake.selectedIngredientIds.length === 0 && whatCanIMake.excludedIngredientIds.length > 0
                       ? `${whatCanIMake.totalMakeable} recette${whatCanIMake.totalMakeable > 1 ? 's' : ''} sans ingrédients exclus`
                       : `${whatCanIMake.totalMakeable} recette${whatCanIMake.totalMakeable > 1 ? 's' : ''} réalisable${whatCanIMake.totalMakeable > 1 ? 's' : ''}`
                    }
                  </Text>
                </View>
              )}
              
              {showMatchAnalysis && (
                <TouchableOpacity
                  style={styles.toggleAnalysisButton}
                  onPress={() => setShowMatchAnalysis(!showMatchAnalysis)}
                >
                  <Text style={styles.toggleAnalysisText}>
                    {showMatchAnalysis ? 'Masquer analyse' : 'Afficher analyse'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {searchMode === 'basic' && (
            <View style={styles.filtersContainer}>
              <CategoryChips
                categories={categoryChips}
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
                loading={categoriesLoading}
              />
            </View>
          )}
        </View>

        {/* Recipes List */}
        <View style={styles.content}>
          {groupedRecipes.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={groupedRecipes}
              renderItem={renderCategorySection}
              keyExtractor={(item, index) => `${item.category}_${index}`}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        {/* Floating Add Button */}
        {!selectionMode && (
          <FloatingAddButton onPress={handleAddRecipe} />
        )}

        {/* Share Modal */}
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          recipes={bulkSharing.selectedRecipes}
          mode="multiple"
        />
        
        {/* Advanced Search Modal */}
        <AdvancedSearchModal
          visible={advancedSearchVisible}
          onClose={() => setAdvancedSearchVisible(false)}
          onSearch={handleAdvancedSearch}
          availableIngredients={availableIngredients}
          initialFilters={advancedSearch.state.filters}
        />
        
        <MakeableRecipesModal
          visible={makeableModalVisible}
          onClose={() => setMakeableModalVisible(false)}
          onSearch={handleMakeableSearch}
          availableIngredients={availableIngredients}
          initialSelectedIds={whatCanIMake.selectedIngredientIds}
          initialExcludedIds={whatCanIMake.excludedIngredientIds}
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

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  title: {
    ...typography.styles.h1,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },

  searchAndFiltersSection: {
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  searchContainer: {
    marginBottom: spacing.md,
  },

  filtersContainer: {
    // Container now just holds the CategoryChips
  },
  
  // Advanced search styles
  advancedSearchButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  
  advancedButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  advancedButtonText: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  
  advancedButtonTextActive: {
    color: colors.textWhite,
  },
  
  disabledText: {
    opacity: 0.5,
  },
  
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  resetButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: typography.weights.medium,
  },
  
  selectionCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  
  selectionCountText: {
    fontSize: typography.sizes.xs,
    color: colors.textWhite,
    fontWeight: typography.weights.bold,
  },
  
  searchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  
  statusText: {
    ...typography.styles.small,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  
  toggleAnalysisButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  
  toggleAnalysisText: {
    ...typography.styles.small,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },


  content: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100, // Space for floating button
  },

  categorySection: {
    marginBottom: spacing.lg,
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },

  categoryTitle: {
    ...typography.styles.h3,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
    opacity: 0.5,
  },

  emptyTitle: {
    ...typography.styles.h2,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  emptySubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },

  emptyButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },

  errorTitle: {
    ...typography.styles.h2,
    fontWeight: typography.weights.semibold,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  errorSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
  },

  retryButtonText: {
    ...typography.styles.body,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  // Selection mode styles
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleContainer: {
    flex: 1,
  },

  selectionModeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
  },

  selectionModeText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  cancelSelectionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  cancelSelectionText: {
    ...typography.styles.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  selectionTitle: {
    ...typography.styles.body,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    flex: 1,
    textAlign: 'center',
  },

  selectAllButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  selectAllText: {
    ...typography.styles.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  selectionActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },

  selectionActionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    flex: 1,
    alignItems: 'center',
  },

  selectionActionText: {
    ...typography.styles.small,
    color: colors.textWhite,
    fontWeight: typography.weights.semibold,
  },

  singleActionButton: {
    flex: 0,
    minWidth: 120,
  },
});